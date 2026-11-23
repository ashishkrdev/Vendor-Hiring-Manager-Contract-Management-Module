import { describe, it, expect, vi } from "vitest";
import {
  getVendorOpenings,
  getVendorOpeningDetails,
} from "../../src/controllers/vendor/vendorOpeningController.js";
import {
  getHiringManagerOpenings,
  getHiringManagerOpeningProfiles,
  shortlistProfile,
} from "../../src/controllers/hiring/hiringManagerController.js";
import prisma from "../../src/config/prisma/prisma.js";

// Mock Prisma
vi.mock("../../src/config/prisma/prisma.js", () => {
  return {
    default: {
      opening: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
      },
      hiringProfile: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      user: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(prisma)),
    },
  };
});

describe("Security, RBAC, and Tenant Isolation Unit Tests", () => {
  describe("Tenant Leakage Prevention", () => {
    it("should strictly filter vendor openings by tenantId", async () => {
      const mockReq: any = {
        user: {
          id: "vendor-user-1",
          role: "IT_VENDOR",
          tenant: { tenantId: "tenant-bruce-wayne" },
        },
        query: { page: "1", limit: "10" },
      };

      const mockRes: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      (prisma.opening.findMany as any).mockResolvedValueOnce([]);
      (prisma.opening.count as any).mockResolvedValueOnce(0);
      (prisma.user.findMany as any).mockResolvedValueOnce([]);

      await getVendorOpenings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(prisma.opening.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: "tenant-bruce-wayne",
          }),
        })
      );
    });

    it("should prevent vendor from seeing another vendor's uploaded candidate profiles", async () => {
      const mockReq: any = {
        user: {
          id: "vendor-alice",
          role: "IT_VENDOR",
          tenant: { tenantId: "tenant-bruce-wayne" },
        },
        params: { id: "opening-123" },
      };

      const mockRes: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      (prisma.opening.findFirst as any).mockResolvedValueOnce({
        id: "opening-123",
        tenantId: "tenant-bruce-wayne",
        title: "Senior Fullstack",
        hiringManagerId: "hm-bruce",
      });

      (prisma.user.findUnique as any).mockResolvedValueOnce({
        id: "hm-bruce",
        firstName: "Bruce",
        lastName: "Wayne",
      });

      (prisma.hiringProfile.findMany as any).mockResolvedValueOnce([
        {
          id: 1,
          s3Key: "tenant-bruce-wayne/opening-123/1234_resume_alice.pdf",
          submittedAt: new Date(),
          status: "SUBMITTED",
        },
      ]);

      await getVendorOpeningDetails(mockReq, mockRes);

      expect(prisma.hiringProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            openingId: "opening-123",
            uploadedBy: "vendor-alice", // Strictly scoped to vendor-alice
            isDeleted: false,
          }),
        })
      );

      // Verify that AI recommendation data is NOT leaked to vendor
      const responseData = mockRes.json.mock.calls[0][0];
      const uploadedProfile = responseData.uploadedProfiles[0];
      expect(uploadedProfile).not.toHaveProperty("recommended");
      expect(uploadedProfile).not.toHaveProperty("recommendationScore");
      expect(uploadedProfile).not.toHaveProperty("recommendationReason");
    });
  });

  describe("Hiring Manager Ownership Enforcement", () => {
    it("should deny access when hiring manager attempts to view another manager's opening profiles", async () => {
      const mockReq: any = {
        user: {
          id: "hiring-manager-clark",
          role: "HIRING_MANAGER",
        },
        params: { id: "opening-bruce-only" },
      };

      const mockRes: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      // Opening is managed by someone else (hm-bruce)
      (prisma.opening.findUnique as any).mockResolvedValueOnce({
        id: "opening-bruce-only",
        hiringManagerId: "hm-bruce",
        title: "Lead Architect",
      });

      await getHiringManagerOpeningProfiles(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Forbidden"),
        })
      );
    });

    it("should deny shortlisting when user is not the designated hiring manager for the opening", async () => {
      const mockReq: any = {
        user: {
          id: "unauthorized-hm",
          role: "HIRING_MANAGER",
        },
        params: { id: "42" },
      };

      const mockRes: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      (prisma.hiringProfile.findUnique as any).mockResolvedValueOnce({
        id: 42,
        isDeleted: false,
        opening: {
          id: "opening-bruce",
          hiringManagerId: "hm-bruce", // different manager!
        },
      });

      await shortlistProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Forbidden"),
        })
      );
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  presignVendorProfileUpload,
  uploadVendorProfiles,
} from "../../src/controllers/vendor/vendorOpeningController.js";
import {
  getHiringManagerOpeningProfiles,
  shortlistProfile,
} from "../../src/controllers/hiring/hiringManagerController.js";
import { AgentOrchestrator } from "../../src/services/ai/agentOrchestrator.js";
import prisma from "../../src/config/prisma/prisma.js";

import { Readable } from "stream";

// Mock AWS storage
vi.mock("../../src/services/storage/storageFactory.js", () => ({
  createStorageService: () => ({
    getUploadURL: vi.fn(async (key) => `https://s3.mock.aws/${key}`),
    putObject: vi.fn(async () => ({ message: "Success" })),
    getObjectURL: vi.fn(async (key) => `https://s3.mock.aws/preview/${key}`),
    getObjectStream: vi.fn(async () =>
      Readable.from([
        Buffer.from(
          "John Doe\n6 years experience.\nSkills: React, Node.js, TypeScript, PostgreSQL\nLocation: Remote"
        ),
      ])
    ),
  }),
}));

// Mock Prisma
const mockDb = {
  openings: [
    {
      id: "op-101",
      tenantId: "tenant-bruce-wayne",
      title: "Senior Full Stack Engineer",
      description: "React, Node.js, TypeScript, PostgreSQL",
      location: "Remote",
      contractType: "Full-Time 12 Months",
      experienceMin: 5,
      experienceMax: 8,
      hiringManagerId: "hm-bruce",
    },
  ],
  profiles: [] as any[],
};

vi.mock("../../src/config/prisma/prisma.js", () => {
  return {
    default: {
      opening: {
        findFirst: vi.fn(async ({ where }) => {
          return mockDb.openings.find((o) => o.id === where.id) || null;
        }),
        findUnique: vi.fn(async ({ where }) => {
          return mockDb.openings.find((o) => o.id === where.id) || null;
        }),
      },
      hiringProfile: {
        create: vi.fn(async ({ data }) => {
          const newProfile = {
            id: mockDb.profiles.length + 1,
            ...data,
            isDeleted: false,
            submittedAt: new Date(),
          };
          mockDb.profiles.push(newProfile);
          return newProfile;
        }),
        findMany: vi.fn(async ({ where }) => {
          return mockDb.profiles.filter(
            (p) => p.openingId === where.openingId && !p.isDeleted
          );
        }),
        findUnique: vi.fn(async ({ where }) => {
          const found = mockDb.profiles.find((p) => p.id === where.id);
          if (!found) return null;
          return {
            ...found,
            opening: mockDb.openings.find((o) => o.id === found.openingId),
          };
        }),
        update: vi.fn(async ({ where, data }) => {
          const idx = mockDb.profiles.findIndex((p) => p.id === where.id);
          if (idx !== -1) {
            mockDb.profiles[idx] = { ...mockDb.profiles[idx], ...data };
            return mockDb.profiles[idx];
          }
          return null;
        }),
      },
      $transaction: vi.fn(async (cb) => cb(prisma)),
    },
  };
});

describe("End-to-End Integration Flow: Upload -> Submit -> Recommend -> Shortlist", () => {
  beforeEach(() => {
    mockDb.profiles = [];
  });

  it("should complete the full lifecycle successfully", async () => {
    // -------------------------------------------------------------
    // Stage 1: Vendor presigns upload token
    // -------------------------------------------------------------
    const presignReq: any = {
      user: {
        id: "vendor-wayne-tech",
        role: "IT_VENDOR",
        tenant: { tenantId: "tenant-bruce-wayne" },
      },
      params: { id: "op-101" },
      body: { filenames: ["candidate_john_doe.pdf"] },
    };
    const presignRes: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await presignVendorProfileUpload(presignReq, presignRes);
    expect(presignRes.status).toHaveBeenCalledWith(200);
    const tokenResult = presignRes.json.mock.calls[0][0];
    expect(tokenResult.tokens).toHaveLength(1);
    expect(tokenResult.tokens[0].uploadEndpoint).toBe(
      "/api/v1/vendor/openings/op-101/profiles/upload"
    );

    // -------------------------------------------------------------
    // Stage 2: Vendor submits candidate profile via upload endpoint
    // -------------------------------------------------------------
    const uploadReq: any = {
      user: {
        id: "vendor-wayne-tech",
        role: "IT_VENDOR",
        tenant: { tenantId: "tenant-bruce-wayne" },
      },
      params: { id: "op-101" },
      files: [
        {
          originalname: "candidate_john_doe.pdf",
          buffer: Buffer.from("John Doe Resume with React and Node.js"),
          mimetype: "application/pdf",
        },
      ],
      body: {},
    };
    const uploadRes: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await uploadVendorProfiles(uploadReq, uploadRes);
    expect(uploadRes.status).toHaveBeenCalledWith(201);
    expect(mockDb.profiles).toHaveLength(1);
    const submittedProfile = mockDb.profiles[0];
    expect(submittedProfile.status).toBe("SUBMITTED");

    // -------------------------------------------------------------
    // Stage 3: AI Recommendation Agent evaluates the submitted profile
    // -------------------------------------------------------------
    const orchestrator = new AgentOrchestrator();
    const evaluation = await orchestrator.evaluateCandidate({
      profileId: submittedProfile.id,
      s3Key: submittedProfile.s3Key,
      resumeText: "John Doe\n6 years of experience in software development.\nSkills: React, Node.js, TypeScript, PostgreSQL.\nLocation: Remote.",
      opening: mockDb.openings[0],
    });

    // Score: 100% skills (0.5), experience 6 in [5,8] (0.3), Remote location (0.2) = 1.0 (>= 0.75 => Recommended)
    expect(evaluation.score).toBeGreaterThanOrEqual(0.75);
    expect(evaluation.recommended).toBe(true);
    expect(evaluation.latencyMs).toBeLessThan(2000);

    // Persist evaluation result to mock DB
    mockDb.profiles[0].recommended = evaluation.recommended;
    mockDb.profiles[0].recommendationScore = evaluation.score;
    mockDb.profiles[0].recommendationConfidence = evaluation.confidence;
    mockDb.profiles[0].recommendationReason = evaluation.reason;
    mockDb.profiles[0].recommendationLatencyMs = evaluation.latencyMs;

    // -------------------------------------------------------------
    // Stage 4: Hiring Manager views candidate profiles with AI badge
    // -------------------------------------------------------------
    const hmViewReq: any = {
      user: {
        id: "hm-bruce",
        role: "HIRING_MANAGER",
      },
      params: { id: "op-101" },
    };
    const hmViewRes: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await getHiringManagerOpeningProfiles(hmViewReq, hmViewRes);
    expect(hmViewRes.status).toHaveBeenCalledWith(200);
    const reviewData = hmViewRes.json.mock.calls[0][0];
    expect(reviewData.profiles).toHaveLength(1);
    const candidateCard = reviewData.profiles[0];
    expect(candidateCard.badge).toBe("Recommended");
    expect(candidateCard.score).toBeGreaterThanOrEqual(75);
    expect(candidateCard.explanation).toBeDefined();

    // -------------------------------------------------------------
    // Stage 5: Hiring Manager shortlists the candidate
    // -------------------------------------------------------------
    const shortlistReq: any = {
      user: {
        id: "hm-bruce",
        role: "HIRING_MANAGER",
      },
      params: { id: String(submittedProfile.id) },
    };
    const shortlistRes: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await shortlistProfile(shortlistReq, shortlistRes);
    expect(shortlistRes.status).toHaveBeenCalledWith(200);
    expect(mockDb.profiles[0].status).toBe("SHORTLISTED");
    expect(mockDb.profiles[0].shortlistedBy).toBe("hm-bruce");
  });
});

import type { Request, Response } from "express";
import prisma from "../../config/prisma/prisma.js";
import { createStorageService } from "../../services/storage/storageFactory.js";

/**
 * GET /api/v1/hiring-manager/openings
 * Strictly returns only openings belonging to the logged-in Hiring Manager.
 * Mandatory condition: opening.hiringManagerId === loggedInUser.id
 */
export async function getHiringManagerOpenings(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const tenantId = user?.tenant?.tenantId || user?.tenantId;

    if (!user || !user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const whereClause: any = {
      hiringManagerId: user.id,
      tenantId: tenantId ? tenantId : undefined,
    };

    const [openings, total] = await Promise.all([
      prisma.opening.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { postedDate: "desc" },
        include: {
          _count: {
            select: {
              hiringProfiles: {
                where: { isDeleted: false },
              },
            },
          },
        },
      }),
      prisma.opening.count({ where: whereClause }),
    ]);

    const formattedOpenings = openings.map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description,
      location: o.location,
      contractType: o.contractType,
      experienceMin: o.experienceMin,
      experienceMax: o.experienceMax,
      postedDate: o.postedDate,
      expectedCompletionDate: o.expectedCompletionDate,
      status: o.status,
      profilesCount: o._count.hiringProfiles,
    }));

    return res.status(200).json({
      data: formattedOpenings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("[getHiringManagerOpenings] Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * GET /api/v1/hiring-manager/openings/:id/profiles
 * Returns all non-deleted profiles submitted for this opening,
 * including full AI recommendation metrics.
 * Verifies opening belongs to the logged-in hiring manager.
 */
export async function getHiringManagerOpeningProfiles(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const { id: openingId } = req.params;

    const opening = await prisma.opening.findUnique({
      where: { id: openingId },
    });

    if (!opening) {
      return res.status(404).json({ message: "Opening not found" });
    }

    // Mandatory condition: opening.hiringManagerId === loggedInUser.id
    if (opening.hiringManagerId !== user.id) {
      return res.status(403).json({
        message: "Forbidden: You are not authorized to view openings managed by another hiring manager",
      });
    }

    const profiles = await prisma.hiringProfile.findMany({
      where: {
        openingId,
        isDeleted: false,
      },
      orderBy: { submittedAt: "desc" },
    });

    const formattedProfiles = profiles.map((p) => {
      // Determine badge category
      let badge: "Recommended" | "Borderline" | "Not Recommended" | "Pending" = "Pending";
      if (p.recommendationScore !== null && p.recommendationScore !== undefined) {
        if (p.recommendationScore >= 0.75) {
          badge = "Recommended";
        } else if (p.recommendationScore >= 0.5) {
          badge = "Borderline";
        } else {
          badge = "Not Recommended";
        }
      }

      const parts = p.s3Key.split("/");
      const lastPart = parts[parts.length - 1];
      const filename = lastPart.replace(/^\d+_/, "");

      return {
        id: p.id,
        filename,
        s3Key: p.s3Key,
        uploadedBy: p.uploadedBy,
        submittedAt: p.submittedAt,
        status: p.status,
        badge,
        recommended: p.recommended,
        score: p.recommendationScore !== null ? Math.round(p.recommendationScore * 100) : null,
        confidence: p.recommendationConfidence !== null ? Math.round(p.recommendationConfidence * 100) : null,
        explanation: p.recommendationReason,
        latencyMs: p.recommendationLatencyMs,
        version: p.recommendationVersion,
        shortlistedBy: p.shortlistedBy,
        shortlistedAt: p.shortlistedAt,
        rejectedBy: p.rejectedBy,
        rejectedAt: p.rejectedAt,
      };
    });

    return res.status(200).json({
      opening: {
        id: opening.id,
        title: opening.title,
        description: opening.description,
        location: opening.location,
        contractType: opening.contractType,
        experienceRange: {
          min: opening.experienceMin,
          max: opening.experienceMax,
        },
      },
      profiles: formattedProfiles,
    });
  } catch (error: any) {
    console.error("[getHiringManagerOpeningProfiles] Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * POST /api/v1/hiring-manager/profiles/:id/shortlist
 * Shortlists a candidate profile.
 */
export async function shortlistProfile(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const profileId = parseInt(req.params.id, 10);

    if (isNaN(profileId)) {
      return res.status(400).json({ message: "Invalid profile ID" });
    }

    const profile = await prisma.hiringProfile.findUnique({
      where: { id: profileId },
      include: { opening: true },
    });

    if (!profile || profile.isDeleted) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // Mandatory authorization check
    if (profile.opening.hiringManagerId !== user.id) {
      return res.status(403).json({
        message: "Forbidden: You can only shortlist candidates for your own openings",
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      return await tx.hiringProfile.update({
        where: { id: profileId },
        data: {
          status: "SHORTLISTED",
          shortlistedBy: user.id,
          shortlistedAt: new Date(),
          rejectedBy: null,
          rejectedAt: null,
        },
      });
    });

    return res.status(200).json({
      message: "Profile successfully shortlisted",
      profile: updated,
    });
  } catch (error: any) {
    console.error("[shortlistProfile] Error:", error);
    return res.status(500).json({ message: "Failed to shortlist profile" });
  }
}

/**
 * POST /api/v1/hiring-manager/profiles/:id/reject
 * Rejects a candidate profile.
 */
export async function rejectProfile(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const profileId = parseInt(req.params.id, 10);

    if (isNaN(profileId)) {
      return res.status(400).json({ message: "Invalid profile ID" });
    }

    const profile = await prisma.hiringProfile.findUnique({
      where: { id: profileId },
      include: { opening: true },
    });

    if (!profile || profile.isDeleted) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // Mandatory authorization check
    if (profile.opening.hiringManagerId !== user.id) {
      return res.status(403).json({
        message: "Forbidden: You can only reject candidates for your own openings",
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      return await tx.hiringProfile.update({
        where: { id: profileId },
        data: {
          status: "REJECTED",
          rejectedBy: user.id,
          rejectedAt: new Date(),
          shortlistedBy: null,
          shortlistedAt: null,
        },
      });
    });

    return res.status(200).json({
      message: "Profile successfully rejected",
      profile: updated,
    });
  } catch (error: any) {
    console.error("[rejectProfile] Error:", error);
    return res.status(500).json({ message: "Failed to reject profile" });
  }
}

/**
 * GET /api/v1/hiring-manager/profiles/:id/preview
 * Generates secure backend presigned download/view URL for hiring manager.
 */
export async function previewHiringProfile(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const profileId = parseInt(req.params.id, 10);

    if (isNaN(profileId)) {
      return res.status(400).json({ message: "Invalid profile ID" });
    }

    const profile = await prisma.hiringProfile.findUnique({
      where: { id: profileId },
      include: { opening: true },
    });

    if (!profile || profile.isDeleted) {
      return res.status(404).json({ message: "Profile not found" });
    }

    if (profile.opening.hiringManagerId !== user.id) {
      return res.status(403).json({ message: "Forbidden: Not your opening" });
    }

    const storageService = createStorageService();
    const previewUrl = await storageService.getObjectURL(profile.s3Key);

    return res.status(200).json({ previewUrl });
  } catch (error: any) {
    console.error("[previewHiringProfile] Error:", error);
    return res.status(500).json({ message: "Failed to generate preview URL" });
  }
}

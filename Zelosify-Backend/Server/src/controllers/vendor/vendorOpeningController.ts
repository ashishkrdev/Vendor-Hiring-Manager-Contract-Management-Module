import type { Request, Response } from "express";
import prisma from "../../config/prisma/prisma.js";
import { FilePresignService } from "../../services/upload/filePresignService.js";
import { createStorageService } from "../../services/storage/storageFactory.js";
import { triggerAsyncProfileEvaluation } from "../../services/ai/recommendationService.js";
import { sanitizeFilename } from "../../helpers/vendorRequestValidation.js";

const presignService = new FilePresignService();

/**
 * GET /api/v1/vendor/openings
 * Returns paginated openings strictly scoped to the IT Vendor's tenant.
 */
export async function getVendorOpenings(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const tenantId = user?.tenant?.tenantId || user?.tenantId;

    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context missing or unauthorized" });
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const statusFilter = (req.query.status as string) || "OPEN";
    const search = (req.query.search as string)?.trim();

    const whereClause: any = {
      tenantId,
      status: statusFilter as any,
    };

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
        { contractType: { contains: search, mode: "insensitive" } },
      ];
    }

    const [openings, total] = await Promise.all([
      prisma.opening.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { postedDate: "desc" },
      }),
      prisma.opening.count({ where: whereClause }),
    ]);

    // Fetch hiring manager names for display
    const hmIds = Array.from(new Set(openings.map((o) => o.hiringManagerId)));
    const hiringManagers = await prisma.user.findMany({
      where: { id: { in: hmIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const hmMap = new Map(
      hiringManagers.map((h) => [
        h.id,
        `${h.firstName || ""} ${h.lastName || ""}`.trim() || "Hiring Manager",
      ])
    );

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
      hiringManagerName: hmMap.get(o.hiringManagerId) || "Hiring Manager",
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
    console.error("[getVendorOpenings] Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * GET /api/v1/vendor/openings/:id
 * Returns opening details, hiring manager name, experience range,
 * profiles count and ONLY the vendor's own uploaded profiles (AI data strictly excluded).
 */
export async function getVendorOpeningDetails(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const tenantId = user?.tenant?.tenantId || user?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context missing" });
    }

    const opening = await prisma.opening.findFirst({
      where: { id, tenantId },
    });

    if (!opening) {
      return res.status(404).json({ message: "Opening not found" });
    }

    // Look up hiring manager
    const hiringManager = await prisma.user.findUnique({
      where: { id: opening.hiringManagerId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    const hiringManagerName = hiringManager
      ? `${hiringManager.firstName || ""} ${hiringManager.lastName || ""}`.trim() || "Hiring Manager"
      : "Hiring Manager";

    // Strictly fetch ONLY profiles uploaded by THIS vendor and not deleted
    const uploadedProfiles = await prisma.hiringProfile.findMany({
      where: {
        openingId: id,
        uploadedBy: user.id,
        isDeleted: false,
      },
      select: {
        id: true,
        s3Key: true,
        submittedAt: true,
        status: true,
        // STRICT RBAC: Do NOT include recommended, recommendationScore, recommendationReason
      },
      orderBy: { submittedAt: "desc" },
    });

    // Derive original filename from s3Key
    const sanitizedProfiles = uploadedProfiles.map((p) => {
      const parts = p.s3Key.split("/");
      const lastPart = parts[parts.length - 1];
      const filename = lastPart.replace(/^\d+_/, "");
      return {
        id: p.id,
        s3Key: p.s3Key,
        filename,
        submittedAt: p.submittedAt,
        status: p.status,
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
        postedDate: opening.postedDate,
        status: opening.status,
        hiringManagerName,
      },
      profilesCount: sanitizedProfiles.length,
      uploadedProfiles: sanitizedProfiles,
    });
  } catch (error: any) {
    console.error("[getVendorOpeningDetails] Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * POST /api/v1/vendor/openings/:id/profiles/presign
 * Generates encrypted presigned upload tokens.
 * Key format: <tenantId>/<openingId>/<timestamp>_<filename>
 */
export async function presignVendorProfileUpload(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const tenantId = user?.tenant?.tenantId || user?.tenantId;
    const { id: openingId } = req.params;
    const { filenames } = req.body;

    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context missing" });
    }

    if (!Array.isArray(filenames) || filenames.length === 0) {
      return res.status(400).json({ message: "filenames array is required" });
    }

    // Verify opening exists in tenant
    const opening = await prisma.opening.findFirst({
      where: { id: openingId, tenantId },
    });

    if (!opening) {
      return res.status(404).json({ message: "Opening not found" });
    }

    const tokens = await presignService.generateUploadTokens(filenames, {
      tenantId,
      uploadEndpoint: `/api/v1/vendor/openings/${openingId}/profiles/upload`,
      s3KeyConfig: {
        pathSegments: [tenantId, openingId],
        includeTimestamp: true,
      },
      customMetadata: {
        openingId,
        uploadedBy: user.id,
      },
    });

    return res.status(200).json({
      message: "Presigned upload tokens generated successfully",
      tokens,
    });
  } catch (error: any) {
    console.error("[presignVendorProfileUpload] Error:", error);
    return res.status(500).json({ message: "Failed to generate presigned upload URLs" });
  }
}

/**
 * POST /api/v1/vendor/openings/:id/profiles/upload
 * Submits candidate profiles. Writes to DB in Prisma transaction and
 * triggers automated background AI agent recommendation.
 */
export async function uploadVendorProfiles(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const tenantId = user?.tenant?.tenantId || user?.tenantId;
    const { id: openingId } = req.params;

    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context missing" });
    }

    const opening = await prisma.opening.findFirst({
      where: { id: openingId, tenantId },
    });

    if (!opening) {
      return res.status(404).json({ message: "Opening not found" });
    }

    const files = (req as any).files as Express.Multer.File[] | undefined;
    const itemsToCreate: Array<{ s3Key: string; filename: string }> = [];

    if (files && files.length > 0) {
      const storageService = createStorageService();

      for (const file of files) {
        const sanitized = sanitizeFilename(file.originalname);
        const timestamp = Date.now();
        const s3Key = `${tenantId}/${openingId}/${timestamp}_${sanitized}`;

        // Upload to S3
        await storageService.putObject(s3Key, file.buffer, file.mimetype);

        itemsToCreate.push({
          s3Key,
          filename: sanitized,
        });
      }
    } else if (req.body.profiles && Array.isArray(req.body.profiles)) {
      // Direct key submission from presigned upload flow
      for (const p of req.body.profiles) {
        if (p.s3Key) {
          itemsToCreate.push({
            s3Key: p.s3Key,
            filename: p.filename || p.s3Key.split("/").pop() || "candidate_profile",
          });
        }
      }
    } else {
      return res.status(400).json({ message: "No files or profile keys uploaded" });
    }

    if (itemsToCreate.length === 0) {
      return res.status(400).json({ message: "No valid profile files to save" });
    }

    // Prisma Transaction (Mandatory ACID requirement)
    const createdProfiles = await prisma.$transaction(async (tx) => {
      const saved = [];
      for (const item of itemsToCreate) {
        const created = await tx.hiringProfile.create({
          data: {
            openingId,
            s3Key: item.s3Key,
            uploadedBy: user.id,
            status: "SUBMITTED",
          },
        });
        saved.push(created);
      }
      return saved;
    });

    // Automatically trigger AI Recommendation Agent asynchronously on SUBMITTED
    for (const profile of createdProfiles) {
      triggerAsyncProfileEvaluation(profile.id);
    }

    return res.status(201).json({
      message: "Profiles submitted successfully. AI recommendation agent triggered.",
      profiles: createdProfiles.map((p) => ({
        id: p.id,
        s3Key: p.s3Key,
        status: p.status,
        submittedAt: p.submittedAt,
      })),
    });
  } catch (error: any) {
    console.error("[uploadVendorProfiles] Error:", error);
    return res.status(500).json({ message: "Failed to upload profiles", error: error.message });
  }
}

/**
 * DELETE /api/v1/vendor/profiles/:id
 * Soft deletes a candidate profile (isDeleted: true).
 */
export async function softDeleteVendorProfile(req: Request, res: Response) {
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

    // Only allow soft deletion of own uploaded profile
    if (profile.uploadedBy !== user.id) {
      return res.status(403).json({ message: "Cannot delete another vendor's profile" });
    }

    // Prisma transaction
    await prisma.$transaction(async (tx) => {
      await tx.hiringProfile.update({
        where: { id: profileId },
        data: { isDeleted: true },
      });
    });

    return res.status(200).json({ message: "Profile soft-deleted successfully" });
  } catch (error: any) {
    console.error("[softDeleteVendorProfile] Error:", error);
    return res.status(500).json({ message: "Failed to delete profile" });
  }
}

/**
 * GET /api/v1/vendor/profiles/:id/preview
 * Generates secure backend presigned download/view URL for profile file.
 */
export async function previewVendorProfile(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const profileId = parseInt(req.params.id, 10);

    if (isNaN(profileId)) {
      return res.status(400).json({ message: "Invalid profile ID" });
    }

    const profile = await prisma.hiringProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile || profile.isDeleted) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // Verify vendor owns this profile
    if (profile.uploadedBy !== user.id && user.role !== "HIRING_MANAGER") {
      return res.status(403).json({ message: "Unauthorized access to profile file" });
    }

    const storageService = createStorageService();
    const previewUrl = await storageService.getObjectURL(profile.s3Key);

    return res.status(200).json({ previewUrl });
  } catch (error: any) {
    console.error("[previewVendorProfile] Error:", error);
    return res.status(500).json({ message: "Failed to generate preview URL" });
  }
}

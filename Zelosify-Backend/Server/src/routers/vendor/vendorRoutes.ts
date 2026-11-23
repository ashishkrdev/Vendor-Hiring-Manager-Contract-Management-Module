import express, { type RequestHandler } from "express";
import vendorRequestRoutes from "./vendorRequestRoutes.js";
import { authenticateUser } from "../../middlewares/auth/authenticateMiddleware.js";
import { authorizeRole } from "../../middlewares/auth/authorizeMiddleware.js";
import { uploadConfig } from "../../config/multer/multerConfig.js";
import {
  getVendorOpenings,
  getVendorOpeningDetails,
  presignVendorProfileUpload,
  uploadVendorProfiles,
  softDeleteVendorProfile,
  previewVendorProfile,
} from "../../controllers/vendor/vendorOpeningController.js";

const router = express.Router();

// Existing requests router
router.use("/requests", vendorRequestRoutes);

/**
 * IT VENDOR CONTRACT MANAGEMENT ROUTES
 * Role: IT_VENDOR
 */

// 1. Fetch Openings
router.get(
  "/openings",
  authenticateUser as RequestHandler,
  authorizeRole("IT_VENDOR") as RequestHandler,
  (async (req, res, next) => {
    try {
      await getVendorOpenings(req, res);
    } catch (err) {
      next(err);
    }
  }) as RequestHandler
);

// 2. Fetch Opening Details
router.get(
  "/openings/:id",
  authenticateUser as RequestHandler,
  authorizeRole("IT_VENDOR") as RequestHandler,
  (async (req, res, next) => {
    try {
      await getVendorOpeningDetails(req, res);
    } catch (err) {
      next(err);
    }
  }) as RequestHandler
);

// 3. Presign Upload URLs
router.post(
  "/openings/:id/profiles/presign",
  authenticateUser as RequestHandler,
  authorizeRole("IT_VENDOR") as RequestHandler,
  (async (req, res, next) => {
    try {
      await presignVendorProfileUpload(req, res);
    } catch (err) {
      next(err);
    }
  }) as RequestHandler
);

// 4. Submit Profiles (Multer array upload supported)
router.post(
  "/openings/:id/profiles/upload",
  authenticateUser as RequestHandler,
  authorizeRole("IT_VENDOR") as RequestHandler,
  uploadConfig.array("files") as any,
  (async (req, res, next) => {
    try {
      await uploadVendorProfiles(req, res);
    } catch (err) {
      next(err);
    }
  }) as RequestHandler
);

// 5. Soft Delete Profile
router.delete(
  "/profiles/:id",
  authenticateUser as RequestHandler,
  authorizeRole("IT_VENDOR") as RequestHandler,
  (async (req, res, next) => {
    try {
      await softDeleteVendorProfile(req, res);
    } catch (err) {
      next(err);
    }
  }) as RequestHandler
);

// 6. Preview Candidate Profile File
router.get(
  "/profiles/:id/preview",
  authenticateUser as RequestHandler,
  authorizeRole("IT_VENDOR") as RequestHandler,
  (async (req, res, next) => {
    try {
      await previewVendorProfile(req, res);
    } catch (err) {
      next(err);
    }
  }) as RequestHandler
);

export default router;

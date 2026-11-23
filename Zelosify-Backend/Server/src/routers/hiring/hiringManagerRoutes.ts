import { Router, type RequestHandler } from "express";
import { authenticateUser } from "../../middlewares/auth/authenticateMiddleware.js";
import { authorizeRole } from "../../middlewares/auth/authorizeMiddleware.js";
import {
  getHiringManagerOpenings,
  getHiringManagerOpeningProfiles,
  shortlistProfile,
  rejectProfile,
  previewHiringProfile,
} from "../../controllers/hiring/hiringManagerController.js";

const router = Router();

/**
 * HIRING MANAGER CONTRACT MANAGEMENT ROUTES
 * Requires authentication and HIRING_MANAGER role
 */

// 1. Fetch own openings
router.get(
  "/openings",
  authenticateUser as RequestHandler,
  authorizeRole("HIRING_MANAGER") as RequestHandler,
  (async (req, res, next) => {
    try {
      await getHiringManagerOpenings(req, res);
    } catch (err) {
      next(err);
    }
  }) as RequestHandler
);

// 2. Fetch profiles for opening with AI recommendations
router.get(
  "/openings/:id/profiles",
  authenticateUser as RequestHandler,
  authorizeRole("HIRING_MANAGER") as RequestHandler,
  (async (req, res, next) => {
    try {
      await getHiringManagerOpeningProfiles(req, res);
    } catch (err) {
      next(err);
    }
  }) as RequestHandler
);

// 3. Shortlist candidate profile
router.post(
  "/profiles/:id/shortlist",
  authenticateUser as RequestHandler,
  authorizeRole("HIRING_MANAGER") as RequestHandler,
  (async (req, res, next) => {
    try {
      await shortlistProfile(req, res);
    } catch (err) {
      next(err);
    }
  }) as RequestHandler
);

// 4. Reject candidate profile
router.post(
  "/profiles/:id/reject",
  authenticateUser as RequestHandler,
  authorizeRole("HIRING_MANAGER") as RequestHandler,
  (async (req, res, next) => {
    try {
      await rejectProfile(req, res);
    } catch (err) {
      next(err);
    }
  }) as RequestHandler
);

// 5. Preview candidate profile file
router.get(
  "/profiles/:id/preview",
  authenticateUser as RequestHandler,
  authorizeRole("HIRING_MANAGER") as RequestHandler,
  (async (req, res, next) => {
    try {
      await previewHiringProfile(req, res);
    } catch (err) {
      next(err);
    }
  }) as RequestHandler
);

export default router;

import { Router } from "express";
import { generateBriefController } from "../../controllers/brief/generateBrief.js";
import { saveBriefController } from "../../controllers/brief/saveBrief.js";
import { listBriefsController } from "../../controllers/brief/listBriefs.js";
import { deleteBriefController } from "../../controllers/brief/deleteBrief.js";
import { toggleShareController } from "../../controllers/brief/toggleShare.js";
import { getPublicBriefController } from "../../controllers/brief/getPublicBrief.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";
import { explainBriefController } from "../../controllers/brief/explainBrief.js";

const briefRouter = Router();

// Protected routes
briefRouter.post("/generate", authenticateToken, generateBriefController);
briefRouter.post("/save", authenticateToken, saveBriefController);
briefRouter.get("/list", authenticateToken, listBriefsController);
briefRouter.delete("/:id", authenticateToken, deleteBriefController);
briefRouter.patch(
  "/:id/toggle-share",
  authenticateToken,
  toggleShareController,
);
briefRouter.post("/:id/explain", authenticateToken, explainBriefController);

// Public route — no auth
briefRouter.get("/public/:id", getPublicBriefController);

export default briefRouter;

import { generateBriefFromGroq } from "../../lib/groq.js";
import AppError from "../../utils/appError.js";

export const generateBriefController = async (req, res, next) => {
  try {
    const { idea } = req.body;

    if (!idea || typeof idea !== "string") {
      throw new AppError("VALIDATION_ERROR", 400, "Idea is required");
    }

    if (idea.trim().split(" ").length < 5) {
      throw new AppError(
        "VALIDATION_ERROR",
        400,
        "Please describe your idea in more detail",
      );
    }

    if (idea.length > 500) {
      throw new AppError(
        "VALIDATION_ERROR",
        400,
        "Idea must be under 500 characters",
      );
    }

    const result = await generateBriefFromGroq(idea.trim());

    return res.status(200).json({
      success: true,
      brief: result,
    });
  } catch (error) {
    console.log(error);

    if (error instanceof AppError) return next(error);
    return next(
      new AppError(
        "SERVER_ERROR",
        500,
        error.message || "Failed to generate brief",
      ),
    );
  }
};

import { supabase } from "../../db/client.js";
import AppError from "../../utils/appError.js";

export const getPublicBriefController = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new AppError("VALIDATION_ERROR", 400, "Brief ID is required");
    }

    const { data, error } = await supabase
      .from("briefs")
      .select(
        "id, title, idea, features, stack, timeline, questions, is_public, created_at",
      )
      .eq("id", id)
      .eq("is_public", true)
      .single();

    if (error || !data) {
      throw new AppError("NOT_FOUND", 404, "Brief not found or not public");
    }

    return res.status(200).json({
      success: true,
      brief: data,
    });
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError("SERVER_ERROR", 500, "Failed to fetch brief"));
  }
};

import { supabase } from "../../db/client.js";
import AppError from "../../utils/appError.js";

export const deleteBriefController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!id) {
      throw new AppError("VALIDATION_ERROR", 400, "Brief ID is required");
    }

    // Verify ownership before deleting
    const { data: existing, error: fetchError } = await supabase
      .from("briefs")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      throw new AppError("NOT_FOUND", 404, "Brief not found");
    }

    if (existing.user_id !== userId) {
      throw new AppError("FORBIDDEN", 403, "You do not own this brief");
    }

    const { error } = await supabase.from("briefs").delete().eq("id", id);

    if (error) {
      throw new AppError(
        "DATABASE_ERROR",
        500,
        "Failed to delete brief",
        error,
      );
    }

    return res.status(200).json({
      success: true,
      message: "Brief deleted successfully",
    });
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError("SERVER_ERROR", 500, "Failed to delete brief"));
  }
};

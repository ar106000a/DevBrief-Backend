import { supabase } from "../../db/client.js";
import AppError from "../../utils/appError.js";

export const listBriefsController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    // const userId = "63d4e4ac-2c7e-4f47-b8c4-565e5ad8ea9b";
    console.log(userId);
    if (userId == null) {
      throw new AppError(
        "VALIDATION ERROR",
        401,
        "User id isnt attatched with request",
      );
    }

    const { data, error } = await supabase
      .from("briefs")
      .select(
        "id, title, idea, features, stack, timeline, questions, is_public, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new AppError(
        "DATABASE_ERROR",
        500,
        "Failed to fetch briefs",
        error,
      );
    }

    return res.status(200).json({
      success: true,
      briefs: data,
    });
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(
      new AppError(
        "SERVER_ERROR",
        500,
        "Failed to fetch briefs",
        error.message,
      ),
    );
  }
};

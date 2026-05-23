import { supabase } from "../../db/client.js";
import AppError from "../../utils/appError.js";

export const getUserController = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("users")
      .select("id, email, username, avatar_url, created_at")
      .eq("id", userId)
      .single();

    if (error || !data) {
      throw new AppError("NOT_FOUND", 404, "User not found");
    }

    return res.status(200).json({
      success: true,
      user: data,
    });
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError("SERVER_ERROR", 500, "Failed to fetch user"));
  }
};

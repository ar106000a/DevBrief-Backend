import { supabase } from "../../db/client.js";
import AppError from "../../utils/appError.js";

export const updateUsernameController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { username } = req.body;

    if (!username) {
      throw new AppError("VALIDATION_ERROR", 400, "Username is required");
    }

    if (username.length < 3) {
      throw new AppError(
        "VALIDATION_ERROR",
        400,
        "Username must be at least 3 characters",
      );
    }

    // Check availability — exclude current user
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .neq("id", userId)
      .maybeSingle();

    if (existing) {
      throw new AppError("VALIDATION_ERROR", 409, "Username is not available");
    }

    const { data, error } = await supabase
      .from("users")
      .update({ username })
      .eq("id", userId)
      .select("id, email, username, avatar_url")
      .single();

    if (error) {
      throw new AppError("DATABASE_ERROR", 500, "Failed to update username");
    }

    return res.status(200).json({
      success: true,
      message: "Username updated successfully",
      user: data,
    });
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError("SERVER_ERROR", 500, "Failed to update username"));
  }
};

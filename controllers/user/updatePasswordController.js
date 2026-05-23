import { supabase } from "../../db/client.js";
import bcrypt from "bcryptjs";
import AppError from "../../utils/appError.js";

export const updatePasswordController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError(
        "VALIDATION_ERROR",
        400,
        "Both current and new password are required",
      );
    }

    if (newPassword.length < 8) {
      throw new AppError(
        "VALIDATION_ERROR",
        400,
        "New password must be at least 8 characters",
      );
    }

    if (currentPassword === newPassword) {
      throw new AppError(
        "VALIDATION_ERROR",
        400,
        "New password must be different from current",
      );
    }

    // Fetch current hash
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("password_hash")
      .eq("id", userId)
      .single();

    if (fetchError || !user) {
      throw new AppError("NOT_FOUND", 404, "User not found");
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      throw new AppError(
        "INVALID_CREDENTIALS",
        401,
        "Current password is incorrect",
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const { error: updateError } = await supabase
      .from("users")
      .update({ password_hash: hashedPassword })
      .eq("id", userId);

    if (updateError) {
      throw new AppError("DATABASE_ERROR", 500, "Failed to update password");
    }

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError("SERVER_ERROR", 500, "Failed to update password"));
  }
};

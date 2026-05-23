import { supabase } from "../../db/client.js";
import AppError from "../../utils/appError.js";
import bcrypt from "bcryptjs";

export const deleteAccountController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      throw new AppError(
        "VALIDATION_ERROR",
        400,
        "Password is required to delete account",
      );
    }

    // Verify password before deleting
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("password_hash")
      .eq("id", userId)
      .single();

    if (fetchError || !user) {
      throw new AppError("NOT_FOUND", 404, "User not found");
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new AppError("INVALID_CREDENTIALS", 401, "Incorrect password");
    }

    // Delete user — briefs cascade automatically
    const { error: deleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", userId);

    if (deleteError) {
      throw new AppError("DATABASE_ERROR", 500, "Failed to delete account");
    }

    // Clear cookies
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    return res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError("SERVER_ERROR", 500, "Failed to delete account"));
  }
};

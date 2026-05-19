import { supabase } from "../../db/client.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import AppError from "../../utils/appError.js"; // Import AppError

export const resetPasswordController = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { resetToken } = req.cookies;

    // Validation
    if (!password || !email) {
      throw new AppError(
        "VALIDATION_ERROR",
        400,
        "Password and Email are required to reset.",
      );
    }
    if (password.length < 8) {
      throw new AppError(
        "VALIDATION_ERROR",
        400,
        "Password must be at least 8 characters.",
      );
    }

    // Check for existing user
    const { data: existingUser, error: existingUserError } = await supabase
      .from("users")
      .select("id,email,password_hash")
      .eq("email", email)
      .single();

    if (existingUserError) {
      throw new AppError(
        "DATABASE_ERROR",
        500,
        "Failed fetch from database",
        existingUserError,
      );
    }

    if (!existingUser) {
      throw new AppError(
        "VALIDATION_ERROR",
        401,
        "No user with this email exists",
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_RESET_SECRET);
      // console.log(decoded);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        throw new AppError("VALIDATION_ERROR", 401, "Expired reset token", err);
      } else {
        throw new AppError(
          "VALIDATION_ERROR",
          401,
          "Invalid or malformed reset token",
          err,
        );
      }
    }

    if (decoded.id !== existingUser.id) {
      throw new AppError(
        "VALIDATION_ERROR",
        403,
        "The reset token doesn't belong to the user",
      );
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const { data, error } = await supabase
      .from("users")
      .update({ password_hash: hashedPassword })
      .eq("email", email)
      .select();

    if (error) {
      throw new AppError(
        "DATABASE_ERROR",
        500,
        "Failed updating the database.",
      );
    }
    if (!data) {
      throw new AppError(
        "DATABASE_ERROR",
        500,
        "Couldn't update the record, DB error",
      );
    }
    res.clearCookie("refreshToken", {
      sameSite: "none",
      httpOnly: true,
      secure: true,
      path: "/",
    });
    return res.status(200).json({
      success: true,
      message: "Password updated successfully! Please go to login again!",
    });
  } catch (err) {
    // console.error("Reset password error:", err);
    // Check if the error is an instance of AppError
    if (err instanceof AppError) {
      return next(err); // Pass the AppError directly to the error handler
    }
    // For unexpected errors, create a new AppError with a generic message
    return next(
      new AppError("SERVER_ERROR", 500, "Internal server error", err),
    );
  }
};

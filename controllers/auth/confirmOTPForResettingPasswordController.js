import { supabase } from "../../db/client.js";
import AppError from "../../utils/appError.js";
import { generateResetToken } from "../../utils/tokensGenerationForAuth.js";

export const confirmOTPForResettingPasswordController = async (
  req,
  res,
  next,
) => {
  const { email, otp } = req.body;

  try {
    // 1. Basic validation check for missing credentials
    if (!email || !otp) {
      throw new AppError(
        "VALIDATION_ERROR",
        400,
        "Email and OTP are required for checking",
      );
    }

    // 2. First query: Find the user by email
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    // Handle case where user is not found
    if (userError) {
      throw new AppError(
        "DATABASE_ERROR",
        500,
        "User lookup failed in the database",
      );
    }
    if (!userData) {
      throw new AppError(
        "VALIDATION_ERROR",
        404,
        "User is not found in the database!",
      );
    }

    // 3. Second query: Find the matching otp
    const { data: otpRecord, error: otpError } = await supabase
      .from("otps")
      .select("otp_code, expires_at")
      .eq("user_id", userData.id)
      .eq("otp_code", otp)
      .eq("purpose", "Password reset")
      .eq("used", false)
      .maybeSingle();

    // Handle errors from the OTP query or if no OTPs were found at all
    if (otpError) {
      throw new AppError(
        "DATABASE_ERROR",
        500,
        "OTP lookup failed in the db",
        otpError,
      );
    }
    if (!otpRecord) {
      throw new AppError("VALIDATION_ERROR", 400, "No such OTPs in record");
    }

    // 4. Check if the matching OTP has expired
    const expirationDate = new Date(otpRecord.expires_at);
    const now = new Date();
    const isExpired = now > expirationDate;

    if (isExpired) {
      throw new AppError(
        "VALIDATION_ERROR",
        401,
        "OTP has expired. Please try again!",
      );
    }

    // 5. If it's a valid and non-expired OTP, delete all old OTPs for that user
    // and then return success.
    let deleteFlag = "OTPs deleted for this user";
    const { error: deleteError } = await supabase
      .from("otps")
      .delete()
      .eq("user_id", userData.id)
      .eq("purpose", "Password reset");
    if (deleteError) {
      deleteFlag = "Failed deleting extra OTPs from db";
    }

    //signing a resetToken for resetting password
    const resetToken = generateResetToken(userData.id);

    //setting resetToken in a cookie
    res.cookie("resetToken", resetToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      path: "/",
      maxAge: 10 * 60 * 1000,
    });
    // Return success message regardless of deletion outcome

    return res.status(200).json({
      success: true,
      message: "OTP confirmed! Try resetting password now",
      deleteFlag: deleteFlag,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error); // Pass the AppError directly to the error handler
    }
    // For unexpected errors, create a new AppError with a generic message
    return next(
      new AppError(
        "SERVER_ERROR",
        500,
        "Server error during otp confirmation.",
        error,
      ),
    );
  }
};

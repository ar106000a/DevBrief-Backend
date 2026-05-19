import { supabase } from "../../db/client.js";
import FormatError from "../../utils/FormatError.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../utils/tokensGenerationForAuth.js";
import jwt from "jsonwebtoken";
import AppError from "../../utils/appError.js";

export const confirmEmailController = async (req, res, next) => {
  try {
    const { id, otp } = req.body;
    // Validation
    if (!id || !otp) {
      throw new AppError(
        "VALIDATION_ERROR",
        400,
        "User Id and otp are required",
      );
    }
    //checking the cookie with the request
    const { confirmEmailToken } = req.cookies;
    if (!confirmEmailToken) {
      throw new AppError(
        "VALIDATION_ERROR",
        400,
        "There is no confirm email token with the request",
      );
    }

    //Verifying the cookie in the request
    let decoded;
    try {
      decoded = jwt.verify(confirmEmailToken, process.env.JWT_CONFIRM_SECRET);
    } catch (err) {
      throw new AppError(
        "VALIDATION_ERROR",
        401,
        "The confirm email token is expired",
        err,
      );
    }
    //fetching user once and for all
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw new AppError("DATABASE_ERROR", 500, "Failed user profile lookup!");
    }
    //Authorize the user with token
    if (decoded.email != user.email) {
      throw new AppError(
        "VALIDATION_ERROR",
        401,
        "The request is unauthorized. The confirm email token doesnt belong to the current session!",
      );
    }

    // Check if OTP record for the given user ID is in the DB
    const { data: otpRecord, error: fetchError } = await supabase
      .from("otps")
      .select("user_id, otp_code, expires_at,used")
      .eq("user_id", id)
      .eq("otp_code", otp)
      .eq("used", false)
      .eq("purpose", "email_verification")
      .single();

    if (fetchError) {
      throw new AppError(
        "DATABASE_ERROR",
        500,
        "Error while fetching otp records!",
        fetchError,
      );
    }

    // Check if any OTP record exist
    if (!otpRecord) {
      throw new AppError(
        "VALIDATION_ERROR",
        401,
        "Invalid or Used otp recieved!",
      );
    }

    // Find the matching, non-expired, unused OTP record
    const now = new Date();
    const expiresAt = new Date(otpRecord.expires_at);
    if (!(expiresAt instanceof Date) || isNaN(expiresAt)) {
      throw new AppError(
        "VALIDATION_ERROR",
        400,
        "OTP expry timestamp invalid",
      );
    }
    const validOtp = expiresAt > now;

    if (validOtp) {
      // Update the otp's used status
      const { error: otpUpdateError } = await supabase
        .from("otps")
        .update({ used: true })
        .eq("user_id", id)
        .eq("otp_code", otpRecord.otp_code);

      if (otpUpdateError) {
        throw new AppError(
          "DATABASE_ERROR",
          500,
          "Faile dto update otp used status",
        );
      }

      // If a valid OTP is found, update the user's verification status
      const { error: updateError } = await supabase
        .from("users")
        .update({ is_verified: true })
        .eq("id", id);

      if (updateError) {
        throw new AppError(
          "DATABASE_ERROR",
          500,
          "Faile dto update user verification status",
          updateError,
        );
      }

      // Crucial Security Step: Delete all OTPs for this user to prevent replay attacks
      const { error: deleteError } = await supabase
        .from("otps")
        .delete()
        .eq("purpose", "email_verification")
        .eq("user_id", id);
      let deleteFlag = "OTPs deleted";
      if (deleteError) {
        // console.error("Failed to delete used OTPs:", deleteError);
        deleteFlag = "OTPs deletion failed!";
      }

      //clearing the cookie after verification
      res.clearCookie("confirmEmailToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
        path: "/",
      });

      //Deciding the response-flow
      const AUTH_FLOW = process.env.REGISTRATION_FLOW || "LOGIN";
      if (AUTH_FLOW === "LOGIN") {
        return res.status(200).json({
          message: "Email Confirmed Successfully. Please Log in again!",
          success: true,
          deleteFlag: deleteFlag,
        });
      } else {
        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken(user.id);
        res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "none",
          path: "/",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        // also set access token as httpOnly cookie
        res.cookie("accessToken", accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "none",
          path: "/",
          maxAge: 15 * 60 * 1000,
        });
        res.status(200).json({
          user: { id: user.id, email: user.email, username: user.username },
          success: true,
          message: "Successfully logged in the new user!",
          deleteFlag: deleteFlag,
        });
      }
    } else {
      // Expired OTP
      let errorMessage = "Expired OTP!";
      throw new AppError("VALIDATION_ERROR", 400, errorMessage);
    }
  } catch (error) {
    if (error instanceof AppError) {
      return next(error); // Pass the AppError directly to the error handler
    }
    // For unexpected errors, create a new AppError with a generic message
    return next(
      new AppError(
        "SERVER_ERROR",
        500,
        "Server error during email confirmation.",
        error,
      ),
    );
  }
};

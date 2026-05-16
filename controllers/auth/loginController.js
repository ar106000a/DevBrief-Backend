import { supabase } from "../../db/client.js";
import bcrypt from "bcryptjs";
import {
  generateAccessToken,
  generateRefreshToken,
  generateEmailToken,
} from "../../utils/tokensGenerationForAuth.js";
import AppError from "../../utils/appError.js";
import { generateOTP } from "../../utils/otpGeneration.js";
import { sendEmail } from "../../utils/mailer.js";

export const loginController = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      throw new AppError(
        "VALIDATION_ERROR",
        400,
        "Email/username and password are required",
      );
    }

    // ─── Step 1: determine if identifier is email or username ───
    const isEmail = identifier.includes("@");
    let user = null;

    if (isEmail) {
      // Try email first
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", identifier)
        .maybeSingle();

      if (error)
        throw new AppError("DATABASE_ERROR", 500, "Failed db lookup", error);
      user = data;
    } else {
      // Try username
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", identifier)
        .maybeSingle();

      if (error)
        throw new AppError("DATABASE_ERROR", 500, "Failed db lookup", error);
      user = data;
    }

    // ─── Step 2: user not found ──────────────────────────────────
    if (!user) {
      throw new AppError("INVALID_CREDENTIALS", 401, "Invalid credentials");
    }

    // ─── Step 3: password check ──────────────────────────────────
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new AppError("INVALID_CREDENTIALS", 401, "Invalid credentials");
    }

    // ─── Step 4: verified user → issue tokens ────────────────────
    if (user.is_verified) {
      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      // Set short-lived httpOnly access token cookie
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      return res.status(200).json({
        user: { id: user.id, email: user.email, username: user.username },
        accessToken,
        success: true,
      });
    }

    // ─── Step 5: unverified user → send OTP ─────────────────────
    const otp = generateOTP();

    try {
      await sendEmail({
        to: user.email,
        subject: "Your OTP",
        html: `<b>Your otp code is ${otp}</b>`,
      });
    } catch (error) {
      throw new AppError(
        "DATABASE_ERROR",
        500,
        "Couldn't send OTP to email",
        error,
      );
    }

    const { error: otpError } = await supabase
      .from("otps")
      .insert([{ user_id: user.id, otp_code: otp }])
      .select()
      .single();

    if (otpError) {
      throw new AppError("SERVER_ERROR", 500, "Error inserting OTP", otpError);
    }

    const confirmEmailToken = generateEmailToken(user.email);
    res.cookie("confirmEmailToken", confirmEmailToken, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 60 * 1000,
    });

    return res.status(200).json({
      user: { id: user.id, email: user.email, username: user.username },
      accessToken: null,
      success: true,
    });
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(
      new AppError("SERVER_ERROR", 500, "Internal Server Error", error),
    );
  }
};

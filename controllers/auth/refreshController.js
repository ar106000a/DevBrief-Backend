import { supabase } from "../../db/client.js";
import "dotenv/config";
import jwt from "jsonwebtoken";
import AppError from "../../utils/appError.js"; // Import AppError
import { generateAccessToken } from "../../utils/tokensGenerationForAuth.js";

export const refreshController = async (req, res, next) => {
  const { refreshToken } = req.cookies;
  try {
    // Check if refresh token is present

    if (!refreshToken) {
      throw new AppError("VALIDATION_ERROR", 400, "Refresh token required");
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      throw new AppError(
        "VALIDATION_ERROR",
        401,
        "Invalid refresh token",
        error,
      );
    }
    const SESSION_MAX_AGE_MILISECONDS =
      Number(process.env.SESSION_MAX_AGE_DAYS) * 24 * 60 * 60 * 1000;
    if (Date.now() - decoded.sessionStart > SESSION_MAX_AGE_MILISECONDS) {
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
        path: "/",
      });
      throw new AppError(
        "VALIDATION_ERROR",
        401,
        "Forced logout due to max session age hit, please login again",
      );
    }

    // Verify user still exists
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, username,is_verified")
      .eq("id", decoded.userId)
      .maybeSingle();

    if (error) {
      throw new AppError(
        "DATABASE_ERROR",
        500,
        "User lookup failed from db",
        error,
      );
    }
    if (!user) {
      throw new AppError("VALIDATION_ERROR", 401, "User not found");
    }
    if (!user.is_verified) {
      throw new AppError("VALIDATION_ERROR", 403, "User not authorized");
    }

    // Generate new access token
    const accessToken = generateAccessToken(user.id);
    // Set access token as httpOnly cookie so client JS doesn't need to read it
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    res.set("Cache-Control", "no-store");
    return res.status(200).json({
      user: { id: user.id, email: user.email, username: user.username },
      success: true,
      message: "New Access Token granted",
    });
  } catch (error) {
    // console.log("Refreshing error: ", error);
    if (error instanceof AppError) {
      return next(error);
    }
    return next(
      new AppError("SERVER_ERROR", 500, "Internal server error", error),
    );
  }
};

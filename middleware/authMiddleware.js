import jwt from "jsonwebtoken";
import FormatError from "../utils/FormatError.js";
import AppError from "../utils/appError.js";
// Auth middleware
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      throw new AppError(
        "VALIDATION_ERROR",
        401,
        "Access token is not present",
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (err) {
      // Logic for specific JWT errors
      const message =
        err.name === "TokenExpiredError" ? "Expired token" : "Invalid token";
      throw new AppError("VALIDATION_ERROR", 401, message, err);
    }

    req.user = { id: decoded.userId };
    next();
  } catch (error) {
    // Check if the error is an instance of AppError
    if (error instanceof AppError) {
      return next(error); // Pass the AppError directly to the error handler
    }
    // For unexpected errors, create a new AppError with a generic message
    return next(
      new AppError("SERVER_ERROR", 500, "Internal server error", error),
    );
  }
};

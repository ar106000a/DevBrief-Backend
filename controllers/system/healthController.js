import AppError from "../../utils/appError.js";
import { supabase } from "../../db/client.js";
export const healthCheck = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("briefs").select("*");
    if (error) {
      throw new AppError(
        "DATABASE_ERROR",
        500,
        "Could not connect to the database",
        error,
      );
    }
    res.status(200).json({ success: true, message: "db is alive" });
  } catch (err) {
    // console.log(err);
    if (err instanceof AppError) {
      return next(err);
    }
    return next(
      new AppError("SERVER_ERROR", 500, "Internal server error", err),
    );
  }
};

import { supabase } from "../../db/client.js";
import AppError from "../../utils/appError.js";

export const saveBriefController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { title, idea, features, stack, cost, team, timeline, questions } =
      req.body;

    if (!title || !idea || !features || !stack || !timeline || !questions) {
      throw new AppError(
        "VALIDATION_ERROR",
        400,
        "All brief fields are required",
      );
    }

    const { data, error } = await supabase
      .from("briefs")
      .insert([
        {
          user_id: userId,
          title,
          idea,
          features,
          stack,
          cost,
          team,
          timeline,
          questions,
          is_public: false,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new AppError("DATABASE_ERROR", 500, "Failed to save brief", error);
    }

    return res.status(201).json({
      success: true,
      message: "Brief saved successfully",
      brief: data,
    });
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError("SERVER_ERROR", 500, "Failed to save brief"));
  }
};

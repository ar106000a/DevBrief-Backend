import { supabase } from "../../db/client.js";
import AppError from "../../utils/appError.js";

export const updateAvatarController = async (req, res, next) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      throw new AppError("VALIDATION_ERROR", 400, "No image provided");
    }

    const fileExt = req.file.mimetype.split("/")[1];
    const fileName = `${userId}-${Date.now()}.${fileExt}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      throw new AppError(
        "SERVER_ERROR",
        500,
        "Failed to upload avatar",
        uploadError,
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    const avatarUrl = urlData.publicUrl;

    // Save to user record
    const { error: updateError } = await supabase
      .from("users")
      .update({ avatar_url: avatarUrl })
      .eq("id", userId);

    if (updateError) {
      throw new AppError("DATABASE_ERROR", 500, "Failed to save avatar URL");
    }

    return res.status(200).json({
      success: true,
      message: "Avatar updated successfully",
      avatar_url: avatarUrl,
    });
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError("SERVER_ERROR", 500, "Failed to update avatar"));
  }
};

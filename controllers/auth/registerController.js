import { supabase } from "../../db/client.js";
import { generateOTP } from "../../utils/otpGeneration.js";
import { sendEmail } from "../../utils/mailer.js";
import { generateEmailToken } from "../../utils/tokensGenerationForAuth.js";
import bcrypt from "bcryptjs";
import AppError from "../../utils/appError.js";

export const registerController = async (req, res, next) => {
  try {
    const { email, password, username } = req.body;

    // Validation
    if (!email || !password || !username) {
      throw new AppError("VALIDATION_ERROR", 400, "All fields are mandatory");
    }

    if (password.length < 8) {
      throw new AppError(
        "VALIDATION_ERROR",
        400,
        "Password must be at least 8 characters",
      );
    }

    //Getting the userData from database
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .or(`username.eq."${username}",email.eq."${email}"`);

    if (userError) {
      throw new AppError(
        "DATABASE_ERROR",
        501,
        "Could not check for username availability!",
        userError,
      );
    }

    //deciding the flow
    let usernameData = false;
    let existingUser = null;
    userData.forEach((row) => {
      if (row.username === username && row.email !== email) {
        usernameData = true;
      }
      if (row.email === email) {
        existingUser = row;
      }
    });

    //checking if username exists
    if (usernameData) {
      throw new AppError("VALIDATION_ERROR", 409, "Username is not available!");
    }

    //flow for existing verified user
    if (existingUser?.is_verified) {
      throw new AppError(
        "VALIDATION_ERROR",
        409,
        "Email already registered, please try logging in!",
      );
    }

    //otp generation
    let otp = generateOTP();
    // Inside your function...
    try {
      await sendEmail({
        to: email,
        subject: "Your OTP",
        html: `<b>Your otp code is ${otp}</b>`,
      });
      console.log("Email sent via API!");
    } catch (error) {
      console.error("Mail API Error:", error);
      throw new AppError(
        "DATABASE_ERROR",
        500,
        "couldnt send otp to mail",
        error,
      );
    }
    //hashing password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    let finalUser;
    let message;
    if (existingUser) {
      // Update the existing user record with the new OTP and any new data
      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update({
          username: username,
          password_hash: passwordHash,
          is_test_user: process.env.NODE_ENV !== "production",
        })
        .eq("email", email)
        .select()
        .single();

      if (updateError) {
        throw new AppError(
          "DATABASE_ERROR",
          500,
          "Failed to update unverified user",
          updateError,
        );
      }
      finalUser = updatedUser;
      message = "Registration pending verification. A new OTP has been sent.";
    } else {
      // Create a new user
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert([
          {
            email,
            username,
            password_hash: passwordHash,
            is_test_user: process.env.NODE_ENV !== "production",
          },
        ])
        .select("id, email, username, created_at")
        .single();

      if (createError) {
        throw new AppError(
          "DATABASE_ERROR",
          500,
          "Error while creating new user",
          createError,
        );
      }
      finalUser = newUser;
      message =
        "Registration successful. Please verify your email with the OTP sent.";
    }
    // Insert new OTP record for the updated user
    const { error: otpError } = await supabase
      .from("otps")
      .insert([{ user_id: finalUser.id, otp_code: otp }])
      .select()
      .single();

    if (otpError) {
      throw new AppError(
        "SERVER_ERROR",
        500,
        "Error while inserting OTP code",
        otpError,
      );
    }
    // Generate tokens
    const confirmEmailToken = generateEmailToken(finalUser.email);

    // Set confirmEmail token in HTTP-only cookie
    res.cookie("confirmEmailToken", confirmEmailToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:  "lax",
      maxAge: 10 * 60 * 1000, // 10 minutes
    });

    return res.status(existingUser ? 200 : 201).json({
      message: message,
      user: {
        id: finalUser.id,
        email: finalUser.email,
        username: finalUser.username,
      },
      success: true,
    });
  } catch (error) {
    // console.error("Registration error:", error);
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

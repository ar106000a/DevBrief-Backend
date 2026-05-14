import { supabase } from "../../db/client.js";
import AppError from "../../utils/appError.js";
import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

const groq = new Groq({ apiKey: process.env.VITE_GROQ_API_KEY });

const parseFeatures = (features) => {
  if (Array.isArray(features)) return features;
  if (typeof features !== "string") return [];

  try {
    return JSON.parse(features);
  } catch {
    return features
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
};

const buildBlueprintPrompt = (brief) => `
You are a world-class business consultant helping a non-technical founder understand their app idea deeply.

Write a Blueprint document for the following app idea. 
This document is for the FOUNDER ONLY — no technical jargon, no code, no stack mentions.
Write in warm, confident, clear business language. Use short paragraphs.

App idea: "${brief.idea}"
Core features: ${parseFeatures(brief.features).join(", ")}
Timeline: ${brief.timeline}

Write exactly these 8 sections with these exact headings:

THE VISION
2-3 sentences. What is this product and why does it matter? Make it inspiring.

THE PROBLEM
What pain point does this solve? Who feels this pain and how badly?

THE SOLUTION
How does this app solve the problem? Explain it like you're pitching to a friend.

HOW IT WORKS
Walk through the user journey step by step. What does a user do from the moment they open the app?

WHO IT'S FOR
Describe 2 specific user personas. Give each a name, a job, a frustration, and a goal.

THE OPPORTUNITY
Why is now the right time to build this? What makes this idea viable?

WHAT COULD GO WRONG
2-3 honest, non-technical risks the founder should be aware of.

THE FIRST 30 DAYS
Concrete next steps for the founder to move this from idea to reality.

Rules:
- No bullet points — write in flowing paragraphs
- No technical terms whatsoever
- Keep each section under 150 words
- Write as if you genuinely believe in this idea
- Return plain text only — no markdown, no asterisks, no special formatting
`;

export const explainBriefController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!id) {
      throw new AppError("VALIDATION_ERROR", 400, "Brief ID is required");
    }

    // Fetch brief and verify ownership
    const { data: brief, error: fetchError } = await supabase
      .from("briefs")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchError || !brief) {
      throw new AppError("NOT_FOUND", 404, "Brief not found");
    }

    // Return cached explanation if exists
    if (brief.explanation) {
      return res.status(200).json({
        success: true,
        explanation: brief.explanation,
        cached: true,
      });
    }

    // Generate via Groq
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.6,
      max_tokens: 2000,
      messages: [{ role: "user", content: buildBlueprintPrompt(brief) }],
    });

    const explanation = response.choices?.[0]?.message?.content;
    if (!explanation)
      throw new AppError("SERVER_ERROR", 500, "Empty response from AI");

    // Save to DB
    const { error: updateError } = await supabase
      .from("briefs")
      .update({ explanation })
      .eq("id", id);

    if (updateError) {
      throw new AppError("DATABASE_ERROR", 500, "Failed to save explanation");
    }

    return res.status(200).json({
      success: true,
      explanation,
      cached: false,
    });
  } catch (error) {
    console.log(error);
    if (error instanceof AppError) return next(error);
    return next(
      new AppError("SERVER_ERROR", 500, "Failed to generate Blueprint"),
    );
  }
};

import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

const groq = new Groq({ apiKey: process.env.VITE_GROQ_API_KEY });

const buildPrompt = (idea) => `
You are a senior software architect helping a non-technical founder scope their app idea.

Analyze the following app idea and return a structured JSON object.
Return ONLY valid JSON — no markdown, no backticks, no explanation.

App idea: "${idea}"

Return exactly this shape:
{
  "title": "6 words max summarizing the idea",
  "features": ["feature 1", "feature 2", "feature 3", "feature 4", "feature 5"],
  "stack": ["technology 1", "technology 2", "technology 3", "technology 4"],
  "timeline": "A realistic timeline estimate as a single string e.g. '3-4 weeks for MVP'",
  "cost": "A realistic cost range as a single string e.g. '$2,000 - $5,000'",
  "team": "Recommended team size and roles as a single string e.g. '2 developers — 1 frontend, 1 backend'",
  "questions": [
    "Question a developer would ask before starting",
    "Question about user roles or permissions",
    "Question about third-party integrations",
    "Question about monetization or payments",
    "Question about scale or expected users"
  ]
}

Rules:
- features: exactly 5 specific, actionable features
- stack: exactly 4 technologies appropriate for the idea
- timeline: honest, based on a small team of 1-2 developers
- cost: realistic freelance market rates in USD, give a range not a fixed number
- team: recommend the minimum viable team to ship the MVP
- questions: exactly 5 questions that reveal hidden complexity
- title: plain English, no jargon
`;

export const generateBriefFromGroq = async (idea) => {
  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: 0.4,
    max_tokens: 1000,
    messages: [{ role: "user", content: buildPrompt(idea) }],
  });

  const raw = response.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Empty response from AI");

  let parsed;
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    throw new Error("AI returned malformed response");
  }

  if (
    !parsed.title ||
    !Array.isArray(parsed.features) ||
    !Array.isArray(parsed.stack) ||
    !parsed.timeline ||
    !parsed.cost ||
    !parsed.team ||
    !Array.isArray(parsed.questions)
  ) {
    throw new Error("AI response was incomplete");
  }

  return {
    title: parsed.title,
    features: parsed.features.slice(0, 5),
    stack: parsed.stack.slice(0, 4),
    timeline: parsed.timeline,
    cost: parsed.cost,
    team: parsed.team,
    questions: parsed.questions.slice(0, 5),
  };
};

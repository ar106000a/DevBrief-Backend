import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoute from "./routes/auth/index.js";
import { authenticateToken } from "./middleware/authMiddleware.js";
import protectedRoutes from "./routes/protectedRoutes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import helmet from "helmet";
import systemRoutes from "./routes/system/index.js";
import briefRouter from "./routes/brief/brief.js";

export const app = express();
app.set("trust proxy", 1);

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow any origin when credentials: true by reflecting it back
      callback(null, origin || "*");
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(helmet());
app.get("/", (req, res) => res.status(200).send("OK"));
app.get("/test-safari", (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Safari Cookie Test</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      padding: 20px;
      border-radius: 8px;
    }
    button {
      display: block;
      width: 100%;
      padding: 12px;
      margin: 10px 0;
      font-size: 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      background: #007AFF;
      color: white;
    }
    button:hover { background: #0051D5; }
    .result {
      margin-top: 20px;
      padding: 15px;
      background: #f9f9f9;
      border: 1px solid #ddd;
      border-radius: 6px;
      white-space: pre-wrap;
      word-break: break-all;
      font-size: 12px;
      font-family: monospace;
    }
    .error { background: #ffebee; border-color: #ef5350; color: #c62828; }
    .success { background: #e8f5e9; border-color: #66bb6a; color: #2e7d32; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Safari Cookie Test</h1>
    <button onclick="testGetCookie()">Test 1: GET /api/auth/test-cookie</button>
    <button onclick="testDebugGet()">Test 2: GET /api/auth/debug</button>
    <button onclick="testDebugPost()">Test 3: POST /api/auth/debug-post (with credentials)</button>
    <div id="result"></div>
  </div>
  <script>
    const API_URL = 'https://devbrief-backend.onrender.com';
    function showResult(text, isError = false) {
      const div = document.getElementById('result');
      div.textContent = text;
      div.className = 'result ' + (isError ? 'error' : 'success');
    }
    async function testGetCookie() {
      try {
        const res = await fetch(\`\${API_URL}/api/auth/test-cookie\`);
        const data = await res.json();
        showResult(JSON.stringify(data, null, 2), false);
      } catch (err) {
        showResult('Error: ' + err.message, true);
      }
    }
    async function testDebugGet() {
      try {
        const res = await fetch(\`\${API_URL}/api/auth/debug\`);
        const data = await res.json();
        showResult(JSON.stringify(data, null, 2), false);
      } catch (err) {
        showResult('Error: ' + err.message, true);
      }
    }
    async function testDebugPost() {
      try {
        const res = await fetch(\`\${API_URL}/api/auth/debug-post\`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        showResult(JSON.stringify(data, null, 2), false);
      } catch (err) {
        showResult('Error: ' + err.message, true);
      }
    }
  </script>
</body>
</html>`);
});
app.use("/api/auth", authRoute);
app.get("/api/auth/debug", (req, res) => {
  res.json({
    success: true,
    cookies: req.cookies,
    origin: req.headers.origin,
    host: req.headers.host,
  });
});
app.post("/api/auth/debug-post", (req, res) => {
  console.log("DEBUG-POST called:", {
    cookies: req.cookies,
    hasRefreshToken: !!req.cookies.refreshToken,
    origin: req.headers.origin,
    method: req.method,
  });
  res.json({
    success: true,
    message: "POST debug endpoint",
    cookies: req.cookies,
    hasRefreshToken: !!req.cookies.refreshToken,
    origin: req.headers.origin,
    host: req.headers.host,
    method: req.method,
  });
});
app.get("/api/auth/test-cookie", (req, res) => {
  res.cookie("safariTest", "ok", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
    path: "/",
    maxAge: 10 * 1000,
  });
  res.json({
    success: true,
    message: "Test cookie sent",
    origin: req.headers.origin,
    host: req.headers.host,
  });
});
app.use("/system", systemRoutes);
app.use("/api/brief", briefRouter);
app.use("/app/brief", briefRouter);
app.use("/app", authenticateToken, protectedRoutes);
app.use(errorHandler);

export default app;

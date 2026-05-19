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
// app.use(
//   cors({
//     origin: process.env.ORIGIN,
//     credentials: true,
//   }),
// );

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(helmet());
app.get("/", (req, res) => res.status(200).send("OK"));
app.use("/api/auth", authRoute);
app.get("/api/auth/debug", (req, res) => {
  res.json({
    success: true,
    cookies: req.cookies,
    origin: req.headers.origin,
    host: req.headers.host,
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

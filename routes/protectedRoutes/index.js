import { Router } from "express";
import getProfileRoute from "./getProfileRoute.js";
import briefRouter from "../brief/brief.js";
const protectedRoutes = Router();

protectedRoutes.use("/", getProfileRoute);
export default protectedRoutes;

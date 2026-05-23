import { Router } from "express";
import { getProfileController } from "../../controllers/protectedRoutes/getProfileController.js";
const getProfileRoute = Router();

getProfileRoute.post("/getProfile", getProfileController);
export default getProfileRoute;

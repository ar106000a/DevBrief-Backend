import { Router } from "express";
import { getUserController } from "../../controllers/user/getUserController.js";
import { updateUsernameController } from "../../controllers/user/updateUsernameController.js";
import { updatePasswordController } from "../../controllers/user/updatePasswordController.js";
import { updateAvatarController } from "../../controllers/user/updateAvatarController.js";
import { deleteAccountController } from "../../controllers/user/deleteAccountController.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";
import multer from "multer";

const userRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images are allowed"));
  },
});

userRouter.get("/me", authenticateToken, getUserController);
userRouter.patch("/username", authenticateToken, updateUsernameController);
userRouter.patch("/password", authenticateToken, updatePasswordController);
userRouter.patch(
  "/avatar",
  authenticateToken,
  upload.single("avatar"),
  updateAvatarController,
);
userRouter.delete("/delete", authenticateToken, deleteAccountController);

export default userRouter;

export const logoutController = async (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
  });
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
    timeStamp: new Date().toISOString(),
  });
};

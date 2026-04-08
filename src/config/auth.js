import jwt from "jsonwebtoken";

const DEV_SECRET = "development-only-change-me";

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production.");
  }

  if (!secret && process.env.NODE_ENV !== "test") {
    console.warn("JWT_SECRET is not set. Using a development-only secret.");
  }

  return secret || DEV_SECRET;
};

export const signAdminToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      username: user.username,
      role: "admin",
    },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" },
  );

export const verifyAdminToken = (token) => jwt.verify(token, getJwtSecret());

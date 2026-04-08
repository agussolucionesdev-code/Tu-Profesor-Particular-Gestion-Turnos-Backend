import { verifyAdminToken } from "../config/auth.js";

export const requireAdmin = (req, res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      success: false,
      message: "Acceso no autorizado.",
    });
  }

  try {
    req.user = verifyAdminToken(token);
    return next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Sesion vencida o invalida.",
    });
  }
};

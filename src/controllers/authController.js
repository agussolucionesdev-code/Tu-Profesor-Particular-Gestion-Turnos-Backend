import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { signAdminToken } from "../config/auth.js";

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Por favor, proporciona el usuario y la contrasena.",
      });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const user = await User.findOne({ username: normalizedUsername });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Credenciales invalidas.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Credenciales invalidas.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Autenticacion exitosa. Bienvenido al panel.",
      token: signAdminToken(user),
      user: {
        username: user.username,
      },
    });
  } catch (error) {
    console.error(`[Auth Error] Login failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor. Intentalo nuevamente.",
    });
  }
};

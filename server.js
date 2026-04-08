/**
 * server.js
 * Main entry point - Port listener and DB initialization
 * Punto de entrada principal - Listener del puerto e inicio de DB
 */

import "dotenv/config"; // Carga las variables del .env automáticamente
import app from "./src/app.js"; // Importamos la app ya configurada
import connectDB from "./src/config/db.js"; // Importamos la conexión a la DB
import { ensureConfiguredAdmin } from "./src/config/adminSeed.js";

const PORT = process.env.PORT || 3000;

/**
 * launch
 * Starts the database and then the server
 * Inicia la base de datos y luego el servidor
 */
const launch = async () => {
  try {
    // 1. Conectamos a MongoDB
    await connectDB();
    await ensureConfiguredAdmin();

    // 2. Encendemos el servidor usando la 'app' que viene de src/app.js
    app.listen(PORT, () => {
      console.log("==================================================");
      console.log(`🚀 AGUSTIN SOSA API - PRO SYSTEM ONLINE`);
      console.log(`📡 PORT: ${PORT}`);
      console.log(`🔗 HEALTH: http://localhost:${PORT}/health`);
      console.log("==================================================");
    });
  } catch (error) {
    console.error("❌ CRITICAL ERROR during launch:", error.message);
    process.exit(1);
  }
};

launch();

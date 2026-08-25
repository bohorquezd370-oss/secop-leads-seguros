import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import express from "express";
import cors from "cors";
import { procesosRouter } from "./modules/procesos/procesos.routes.js";
import { errorHandler } from "./middlewares/error-handler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5190" }));
app.use(express.json());

app.use("/api/procesos", procesosRouter);

// En producción, el build del frontend se copia a "public" (ver root package.json) y este
// mismo servicio lo sirve — evita desplegar/mantener dos servicios separados.
const publicDir = path.join(__dirname, "..", "public");
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });
}

app.use(errorHandler);

const port = Number(process.env.PORT ?? 4100);
app.listen(port, () => console.log(`Dashboard API escuchando en http://localhost:${port}`));

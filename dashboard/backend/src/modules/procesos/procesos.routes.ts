import { Router } from "express";
import * as procesosController from "./procesos.controller.js";

export const procesosRouter = Router();

// "/cupo-diario" debe registrarse antes de "/:id" — si no, Express interpreta "cupo-diario"
// como un valor de :id y nunca llega a este handler.
procesosRouter.get("/cupo-diario", procesosController.cupoDiario);
procesosRouter.get("/", procesosController.listar);
procesosRouter.get("/:id", procesosController.obtener);
procesosRouter.post("/", procesosController.crear);
procesosRouter.post("/depurar", procesosController.depurar);
procesosRouter.patch("/:id/estado-comercial", procesosController.actualizarEstadoComercial);
procesosRouter.patch("/:id/notas", procesosController.actualizarNotas);
procesosRouter.patch("/:id/contacto", procesosController.actualizarContacto);
procesosRouter.delete("/:id", procesosController.eliminar);

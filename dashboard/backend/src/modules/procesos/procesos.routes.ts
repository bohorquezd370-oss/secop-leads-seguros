import { Router } from "express";
import * as procesosController from "./procesos.controller.js";

export const procesosRouter = Router();

procesosRouter.get("/", procesosController.listar);
procesosRouter.get("/:id", procesosController.obtener);
procesosRouter.post("/", procesosController.crear);
procesosRouter.patch("/:id/estado-comercial", procesosController.actualizarEstadoComercial);
procesosRouter.patch("/:id/notas", procesosController.actualizarNotas);
procesosRouter.patch("/:id/contacto", procesosController.actualizarContacto);

import type { Request, Response, NextFunction } from "express";
import {
  ActualizarContactoSchema,
  ActualizarEstadoComercialSchema,
  ActualizarNotasSchema,
  CrearProcesoSchema,
} from "./procesos.schema.js";
import * as procesosService from "./procesos.service.js";

export async function listar(req: Request, res: Response, next: NextFunction) {
  try {
    const { estadoSecop, estadoComercial, desde, hasta } = req.query;
    res.json(
      await procesosService.listarProcesos({
        estadoSecop: typeof estadoSecop === "string" ? estadoSecop : undefined,
        estadoComercial: typeof estadoComercial === "string" ? estadoComercial : undefined,
        desde: typeof desde === "string" ? desde : undefined,
        hasta: typeof hasta === "string" ? hasta : undefined,
      })
    );
  } catch (err) {
    next(err);
  }
}

export async function obtener(req: Request, res: Response, next: NextFunction) {
  try {
    const proceso = await procesosService.obtenerProceso(req.params.id);
    if (!proceso) return res.status(404).json({ error: "Proceso no encontrado" });
    res.json(proceso);
  } catch (err) {
    next(err);
  }
}

export async function crear(req: Request, res: Response, next: NextFunction) {
  try {
    const datos = CrearProcesoSchema.parse(req.body);
    res.status(201).json(await procesosService.crearProceso(datos));
  } catch (err) {
    next(err);
  }
}

export async function actualizarEstadoComercial(req: Request, res: Response, next: NextFunction) {
  try {
    const datos = ActualizarEstadoComercialSchema.parse(req.body);
    res.json(await procesosService.actualizarEstadoComercial(req.params.id, datos));
  } catch (err) {
    next(err);
  }
}

export async function actualizarNotas(req: Request, res: Response, next: NextFunction) {
  try {
    const datos = ActualizarNotasSchema.parse(req.body);
    res.json(await procesosService.actualizarNotas(req.params.id, datos));
  } catch (err) {
    next(err);
  }
}

export async function actualizarContacto(req: Request, res: Response, next: NextFunction) {
  try {
    const datos = ActualizarContactoSchema.parse(req.body);
    res.json(await procesosService.actualizarContacto(req.params.id, datos));
  } catch (err) {
    next(err);
  }
}

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
    const resultado = await procesosService.crearProceso(datos);
    if (!resultado) {
      return res.status(409).json({ error: "Cupo diario de leads nuevos alcanzado" });
    }
    res.status(201).json(resultado);
  } catch (err) {
    next(err);
  }
}

export async function cupoDiario(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await procesosService.obtenerCupoDiario());
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

export async function depurar(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await procesosService.depurarSinSeguimiento());
  } catch (err) {
    next(err);
  }
}

export async function eliminar(req: Request, res: Response, next: NextFunction) {
  try {
    await procesosService.eliminarProceso(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

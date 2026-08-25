import { prisma } from "../../config/prisma.js";
import { z } from "zod";
import type {
  ActualizarContactoSchema,
  ActualizarEstadoComercialSchema,
  ActualizarNotasSchema,
  CrearProcesoSchema,
} from "./procesos.schema.js";

type CrearProcesoInput = z.infer<typeof CrearProcesoSchema>;
type ActualizarEstadoComercialInput = z.infer<typeof ActualizarEstadoComercialSchema>;
type ActualizarNotasInput = z.infer<typeof ActualizarNotasSchema>;
type ActualizarContactoInput = z.infer<typeof ActualizarContactoSchema>;

export interface FiltrosProcesos {
  estadoSecop?: string;
  estadoComercial?: string;
  desde?: string;
  hasta?: string;
}

export function listarProcesos(filtros: FiltrosProcesos = {}) {
  return prisma.proceso.findMany({
    where: {
      estadoSecop: filtros.estadoSecop || undefined,
      estadoComercial: filtros.estadoComercial || undefined,
      ...(filtros.desde || filtros.hasta
        ? {
            createdAt: {
              gte: filtros.desde ? new Date(filtros.desde) : undefined,
              lte: filtros.hasta ? new Date(filtros.hasta) : undefined,
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export function obtenerProceso(id: string) {
  return prisma.proceso.findUnique({ where: { id } });
}

// "celebrado" siempre es más avanzado que "adjudicado" — el upsert nunca hace retroceder el
// estado, aunque el Scout vuelva a enviar un registro más viejo del dataset de Procesos tras
// haber visto ya el contrato firmado en el dataset de Contratos Electrónicos.
const RANGO_ESTADO: Record<string, number> = { adjudicado: 1, celebrado: 2 };

export async function crearProceso(datos: CrearProcesoInput) {
  const existente = await prisma.proceso.findUnique({ where: { idProceso: datos.idProceso } });

  if (existente && RANGO_ESTADO[datos.estadoSecop] < RANGO_ESTADO[existente.estadoSecop]) {
    // No pisar un estado más avanzado con uno más viejo — sí se permite completar campos
    // nuevos que vengan vacíos en el existente (ej. representanteLegalNombre).
    datos = { ...datos, estadoSecop: existente.estadoSecop as CrearProcesoInput["estadoSecop"] };
  }

  // correoContacto es una SUGERENCIA del Scout (dataset público de contacto) — solo se aplica
  // si el proceso es nuevo o el campo sigue vacío. Si el equipo comercial ya lo completó o
  // corrigió a mano, el Scout nunca lo pisa en corridas siguientes. telefonoContacto y
  // direccionContacto son 100% manuales — el Scout jamás los envía.
  if (existente?.correoContacto) {
    datos = { ...datos, correoContacto: existente.correoContacto };
  }

  // estadoComercial y notasComerciales son dominio exclusivo del humano — el Scout nunca los toca.
  return prisma.proceso.upsert({
    where: { idProceso: datos.idProceso },
    update: datos,
    create: datos,
  });
}

export function actualizarEstadoComercial(id: string, datos: ActualizarEstadoComercialInput) {
  return prisma.proceso.update({ where: { id }, data: datos });
}

export function actualizarNotas(id: string, datos: ActualizarNotasInput) {
  return prisma.proceso.update({ where: { id }, data: datos });
}

// El contacto lo escribe a mano el equipo comercial (no hay scraper — ver CLAUDE.md sobre por
// qué RUES público no sirve para esto).
export function actualizarContacto(id: string, datos: ActualizarContactoInput) {
  return prisma.proceso.update({ where: { id }, data: { ...datos, contactoActualizadoEn: new Date() } });
}

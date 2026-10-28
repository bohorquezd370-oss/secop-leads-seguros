import { prisma } from "../../config/prisma.js";
import { z } from "zod";
import type {
  ActualizarContactoSchema,
  ActualizarEstadoComercialSchema,
  ActualizarNotasSchema,
  CrearProcesoSchema,
} from "./procesos.schema.js";
import { enviarCorreo } from "../../config/email.js";
import { construirCorreoInicial, construirCorreoRecordatorio } from "./procesos.marketing.js";

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

// "hasta" debe cubrir el día completo en hora Bogotá, no cortar a medianoche UTC (Bogotá es
// UTC-5 todo el año, sin horario de verano) — por eso se usa como límite EXCLUSIVO del día
// siguiente (00:00 Bogotá del día después de "hasta"), igual lógica que inicioDiaBogota() más
// abajo para "hoy". Filtra por createdAt (cuándo el proceso entró al tablero), no por la fecha
// real de adjudicación/firma — pedido del usuario (2026-10-27), ver también el orden por
// createdAt desc: los procesos más nuevos quedan primero en vez de ordenarse por urgencia.
function inicioDiaBogotaDe(fechaYYYYMMDD: string): Date {
  return new Date(`${fechaYYYYMMDD}T05:00:00.000Z`); // 00:00 Bogotá = 05:00 UTC
}

export function listarProcesos(filtros: FiltrosProcesos = {}) {
  const desde = filtros.desde ? inicioDiaBogotaDe(filtros.desde) : undefined;
  const hasta = filtros.hasta
    ? new Date(inicioDiaBogotaDe(filtros.hasta).getTime() + 24 * 60 * 60 * 1000)
    : undefined;

  return prisma.proceso.findMany({
    where: {
      estadoSecop: filtros.estadoSecop || undefined,
      estadoComercial: filtros.estadoComercial || undefined,
      ...(desde || hasta ? { createdAt: { gte: desde, lt: hasta } } : {}),
    },
    // Más nuevos primero — pedido del usuario (2026-10-27). El dashboard ya no reordena esto
    // por urgencia (ver ProcesosTable.tsx), así que este orden es el que ve el usuario final.
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

// Tope de leads NUEVOS por día — SOLO aplica a "celebrado" (2026-10-27, pedido del usuario:
// "adjudicado" ya no tiene ningún límite, entran TODOS los que se adjudiquen cada día). Tiene
// sentido con la estrategia de pólizas de cumplimiento: "adjudicado" es la ventana real de
// venta (ver CLAUDE.md), así que nunca se descarta un candidato ahí solo por volumen;
// "celebrado" sigue siendo de baja prioridad y mantiene el cupo para no inflar el tablero con
// procesos que probablemente ya consiguieron póliza con alguien más. Solo cuenta contra esto
// un idProceso que no existía todavía; actualizar uno ya creado nunca consume cupo. Se reinicia
// a medianoche hora de Bogotá.
const CUPO_DIARIO_LEADS = Number(process.env.CUPO_DIARIO_LEADS ?? 80);

function inicioDiaBogota(): Date {
  // "en-CA" da YYYY-MM-DD de hoy en hora Bogotá — igual que ya se hace en otras fechas del
  // scout (ver scout/src/client.ts, fechaBogota).
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
  return inicioDiaBogotaDe(hoy);
}

export async function obtenerCupoDiario() {
  const inicio = inicioDiaBogota();
  // creadosHoy: total del día (adjudicados + celebrados), solo informativo para el stat del
  // dashboard. cupoDisponible: se calcula SOLO sobre "celebrado" — es lo único que el cupo
  // sigue limitando (ver comentario de CUPO_DIARIO_LEADS arriba).
  const [creadosHoy, celebradosHoy] = await Promise.all([
    prisma.proceso.count({ where: { createdAt: { gte: inicio } } }),
    prisma.proceso.count({ where: { createdAt: { gte: inicio }, estadoSecop: "celebrado" } }),
  ]);
  return {
    creadosHoy,
    cupoMaximo: CUPO_DIARIO_LEADS,
    cupoDisponible: Math.max(0, CUPO_DIARIO_LEADS - celebradosHoy),
  };
}

export async function crearProceso(datos: CrearProcesoInput) {
  const existente = await prisma.proceso.findUnique({ where: { idProceso: datos.idProceso } });

  // El cupo diario ya NO aplica a "adjudicado" — solo a "celebrado" (ver CUPO_DIARIO_LEADS).
  if (!existente && datos.estadoSecop === "celebrado") {
    const { cupoDisponible } = await obtenerCupoDiario();
    if (cupoDisponible <= 0) return null;
  }

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

export function eliminarProceso(id: string) {
  return prisma.proceso.delete({ where: { id } });
}

// Días sin ningún tipo de seguimiento comercial antes de descartar un lead automáticamente —
// pedido del usuario (2026-09-09): que el tablero no se llene de procesos abandonados.
const DIAS_SIN_SEGUIMIENTO = Number(process.env.DIAS_SIN_SEGUIMIENTO ?? 3);

// "Sin seguimiento" = nunca se tocó el estado comercial (sigue en "nuevo"), nunca se escribió
// una nota, y nunca se guardó contacto a mano — sin importar si el Scout le sugirió un correo
// automáticamente, eso no cuenta como gestión humana. Se llama desde el Scout en cada corrida
// (ver scout/src/index.ts), igual que el patrón de depuración de secop-agentes.
export async function depurarSinSeguimiento() {
  const limite = new Date(Date.now() - DIAS_SIN_SEGUIMIENTO * 24 * 60 * 60 * 1000);
  const { count } = await prisma.proceso.deleteMany({
    where: {
      estadoComercial: "nuevo",
      notasComerciales: null,
      contactoActualizadoEn: null,
      createdAt: { lt: limite },
    },
  });
  return { eliminados: count, diasSinSeguimiento: DIAS_SIN_SEGUIMIENTO };
}

// Horas de espera antes del recordatorio — ver docs/estrategia-email-marketing.md (una sola
// campaña corta, no una secuencia larga, porque la ventana real de venta son pocos días).
const HORAS_RECORDATORIO_MARKETING = Number(process.env.HORAS_RECORDATORIO_MARKETING ?? 30);

// Se llama desde el Scout en cada corrida (ver scout/src/index.ts), después de insertar los
// procesos nuevos. Solo dispara para "adjudicado" — "celebrado" casi siempre ya consiguió
// póliza con alguien más (ver comentario al inicio de CLAUDE.md sobre pólizas de cumplimiento).
export async function enviarMarketing() {
  let inicialesEnviados = 0;
  let recordatoriosEnviados = 0;
  let simulados = 0;

  const pendientesInicial = await prisma.proceso.findMany({
    where: { estadoSecop: "adjudicado", correoContacto: { not: null }, correoMarketingEnviadoEn: null },
  });
  for (const proceso of pendientesInicial) {
    const { asunto, cuerpo } = construirCorreoInicial(proceso);
    const { simulado } = await enviarCorreo(proceso.correoContacto!, asunto, cuerpo);
    await prisma.proceso.update({ where: { id: proceso.id }, data: { correoMarketingEnviadoEn: new Date() } });
    inicialesEnviados++;
    if (simulado) simulados++;
  }

  // Recordatorio: ya pasaron HORAS_RECORDATORIO_MARKETING desde el correo inicial, no se ha
  // mandado recordatorio todavía, y el proceso sigue en "nuevo" — si el equipo comercial ya
  // cambió el estado, alguien ya lo está gestionando y no hace falta insistir por correo.
  const limite = new Date(Date.now() - HORAS_RECORDATORIO_MARKETING * 60 * 60 * 1000);
  const pendientesRecordatorio = await prisma.proceso.findMany({
    where: {
      estadoSecop: "adjudicado",
      correoContacto: { not: null },
      correoMarketingEnviadoEn: { lt: limite },
      correoMarketingRecordatorioEn: null,
      estadoComercial: "nuevo",
    },
  });
  for (const proceso of pendientesRecordatorio) {
    const { asunto, cuerpo } = construirCorreoRecordatorio(proceso);
    const { simulado } = await enviarCorreo(proceso.correoContacto!, asunto, cuerpo);
    await prisma.proceso.update({ where: { id: proceso.id }, data: { correoMarketingRecordatorioEn: new Date() } });
    recordatoriosEnviados++;
    if (simulado) simulados++;
  }

  return { inicialesEnviados, recordatoriosEnviados, simulados };
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

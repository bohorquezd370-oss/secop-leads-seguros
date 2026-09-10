import type { Proceso } from "../types/proceso";

// En mínima cuantía la garantía/póliza de cumplimiento normalmente se aporta ANTES de firmar
// el contrato — así que "adjudicado" (recién ganó, todavía sin póliza) es la ventana real de
// venta, y "celebrado" casi siempre significa que ya consiguió la póliza con alguien más
// (decisión del usuario, 2026-09-10). 3 días es una estimación general de mínima cuantía, no
// un plazo exacto — varía según el pliego de cada proceso.
const DIAS_VENTANA_SUSCRIPCION = 3;

// Días que quedan (estimado) para que el adjudicatario deba tener la póliza — null si no
// aplica (celebrado, o adjudicado sin fecha). Puede ser negativo: la ventana ya se estima
// vencida, pero el proceso sigue mostrándose por si el pliego dio más plazo del estimado.
export function diasRestantesSuscripcion(proceso: Proceso): number | null {
  if (proceso.estadoSecop !== "adjudicado" || !proceso.fechaAdjudicacion) return null;
  const diasTranscurridos = (Date.now() - new Date(proceso.fechaAdjudicacion).getTime()) / (1000 * 60 * 60 * 24);
  return Math.ceil(DIAS_VENTANA_SUSCRIPCION - diasTranscurridos);
}

export type NivelUrgencia = "vencido" | "critico" | "atencion" | "normal" | "baja";

export function nivelUrgencia(proceso: Proceso): NivelUrgencia {
  const dias = diasRestantesSuscripcion(proceso);
  if (dias === null) return "baja"; // celebrado: ya probablemente no se puede vender
  if (dias < 0) return "vencido";
  if (dias <= 1) return "critico";
  if (dias === 2) return "atencion";
  return "normal";
}

export const ETIQUETA_URGENCIA: Record<NivelUrgencia, string> = {
  critico: "Contactar hoy",
  atencion: "Quedan 2 días",
  normal: "Recién adjudicado",
  vencido: "Ventana vencida",
  baja: "Baja prioridad",
};

export const COLOR_URGENCIA: Record<NivelUrgencia, string> = {
  critico: "bg-red-100 text-red-700",
  atencion: "bg-amber-100 text-amber-700",
  normal: "bg-sky-100 text-sky-700",
  vencido: "bg-zinc-100 text-zinc-500",
  baja: "bg-zinc-50 text-zinc-400",
};

// Orden de prioridad para trabajar la lista: adjudicados primero (los más urgentes arriba),
// celebrados al final. Dentro de "adjudicado", menos días restantes = más arriba.
const ORDEN_NIVEL: Record<NivelUrgencia, number> = { critico: 0, atencion: 1, normal: 2, vencido: 3, baja: 4 };

export function compararPorUrgencia(a: Proceso, b: Proceso): number {
  const nivelA = ORDEN_NIVEL[nivelUrgencia(a)];
  const nivelB = ORDEN_NIVEL[nivelUrgencia(b)];
  if (nivelA !== nivelB) return nivelA - nivelB;
  const diasA = diasRestantesSuscripcion(a);
  const diasB = diasRestantesSuscripcion(b);
  if (diasA !== null && diasB !== null && diasA !== diasB) return diasA - diasB;
  return (b.valor ?? 0) - (a.valor ?? 0);
}

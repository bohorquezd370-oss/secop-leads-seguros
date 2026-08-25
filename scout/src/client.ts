import { ProcesoAdjudicadoSchema, ContratoSchema, type ProcesoAdjudicado, type Contrato, type PerfilLeads } from "./types.js";

const DATASET_PROCESOS = "p6dx-8zbt";
const DATASET_CONTRATOS = "jbjy-vk9h";
const BASE_URL = "https://www.datos.gov.co/resource";

// Estados de estado_contrato que NO representan un contrato ya celebrado/firmado —
// verificado en vivo contra la API real (2026-08-24, ver CLAUDE.md).
const ESTADOS_CONTRATO_NO_CELEBRADOS = ["Borrador", "Cancelado", "enviado Proveedor", "En aprobación"];

function escaparLiteral(valor: string): string {
  return valor.replace(/'/g, "''");
}

// Fecha YYYY-MM-DD en zona horaria de Colombia, desplazada N días (negativo = hacia atrás).
function fechaBogota(diasDesdeHoy: number): string {
  const fecha = new Date(Date.now() + diasDesdeHoy * 24 * 60 * 60 * 1000);
  return fecha.toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
}

function condicionModalidad(modalidades: string[]): string {
  return "(" + modalidades.map((m) => `modalidad_de_contratacion = '${escaparLiteral(m)}'`).join(" OR ") + ")";
}

export interface BuscarOpciones {
  limite?: number;
  appToken?: string;
}

// Procesos con adjudicado='Si' en los últimos N días (fecha_adjudicacion) — estado "adjudicado".
export async function buscarAdjudicados(
  perfil: PerfilLeads,
  opciones: BuscarOpciones = {}
): Promise<ProcesoAdjudicado[]> {
  const desde = fechaBogota(-perfil.diasHaciaAtras);
  const where = [
    "adjudicado = 'Si'",
    condicionModalidad(perfil.modalidades),
    `fecha_adjudicacion >= '${desde}'`,
  ].join(" AND ");

  const params = new URLSearchParams({
    $where: where,
    $limit: String(opciones.limite ?? 200),
    $order: "fecha_adjudicacion DESC",
  });

  const headers: Record<string, string> = {};
  if (opciones.appToken) headers["X-App-Token"] = opciones.appToken;

  const res = await fetch(`${BASE_URL}/${DATASET_PROCESOS}.json?${params.toString()}`, { headers });
  if (!res.ok) throw new Error(`Datos Abiertos (procesos) respondió ${res.status}: ${await res.text()}`);

  return ProcesoAdjudicadoSchema.array().parse(await res.json());
}

// Contratos ya firmados en los últimos N días (fecha_de_firma), excluyendo los estados que no
// representan un contrato celebrado (borrador, cancelado, etc.) — estado "celebrado".
export async function buscarCelebrados(perfil: PerfilLeads, opciones: BuscarOpciones = {}): Promise<Contrato[]> {
  const desde = fechaBogota(-perfil.diasHaciaAtras);
  const condicionEstado = ESTADOS_CONTRATO_NO_CELEBRADOS.map(
    (e) => `estado_contrato != '${escaparLiteral(e)}'`
  ).join(" AND ");

  const where = [
    condicionModalidad(perfil.modalidades),
    `fecha_de_firma >= '${desde}'`,
    condicionEstado,
  ].join(" AND ");

  const params = new URLSearchParams({
    $where: where,
    $limit: String(opciones.limite ?? 200),
    $order: "fecha_de_firma DESC",
  });

  const headers: Record<string, string> = {};
  if (opciones.appToken) headers["X-App-Token"] = opciones.appToken;

  const res = await fetch(`${BASE_URL}/${DATASET_CONTRATOS}.json?${params.toString()}`, { headers });
  if (!res.ok) throw new Error(`Datos Abiertos (contratos) respondió ${res.status}: ${await res.text()}`);

  return ContratoSchema.array().parse(await res.json());
}

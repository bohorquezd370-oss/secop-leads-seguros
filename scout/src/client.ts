import {
  ProcesoAdjudicadoSchema,
  ContratoSchema,
  ContactoProveedorSchema,
  type ProcesoAdjudicado,
  type Contrato,
  type ContactoProveedor,
  type PerfilLeads,
} from "./types.js";

const DATASET_PROCESOS = "p6dx-8zbt";
const DATASET_CONTRATOS = "jbjy-vk9h";
const DATASET_CONTACTOS = "4ex9-j3n8";
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

const TAMANO_LOTE_CONTACTOS = 50;

// Correo/sitio web público del proveedor por NIT — dataset "SECOP II - Contacto Entidades y
// Proveedores" (4ex9-j3n8), sin login ni captcha (verificado en vivo 2026-08-25, ver
// CLAUDE.md). Se consulta en lotes (IN (...)) para no hacer una petición por proveedor.
export async function buscarContactosProveedores(
  nits: string[],
  opciones: BuscarOpciones = {}
): Promise<Map<string, ContactoProveedor>> {
  const headers: Record<string, string> = {};
  if (opciones.appToken) headers["X-App-Token"] = opciones.appToken;

  const mapa = new Map<string, ContactoProveedor>();
  const nitsUnicos = [...new Set(nits)];

  for (let i = 0; i < nitsUnicos.length; i += TAMANO_LOTE_CONTACTOS) {
    const lote = nitsUnicos.slice(i, i + TAMANO_LOTE_CONTACTOS);
    const listaNits = lote.map((nit) => `'${escaparLiteral(nit)}'`).join(",");
    const params = new URLSearchParams({
      $where: `nit_entidad IN (${listaNits})`,
      $limit: String(lote.length),
    });

    const res = await fetch(`${BASE_URL}/${DATASET_CONTACTOS}.json?${params.toString()}`, { headers });
    if (!res.ok) throw new Error(`Datos Abiertos (contactos) respondió ${res.status}: ${await res.text()}`);

    for (const c of ContactoProveedorSchema.array().parse(await res.json())) {
      mapa.set(c.nit_entidad, c);
    }
  }

  return mapa;
}

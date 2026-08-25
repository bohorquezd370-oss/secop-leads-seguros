import { buscarAdjudicados, buscarCelebrados } from "./client.js";
import type { Contrato, PerfilLeads, ProcesoAdjudicado } from "./types.js";

const DASHBOARD_URL = process.env.DASHBOARD_URL ?? "http://localhost:4100";

// Perfil confirmado por el usuario (2026-08-24): general (sin filtro de objeto/palabra clave),
// solo mínima cuantía, últimos 3 días — ver CLAUDE.md.
const perfil: PerfilLeads = {
  modalidades: ["Mínima cuantía"],
  diasHaciaAtras: 3,
};

// Datos Abiertos usa placeholders como "No Definido" / "No definido" / "Sin Descripcion" en
// vez de dejar el campo vacío — verificado en vivo (2026-08-24) contra procesos y contratos
// reales recientes. Sin este filtro, esos textos terminarían guardados como si fueran datos
// reales (o, peor, usados para armar un link de RUES con NIT "No Definido").
const PLACEHOLDERS_VACIOS = new Set(["no definido", "sin descripcion", "sin descripción", "no aplica"]);

function limpio(valor: string | undefined): string | undefined {
  if (!valor) return undefined;
  return PLACEHOLDERS_VACIOS.has(valor.trim().toLowerCase()) ? undefined : valor;
}

function soloDigitos(nit: string | undefined): string | undefined {
  const limpiado = limpio(nit);
  return limpiado?.replace(/[^0-9]/g, "") || undefined;
}

// La búsqueda de RUES no acepta el NIT por query param (verificado en vivo, 2026-08-24) — el
// link siempre apunta a la página de búsqueda avanzada, y el humano escribe el NIT ahí. RUES
// público tampoco expone teléfono/correo en ningún resultado (solo lo vende en su certificado
// de pago), así que este link es solo para confirmar el NIT/estado de la matrícula — el
// teléfono/correo del prospecto se gestiona manualmente desde el dashboard (ver
// ProcesoDetail.tsx, sección "Contacto").
const URL_BUSQUEDA_RUES = "https://www.rues.org.co/busqueda-avanzada";

function urlRues(nit: string | undefined): string | undefined {
  return soloDigitos(nit) ? URL_BUSQUEDA_RUES : undefined;
}

function normalizarAdjudicado(p: ProcesoAdjudicado) {
  const proveedorNit = limpio(p.nit_del_proveedor_adjudicado);
  return {
    idProceso: p.id_del_proceso,
    entidad: p.entidad ?? "Desconocida",
    nitEntidad: limpio(p.nit_entidad),
    departamentoEntidad: limpio(p.departamento_entidad),
    ciudadEntidad: limpio(p.ciudad_entidad),
    objeto: p.nombre_del_procedimiento || p.descripci_n_del_procedimiento || "Sin objeto especificado",
    modalidad: limpio(p.modalidad_de_contratacion),
    tipoContrato: limpio(p.tipo_de_contrato),
    estadoSecop: "adjudicado" as const,
    valor: p.valor_total_adjudicacion ? parseFloat(p.valor_total_adjudicacion) : p.precio_base ? parseFloat(p.precio_base) : undefined,
    fechaAdjudicacion: p.fecha_adjudicacion,
    proveedorNombre: limpio(p.nombre_del_proveedor),
    proveedorNit,
    proveedorDepartamento: limpio(p.departamento_proveedor),
    proveedorCiudad: limpio(p.ciudad_proveedor),
    urlProceso: p.urlproceso?.url,
    urlRues: urlRues(proveedorNit),
  };
}

function normalizarCelebrado(c: Contrato) {
  const proveedorNit = limpio(c.documento_proveedor);
  return {
    // proceso_de_compra liga este contrato con el mismo proceso que puede haber llegado antes
    // como "adjudicado" desde el otro dataset — si falta, se usa el id del contrato.
    idProceso: c.proceso_de_compra ?? c.id_contrato,
    entidad: c.nombre_entidad ?? "Desconocida",
    departamentoEntidad: limpio(c.departamento),
    ciudadEntidad: limpio(c.ciudad),
    objeto: c.objeto_del_contrato || c.descripcion_del_proceso || "Sin objeto especificado",
    modalidad: limpio(c.modalidad_de_contratacion),
    tipoContrato: limpio(c.tipo_de_contrato),
    estadoSecop: "celebrado" as const,
    valor: c.valor_del_contrato ? parseFloat(c.valor_del_contrato) : undefined,
    fechaFirma: c.fecha_de_firma,
    proveedorNombre: limpio(c.proveedor_adjudicado),
    proveedorNit,
    representanteLegalNombre: limpio(c.nombre_representante_legal),
    representanteLegalDireccion: limpio(c.domicilio_representante_legal),
    urlProceso: c.urlproceso?.url,
    urlRues: urlRues(proveedorNit),
  };
}

async function enviarAlDashboard(datos: Record<string, unknown>): Promise<boolean> {
  const res = await fetch(`${DASHBOARD_URL}/api/procesos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  return res.ok;
}

const adjudicados = await buscarAdjudicados(perfil);
const celebrados = await buscarCelebrados(perfil);
console.log(`Adjudicados encontrados: ${adjudicados.length} · Celebrados encontrados: ${celebrados.length}`);

let enviados = 0;
let fallidos = 0;

// Los adjudicados se envían antes que los celebrados: si un mismo proceso está en ambos
// lotes, el backend nunca deja que "celebrado" retroceda a "adjudicado" (ver
// procesos.service.ts), así que el orden solo importa para que el log sea legible.
for (const p of adjudicados) {
  const ok = await enviarAlDashboard(normalizarAdjudicado(p));
  ok ? enviados++ : fallidos++;
  console.log(`  ${ok ? "✓" : "✗"} [adjudicado] [${p.id_del_proceso}] ${p.nombre_del_procedimiento?.slice(0, 60)}`);
}

for (const c of celebrados) {
  const ok = await enviarAlDashboard(normalizarCelebrado(c));
  ok ? enviados++ : fallidos++;
  console.log(`  ${ok ? "✓" : "✗"} [celebrado] [${c.id_contrato}] ${c.objeto_del_contrato?.slice(0, 60)}`);
}

console.log(`\nResumen: ${enviados} enviados/actualizados, ${fallidos} fallidos.`);

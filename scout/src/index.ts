import { buscarAdjudicados, buscarCelebrados, buscarContactosProveedores } from "./client.js";
import type { ContactoProveedor, Contrato, PerfilLeads, ProcesoAdjudicado } from "./types.js";

const DASHBOARD_URL = process.env.DASHBOARD_URL ?? "http://localhost:4100";

// Perfil confirmado por el usuario: general (sin filtro de objeto/palabra clave), solo mínima
// cuantía, últimos 3 días, valor mínimo $20.000.000 (2026-08-26: procesos más pequeños no
// justifican el trabajo de captación al detalle) — ver CLAUDE.md.
const perfil: PerfilLeads = {
  modalidades: ["Mínima cuantía"],
  diasHaciaAtras: 3,
  valorMinimo: 20_000_000,
};

// Tope de leads NUEVOS por día (2026-08-26, pedido del usuario: 80/día para poder trabajar
// cada uno al detalle) — lo hace cumplir el backend (ver crearProceso en
// procesos.service.ts), nunca bloquea actualizar un proceso que ya existía.

// Datos Abiertos usa placeholders como "No Definido" / "No definido" / "Sin Descripcion" / "No
// Provisto" en vez de dejar el campo vacío — verificado en vivo (2026-08-24/25) contra
// procesos, contratos y contactos reales. Sin este filtro, esos textos terminarían guardados
// como si fueran datos reales (o, peor, usados para armar un link de RUES con NIT "No Definido").
const PLACEHOLDERS_VACIOS = new Set([
  "no definido",
  "sin descripcion",
  "sin descripción",
  "no aplica",
  "no provisto",
]);

function limpio(valor: string | undefined): string | undefined {
  if (!valor) return undefined;
  return PLACEHOLDERS_VACIOS.has(valor.trim().toLowerCase()) ? undefined : valor;
}

function soloDigitos(nit: string | undefined): string | undefined {
  const limpiado = limpio(nit);
  return limpiado?.replace(/[^0-9]/g, "") || undefined;
}

// La búsqueda de RUES no acepta el NIT por query param (verificado en vivo, 2026-08-24) — el
// link siempre apunta a la página de búsqueda avanzada (el dashboard copia el NIT al
// portapapeles al abrirlo). RUES público tampoco expone teléfono/correo en ningún resultado
// (solo lo vende en su certificado de pago) — por eso el correo/sitio web viene de un dataset
// distinto (ver buscarContactosProveedores más abajo), y el teléfono queda como el único dato
// que el equipo comercial sigue completando a mano.
const URL_BUSQUEDA_RUES = "https://www.rues.org.co/busqueda-avanzada";

function urlRues(nit: string | undefined): string | undefined {
  return soloDigitos(nit) ? URL_BUSQUEDA_RUES : undefined;
}

// Prioriza el correo corporativo sobre el del representante legal; ambos vienen del dataset
// público "SECOP II - Contacto Entidades y Proveedores" (ver client.ts) — sin login, sin captcha.
function mejorCorreo(contacto: ContactoProveedor | undefined): string | undefined {
  return limpio(contacto?.correo_electronico) ?? limpio(contacto?.correo_representante_legal);
}

function sitioWeb(contacto: ContactoProveedor | undefined): string | undefined {
  return limpio(contacto?.website);
}

function normalizarAdjudicado(p: ProcesoAdjudicado, contactos: Map<string, ContactoProveedor>) {
  const proveedorNit = limpio(p.nit_del_proveedor_adjudicado);
  const contacto = proveedorNit ? contactos.get(proveedorNit) : undefined;
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
    correoContacto: mejorCorreo(contacto),
    sitioWeb: sitioWeb(contacto),
  };
}

function normalizarCelebrado(c: Contrato, contactos: Map<string, ContactoProveedor>) {
  const proveedorNit = limpio(c.documento_proveedor);
  const contacto = proveedorNit ? contactos.get(proveedorNit) : undefined;
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
    correoContacto: mejorCorreo(contacto),
    sitioWeb: sitioWeb(contacto),
  };
}

// Cuando el mismo idProceso sale en ambos datasets, se completan campos que falten en uno con
// los del otro (ej. representanteLegalNombre solo viene del dataset de contratos) en vez de
// simplemente descartar uno de los dos registros.
function fusionar(base: Record<string, unknown>, extra: Record<string, unknown>): Record<string, unknown> {
  const resultado: Record<string, unknown> = { ...base };
  for (const [clave, valor] of Object.entries(extra)) {
    if (valor !== undefined) resultado[clave] = valor;
  }
  return resultado;
}

async function enviarAlDashboard(datos: Record<string, unknown>): Promise<number> {
  const res = await fetch(`${DASHBOARD_URL}/api/procesos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  return res.status;
}

const adjudicados = await buscarAdjudicados(perfil);
const celebrados = await buscarCelebrados(perfil);
console.log(`Adjudicados encontrados: ${adjudicados.length} · Celebrados encontrados: ${celebrados.length}`);

const nits = [
  ...adjudicados.map((p) => limpio(p.nit_del_proveedor_adjudicado)),
  ...celebrados.map((c) => limpio(c.documento_proveedor)),
].filter((nit): nit is string => Boolean(nit));
const contactos = await buscarContactosProveedores(nits);
console.log(`Contactos públicos encontrados: ${contactos.size} de ${new Set(nits).size} NIT únicos`);

const candidatos = new Map<string, Record<string, unknown>>();
for (const p of adjudicados) {
  const norm = normalizarAdjudicado(p, contactos);
  candidatos.set(norm.idProceso, norm);
}
for (const c of celebrados) {
  const norm = normalizarCelebrado(c, contactos);
  const existente = candidatos.get(norm.idProceso);
  candidatos.set(norm.idProceso, existente ? fusionar(existente, norm) : norm);
}

// De mayor a menor valor: cuando hay más candidatos que cupo diario disponible, entran
// primero los procesos más grandes (mejor prospecto de póliza).
const listaCandidatos = [...candidatos.values()].sort(
  (a, b) => ((b.valor as number | undefined) ?? 0) - ((a.valor as number | undefined) ?? 0)
);

let enviados = 0;
let sinCupo = 0;
let fallidos = 0;

for (const lead of listaCandidatos) {
  const status = await enviarAlDashboard(lead);
  const etiqueta = `[${lead.estadoSecop}] [${lead.idProceso}] ${String(lead.objeto).slice(0, 55)}`;
  if (status >= 200 && status < 300) {
    enviados++;
    console.log(`  ✓ ${etiqueta}`);
  } else if (status === 409) {
    // El backend rechaza únicamente procesos NUEVOS cuando ya se alcanzó el cupo diario de
    // leads — actualizar uno que ya existía nunca cuenta contra el cupo (ver crearProceso).
    sinCupo++;
    console.log(`  · ${etiqueta} — sin cupo diario`);
  } else {
    fallidos++;
    console.log(`  ✗ ${etiqueta} — error ${status}`);
  }
}

console.log(`\nResumen: ${enviados} enviados/actualizados, ${sinCupo} sin cupo diario (80/día), ${fallidos} fallidos.`);

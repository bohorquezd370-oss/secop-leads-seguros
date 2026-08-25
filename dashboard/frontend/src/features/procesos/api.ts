import type { EstadoComercial, Proceso } from "../../types/proceso";

// Vacío por defecto (rutas relativas) — en producción el frontend se sirve desde el mismo
// origen que la API. En desarrollo, .env define VITE_API_URL=http://localhost:4100.
const API_URL = import.meta.env.VITE_API_URL ?? "";

async function manejarRespuesta<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`);
  return res.json();
}

export interface FiltrosProcesos {
  estadoSecop?: string;
  estadoComercial?: string;
}

export function listarProcesos(filtros: FiltrosProcesos = {}): Promise<Proceso[]> {
  const params = new URLSearchParams();
  if (filtros.estadoSecop) params.set("estadoSecop", filtros.estadoSecop);
  if (filtros.estadoComercial) params.set("estadoComercial", filtros.estadoComercial);
  const qs = params.toString();
  return fetch(`${API_URL}/api/procesos${qs ? `?${qs}` : ""}`).then(manejarRespuesta<Proceso[]>);
}

export function obtenerProceso(id: string): Promise<Proceso> {
  return fetch(`${API_URL}/api/procesos/${id}`).then(manejarRespuesta<Proceso>);
}

export function actualizarEstadoComercial(id: string, estadoComercial: EstadoComercial): Promise<Proceso> {
  return fetch(`${API_URL}/api/procesos/${id}/estado-comercial`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estadoComercial }),
  }).then(manejarRespuesta<Proceso>);
}

export function actualizarNotas(id: string, notasComerciales: string): Promise<Proceso> {
  return fetch(`${API_URL}/api/procesos/${id}/notas`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notasComerciales }),
  }).then(manejarRespuesta<Proceso>);
}

export interface DatosContacto {
  direccionContacto?: string;
  telefonoContacto?: string;
  correoContacto?: string;
}

export function actualizarContacto(id: string, datos: DatosContacto): Promise<Proceso> {
  return fetch(`${API_URL}/api/procesos/${id}/contacto`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  }).then(manejarRespuesta<Proceso>);
}

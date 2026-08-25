export const ESTADOS_SECOP = ["adjudicado", "celebrado"] as const;
export type EstadoSecop = (typeof ESTADOS_SECOP)[number];

export const ESTADOS_COMERCIALES = ["nuevo", "contactado", "cotizado", "cerrado", "descartado"] as const;
export type EstadoComercial = (typeof ESTADOS_COMERCIALES)[number];

export interface Proceso {
  id: string;
  idProceso: string;
  entidad: string;
  nitEntidad: string | null;
  departamentoEntidad: string | null;
  ciudadEntidad: string | null;
  objeto: string;
  modalidad: string | null;
  tipoContrato: string | null;
  estadoSecop: EstadoSecop;
  valor: number | null;
  fechaAdjudicacion: string | null;
  fechaFirma: string | null;
  proveedorNombre: string | null;
  proveedorNit: string | null;
  proveedorDepartamento: string | null;
  proveedorCiudad: string | null;
  representanteLegalNombre: string | null;
  representanteLegalDireccion: string | null;
  urlProceso: string | null;
  urlRues: string | null;
  sitioWeb: string | null;
  direccionContacto: string | null;
  telefonoContacto: string | null;
  correoContacto: string | null;
  contactoActualizadoEn: string | null;
  estadoComercial: EstadoComercial;
  notasComerciales: string | null;
  createdAt: string;
  updatedAt: string;
}

export const ETIQUETAS_ESTADO_SECOP: Record<EstadoSecop, string> = {
  adjudicado: "Adjudicado",
  celebrado: "Celebrado",
};

export const COLOR_ESTADO_SECOP: Record<EstadoSecop, string> = {
  adjudicado: "bg-sky-100 text-sky-800",
  celebrado: "bg-emerald-100 text-emerald-800",
};

export const ETIQUETAS_ESTADO_COMERCIAL: Record<EstadoComercial, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  cotizado: "Cotizado",
  cerrado: "Cerrado",
  descartado: "Descartado",
};

export const COLOR_ESTADO_COMERCIAL: Record<EstadoComercial, string> = {
  nuevo: "bg-amber-100 text-amber-800",
  contactado: "bg-indigo-100 text-indigo-800",
  cotizado: "bg-purple-100 text-purple-800",
  cerrado: "bg-emerald-100 text-emerald-800",
  descartado: "bg-zinc-100 text-zinc-600",
};

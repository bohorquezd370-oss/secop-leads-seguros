import { z } from "zod";

export const ESTADOS_SECOP = ["adjudicado", "celebrado"] as const;

export const ESTADOS_COMERCIALES = ["nuevo", "contactado", "cotizado", "cerrado", "descartado"] as const;

export const CrearProcesoSchema = z.object({
  idProceso: z.string().min(1),
  entidad: z.string().min(1),
  nitEntidad: z.string().optional(),
  departamentoEntidad: z.string().optional(),
  ciudadEntidad: z.string().optional(),
  objeto: z.string().min(1),
  modalidad: z.string().optional(),
  tipoContrato: z.string().optional(),
  estadoSecop: z.enum(ESTADOS_SECOP),
  valor: z.number().nonnegative().optional(),
  fechaAdjudicacion: z.coerce.date().optional(),
  fechaFirma: z.coerce.date().optional(),
  proveedorNombre: z.string().optional(),
  proveedorNit: z.string().optional(),
  proveedorDepartamento: z.string().optional(),
  proveedorCiudad: z.string().optional(),
  representanteLegalNombre: z.string().optional(),
  representanteLegalDireccion: z.string().optional(),
  urlProceso: z.string().url().optional(),
  urlRues: z.string().url().optional(),
});

export const ActualizarEstadoComercialSchema = z.object({
  estadoComercial: z.enum(ESTADOS_COMERCIALES),
});

export const ActualizarNotasSchema = z.object({
  notasComerciales: z.string(),
});

export const ActualizarContactoSchema = z.object({
  direccionContacto: z.string().optional(),
  telefonoContacto: z.string().optional(),
  correoContacto: z.string().optional(),
});

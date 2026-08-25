import { z } from "zod";

// Campos del dataset "SECOP II - Procesos de Contratación" (p6dx-8zbt en datos.gov.co) usados
// para detectar procesos en estado "Adjudicado". Verificado contra un registro real de la API
// SODA (2026-08-24) — ver CLAUDE.md sección de investigación.
export const ProcesoAdjudicadoSchema = z.object({
  entidad: z.string().optional(),
  nit_entidad: z.string().optional(),
  departamento_entidad: z.string().optional(),
  ciudad_entidad: z.string().optional(),
  id_del_proceso: z.string(),
  nombre_del_procedimiento: z.string().optional(),
  descripci_n_del_procedimiento: z.string().optional(),
  fecha_adjudicacion: z.string().optional(),
  precio_base: z.string().optional(),
  valor_total_adjudicacion: z.string().optional(),
  modalidad_de_contratacion: z.string().optional(),
  tipo_de_contrato: z.string().optional(),
  adjudicado: z.string().optional(),
  nombre_del_proveedor: z.string().optional(),
  nit_del_proveedor_adjudicado: z.string().optional(),
  departamento_proveedor: z.string().optional(),
  ciudad_proveedor: z.string().optional(),
  urlproceso: z.object({ url: z.string() }).optional(),
});

export type ProcesoAdjudicado = z.infer<typeof ProcesoAdjudicadoSchema>;

// Campos del dataset "SECOP II - Contratos Electrónicos" (jbjy-vk9h en datos.gov.co) usados
// para detectar procesos "Celebrados" — no existe un estado literal así, se infiere de que el
// contrato ya existe (fecha_de_firma) en este dataset (ver client.ts, filtro de estado_contrato).
export const ContratoSchema = z.object({
  nombre_entidad: z.string().optional(),
  nit_entidad: z.string().optional(),
  departamento: z.string().optional(),
  ciudad: z.string().optional(),
  proceso_de_compra: z.string().optional(),
  id_contrato: z.string(),
  estado_contrato: z.string().optional(),
  descripcion_del_proceso: z.string().optional(),
  objeto_del_contrato: z.string().optional(),
  tipo_de_contrato: z.string().optional(),
  modalidad_de_contratacion: z.string().optional(),
  fecha_de_firma: z.string().optional(),
  valor_del_contrato: z.string().optional(),
  proveedor_adjudicado: z.string().optional(),
  documento_proveedor: z.string().optional(),
  nombre_representante_legal: z.string().optional(),
  domicilio_representante_legal: z.string().optional(),
  urlproceso: z.object({ url: z.string() }).optional(),
});

export type Contrato = z.infer<typeof ContratoSchema>;

// Campos del dataset público "SECOP II - Contacto Entidades y Proveedores" (4ex9-j3n8 en
// datos.gov.co) — SIN login, sin captcha, es la fuente pública real de correo/sitio web del
// proveedor (verificado en vivo 2026-08-25: 1.1M+ registros con correo_electronico real,
// 1.6M+ con correo_representante_legal). Los campos vacíos vienen como literal "No Provisto".
export const ContactoProveedorSchema = z.object({
  nit_entidad: z.string(),
  correo_electronico: z.string().optional(),
  correo_representante_legal: z.string().optional(),
  website: z.string().optional(),
});

export type ContactoProveedor = z.infer<typeof ContactoProveedorSchema>;

// Perfil de búsqueda: general (sin filtro de objeto/palabra clave), solo mínima cuantía y una
// ventana de días recientes — decisión del usuario (ver CLAUDE.md).
export interface PerfilLeads {
  modalidades: string[];
  diasHaciaAtras: number;
}

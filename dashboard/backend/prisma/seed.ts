import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Datos de ejemplo con la forma real que produce scout/ (dos datasets de Datos Abiertos,
// ver scout/src/client.ts) — sirven para probar el dashboard antes de correr el Scout real.
const procesos = [
  {
    idProceso: "CO1.REQ.EJEMPLO.001",
    entidad: "ALCALDÍA DE EJEMPLO",
    nitEntidad: "800000000",
    departamentoEntidad: "Cundinamarca",
    ciudadEntidad: "Bogotá",
    objeto: "SUMINISTRO DE MATERIALES DE CONSTRUCCIÓN PARA OBRA PÚBLICA — MÍNIMA CUANTÍA",
    modalidad: "Mínima cuantía",
    tipoContrato: "Suministro",
    estadoSecop: "adjudicado",
    valor: 38_500_000,
    fechaAdjudicacion: new Date(),
    proveedorNombre: "CONSTRUCTORA EJEMPLO SAS",
    proveedorNit: "900123456-1",
    proveedorDepartamento: "Cundinamarca",
    proveedorCiudad: "Bogotá",
    urlProceso: "https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.EJEMPLO",
    urlRues: "https://www.rues.org.co/busqueda-avanzada",
    estadoComercial: "nuevo",
  },
  {
    idProceso: "CO1.PCCNTR.EJEMPLO.002",
    entidad: "ESE HOSPITAL DE EJEMPLO",
    nitEntidad: "800000001",
    departamentoEntidad: "Antioquia",
    ciudadEntidad: "Medellín",
    objeto: "PRESTACIÓN DE SERVICIOS PROFESIONALES DE CONSULTORÍA JURÍDICA — MÍNIMA CUANTÍA",
    modalidad: "Mínima cuantía",
    tipoContrato: "Prestación de servicios",
    estadoSecop: "celebrado",
    valor: 21_000_000,
    fechaFirma: new Date(),
    proveedorNombre: "JUAN CAMILO PÉREZ RÍOS",
    proveedorNit: "1000000000",
    representanteLegalNombre: "JUAN CAMILO PÉREZ RÍOS",
    representanteLegalDireccion: "CALLE FALSA 123, MEDELLÍN",
    urlProceso: "https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.EJEMPLO2",
    urlRues: "https://www.rues.org.co/busqueda-avanzada",
    telefonoContacto: "300 123 4567",
    estadoComercial: "contactado",
    notasComerciales: "Se dejó mensaje el 2026-08-24, pendiente respuesta.",
  },
];

for (const proceso of procesos) {
  await prisma.proceso.upsert({ where: { idProceso: proceso.idProceso }, update: proceso, create: proceso });
}

console.log(`Sembrados ${procesos.length} procesos de ejemplo.`);
await prisma.$disconnect();

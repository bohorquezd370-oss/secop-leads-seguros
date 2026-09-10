// Plantillas de correo de marketing para adjudicatarios de mínima cuantía — ver
// docs/estrategia-email-marketing.md para el razonamiento completo (por qué solo "adjudicado",
// por qué un solo recordatorio, y las consideraciones de Ley 1581/mensajes comerciales).

interface ProcesoParaCorreo {
  idProceso: string;
  entidad: string;
  objeto: string;
  valor: number | null;
  proveedorNombre: string | null;
}

// Identidad del remitente — SIN valores reales por defecto (nunca se inventa el nombre o
// contacto de la empresa del usuario). Mientras no se configuren estas variables de entorno,
// el placeholder deja evidente en el correo (real o simulado) que falta este paso.
function datosEmpresa() {
  return {
    nombre: process.env.EMPRESA_NOMBRE ?? "[Falta configurar EMPRESA_NOMBRE]",
    telefono: process.env.EMPRESA_TELEFONO ?? "[Falta configurar EMPRESA_TELEFONO]",
  };
}

function formatearMoneda(valor: number | null): string {
  if (!valor) return "el valor publicado en SECOP";
  return valor.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

// Aviso de exclusión obligatorio en todo correo — el destinatario no dio su correo
// voluntariamente, viene de un registro público (SECOP), así que debe poder salir fácil.
function pieExclusion(): string {
  return `\n---\nEste correo se envió porque su empresa aparece como adjudicataria en un proceso público de contratación (SECOP II), información pública. Si no desea recibir más correos de este tipo, responda con "no enviar más" y no le volveremos a escribir.`;
}

export function construirCorreoInicial(proceso: ProcesoParaCorreo): { asunto: string; cuerpo: string } {
  const empresa = datosEmpresa();
  const asunto = `Póliza de cumplimiento para su contrato con ${proceso.entidad}`;
  const cuerpo = `Hola,

Vimos que ${proceso.proveedorNombre ?? "su empresa"} fue adjudicataria del proceso "${proceso.objeto}" con ${proceso.entidad} (${proceso.idProceso}), por ${formatearMoneda(proceso.valor)}. ¡Felicitaciones!

Antes de firmar el contrato, la entidad le va a exigir presentar la póliza de cumplimiento y las demás garantías del proceso. En ${empresa.nombre} podemos cotizársela hoy mismo, sin trámites largos, para que no se le complique el plazo de suscripción.

Si le interesa, responda este correo o llámenos al ${empresa.telefono} — nos comunicamos con usted el mismo día.

Saludos,
${empresa.nombre}
${pieExclusion()}`;
  return { asunto, cuerpo };
}

export function construirCorreoRecordatorio(proceso: ProcesoParaCorreo): { asunto: string; cuerpo: string } {
  const empresa = datosEmpresa();
  const asunto = `Recordatorio: póliza de cumplimiento para su contrato con ${proceso.entidad}`;
  const cuerpo = `Hola,

Le escribimos de nuevo por el proceso "${proceso.objeto}" con ${proceso.entidad} (${proceso.idProceso}) — recuerde que la póliza de cumplimiento normalmente se debe presentar en los primeros días después de la adjudicación.

Si ya la consiguió con alguien más, puede ignorar este mensaje. Si no, seguimos disponibles para cotizarle hoy: ${empresa.telefono} o respondiendo este correo.

Saludos,
${empresa.nombre}
${pieExclusion()}`;
  return { asunto, cuerpo };
}

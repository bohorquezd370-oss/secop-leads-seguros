import nodemailer from "nodemailer";

// Si no hay SMTP configurado (.env / variables de Railway), no se envía correo real — solo se
// deja constancia en consola. Así el marketing por correo nunca sale a producción hasta que el
// usuario configure sus propias credenciales de envío (mismo patrón que secop-agentes).
const smtpConfigurado = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = smtpConfigurado
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_PORT === "465",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

export async function enviarCorreo(destinatario: string, asunto: string, cuerpo: string): Promise<{ simulado: boolean }> {
  if (!transporter) {
    console.log(`[email simulado] Para: ${destinatario} · Asunto: ${asunto}\n${cuerpo}\n`);
    return { simulado: true };
  }
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to: destinatario,
    subject: asunto,
    text: cuerpo,
  });
  return { simulado: false };
}

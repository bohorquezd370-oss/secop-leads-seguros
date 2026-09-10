# Estrategia de email marketing a adjudicatarios

Contexto: el usuario vende pólizas de cumplimiento para procesos de mínima cuantía. En Colombia,
la garantía/póliza de cumplimiento normalmente se aporta **antes** de firmar el contrato — así
que la ventana real de venta es cuando un proceso está **"adjudicado"** (recién ganó, todavía sin
póliza), no cuando ya aparece **"celebrado"** (ahí casi seguro ya la consiguió con alguien más).

## Reglas de la campaña

1. **Solo "adjudicado" con correo público conocido.** Nunca se envía a "celebrado" — la
   oportunidad ya pasó en la enorme mayoría de los casos.
2. **Disparo automático, no en lote una vez al día.** El Scout llama a
   `POST /api/procesos/marketing/enviar` al final de cada corrida (cada 12h) — cualquier
   adjudicado nuevo con correo recibe su correo inicial en esa misma corrida, no espera a un
   proceso de marketing aparte.
3. **Un solo correo inicial + un recordatorio, no una secuencia larga.** La ventana de venta es
   de días, no semanas — un recordatorio a las `HORAS_RECORDATORIO_MARKETING` (default 30h)
   horas es suficiente. El recordatorio NO se envía si el equipo comercial ya cambió el
   `estadoComercial` (alguien ya lo está gestionando por otro canal).
4. **Aviso de exclusión obligatorio en cada correo.** El destinatario no dio su correo
   voluntariamente — viene de un registro público de SECOP (dataset `4ex9-j3n8`). Todo correo
   debe permitirle salir fácilmente ("responda 'no enviar más'"). Esto no es opcional: es la
   base para no violar la Ley 1581 de 2012 (protección de datos) y las normas sobre mensajes
   comerciales no solicitados en Colombia. **Nota:** esto es una precaución de buena práctica,
   no asesoría legal — si el volumen de envío crece, vale la pena que alguien de
   legal/cumplimiento revise la plantilla una vez.
5. **Mensaje corto y específico al proceso**, nunca una plantilla genérica de "somos una
   aseguradora": felicitación por la adjudicación real (entidad, objeto, valor), recordatorio de
   que necesita presentar garantía/póliza, oferta de cotizar el mismo día, un solo
   call-to-action (responder el correo o llamar).

## Implementación técnica

- **Plantillas**: `dashboard/backend/src/modules/procesos/procesos.marketing.ts`
  (`construirCorreoInicial` / `construirCorreoRecordatorio`).
- **Envío**: `dashboard/backend/src/config/email.ts` — mismo patrón que `secop-agentes`: sin
  `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` configurados, el envío se **simula** (log en consola) en
  vez de fallar o mandar algo real. Esto es deliberado: el marketing real solo empieza cuando el
  usuario configura su propia cuenta de correo en las variables de entorno — nadie más decide
  eso por él.
- **Identidad del remitente**: `EMPRESA_NOMBRE` y `EMPRESA_TELEFONO` (variables de entorno, sin
  valor real por defecto — el correo muestra `[Falta configurar ...]` mientras no se llenen, en
  vez de inventar un nombre o teléfono).
- **Lógica de envío**: `enviarMarketing()` en `procesos.service.ts` — corre en cada corrida del
  Scout, busca adjudicados con correo sin `correoMarketingEnviadoEn`, manda el inicial; busca
  los que ya pasaron `HORAS_RECORDATORIO_MARKETING` sin recordatorio y siguen en
  `estadoComercial = "nuevo"`, manda el recordatorio.
- **Seguimiento**: campos `correoMarketingEnviadoEn` / `correoMarketingRecordatorioEn` en
  `Proceso` — visibles en el panel de detalle del dashboard.

## Para activar el envío real

Configurar en las variables de entorno del servicio (Railway → Settings → Variables):

```
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...
EMPRESA_NOMBRE=...
EMPRESA_TELEFONO=...
```

Sin esto, el sistema sigue funcionando normalmente pero solo *simula* el envío (queda en los
logs de la rutina del Scout en la nube, nunca llega a un destinatario real).

## Pendiente / mejoras futuras (no implementadas)

- Medir conversión real (correo enviado → `estadoComercial = "cerrado"`) — hoy se puede cruzar
  manualmente con los campos existentes, no hay un reporte automático todavía.
- Revisión legal formal de la plantilla si el volumen de envío crece significativamente.

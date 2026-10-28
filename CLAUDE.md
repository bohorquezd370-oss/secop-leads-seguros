# CLAUDE.md

Dashboard de leads comerciales para una aseguradora: detecta procesos de contratación pública en
SECOP II (Colombia) que ya llegaron a estado **Adjudicado** o **Celebrado** (contrato firmado),
para ofrecer pólizas a la empresa ganadora — obras, prestación de servicios, consultorías,
suministros y demás bienes y servicios adjudicados.

Proyecto hermano de `secop-agentes` (ayuda a una empresa a *participar* en SECOP), pero con un
propósito distinto: generar leads comerciales, no presentar ofertas. Solo interviene el agente
**Scout** — sin descarga de documentos, sin análisis financiero, sin radicación.

**Producto real: pólizas de cumplimiento (2026-09-10).** El usuario vende específicamente
pólizas de cumplimiento para procesos de mínima cuantía. Esto importa para el diseño porque en
mínima cuantía la garantía/póliza normalmente se aporta **antes** de firmar el contrato — así
que "adjudicado" (recién ganó, todavía sin póliza) es la ventana real de venta, y "celebrado"
casi siempre significa que el adjudicatario ya consiguió su póliza con alguien más. Todo el
sistema (orden del Scout, prioridad del cupo diario, la tabla del dashboard) trata "adjudicado"
como urgente y "celebrado" como baja prioridad — ver sección 5 y `lib/urgencia.ts`.

---

## 1. Arquitectura de agentes

1. **Scout** (`scout/`) — consulta dos datasets de Datos Abiertos SECOP II (sin login, sin
   captcha), detecta procesos en modalidad "Mínima cuantía" adjudicados/celebrados en los
   últimos 3 días (sin filtro de objeto — general), y hace upsert al dashboard.
2. **Dashboard** (`dashboard/`) — muestra los procesos con los datos de la empresa adjudicataria
   (nombre, NIT, representante legal, domicilio cuando esté disponible) y permite al equipo
   comercial llevar su propio seguimiento (estado comercial + notas + contacto).

No hay agente Financiero, Documental, ni Sesión Asistida (SECOP transaccional) en este proyecto —
decisión explícita del usuario (2026-08-24): solo búsqueda + detalle del proceso.

---

## 2. Los dos datasets y qué significa "Adjudicado" / "Celebrado"

Verificado en vivo contra la API real de datos.gov.co (2026-08-24):

- **`p6dx-8zbt`** (SECOP II - Procesos de Contratación): cuando `adjudicado='Si'`, trae
  `nombre_del_proveedor`, `nit_del_proveedor_adjudicado`, `departamento_proveedor`,
  `ciudad_proveedor`, `valor_total_adjudicacion`, `fecha_adjudicacion`, `tipo_de_contrato`. Este
  es el estado **"adjudicado"**.
- **`jbjy-vk9h`** (SECOP II - Contratos Electrónicos): no existe un estado literal "Celebrado" —
  se infiere de que el contrato ya existe en este dataset (`fecha_de_firma`) con `estado_contrato`
  distinto de `Borrador`, `Cancelado`, `enviado Proveedor`, `En aprobación` (esos son pre-firma o
  descartados; valores reales confirmados con `$group=estado_contrato`: `En ejecución, Cerrado,
  Modificado, terminado, Borrador, Aprobado, Cancelado, enviado Proveedor, cedido, En aprobación,
  Suspendido, Prorrogado`). Este dataset trae además `nombre_representante_legal` y
  `domicilio_representante_legal` — la única dirección gratuita y confiable que existe en Datos
  Abiertos para el proveedor. Este es el estado **"celebrado"**.
- Ambos datasets comparten el proceso de origen (`id_del_proceso` en uno ↔ `proceso_de_compra` en
  el otro) — un mismo proceso puede aparecer primero como "adjudicado" y luego como "celebrado".
  El backend nunca deja que "celebrado" retroceda a "adjudicado" en el upsert (ver
  `crearProceso` en `procesos.service.ts`).
- **Placeholders de Datos Abiertos**: los campos vacíos vienen como texto literal `"No Definido"` /
  `"No definido"` / `"Sin Descripcion"` / `"No Aplica"`, nunca `null`. `scout/src/index.ts`
  (función `limpio()`) los filtra antes de guardar — si no, terminarían mostrándose como si
  fueran datos reales.

---

## 3. RUES no tiene teléfono/correo público — decisión de diseño importante

Se investigó en vivo (2026-08-24) si era viable automatizar la consulta de RUES (Cámara de
Comercio) para completar teléfono/correo del proveedor adjudicado:

- La URL real de búsqueda es `https://www.rues.org.co/busqueda-avanzada` (NO
  `/RM/ConsultaPublica`, que sirve una página sin el widget de búsqueda funcional).
- **No hay captcha ni login** para la búsqueda pública por NIT — se probó una búsqueda real
  (NIT 900343856) sin bloqueo.
- **RUES público NO expone teléfono ni correo en ningún resultado** — se verificaron las 4
  pestañas del detalle (Información general, Actividad económica, Representante legal,
  Propietario/Establecimiento): solo hay metadata registral (matrícula, estado, tipo de
  sociedad, actividad CIIU, cláusula estatutaria de representación legal). El dato de contacto
  completo solo está en el "Certificado" de pago, que no es razonable automatizar (checkout con
  tarjeta por cada lead, sin garantía de traer el dato tampoco).
- La URL de búsqueda **no acepta el NIT por query param** (`?identificacion=` / `?nit=` no
  prellenan el campo) — el link `urlRues` en cada proceso apunta siempre a la misma página base;
  el humano escribe el NIT ahí.

**Decisión del usuario (2026-08-24): no se construye scraper de RUES.** El link a RUES
(`urlRues`) sigue existiendo, pero como esa plataforma tampoco permite deep-linking a la ficha
de una empresa (verificado en vivo 2026-08-25: la URL de detalle no lleva NIT ni identificador
alguno, y los query params no prellenan el formulario), el botón "Copiar NIT y buscar en RUES"
(`lib/rues.ts`) al menos copia el NIT al portapapeles antes de abrir la página — solo sirve para
confirmar NIT/estado de matrícula, nunca trae contacto.

**Actualización (2026-08-25): sí existe una fuente pública de correo/sitio web.** El dataset
`4ex9-j3n8` ("SECOP II - Contacto Entidades y Proveedores" en datos.gov.co) es público, sin
login ni captcha, y trae `correo_electronico`, `correo_representante_legal` y `website` por
`nit_entidad` — verificado con 1.1M+ registros con correo real y 1.6M+ con correo de
representante legal. El Scout (`buscarContactosProveedores` en `scout/src/client.ts`) consulta
este dataset en lotes (`IN (...)`) por cada corrida y sugiere `correoContacto`/`sitioWeb`
automáticamente. **No tiene teléfono** (solo `numero_fax`, casi siempre vacío) — ese campo
(`telefonoContacto`) y `direccionContacto` siguen siendo 100% manuales, sin fuente pública
gratuita conocida. El equipo comercial los llena desde el panel de detalle
(`ProcesoDetail.tsx`), y puede corregir el correo sugerido si hace falta — el Scout nunca pisa
un `correoContacto` que ya tenga valor (ver `crearProceso` en `procesos.service.ts`), sea porque
él mismo lo sugirió antes o porque un humano lo editó.

**Importante — se descartó usar las credenciales de SECOP II de otro proyecto.** El usuario
sugirió usar el login de Verde Ecológico (`secop-agentes`, empresa distinta a la de este
proyecto) para entrar a un supuesto "directorio SECOP" autenticado. Se rechazó: mezclaría
credenciales de un negocio no relacionado, iría en contra de la regla explícita de
`secop-agentes` de nunca automatizar el login/captcha de SECOP transaccional, y el dataset
público de arriba resuelve el mismo problema sin ese riesgo.

---

## 4. Stack

Mismo patrón que `secop-agentes`: Node.js + TypeScript (scout), Express + Prisma + TypeScript
(backend), React + Vite + TypeScript + TailwindCSS + TanStack Query (frontend). SQLite en
desarrollo local (`provider = "sqlite"` en `schema.prisma`), Postgres en producción (Railway) —
cambiar el provider recién antes de desplegar, igual que en el proyecto original (ver
`docs/despliegue-dashboard.md`).

Puertos de desarrollo (distintos a los otros proyectos del usuario: 5173 app de mascotas, 4000/5180
secop-agentes): backend `4100`, frontend `5190`.

Sin `Empresa` model — a diferencia de `secop-agentes`, este es un solo tenant (la aseguradora), no
hay múltiples razones sociales cotizando.

---

## 5. Perfil real del Scout (confirmado 2026-08-24, ajustado 2026-08-26)

- **Modalidad:** solo "Mínima cuantía".
- **Ventana:** últimos 3 días (`fecha_adjudicacion` o `fecha_de_firma` según el dataset).
- **Sin filtro de objeto/palabra clave** — a diferencia de `secop-agentes` (que busca solo
  interventorías), aquí se quiere ver *todo tipo* de proceso adjudicado/celebrado: obra,
  prestación de servicios, consultoría, suministro, compraventa, etc.
- **Valor mínimo $20.000.000** (`valorMinimo` en `PerfilLeads`, 2026-08-26) — procesos más
  pequeños no justifican el trabajo de captación al detalle. Se filtra directamente en la
  consulta SoQL (`valor_total_adjudicacion` / `valor_del_contrato >= 20000000`, verificado que
  la comparación numérica funciona correctamente y no es lexicográfica).
- **Tope de 80 leads NUEVOS por día — SOLO para "celebrado"** (creado 2026-08-26, **restringido
  a "celebrado" el 2026-10-27** a pedido del usuario: "adjudicado" ya no tiene ningún límite,
  entran TODOS los que se adjudiquen cada día). Tiene sentido con la estrategia de pólizas de
  cumplimiento (ver comentario al inicio de este archivo): "adjudicado" es la ventana real de
  venta, nunca se descarta un candidato ahí solo por volumen; "celebrado" sigue siendo de baja
  prioridad y mantiene el cupo para no inflar el tablero con procesos que probablemente ya
  consiguieron póliza con alguien más. Lo hace cumplir el **backend**, no el Scout — ver
  `CUPO_DIARIO_LEADS`/`obtenerCupoDiario`/`crearProceso` en `procesos.service.ts`: la función
  `obtenerCupoDiario` calcula `cupoDisponible` contando solo los "celebrado" creados hoy, y
  `crearProceso` solo invoca ese chequeo cuando `datos.estadoSecop === "celebrado"`. Un
  `idProceso` que no existía todavía cuenta contra el cupo (si es celebrado); actualizar uno que
  ya existía (ej. pasar de adjudicado a celebrado, o refrescar el correo sugerido) nunca lo
  consume. El cupo se reinicia a medianoche hora de Bogotá. Probado en vivo
  (`CUPO_DIARIO_LEADS=1`): el primer "celebrado" entra y agota el cupo, el segundo se rechaza
  con 409, pero dos "adjudicado" seguidos entran sin problema con el cupo ya en 0.
  **Orden de prioridad del Scout** (2026-09-10): primero todos los "adjudicado" (de mayor a
  menor valor) en el log, después los "celebrado" — ver el comentario sobre pólizas de
  cumplimiento al inicio de este archivo. Endpoint `GET /api/procesos/cupo-diario` expone
  `{ creadosHoy, cupoMaximo, cupoDisponible }` (`creadosHoy` = total del día, informativo;
  `cupoDisponible` = solo sobre celebrados), usado también por el stat "Nuevos hoy" del
  dashboard.
- **Auto-descarte por falta de seguimiento** (2026-09-09, reemplaza el punto anterior sobre
  "sin auto-descarte"): el Scout llama primero a `POST /api/procesos/depurar`
  (`depurarSinSeguimiento` en `procesos.service.ts`), que borra los procesos con
  `estadoComercial = "nuevo"` **y** sin notas **y** sin contacto guardado a mano, creados hace
  más de `DIAS_SIN_SEGUIMIENTO` días (default 3, env var). Un correo que el Scout sugirió
  automáticamente NO cuenta como seguimiento — solo una acción humana (cambiar el estado,
  escribir una nota, o guardar contacto) evita el descarte. Probado en vivo: un proceso sin
  tocar se elimina, uno con `estadoComercial` cambiado sobrevive.

Verificado con datos reales el 2026-08-24 (antes del filtro de valor/tope diario): 346 procesos
únicos en una sola corrida (167 adjudicados + 179 celebrados, con varios duplicados entre ambos
datasets correctamente deduplicados por `idProceso`).

---

## 6. Estado del proyecto

- [x] Scout (`scout/`) — probado contra la API real, trae adjudicados y celebrados reales.
- [x] Dashboard backend (`dashboard/backend`) — Express + Prisma + SQLite (dev), modelo `Proceso`
      único, endpoints CRUD + estado comercial + notas + contacto manual. Probado end-to-end.
- [x] Dashboard frontend (`dashboard/frontend`) — tabla con filtros (estado SECOP / estado
      comercial / rango de fecha "Desde-Hasta", agregado 2026-10-27), panel de detalle con datos
      de la empresa adjudicataria, formulario de contacto manual, seguimiento comercial.
      Verificado visualmente en navegador (Playwright) contra datos reales — sin errores de
      consola. **Orden por fecha (2026-10-27, reemplaza el orden por urgencia):** la tabla ya
      no reordena por urgencia — respeta el orden del backend (`createdAt desc`), así que los
      procesos más nuevos quedan siempre primero; el badge de urgencia se sigue mostrando por
      fila, solo dejó de decidir el orden. El filtro "Hasta" cubre el día completo en hora
      Bogotá (límite exclusivo del día siguiente a las 05:00 UTC), no corta a medianoche UTC —
      mismo cuidado de zona horaria que `inicioDiaBogota()`.
- [x] Investigación de RUES completa (sección 3) — decisión: sin scraper de RUES.
- [x] Correo/sitio web público del proveedor (`4ex9-j3n8`) integrado al Scout — ~50% de
      cobertura real en pruebas (173/344 procesos con correo real). Teléfono/dirección siguen
      siendo manuales.
- [x] Repo en GitHub — https://github.com/bohorquezd370-oss/secop-leads-seguros (público, por
      decisión del usuario para simplificar el acceso de la rutina en la nube).
- [x] Cron cada 12 horas — rutina en la nube (skill `/schedule`, trigger
      `trig_01EtMuzmmjvSfWx1Z85MjrdK`) creada con `40 */3 * * *` (2026-08-25), cambiada a
      `40 */12 * * *` UTC (2026-09-09, pedido del usuario). El scout no depende de navegador (a
      diferencia de `sesion-asistida/` en el proyecto original), así que corre completamente en
      la nube sin intervención humana.
  - **Incidente resuelto (2026-09-04 a 2026-09-08):** el entorno de la nube ("Default") tenía
    una política de red que bloqueaba `www.datos.gov.co` (`403 Host not in allowlist`) — todas
    las corridas de esos días fallaron en el primer request, sin llegar nunca a tocar el
    dashboard. Se diagnosticó revisando `list_runs`/`get_run_log` de la rutina (el fallo
    aparecía como texto plano en el resultado del Bash, no como error de la rutina en sí). El
    usuario agregó `www.datos.gov.co` y el dominio de Railway al allowlist del entorno en
    claude.ai (Settings → Code → Environments); se corrió un backfill manual con
    `diasHaciaAtras: 7` (temporal, revertido) para recuperar 80 leads del hueco antes de
    retomar la ventana normal de 3 días.
  - **Rezago normal de publicación de SECOP** (confirmado 2026-09-09): Datos Abiertos no
    publica `fecha_adjudicacion`/`fecha_de_firma` del mismo día — verificado consultando la API
    directo con `$where=fecha_adjudicacion >= 'HOY'`, que devuelve vacío hasta que SECOP
    publica (normalmente 1+ día de rezago). No es una falla del Scout ni de la rutina.
- [x] Auto-descarte por falta de seguimiento a los 3 días — ver sección 5.
- [x] Priorización por urgencia (2026-09-10) — `dashboard/frontend/src/lib/urgencia.ts` calcula
      días restantes estimados (`fechaAdjudicacion + 3 días`, ver comentario al inicio de este
      archivo sobre pólizas de cumplimiento) y clasifica cada proceso en
      crítico/atención/normal/vencido/baja-prioridad. La tabla del dashboard ordena por esto
      (adjudicados urgentes arriba, celebrados al final), y el Scout aplica la misma prioridad
      al repartir el cupo diario (`RANGO_PRIORIDAD` en `scout/src/index.ts`). El estimado de 3
      días es general — el plazo real depende del pliego de cada proceso, no está en los datos.
- [x] Desplegado a Railway — https://secop-leads-seguros-production.up.railway.app (backend +
      frontend en un solo servicio, Postgres administrado). Sin login todavía — decisión
      explícita del usuario (2026-08-24), igual que en `secop-agentes`.

---

Cómo correr el proyecto en desarrollo:

```bash
# backend
cd dashboard/backend
npm install
cp .env.example .env
npx prisma db push
npm run seed        # opcional, datos de ejemplo
npm run dev          # http://localhost:4100

# frontend
cd dashboard/frontend
npm install
cp .env.example .env
npm run dev          # http://localhost:5190

# scout (con el backend corriendo)
cd scout
npm install
DASHBOARD_URL=http://localhost:4100 npx tsx src/index.ts
```

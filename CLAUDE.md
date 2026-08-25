# CLAUDE.md

Dashboard de leads comerciales para una aseguradora: detecta procesos de contratación pública en
SECOP II (Colombia) que ya llegaron a estado **Adjudicado** o **Celebrado** (contrato firmado),
para ofrecer pólizas a la empresa ganadora — obras, prestación de servicios, consultorías,
suministros y demás bienes y servicios adjudicados.

Proyecto hermano de `secop-agentes` (ayuda a una empresa a *participar* en SECOP), pero con un
propósito distinto: generar leads comerciales, no presentar ofertas. Solo interviene el agente
**Scout** — sin descarga de documentos, sin análisis financiero, sin radicación.

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

## 5. Perfil real del Scout (confirmado 2026-08-24)

- **Modalidad:** solo "Mínima cuantía".
- **Ventana:** últimos 3 días (`fecha_adjudicacion` o `fecha_de_firma` según el dataset).
- **Sin filtro de objeto/palabra clave** — a diferencia de `secop-agentes` (que busca solo
  interventorías), aquí se quiere ver *todo tipo* de proceso adjudicado/celebrado: obra,
  prestación de servicios, consultoría, suministro, compraventa, etc.
- **Sin valor mínimo.**
- **Sin auto-descarte por fecha de cierre** — a diferencia de `secop-agentes`, aquí el contrato ya
  se firmó, el lead sigue siendo válido indefinidamente. El descarte es una decisión comercial
  manual vía `estadoComercial = "descartado"`.

Verificado con datos reales el 2026-08-24: 346 procesos únicos en un solo corrida (167
adjudicados + 179 celebrados, con varios duplicados entre ambos datasets correctamente
deduplicados por `idProceso`).

---

## 6. Estado del proyecto

- [x] Scout (`scout/`) — probado contra la API real, trae adjudicados y celebrados reales.
- [x] Dashboard backend (`dashboard/backend`) — Express + Prisma + SQLite (dev), modelo `Proceso`
      único, endpoints CRUD + estado comercial + notas + contacto manual. Probado end-to-end.
- [x] Dashboard frontend (`dashboard/frontend`) — tabla con filtros (estado SECOP / estado
      comercial), panel de detalle con datos de la empresa adjudicataria, formulario de contacto
      manual, seguimiento comercial. Verificado visualmente en navegador (Playwright) contra
      datos reales — sin errores de consola.
- [x] Investigación de RUES completa (sección 3) — decisión: sin scraper de RUES.
- [x] Correo/sitio web público del proveedor (`4ex9-j3n8`) integrado al Scout — ~50% de
      cobertura real en pruebas (173/344 procesos con correo real). Teléfono/dirección siguen
      siendo manuales.
- [x] Repo en GitHub — https://github.com/bohorquezd370-oss/secop-leads-seguros (público, por
      decisión del usuario para simplificar el acceso de la rutina en la nube).
- [x] Cron cada 3 horas — rutina en la nube (skill `/schedule`) creada, cron `40 */3 * * *`
      UTC. El scout no depende de navegador (a diferencia de `sesion-asistida/` en el proyecto
      original), así que corre completamente en la nube sin intervención humana.
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

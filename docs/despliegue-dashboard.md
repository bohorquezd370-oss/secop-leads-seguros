# Despliegue del dashboard en Railway (acceso permanente para varias personas)

El código ya está preparado para esto: el backend sirve el build del frontend desde el mismo
servicio (un solo deploy, una sola URL).

**Paso 0 (antes de desplegar):** `dashboard/backend/prisma/schema.prisma` quedó temporalmente en
SQLite para seguir desarrollando localmente sin Postgres. Cambiar `provider = "sqlite"` a
`provider = "postgresql"` en el `datasource db` antes de seguir con el paso 7 de abajo.

**Nota de seguridad:** este dashboard, por decisión explícita del proyecto hermano
(`secop-agentes`), suele quedar sin login al principio. Como aquí se ven datos de contacto y
seguimiento comercial (no financieros/de costos), el riesgo es menor, pero sigue siendo
recomendable agregar autenticación básica antes de compartir la URL ampliamente con el equipo
comercial.

## Pasos

1. **Crear cuenta en Railway**: entra a railway.app y crea una cuenta (con GitHub es lo más
   simple, porque luego conecta el repo directo).

2. **Subir este repo a GitHub** (si no lo has hecho):
   ```bash
   cd ~/secop-leads-seguros
   git add -A
   git commit -m "Preparar despliegue del dashboard"
   gh repo create secop-leads-seguros --private --source=. --push
   ```
   (o crea el repo manualmente en GitHub y haz `git remote add origin <url> && git push -u origin main`)

3. **Nuevo proyecto en Railway** → "New Project" → "Deploy from GitHub repo" → selecciona
   `secop-leads-seguros`.

4. **Agregar Postgres**: dentro del proyecto, "New" → "Database" → "Add PostgreSQL". Railway
   crea automáticamente la variable `DATABASE_URL` — cópiala (la vas a necesitar también en tu
   `.env` local si quieres seguir desarrollando contra esa misma base).

5. **Variables de entorno del servicio** (en el servicio de la app, no el de Postgres, pestaña
   "Variables"):
   ```
   DATABASE_URL=<la misma de Postgres, Railway permite referenciarla automáticamente>
   PORT=4100
   CORS_ORIGIN=<la URL pública que Railway te asigne, ej. https://secop-leads-seguros.up.railway.app>
   ```

6. **Build/start command**: Railway debería detectar automáticamente el `package.json` en la
   raíz del repo y usar `npm run build` / `npm run start`. Si no lo detecta solo, en Settings →
   "Build Command" pon `npm run build` y en "Start Command" pon `npm run start`.

7. **Generar la migración inicial contra Postgres** (una sola vez, desde tu máquina, apuntando
   ya al `DATABASE_URL` de Railway):
   ```bash
   cd ~/secop-leads-seguros/dashboard/backend
   echo 'DATABASE_URL="<pega aquí la URL de Postgres de Railway>"' >> .env
   npx prisma migrate dev --name init_postgres
   npm run seed   # opcional: carga procesos de ejemplo
   ```
   Después de esto, súbelo a GitHub (`git add -A && git commit -m "Migración inicial Postgres" && git push`)
   para que Railway tenga la carpeta `prisma/migrations` y pueda correr `prisma migrate deploy`
   automáticamente en cada deploy (ya está en el script `start` del `package.json` raíz).

8. **Deploy**: Railway despliega automáticamente al hacer push a `main`. Cuando termine, te da
   una URL pública (Settings → "Generate Domain" si no la ves de una).

9. **Programar el Scout cada 3 horas**: usa la skill `/schedule` para crear una rutina en la nube
   que clone este repo y corra `npm run scout` con `DASHBOARD_URL` apuntando a la URL pública de
   Railway, cron `0 */3 * * *`. El Scout no necesita navegador ni credenciales — corre 100% en
   la nube sin intervención humana (a diferencia de `sesion-asistida/` en `secop-agentes`).

## Próximos pasos recomendados
- Agregar login básico antes de compartir la URL ampliamente con el equipo comercial.

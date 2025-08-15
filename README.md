# SmartInventoryCloud_Pro (DH Store)

Deployable inventory system (frontend + backend + Postgres) with landing page and Render blueprint.

## What’s inside
- **landing/** — public welcome page for `dhstore.rw`
- **frontend/** — React app for `app.dhstore.rw` (charts, login, dashboard)
- **backend/** — Node/Express API for `api.dhstore.rw` (Prisma + Postgres, roles, email alerts)
- **render.yaml** — One-click Render deploy (backend, frontend, database)

## Quick deploy
1. Push this directory to a new **GitHub repo** you own.
2. On **Render → New → Blueprint**, select your repo. It will create:
   - Postgres (`dhstore-postgres`)
   - Backend (`dhstore-backend`)
   - Frontend (`dhstore-frontend`)
3. In Render **Custom Domains**:
   - Add `app.dhstore.rw` to the **frontend** service and copy the CNAME target they give.
   - Add `api.dhstore.rw` to the **backend** service and copy the CNAME target they give.
4. In **Afriregister DNS**, create **CNAME** records:
   - `app` → paste Render’s frontend CNAME target
   - `api` → paste Render’s backend CNAME target
5. Wait for SSL to provision. Login: `admin / Admin@123` → change password.

## Local dev
See `.env.sample` files in `backend/` and `frontend/`.

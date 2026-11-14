# Vigía Frontend (`vigia-frontend`)

## Overview
Vigía is a construction materials traceability platform by Trazza Labs. It follows each material from the warehouse to the construction site: orders, dispatches, transport tracking, site reception and discrepancy management, so missing or damaged materials are detected in time.

This repository holds the web client, a Vue 3 + Vite single-page application organized with a domain-driven design (DDD) style: every feature lives in its own bounded context, and business concepts stay separated from UI and infrastructure concerns.

- **Live app:** https://vigia-frontend-8084.web.app
- **Landing page:** https://upc-pre-202620-1asi0730-8084-developers.github.io/vigia-landing/

## Goals
- Digitize the chain of custody of construction materials, from warehouse dispatch to site reception.
- Detect differences between what was sent and what was received, route deviations and delays as they happen.
- Give each role (Supervisor, Warehouse Manager, Site Resident) a view focused on its own work.
- Keep a front-end architecture with explicit domain language and clear layer boundaries.

## Tech Stack
- Vue 3 + Vite
- Pinia
- Vue Router
- Vue I18n (English and Spanish)
- PrimeVue + PrimeFlex + PrimeIcons
- Leaflet + `@vue-leaflet/vue-leaflet` (maps)
- Axios
- `json-server` (local mock API)
- Firebase Hosting (deployment)

## Project Structure (DDD-Oriented)
```text
src/
  iam/                                   # Identity and access: roles, profile, settings
  project-management/                    # Construction projects (sites)
  inventory-management/                  # Materials, stock and inventory movements
  order-management-and-distpatch/        # Material orders and dispatches
  fleet-and-device-management/           # Vehicles, GPS devices and geofences
  transit-traceability/                  # Real-time route tracking and transit alerts
  site-reception-and-verification/       # Site receptions, quantity checks and evidence
  discrepancy-and-evidence-management/   # Discrepancy cases, responsibility and closure
  activity-history/                      # Activity log of the whole flow
  dashboard/                             # Role-based home dashboards
  shared/                                # Cross-context infrastructure and UI
  locales/                               # en.json / es.json translations

Each bounded context follows the same layers:
  <context>/
    domain/                              # Entities, value objects and business rules
    application/                         # Pinia store: use cases and state
    infrastructure/                      # API clients and assemblers
    presentation/                        # Views, components and route declarations

server/
  data/<bounded-context>/<collection>.json   # Mock dataset, one file per collection
  db.cjs                                 # Builds the database from server/data
  routes.json                            # URL rewrites (/api/v1/* and kebab-case paths)
  middleware.cjs                         # Business rules of the mock API (409 conflicts, etc.)
  vite-mock-api.cjs                      # Serves the mock API inside `npm run dev`
  start.cjs                              # Standalone mock server (`npm run server`)
```

## Bounded Contexts

| Context | Folder | Main responsibilities |
|---|---|---|
| Identity and Access (IAM) | `iam/` | Active role and user, profile and preferences (Settings) |
| Project Management | `project-management/` | Construction projects, progress, status and zones |
| Inventory Management | `inventory-management/` | Materials, stock alerts, consumption by period and category |
| Order Management and Dispatch | `order-management-and-distpatch/` | Material orders, dispatches and the new dispatch wizard |
| Fleet and Device Management | `fleet-and-device-management/` | Vehicles, GPS device pairing and facility geofences |
| Transit Traceability | `transit-traceability/` | Route tracking on a map, deviation, prolonged stop and signal alerts |
| Site Reception and Verification | `site-reception-and-verification/` | Arrivals, receptions, quantity comparison and photographic evidence |
| Discrepancy and Evidence Management | `discrepancy-and-evidence-management/` | Discrepancy cases, evidence timeline, responsibility and closure |
| Activity History | `activity-history/` | Activity log with date, type, user and reference filters |
| Dashboard | `dashboard/` | Home dashboard for each role, built from the other contexts' stores |
| Shared | `shared/` | `BaseApi`, `BaseEndpoint`, in-browser mock API, layout, sidebar, role selector, language switcher, KPI and donut chart components |

## Layer Responsibilities

### Domain Layer
- Defines business concepts and invariants as plain JavaScript classes.
- Stays framework-agnostic: no Vue, Axios or UI code.

### Application Layer
- Coordinates use cases and state through Pinia stores.
- Uses domain objects plus infrastructure services to run each workflow.

### Infrastructure Layer
- Talks to the API through classes that extend `BaseApi`.
- Maps external payloads to domain entities with assemblers.

### Presentation Layer
- Renders the UI with PrimeVue components and handles user interactions.
- Calls store actions and reacts to state; it never calls HTTP clients directly.
- Actions that send data to the API live on their own routed pages, not in modal dialogs.

## Roles
Switch the active role with the **Active role** selector (top bar or sidebar). Each role only sees its allowed pages; views it cannot access redirect to its first allowed page.

| Role | Test user | Pages |
|---|---|---|
| Supervisor (Admin) | María Torres | Home, Projects, Materials, Dispatches, Transportation, Receptions, Issues, History, Reports, Settings |
| Warehouse Manager | Miguel Rojas | Home, Materials, Material Orders, Dispatches, Transportation, History, Settings |
| Site Resident | Juan Pérez | Home, Projects, Receptions, Issues, History, Settings |

## Running the Project

### Prerequisites
- Node.js + npm installed (use versions compatible with Vite 8).

### 1) Install dependencies
```bash
npm install
```

### 2) Start the app with the real backend
```bash
npm run dev
```
First start MySQL and run `.\scripts\start-local.ps1` from `vigia-platform`. Then open http://localhost:5173. In development, `/api/v1` is proxied to `http://localhost:5125` and the in-memory API is disabled. Sign in with a local account listed in the backend's `.local/access.json`, or register a site-manager account. Passwords are hashed on the server; API calls carry the bearer token issued at sign-in. Signing out clears the browser session.

Use `VITE_BACKEND_URL` in `.env.development.local` if the backend listens elsewhere. The backend startup script creates a separate `vigia_local_integration` database; it does not migrate your existing `EnsureCreated()` database.

### 3) Legacy standalone mock API
The original mock server remains available for inspecting the old demo dataset:
```bash
npm run server
```
It listens on the port of `VITE_LEARNING_PLATFORM_API_URL` (3000 when no port is set). It does not validate the new persisted authentication flow; use the real backend for integration verification.

### 4) API checks
The following command checks the legacy mock API only:
```bash
node test-e2e.js
```
For the real API, follow `scripts/verify-local.py` and `tests/VigiaPlatform.IntegrationChecks` in the backend repository. Those checks exercise actual MySQL persistence and authorization.

### 5) Build for production
```bash
npm run build
```

### 6) Preview production build
```bash
npm run preview
```

### 7) Deploy to Firebase Hosting
The project is configured for the `vigia-frontend-8084` Firebase project (`.firebaserc`, `firebase.json`):
```bash
npm run build
```
```bash
firebase deploy --only hosting
```
The existing Firebase release remains the previous demo. Before publishing this integrated version, set `VITE_USE_IN_MEMORY_API="false"`, configure `VITE_LEARNING_PLATFORM_API_URL` with the deployed HTTPS API URL (or a configured hosting rewrite), and allow the Firebase origin in backend CORS. The current production environment still contains the previous mock configuration; do not deploy it as a connected release. A successful build alone does not verify cloud connectivity.

## Environment Variables
Environment files included:
- `.env.development`
- `.env.production`

Main variables:
- `VITE_LEARNING_PLATFORM_API_URL`: base URL of the API (`/api/v1` in both environments).
- `VITE_USE_IN_MEMORY_API`: `"false"` for real integration. The previous production demo configuration is retained until cloud deployment.
- `VITE_BACKEND_URL`: local development proxy target; defaults to `http://localhost:5125`.
- Endpoint paths, one per resource:
  - `VITE_PROJECTS_ENDPOINT_PATH`, `VITE_MATERIALS_ENDPOINT_PATH`, `VITE_INVENTORY_MOVEMENTS_ENDPOINT_PATH`
  - `VITE_ORDERS_ENDPOINT_PATH`, `VITE_DISPATCHES_ENDPOINT_PATH`
  - `VITE_VEHICLES_ENDPOINT_PATH`, `VITE_GEOFENCES_ENDPOINT_PATH`, `VITE_TELEMETRY_ENDPOINT_PATH`
  - `VITE_ROUTES_ENDPOINT_PATH`
  - `VITE_RECEPTIONS_ENDPOINT_PATH`, `VITE_UPCOMING_ARRIVALS_ENDPOINT_PATH`
  - `VITE_DISCREPANCY_CASES_ENDPOINT_PATH`, `VITE_ACTIVITY_RECORDS_ENDPOINT_PATH`
  - `VITE_USERS_ENDPOINT_PATH`, `VITE_SIGNIN_ENDPOINT_PATH`, `VITE_SIGNUP_ENDPOINT_PATH`
- `VITE_PRIME_UI_LICENSE_KEY`: PrimeVue license key.

Tip: to use a real backend, set its URL in `VITE_LEARNING_PLATFORM_API_URL` and `VITE_USE_IN_MEMORY_API="false"`.

## Routing Notes
- `/` redirects to `/inicio` (Home).
- Main routes: `/inicio`, `/obras`, `/materiales`, `/solicitudes`, `/despachos`, `/transporte`, `/recepciones`, `/problemas`, `/historial`, `/configuracion`.
- Form pages: `/despachos/nuevo`, `/transporte/unidades/nueva`, `/transporte/unidades/:id/gps`, `/recepciones/nueva`, `/recepciones/:id/discrepancia`.
- Detail pages: `/solicitudes/:id`, `/problemas/:id`.
- Each route declares its allowed roles in `meta.roles`; a global `beforeEach` checks them and sets the document title.
- `/iam/sign-in` and `/iam/sign-up` are public; other routes require a valid local session. The backend independently enforces authentication and roles. The role selector only offers the perspectives granted to the authenticated account.

## API and Data Notes
- The mock dataset lives in `server/data`, one JSON file per collection grouped by bounded context: `projects`, `materials`, `inventoryMovements`, `orders`, `dispatches`, `vehicles`, `geofences`, `unassociatedTelemetryEvents`, `routes`, `receptions`, `upcomingArrivals`, `discrepancyCases`, `activityRecords` and `users`.
- `server/routes.json` maps `/api/v1/*` to those collections and exposes kebab-case paths (for example `/api/v1/upcoming-arrivals`).
- `server/middleware.cjs` holds the business rules of the mock API: duplicate license plate or GPS device (409), one geofence per site, reception registration, quantity comparison and evidence upload.
- To add a collection, create `server/data/<bounded-context>/<collection-name>.json` with an array; it is loaded automatically.

## Internationalization
- Translations live in `src/locales/en.json` and `src/locales/es.json`.
- The ES / EN switch in the top bar changes the language and remembers the choice in the browser.

## Git Workflow
- **GitFlow:** `main` holds released versions and `develop` integrates work. Each change goes in a `feature/*` branch created from `develop` and merged back into `develop` with `--no-ff`.
- **Conventional Commits 1.0.0:** `type(scope): description`, for example `feat(transit-traceability): add route domain model` or `fix(i18n): keep a language always selected`.
- **Changes:** see `CHANGELOG.md`.

## Recommended Development Practices
- Keep each feature inside its bounded context first; move code to `shared` only when it is truly cross-context.
- Preserve layer boundaries: presentation never calls raw HTTP clients directly.
- Use the color tokens of `src/style.css` instead of hardcoded colors.
- Add both English and Spanish texts for every new UI string.
- Prefer explicit domain language in naming and docs.

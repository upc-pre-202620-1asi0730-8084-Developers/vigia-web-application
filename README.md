# Vigía Frontend (`vigia-frontend`)

## Overview
Vigía is a construction materials traceability platform by Trazza Labs. It follows each material from the warehouse to the construction site: orders, dispatches, transport tracking, site reception and discrepancy management, so missing or damaged materials are detected in time.

This repository holds the web client, a Vue 3 + Vite single-page application organized with a domain-driven design (DDD) style: every feature lives in its own bounded context, and business concepts stay separated from UI and infrastructure concerns.

- **Live app:** https://vigia-frontend-8084.web.app
- **Landing page:** https://upc-pre-202620-1asi0730-8084-developers.github.io/vigia-website/

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
The hosted Firebase release is connected to the deployed REST API in Azure (`https://vigia-api-8084.northcentralus.cloudapp.azure.com/api/v1`) with `VITE_USE_IN_MEMORY_API="false"`. Ensure `VITE_PRIME_UI_LICENSE_KEY` is configured in `.env.production` before running `npm run build` and `firebase deploy --only hosting`.

## Environment Variables
Environment files included:
- `.env.development`
- `.env.production`

Main variables:
- `VITE_LEARNING_PLATFORM_API_URL`: base URL of the API (`/api/v1` in development with Vite proxy; Azure HTTPS URL in production).
- `VITE_USE_IN_MEMORY_API`: `"false"` for real backend integration (`"true"` enables the in-browser mock adapter for offline demos).
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

## Resident material requests

Residents can open **Material Orders → New material request** and select an assigned project and its requestable materials. The form sends numeric project/material IDs and positive whole quantities through the application store. The API supplies the requester identity, material names/units and request code. A successful request starts as `PENDING`; the detail page preserves its numeric route ID and displays the business code.

Residents can read their own requests and see warehouse acknowledgement after review. Approval controls remain restricted to warehouse/admin perspectives. While the warehouse request list is visible, it refreshes every 15 seconds and announces new pending requests; manual refresh is also available. This is an in-app queue, not an email or push-notification service.

This feature requires the backend request-catalog/submission endpoints and `AddOrderRequesterAccount` migration. An empty assigned-project catalog shows an explicit message rather than fabricating demo data. English and Spanish labels are included. The feature does not publish a release or change Firebase configuration.

## Dispatch net weighing

Warehouse/admin users can open **Dispatches → View weighing** to assign an existing vehicle, record net material weight, expected weight and absolute tolerance in kg, and read the persisted history. All three inputs are required for a comparison and allow at most three decimal places; tolerance may be zero. The backend determines the inclusive comparison, operator, timestamp and whether a measurement remains current after load/vehicle changes. Historical values are preserved. Material quantities are displayed in their original units and never inferred as kg.

The form is available only in `IN_PREPARATION` with an assigned vehicle; other states expose history. Each submission includes a UUID saved with its exact payload in session storage, scoped by account and dispatch. Ambiguous failures retain and lock that payload across reloads; **Retry the same weighing** reuses the UUID rather than recording another measurement. A successful write is distinguished from a failed subsequent history refresh. HTTP conflicts require refreshing before another submission.

Requires the backend `feature/dispatch-weighing` endpoints and `AddDispatchNetWeighings` migration. Run `node --test scripts/verify-weighing.test.mjs` and `npm run build`. Local browser verification covered vehicle assignment, inclusive tolerance, out-of-tolerance review, zero tolerance, history after reload, changed-vehicle invalidation, ES/EN, closed dispatch, missing dispatch and an actual response lost after persistence followed by an idempotent retry (one stored measurement). Azure validation and deployment remain part of the release checklist; guide issuance and departure authorization are available through the delivery-guide view.

Warehouse/admin can open the delivery guide from Dispatches or the weighing view. A current weighing within tolerance and an assigned vehicle are required. Enter the driver and carrier, then issue the guide and authorize departure. The server supplies the immutable cargo snapshot, guide number and operator. The guide view preserves the exact request across ambiguous failures and reloads so retrying does not issue another guide.

After issuance, load, vehicle and new weighing controls are locked. Register departure only when the vehicle actually leaves; the API verifies authorization before changing the status to `IN_TRANSIT`. The resident confirms receipt later through the separate reception workflow. Requires `AddDispatchDeliveryGuides`; run `node --test scripts/verify-weighing.test.mjs scripts/verify-guide.test.mjs` and `npm run build`.

Fleet registration and GPS pairing use fresh server state, bounded requests and locked submission controls. If vehicle registration succeeds but its optional GPS is occupied, the vehicle stays registered and the interface identifies the owning plate. Ambiguous vehicle/GPS writes query server state before reporting success. Validation and conflict messages are localized in English and Spanish.

Geofences select job sites from the real project catalog. For a warehouse, enter a stable code and its name instead of choosing a demonstration property. Select the circular center and a radius of 10 to 50,000 meters that covers the whole property. Duplicate company/site registration is rejected. Requires the backend `AddGeofenceSiteRegistrations` migration; run `node --test scripts/verify-fleet.test.mjs scripts/verify-weighing.test.mjs scripts/verify-guide.test.mjs` and `npm run build`. GPS timestamp ordering and active transit-route integration use the departure flow below.

## Start a trip and follow its GPS

After issuing a delivery guide, warehouse/admin opens **Register departure** and selects the actual origin warehouse, estimated arrival in local time and planned path. The map starts with the warehouse/site centers and accepts intermediate points in travel order. Confirm actual departure before submitting. The backend atomically checks current weighing, guide, GPS, geofences and vehicle availability; the browser retains the exact UUID and payload across an ambiguous response or reload, with a retry action instead of a second trip.

The confirmation links to the created route in **Transportation → Transit tracking**. Tracking refreshes on entry, every 15 seconds while visible, and on demand; a failed refresh retains the last received information with an error. Device-bound and historical routes are distinguished. The simulator is available only in the in-memory demo mode, never as a substitute for real API GPS ingestion. A closed trip remains historical even if its dispatch is still shown as in transit.

The destination resident sees upcoming arrivals for assigned projects, refreshed every 15 seconds with an in-app announcement. Receipt comparison/confirmation remains the separate reception workflow. Requires backend `AddDispatchTripsAndPositionOrdering`; run `node --test scripts/verify-departure.test.mjs scripts/verify-fleet.test.mjs scripts/verify-guide.test.mjs scripts/verify-weighing.test.mjs` and `npm run build`. No new cloud release is implied by local verification.

Row13 verifies frontend boundaries with `node --test scripts/verify-integration-contracts.test.mjs scripts/verify-case-contracts.test.mjs`. Case conversion preserves the reception ID, case number and closure metadata supplied by the API, alongside its dispatch ID. `docs/reviews/integration-contracts-review.json` records the actual local integration findings and the separate A01/A02/A03 handoff. It does not certify receipt authorization, dispatch closure or stored photo upload; these remain acceptance gates before the final release.

# Geofence and telemetry interface review

Reviewed on 2026-11-24 for schedule row 10. Baseline after row 9: frontend `7e434e2`, backend `687f2db`. The user approved circular geofences: select a center and radius that covers the property, without polygon drawing.

The existing view displays Leaflet circles and submits center/radius to the real fleet API. Five direct domain checks passed for center, inside/outside points, null containment and zero distance. This review did not execute a new browser map acceptance test.

## Work for row 11

- Replace the five hardcoded demonstration properties with authoritative project/site selection and explicit warehouse configuration. Do not treat demonstration IDs as production records.
- Reconcile the frontend maximum radius of 5,000 meters with the server's 50,000-meter limit; preserve the 10-meter minimum.
- Align duplicate-site behavior. The UI expects a `409`, but repeated company/site geofences are currently created with `201`.
- Validate field lengths and show loading/request failures explicitly; prevent repeated submission or editing of a pending request. Verify the map after tab changes and at mobile sizes during implementation.
- Align translated feedback and generated names with the active language rather than hardcoded Spanish text.

## Work for row 12

The tracking store generates reports through `TelemetrySimulator` and persists a route separately. `/telemetry/reports` currently updates a vehicle position without appending the device report to an active dispatch route. Keep simulation distinct from accepted GPS-device tracking. Missing coordinates and reports older than the latest position also require server handling; local HTTP diagnostics confirmed zero-default latitude and replacement by an older position.

Backend verification used isolated local data: 34 expected-status HTTP checks, five diagnostic requests, eight C# domain checks and a direct query confirming one retained unknown-device event. No Azure or physical GPS test was performed. Implementation and final product acceptance remain pending.

## Row 11 implementation

The reviewed interface defects are addressed by fresh vehicle reads, bounded requests, guarded submissions, structured localized conflicts, server-confirmed recovery of uncertain vehicle/GPS writes, and real project selection. Warehouse geofences use an explicit code/name, and radius limits match the API. Local UI verification covers registration with an occupied GPS, the actual owning plate in both languages, successful pairing, real project selection, duplicate geofence rejection and persistence after reload. Device timestamp ordering and active route integration remain in row 12.

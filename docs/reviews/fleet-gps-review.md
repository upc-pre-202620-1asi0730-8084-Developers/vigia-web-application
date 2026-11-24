# Fleet and GPS interface review

Reviewed on 2026-11-24 for schedule row 9 and US-18. Frontend baseline: `0936957`; backend baseline: `d47cbb1`. The existing registration and pairing screens use the real fleet API/store. This review identifies work for row 11; it does not change application behavior.

## Findings for row 11

- Align conflict handling with `FLEET_DEVICE_ALREADY_ASSIGNED` and `FLEET_DUPLICATE_LICENSE_PLATE`. The current occupied-device response includes the owning plate in its message, while the UI expects `assignedLicensePlate` and can display the generic Spanish fallback instead of the actual vehicle.
- Load the selected vehicle freshly by ID. A populated cached list currently prevents a fresh fetch on the pairing page; handle missing records and loading failures explicitly.
- Guard repeated submissions synchronously and prevent edits or navigation while pairing is pending. Bound fleet requests so a failed connection does not leave the operation waiting indefinitely.
- Keep the distinction between a registered vehicle and an optional GPS pairing that failed. Do not tell the user to repeat registration after the vehicle already exists.
- Align form constraints with the corrected server lengths, plate format and stored capacity precision. Local diagnostics found long inputs returning `500`, punctuation-only plates accepted and capacity `0.001` persisted as zero.
- Coordinate the displayed position after GPS replacement with the telemetry review; the API currently retains the previous device's position.

These interface findings came from code inspection. Row 9 did not execute a new browser acceptance test. Backend HTTP verification used isolated local data: 29 principal checks, five diagnostic requests and a seven-request concurrent scenario. Concurrent GPS assignment yielded one `200`, one `409` and one owner. No cloud deployment occurred. US-18 remains partial pending implementation and integrated acceptance.

## Row 11 implementation

The reviewed interface defects are addressed by fresh vehicle reads, bounded requests, guarded submissions, structured localized conflicts, server-confirmed recovery of uncertain vehicle/GPS writes, and real project selection. Warehouse geofences use an explicit code/name, and radius limits match the API. Local UI verification covers registration with an occupied GPS, the actual owning plate in both languages, successful pairing, real project selection, duplicate geofence rejection and persistence after reload. Device timestamp ordering and active route integration remain in row 12.

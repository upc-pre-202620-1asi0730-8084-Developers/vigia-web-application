# A12 — Lista de Comprobación de Usabilidad, Accesibilidad y Aporte al Ensayo Final (TB2)

**Responsable:** Cárdenas Huaman, Mathias Andree (`Usuario353`)  
**Rama:** `fix/reception-accessibility` (`vigia-web-application`) + `feature/contact-requests` (`vigia-website`)  
**Fecha de auditoría:** 2026-11-26  
**Alcance:** Vistas del Bounded Context *Site Reception & Verification* (perspectiva Responsable de Obra, perspectiva Supervisor, registro de recepción, reporte de discrepancia con fotos y galería de evidencias) y formulario de contacto del Landing Page. Complementa la base global integrada por Elías Ramos en `fix/i18n-accessibility` (`2aaf32b`).

---

## 1. Lista de comprobación técnica (Teclado, ARIA, Mensajes e Idioma ES/EN)

| Área | Criterio comprobado | Estado | Corrección / Evidencia aplicada |
|---|---|---|---|
| **Teclado y foco** | Selector de perspectiva (*Responsable de Obra* / *Supervisor*) navegable con `Tab` y foco visible (`:focus-visible`) | Verificado | `reception-management-view.vue`: añadido `role="group"`, `:aria-label`, `:aria-pressed` y borde `:focus-visible`. |
| **Teclado y foco** | Filas de tablas de recepciones activables sin ratón (`Tab`, `Enter` y `Espacio`) | Verificado | `site-manager-reception-view.vue` y `supervisor-reception-view.vue`: añadido `tabindex="0"`, `@keydown.enter.prevent`, `@keydown.space.prevent`, `:aria-selected` y `:focus-visible`. |
| **Semántica** | Eliminación de enlaces ficticios `javascript:void(0)` y miniaturas `<div>` clicables | Verificado | Sustituidos por `<button type="button">` semánticos con `:aria-label` para *Ver todos*, *Ver fotos*, *Limpiar filtros* y miniaturas de evidencia. |
| **ARIA y etiquetas** | Botones de solo icono (*Cerrar detalle*, *Más opciones*, *Página anterior/siguiente*) con nombre accesible | Verificado | Añadido `:aria-label` localizado en `site-manager-reception-view.vue` y `supervisor-reception-view.vue`; iconos decorativos marcados con `aria-hidden="true"`. |
| **ARIA y formularios** | Asociación explícita `<label for>` ↔ `id`/`input-id`, `<fieldset>`/`<legend>` y `aria-describedby` | Verificado | `register-reception-page.vue` (`for="receipt-arrival"`, `<fieldset>` para checklist, contador de caracteres `aria-describedby`) y `supervisor-reception-view.vue` (`sup-filter-project`, `sup-filter-status`, `sup-filter-date`, `sup-rows-per-page`). |
| **ARIA y estado en vivo** | Errores y confirmaciones anunciados por lectores de pantalla (`role="alert"` / `role="status"`) | Verificado | `register-reception-page.vue` (`role="alert" aria-live="assertive"`), `report-discrepancy-page.vue` (`aria-live="polite"`, guía visible cuando falta foto u observaciones) y `reception-management-view.vue` (carga con `role="status"`). |
| **Barras y paneles** | Panel lateral `<aside>` etiquetado y barras de comparación con `role="progressbar"` | Verificado | `site-manager-reception-view.vue` y `supervisor-reception-view.vue`: `:aria-label` en `<aside>`, `role="progressbar"` con `aria-valuenow`/`aria-valuemin`/`aria-valuemax`. |
| **Idioma ES/EN** | Eliminación de textos híbridos o fijos en español/inglés en filtros, encabezados y etiquetas | Verificado | Opciones de filtros de fecha, proyecto, estado, totales y etiquetas movidos a `src/locales/en.json` y `src/locales/es.json` con paridad exacta verificada por pruebas automatizadas. |
| **Landing Page** | Formulario de suscripción (`#contacto`) accesible por teclado, validación por campo y mensajes ES/EN | Verificado | `vigia-website` (`feature/contact-requests`): `<label for>`, `aria-required`, `aria-invalid`, `aria-describedby`, `role="alert"` por campo y foco automático al primer campo incompleto. |

**Pruebas automatizadas ejecutadas:** `node --test scripts/*.test.mjs` (`34/34` en verde, incluidas 4 pruebas nuevas en `scripts/verify-reception-accessibility.test.mjs` y paridad completa de `en.json` / `es.json`) + `npm run build` (`vite build` sin errores).

---

## 2. Aporte al ensayo y sustentación final (máximo 12 minutos para el equipo)

### Distribución sugerida de tiempos (12 min totales — 4 integrantes activos)

| Bloque | Tiempo | Responsable | Contenido clave |
|---|---:|---|---|
| 1. Problema, propuesta de valor y Landing Page + Contacto | 2 min | Leonardo López | Contexto Trazza Labs / Vigía, segmentos, Landing Page publicado con formulario conectado (`TS-06`) y flujo de pedidos/pesaje/guía (`US-03`, `US-04`, `US-05`). |
| 2. Arquitectura, Flota, GPS, Tránsito y Despliegue | 3 min | Fabián Sandoval | Arquitectura DDD/C4, MySQL + migraciones EF Core, flota/geocercas (`US-18`, `US-19`), inicio de traslado y telemetría (`US-06`, `TS-08`), Scalar con Bearer auth y despliegue en la nube. |
| 3. **Recepción en obra, comparación, permisos y usabilidad** | **3 min** | **Mathias Andree Cárdenas** | **Demostración en vivo de recepción conforme y discrepante (`US-09`, `TS-04`, `US-10`), guía inmutable del servidor, autorización por proyecto (`403`/`404`), cierre atómico e idempotente, accesibilidad/teclado ES/EN.** |
| 4. Evidencia fotográfica, casos, PDF y colaboración GitFlow | 3 min | Elías Ramos | Persistencia real de fotos protegidas, caso de discrepancia con línea de tiempo y reporte PDF, evidencias de colaboración en los repositorios y resultados de validación. |
| 5. Cierre y conclusiones | 1 min | Equipo (Team Leader) | Resumen de logros, reconciliación transparente de Sprints 5/6 y cierre. |

*(Cumple la pauta: >= 40% demostración en operación y >= 20% evidencias de colaboración).*

### Guión breve de la intervención de Mathias Andree (3 minutos)

1. **Apertura (25 s):** *"Como responsable del Bounded Context Site Reception & Verification, demuestro cómo el Residente de Obra cierra el ciclo de trazabilidad al recibir los materiales en obra, protegiendo la integridad entre almacén y obra."*
2. **Escenario 1 — Recepción conforme atómica (60 s):**
   - Mostrar la lista de próximas llegadas y abrir *Registrar recepción*.
   - Señalar que el `dispatchId` y la guía de remisión (`GD-...`) provienen del servidor y están bloqueados para impedir suplantaciones (`F13-06`).
   - Cotejar cantidades iguales, guardar y confirmar recepción: el API cierra en una sola transacción la recepción (`ConformantClosed`), el despacho (`Completed`) y libera la ruta/vehículo en tránsito (`F13-02`), garantizando idempotencia ante reintentos (`requestId` + `Version`).
3. **Escenario 2 — Discrepancia con fotografía protegida (55 s):**
   - Registrar recepción con cantidad menor a la despachada y abrir *Reportar discrepancia*.
   - Subir evidencia fotográfica antes de verificar (`POST /receptions/{id}/evidence/files`), completar observaciones y emitir el reporte: se crea un único caso vinculado accesible directo desde el botón *Ver caso*, y las miniaturas se cargan con token Bearer autenticado.
4. **Seguridad, usabilidad y aportes de gestión (40 s):**
   - Indicar que un residente no asignado al proyecto recibe `403`/`404` y no puede alterar la recepción (`F13-03`/`F13-07`).
   - Mostrar el cambio rápido de idioma ES/EN y navegación por teclado (`Tab`/`Enter` en filas, paneles y alertas accesibles), además de la planificación del Sprint 4 (`5.2.4.1–5.2.4.3`) y la conexión del formulario de contacto del Landing (`TS-06`).

### Preguntas frecuentes preparadas para la defensa

- **¿Qué pasa si se pierde la conexión justo al confirmar una recepción o reportar una discrepancia?**  
  El cliente guarda un `requestId` UUID en `sessionStorage` y lo reenvía en el reintento; el backend valida `RegisterRequestId` / `VerifyRequestId` y `Version` (concurrencia optimista) para devolver el estado confirmado sin duplicar recepciones ni casos.
- **¿Cómo evitan que un residente manipule una guía de otro despacho o de otra obra?**  
  El backend resuelve el proyecto real a partir del despacho en base de datos, verifica que el residente autenticado esté asignado a esa obra (`403`/`404` si no corresponde) y exige coincidencia exacta con la `DispatchDeliveryGuide` emitida por almacén.
- **¿Por qué los Sprints 5 y 6 del Product Backlog no figuran como cerrados al 100%?**  
  Por trazabilidad honesta en `5.2.4.1`: el calendario cierra en Sprint 4 (TB2). Se adelantaron capacidades clave de casos/fotos/PDF como soporte a `US-10`, pero la sincronización por lotes offline (`Sprint 6`) y pagos en vivo se documentan explícitamente como evolución futura.
- **¿Por qué mantienen Scalar en lugar de Swagger UI?**  
  Es una decisión técnica acordada por el equipo para .NET 10 OpenAPI; en Sprint 4 se configuró el esquema de seguridad Bearer en OpenAPI para probar los 73 endpoints protegidos directamente desde Scalar.

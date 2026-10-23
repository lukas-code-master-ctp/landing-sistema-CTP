# Plan — Google Analytics 4 en cierra.cl

**Spec:** `docs/specs/2026-10-23-google-analytics-spec.md`.
**Rama:** `claude/project-thread-davy68`, un commit por tarea, PR a `main` sin mergear.
**Ejecución:** un subagente por tarea y otro que la revisa antes de la siguiente.
Las tareas tocan `index.html` y `legal.html`, así que van en secuencia.

## T1 — Tag y aviso de cookies
- `assets/analitica.js` adaptado de tapcar (`nfc-landing/assets/analitica.js`):
  ID GA4, clave `cierra-consentimiento`, `cookie_domain: 'none'`, `cierraEvento`,
  galleta SVG, botones `btn btn-outline`/`btn btn-primary`, enlace a
  `legal.html#pp-cookies`.
- `assets/analitica.css` con la tarjeta (360 px, celular a lo ancho, foco,
  reduced motion).
- `<link>` y `<script src="assets/analitica.js">` en `index.html` y `legal.html`,
  junto a Vercel.
- `tools/test_analitica.js` con las pruebas de la lógica.
- Commit: "Analítica: GA4 con modo de consentimiento y aviso de cookies".

## T2 — Eventos de conversión
- Mapeo de eventos en `analitica.js` (`#demo`, app.cierra.cl, `mailto:`).
- `data-ubicacion` en cada CTA de las dos páginas.
- `cierraEvento('enviar_formulario', …)` en el éxito del formulario de demo.
- Botón "Preferencias de cookies" en el pie de las dos páginas.
- `tools/test_html.js` y tests de eventos.
- Commit: "Analítica: eventos de los CTA, formulario de demo y preferencias de cookies".

## T3 — Texto legal y README
- `legal.html`: 2.2, 2.3, 2.4, 2.5, 2.6, 2.8, fecha y comentario de cabecera.
- README: sección "Analítica" (cómo correr los tests, eventos, ID).
- Commit: "Legal: Google Analytics, cookies y consentimiento".

## T4 — QA
- `python -m http.server`, Playwright en escritorio y celular: aviso, aceptar,
  rechazar (cookies borradas), reabrir desde el pie, foco con Tab, eventos en
  `dataLayer`, legal. Capturas a `/mnt/project-files/ga4-cierra/`.

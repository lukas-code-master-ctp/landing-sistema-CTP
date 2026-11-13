# Plan — landing de campaña `/demo/`

Spec: `docs/specs/2026-11-13-landing-campana-demo-spec.md`. Un commit por tarea.

## Tarea 1 — Landing `/demo/` y sus estilos
- `assets/demo.css`: base (reset, `.wrap`, botones, eyebrow), cabecera, hero en dos columnas
  (una en celular, con el formulario antes de la lista), formulario (inputs de 16 px), logos,
  tarjetas, testimonios, pasos, FAQ, banda final, pie, barra fija de celular. Reutiliza los
  tokens de `assets/colors_and_type.css` y los valores de la portada.
- `demo/index.html`: contenido y textos del spec, rutas absolutas, íconos SVG en línea,
  `noindex, follow`. Script: envío a `/api/demo` (copiado de la portada), redirección a
  `/demo/gracias/#<eventId>` tras el 200, y barra fija con IntersectionObserver.

## Tarea 2 — Página de gracias y Lead
- `demo/gracias/index.html`: contenido del spec. Script después de analitica.js y
  meta-pixel.js: valida el hash (UUID), dispara `enviar_formulario` y `cierraMeta.lead`,
  borra el hash.

## Tarea 3 — Origen en el aviso, pruebas y README
- `api/demo.js`: fila "Origen" (función pura `origenLegible(pagina)` exportada para probar).
- `tools/test_demo.js` (nuevo): noindex, fuera de sitemap y llms.txt, sin nav ni enlaces de
  fuga, rutas absolutas, 4 campos con sus `name`, redirección después de `res.ok`, la landing
  no dispara `enviar_formulario` ni `cierraMeta.lead`, la de gracias sí y solo con hash
  válido, sin voseo.
- `tools/test_html.js`: suma las dos páginas (prefijo `/`). `tools/test_capi.mjs`: prueba de
  `origenLegible`.
- README: estructura, sección "Landing de campaña", comando de pruebas.

## Verificación y QA
- Todas las pruebas de `tools/`.
- Servidor local con `/api/demo` simulado; capturas en 1440 y 390 px de la landing, el error,
  y la de gracias; comprobar eventos (dataLayer y fbq) con consentimiento aceptado y
  rechazado; recargar la de gracias no repite.

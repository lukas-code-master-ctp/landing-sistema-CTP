# Plan: píxel de Meta en cierra.cl

**Spec:** `docs/specs/2026-11-05-meta-pixel-spec.md`. **Rama:** `claude/project-thread-1xpmdo`,
un commit por tarea, PR a `main`. Un subagente por tarea y otro que la revisa.

## T1: Consentimiento v2 + píxel base
- `assets/analitica.js`: VERSION 2, formato `{v, analitica, publicidad, fecha}`, texto del
  aviso con Meta, borrar `_fbp`/`_fbc` al rechazar, `window.cierraConsentimiento()` y el
  evento `cierra:consentimiento` en `document` al decidir.
- `assets/meta-pixel.js` (nuevo): constante del ID, carga perezosa con consentimiento,
  `init` + `PageView` una vez, revoke al rechazar, ViewContent en `#demo`,
  `window.cierraMeta.lead(eventId)`.
- Script en `index.html` y `legal.html` después de `analitica.js`.
- `tools/test_analitica.js` y `tools/test_meta.js` (nuevo) + `tools/test_html.js`.
- Commit: "Meta: píxel con consentimiento y ViewContent".

## T2: Lead + API de conversiones
- `index.html`: UUID antes del envío, campos `meta_*` en el cuerpo, `cierraMeta.lead` en
  la rama de éxito.
- `api/_meta-capi.js` (nuevo, funciones puras: normalizar y hashear, armar el evento) y
  su llamada en `api/demo.js`.
- `tools/test_capi.js` (nuevo).
- Commit: "Meta: evento Lead y API de conversiones".

## T3: Legal y README
- `legal.html` 2.2–2.8, fecha y cabecera; README (Meta, variables, pruebas).
- Commit: "Legal: píxel de Meta y publicidad".

## T4: QA local
- `python -m http.server` + Playwright con `fbevents.js` interceptado: sin aceptar no
  se descarga; aceptar → init + PageView; ViewContent; Lead con 200 y no con 500;
  rechazar borra cookies. Escritorio y celular. Capturas a `/mnt/project-files/meta-pixel/`.

## T5: Blog (spec `docs/specs/2026-11-05-blog-spec.md`)
- `blog/index.html`, `blog/financiar-venta-parcelas-sin-banco.html`, `blog/_plantilla.html`,
  `vercel.json` con `cleanUrls`, link en nav/menú móvil/pie de las páginas, `sitemap.xml`,
  `llms.txt`, README, `tools/test_blog.js` y `tools/test_html.js` con las páginas del blog.
- Commit: "Blog: lista, primera entrada y link en el menú".

# Google Analytics 4 en cierra.cl

Fecha: 2026-10-23
Estado: aprobado ("todo ok", Lukas, 2026-10-23). Sin botón de WhatsApp.
Referencia: tapcar.cl (repo `nfc-landing`, PR #2 y #3), cuyo `assets/analitica.js`
y sus tests se copian y se adaptan.

## Qué se pidió

Medir el sitio público cierra.cl en Google Analytics 4, con modo de
consentimiento v2 avanzado, aviso de cookies, eventos de los CTA principales y
el texto legal al día. Vercel Web Analytics se queda en paralelo.

## Decisiones

1. **Propiedad:** "Cierra" (sin corchetes), zona America/Santiago, moneda CLP,
   flujo web `https://cierra.cl` con medición mejorada, en la cuenta de
   Analytics de lukas@impulseai.cl. Se reúsa si ya existe. andres@impulseai.cl
   como Lector de la propiedad. Se configura en la consola de Google, desde el
   Chrome IMPULSEAI del PC de Lukas. La app (app.cierra.cl) queda fuera.
2. **Consentimiento (modo avanzado):** default todo denegado
   (`analytics_storage`, `ad_storage`, `ad_user_data`, `ad_personalization`,
   `wait_for_update: 500`). "Aceptar" concede solo `analytics_storage`; la
   publicidad queda siempre denegada. "Rechazar" deja todo denegado y borra
   `_ga` y `_ga_<ID>`. La decisión vive en `localStorage`, clave
   `cierra-consentimiento`, `{ v: 1, analitica, fecha }`. Si el storage falla,
   el aviso vuelve en cada página y nada se rompe.
3. **Cookie solo en `cierra.cl`** (`cookie_domain: 'none'`, cookie de host):
   no viaja a app.cierra.cl ni a los subdominios de las loteadoras
   (`{slug}.cierra.cl`). Sin linker.
4. **Aviso:** tarjeta chica abajo a la izquierda (máx. 360 px; en celular a lo
   ancho con 12 px de margen), galleta en SVG inline decorativa, texto
   "Usamos cookies de Google Analytics para saber qué partes del sitio sirven."
   + enlace "Más información" a `legal.html#pp-cookies`. Botones "Rechazar"
   (blanco con borde, `btn-outline`) y "Aceptar" (verde de marca,
   `btn-primary`), del mismo tamaño y en la misma fila. Se inserta al inicio del
   `body` (fácil de alcanzar con teclado); mientras se ve, la página reserva su
   alto con `padding-bottom` y `scroll-padding-bottom` para que no tape el foco
   (WCAG 2.4.11). Respeta `prefers-reduced-motion`. El pie de las dos páginas
   suma un botón "Preferencias de cookies" que lo reabre y le pasa el foco.
5. **Eventos** (todos con `ubicacion`, de `data-ubicacion`; sin atributo se manda
   `sin-ubicacion` para que se note):
   | Evento | Cuándo | Parámetros |
   | --- | --- | --- |
   | `clic_solicitar_demo` | clic en un enlace a `#demo` (o `index.html#demo`, `/#demo`) | `ubicacion`, `texto` |
   | `enviar_formulario` | `/api/demo` responde OK | `formulario: demo`, `ubicacion` |
   | `clic_ingresar` | clic en un enlace a `https://app.cierra.cl` | `ubicacion` |
   | `clic_correo` | clic en `mailto:` | `ubicacion` |
   Los eventos van también a Vercel (`va('event')`), con máximo dos
   propiedades. Ninguno detiene la navegación.
6. **Vercel Web Analytics** sigue tal cual en las dos páginas.
7. **Legal (`legal.html`), en el mismo PR:** se reescribe 2.8 (qué mide GA4,
   cookies `_ga`/`_ga_<ID>` de hasta 2 años, señales sin cookies si rechazas,
   cómo cambiar la decisión, Vercel sin cookies) y se ajustan 2.2, 2.3, 2.4
   (Google Analytics en la tabla), 2.5 (datos fuera de Chile), 2.6 (retención
   de GA), la fecha y el comentario de cabecera. Se mantiene "no los usamos
   para publicidad".

## Implementación

- `assets/analitica.js`: ES5, sin dependencias, `require`-able desde Node; la
  parte del navegador en `iniciar(win)`. Expone `window.cierraEvento`.
- `assets/analitica.css`: estilos del aviso, enlazado en las dos páginas.
- `tools/test_analitica.js` y `tools/test_html.js` (Node, sin dependencias):
  lógica de consentimiento, orden de comandos, borrado de cookies, mapeo de
  eventos, y que todo CTA (`.btn`, enlaces a `#demo`, a la app y `mailto:`)
  tenga `data-ubicacion`, que las dos páginas carguen el tag y Vercel, y que
  tengan el botón de preferencias.

## Fuera de alcance

GA4 en la app, Tag Manager, publicidad, botón de WhatsApp.

## Riesgos

- `main` publica directo a cierra.cl: el PR queda abierto hasta el OK de Lukas.
- El texto legal y el tag salen juntos, nunca uno sin el otro.
- Si Google está bloqueado, el sitio y el formulario siguen igual.

# Landing Cierra.cl

Landing page SaaS para vender **Cierra.cl** —el software de automatización operativa que opera la venta de parcelas de punta a punta, del lead a la inscripción en el CBR, incluyendo el financiamiento del propio desarrollador— a inmobiliarias y corredoras. Implementada desde el handoff de Claude Design, usando los tokens, colores y componentes exactos del design system.

## Estructura

- `index.html` — la landing completa (una sola página, es-CL).
- `api/demo.js` — función serverless (Vercel) que procesa el formulario de demo.
- `api/_meta-capi.js` — Lead a la API de conversiones de Meta (módulo, no ruta: el `_` lo excluye). Lo usa `api/demo.js`.
- `demo/` — landing de campaña (`/demo/`, `demo/index.html`) y su página de gracias (`/demo/gracias/`, `demo/gracias/index.html`). No se indexan ni se enlazan desde el sitio. Ver [Landing de campaña](#landing-de-campaña-demo).
- `assets/demo.css` — estilos compartidos por esas dos páginas.
- `tools/test_demo.js` — pruebas de la landing de campaña y su página de gracias: noindex, fuera del sitemap, sin menú ni enlaces de fuga, rutas absolutas, los 4 campos, y la conversión medida una sola vez, en la página de gracias.
- `legal.html` — términos y condiciones y política de privacidad (incluye cookies y analítica, sección 2.8).
- `blog/` — el blog (`/blog/`): `blog/index.html` (lista), una carpeta por entrada (`blog/<slug>/index.html`) y `blog/_plantilla.html` (no se publica). Ver [Blog](#blog).
- `assets/blog.css` y `assets/blog.js` — estilos y nav (menú de celular) compartidos por las páginas del blog; `assets/blog/` — portadas de las entradas.
- `tools/test_blog.js` — pruebas del blog: cada entrada enlazada, en el sitemap, con canonical, metas y JSON-LD, sin rutas relativas ni voseo.
- `assets/analitica.js` — Google Analytics 4 con modo de consentimiento, aviso de cookies y eventos (compartido por las dos páginas).
- `assets/analitica.css` — estilos del aviso de cookies.
- `assets/meta-pixel.js` — píxel de Meta (PageView, ViewContent, Lead), solo con consentimiento; le pregunta la decisión a `analitica.js`.
- `assets/clarity.js` — Microsoft Clarity (mapas de calor y grabaciones), solo con la aceptación de analítica; le pregunta la decisión a `analitica.js`.
- `tools/test_clarity.js` — pruebas de `assets/clarity.js` con un DOM falso (Node, sin dependencias).
- `tools/test_meta.js` — pruebas de `assets/meta-pixel.js` con un DOM falso (Node, sin dependencias).
- `tools/test_analitica.js` — pruebas de `assets/analitica.js` con un DOM falso (Node, sin dependencias).
- `tools/test_capi.mjs` — pruebas de `api/_meta-capi.js`, de su llamada en `api/demo.js` y de la fila "Origen" del aviso al equipo (Node, sin red).
- `tools/test_html.js` — pruebas del HTML de las páginas (index, legal, el blog y la landing de campaña) para la analítica (tag, Vercel, botón de preferencias, `data-ubicacion`).
- `assets/colors_and_type.css` — tokens de marca, tipografía, sombras y radios (fuente de verdad del sistema).
- `assets/dashboard.png` — captura del dashboard que se muestra en "Velo en acción".
- `assets/og-cover.png` — imagen 1200×630 de la vista previa al compartir el link.
- `assets/cierra-*.svg` — isotipo y lockup de marca (el nav y el footer usan el SVG inline).
- `assets/clients/` — logos de clientes de la franja de social proof. Se pintan como
  máscara CSS, así que solo importa el canal alfa: PNG con fondo transparente,
  recortado al contorno del logo (sin margen sobrante) y con su `aspect-ratio`
  declarado en el `style` del `<span>`.

## Cómo verla

Sírvela desde un servidor estático (las fuentes cargan mejor por HTTP que por `file://`):

```bash
python -m http.server 8000
# abre http://localhost:8000
```

Dependencias externas: [Lucide](https://unpkg.com/lucide@latest) (íconos) y Google Fonts (Plus Jakarta Sans + JetBrains Mono) por CDN, Google Analytics (`gtag.js`, desde googletagmanager.com) para la medición y, solo con consentimiento, el píxel de Meta (`fbevents.js`, desde connect.facebook.net) y Microsoft Clarity (desde clarity.ms); ver [Analítica](#analítica-google-analytics-4).

## Secciones

Nav sticky · Hero con composición flotante de KPIs · logos de clientes · banda oscura de posicionamiento (flujo Lead → Reserva → Autorización → Firma → Inscripción CBR) · 9 módulos + 7 roles (`#modulos`) · "Hecho a tu medida" (`#a-medida`: Asistente Cierra con IA, flujo configurable, marca propia, multi-país y multi-moneda, integraciones, importación/exportación) · showcase "Velo en acción" · "Todo tu ecosistema" (`#ecosistema`: portal del inversionista, proyectos compartidos, corredores externos) · testimonios · 4 planes (en UF, con toggle mensual/anual) · FAQ (10 preguntas) · CTA final con formulario de demo · footer.

## Blog

`cierra.cl/blog/` es HTML escrito a mano, sin build ni CMS: una carpeta por entrada (`blog/<slug>/index.html`), así Vercel sirve `/blog/<slug>/` sin `vercel.json` ni `cleanUrls`. Lleva el mismo nav, pie, aviso de cookies, GA4, píxel de Meta y Vercel Analytics que el resto del sitio. **Todas las rutas de las páginas del blog son absolutas** (`/assets/…`, `/#demo`, `/legal.html`): una relativa apuntaría dentro de la carpeta de la entrada.

**Para agregar una entrada:**

1. Copia `blog/_plantilla.html` a `blog/<slug>/index.html` (slug en minúsculas, con guiones y sin tildes).
2. Reemplaza cada `TODO`: título (en `<title>`, `og:title`, `twitter:title`, el JSON-LD y el `<h1>`), descripciones, slug (canonical, `og:url`, `mainEntityOfPage`), fecha (`datePublished`, `<time datetime>`), tiempo de lectura (palabras / 200) y el cuerpo. Español neutro de Chile, tuteo, nunca voseo.
3. Portada: un SVG propio en `assets/blog/<slug>.svg`, 1200×630 y sin texto. `og:image` sigue siendo `/assets/og-cover.png` (los SVG no sirven para la vista previa al compartir).
4. Suma la tarjeta en `blog/index.html` (la más nueva primero) y su `BlogPosting` en el JSON-LD de esa página.
5. Suma la URL en `sitemap.xml` y en `llms.txt`.
6. Corre las [pruebas](#pruebas): `tools/test_blog.js` falla si la entrada no está enlazada, no está en el sitemap, le falta el canonical, una meta o el JSON-LD, o tiene una ruta relativa.

Todo CTA nuevo lleva su `data-ubicacion` (la entrada usa `blog-entrada`; la lista, `blog-lista`).

## Landing de campaña (`/demo/`)

`cierra.cl/demo/` es el destino de los anuncios de Meta. Tiene un solo objetivo: que la persona llene el formulario de demo. Spec: [docs/specs/2026-11-13-landing-campana-demo-spec.md](docs/specs/2026-11-13-landing-campana-demo-spec.md).

- **Solo se llega por el anuncio.** Lleva `noindex`, no está en `sitemap.xml` ni en `llms.txt` y ninguna página del sitio la enlaza. No la sumes al menú ni al pie.
- **No lleva menú, a propósito.** Sin nav, sin precios, sin blog, sin "Iniciar sesión" y sin WhatsApp; el logo no es enlace. Los únicos enlaces que salen de la página son los legales (`/legal.html`), que Meta exige tener a la vista. Todos los botones llevan a `#demo`, el formulario.
- **Formulario de 4 campos**: nombre, email de trabajo, teléfono e inmobiliaria o corredora (`nombre`, `email`, `telefono`, `empresa`). No pide el tamaño del equipo. Se envía a `POST /api/demo`, igual que el de la portada.
- **Página de gracias.** Cuando `/api/demo` responde 200, la landing redirige a `/demo/gracias/#<id del evento>`. Si el envío falla, muestra el error en el formulario y no redirige.
- **El Lead del navegador se dispara en `/demo/gracias/`, no en la landing.** Un evento lanzado justo antes de cambiar de página se puede perder, porque el navegador corta las peticiones pendientes. El id que viaja en el hash es el mismo `meta_event_id` que el servidor mandó a la API de conversiones, así Meta deduplica los dos Lead y cuenta uno. La página de gracias mide (`enviar_formulario` y `Lead`) solo si el hash es un UUID válido, y antes de medir lo borra con `history.replaceState`: recargar, volver atrás o entrar directo a `/demo/gracias/` no cuenta nada.
- **Valores de `data-ubicacion`**: `landing-demo` (el formulario y su botón de envío), `landing-demo-final` (botón de la banda final), `landing-demo-barra` (barra fija de celular) y `gracias` (enlaces de la página de gracias).
- **El aviso al equipo trae la fila "Origen"**: la ruta y los parámetros de la página desde donde se envió el formulario (por ejemplo `/demo/?utm_source=meta&utm_campaign=…`), para distinguir los leads de la campaña de los de la portada (`/`). Lo arma `origenLegible` en `api/demo.js`. La planilla no cambia: sigue recibiendo `origen: "landing/demo"`.
- **Rutas absolutas**, como en el blog: las dos páginas viven en carpetas (`/assets/…`, `/legal.html`).
- **Sin Lucide**: los íconos son SVG en línea.

URL para el anuncio (cambia `NOMBRE` por el de la campaña; los UTM llegan al aviso en la fila "Origen"):

```
https://cierra.cl/demo/?utm_source=meta&utm_medium=paid_social&utm_campaign=NOMBRE
```

## Para terminar de pulir

- **Captura real del dashboard:** el recuadro de "Velo en acción" es ahora un `<img src="assets/dashboard.png">`. Reemplaza ese archivo por la captura real cuando quieras actualizarla.
- **Precios:** los valores en UF y la capacidad de cada plan son referencias; ajústalos a los reales.

## Analítica (Google Analytics 4)

Las mismas mediciones en todas las páginas (portada, legal, blog y la landing de campaña):

- **Google Analytics 4**: propiedad "Cierra" (`560564776`), ID de medición `G-GEPXVS6GJH`, en la cuenta de Analytics de Impulse AI. Lo carga [`assets/analitica.js`](assets/analitica.js), un solo archivo compartido; los estilos del aviso están en [`assets/analitica.css`](assets/analitica.css). **El ID se cambia en un solo lugar**: la constante `ID` al principio de `analitica.js`.
- **Vercel Web Analytics**: sin cookies, cuenta todas las visitas —también las de quien rechaza— y sirve de control para comparar contra GA4.
- **Meta Pixel**: píxel "Cierra.cl - Pixel" (`4526586427599697`, portfolio Impulse AI), para medir las campañas de Instagram y Facebook. Lo carga [`assets/meta-pixel.js`](assets/meta-pixel.js), después de `analitica.js`; **el ID se cambia en la constante `ID`** de ese archivo (el servidor lo lee aparte, de `META_PIXEL_ID`). Usa el **mismo consentimiento v2** que GA4: sin `publicidad: true` no se descarga `fbevents.js`, no existe `fbq` y no hay cookies. Eventos: `PageView` al cargar; `ViewContent` (`content_name: 'Página demo'`) una vez por página, cuando `#demo` queda a la vista; `Lead` (`content_name: 'Demo Cierra'`) solo cuando `/api/demo` responde 200, con un `eventID` (UUID) para que Meta lo deduplique contra la API de conversiones (en la landing de campaña sale desde `/demo/gracias/`; ver [Landing de campaña](#landing-de-campaña-demo)). Sin datos personales en los parámetros.
- **API de conversiones de Meta**: [`api/_meta-capi.js`](api/_meta-capi.js), llamada desde `api/demo.js` después del aviso al equipo. Manda el mismo `Lead`, con el mismo `event_id`, **solo si el navegador avisó consentimiento de publicidad** (`meta_consentimiento: true`) y existen `META_PIXEL_ID` y `META_CAPI_ACCESS_TOKEN`. Datos: correo y teléfono en SHA-256 (nunca en claro; el teléfono normalizado con código de país), IP, user agent, `_fbp`/`_fbc` si existen y la URL de la página. Best-effort: un error queda en el log (sin token ni datos personales) y no cambia la respuesta del formulario.

### Consentimiento

Modo de consentimiento de Google v2, **modo avanzado**:

- Por defecto **todo denegado** (`analytics_storage`, `ad_storage`, `ad_user_data`, `ad_personalization`). En ese estado gtag no escribe cookies y manda señales sin identificador, que GA usa para modelar.
- Un solo **Aceptar** cubre Google Analytics y el píxel de Meta, y un solo **Rechazar** niega los dos.
- **Aceptar** concede en Google **solo** `analytics_storage`. Los permisos de publicidad de Google quedan **siempre** denegados: la publicidad la medimos con Meta, no con Google. Además activa el píxel de Meta.
- **Rechazar** deja todo denegado, borra las cookies `_ga`, `_ga_<ID>`, `_fbp` y `_fbc` que hubieran quedado y, si el píxel estaba cargado, le manda `fbq('consent', 'revoke')`.
- La decisión se guarda en `localStorage`, clave `cierra-consentimiento`, en formato **v2**: `{ v: 2, analitica: true|false, publicidad: true|false, fecha }`. Una decisión **v1** (anterior a Meta, solo cubría GA) se lee como ausente y el aviso vuelve a preguntar. Sin decisión válida —o si `localStorage` falla— el aviso vuelve a aparecer, gtag sigue denegado y Meta no carga.
- `window.cierraConsentimiento()` devuelve la decisión vigente y el evento `cierra:consentimiento` (en `document`) avisa cuando cambia: de eso vive `meta-pixel.js`.
- La cookie queda **solo en cierra.cl** (`cookie_domain: 'none'`): no viaja a app.cierra.cl ni a los subdominios de las loteadoras.
- El botón **"Preferencias de cookies"** del pie (`[data-preferencias-cookies]`) vuelve a abrir el aviso.

### Eventos

Cada evento va a GA4 (`gtag`) y a Vercel (`window.va`, máximo 2 parámetros por evento). Los clics en enlaces se miden por delegación; el formulario usa `window.cierraEvento(nombre, params)`.

| Evento | Cuándo | Parámetros |
|---|---|---|
| `clic_solicitar_demo` | Clic en un enlace a `#demo` | `ubicacion`, `texto` (texto visible, hasta 60 caracteres) |
| `enviar_formulario` | Respuesta OK de `/api/demo`. En la portada sale en la misma página (`ubicacion: demo`); en la landing de campaña sale desde `/demo/gracias/` (`ubicacion: landing-demo`) | `formulario` (`demo`), `ubicacion` |
| `clic_ingresar` | Clic en un enlace a `https://app.cierra.cl` | `ubicacion` |
| `clic_correo` | Clic en un `mailto:` | `ubicacion` |

**Todo CTA nuevo lleva `data-ubicacion`** (por ejemplo `data-ubicacion="hero"`): sin él, el evento sale con `ubicacion: sin-ubicacion`, y `tools/test_html.js` falla.

### Pruebas

```bash
node tools/test_analitica.js && node tools/test_meta.js && node tools/test_clarity.js && node tools/test_html.js && node tools/test_capi.mjs && node tools/test_blog.js && node tools/test_demo.js
```

Sin dependencias ni red.

⚠️ **Si cambia la analítica o la medición de anuncios** (`assets/analitica.js`, `assets/meta-pixel.js`, `assets/clarity.js` o `api/_meta-capi.js`: qué se mide, qué datos recibe Meta, qué cookies se instalan o cómo se pide el consentimiento), hay que actualizar `legal.html` (secciones 2.2, 2.3, 2.4, 2.5, 2.6 y 2.8) **en el mismo PR**.

### Verificación de dominio de Meta

Meta pide verificar `cierra.cl` en el Administrador comercial. La forma elegida es un **registro TXT en el DNS de cierra.cl**, que vive en **Vercel** (`npx vercel dns ls cierra.cl` / `npx vercel dns add cierra.cl …`, o el panel de dominios de Vercel), en la raíz del dominio y con el contenido `facebook-domain-verification=VALOR`. El valor lo entrega Meta (lo consigue Andrés). Si algún día se prefiere el método por meta etiqueta, en el `<head>` de `index.html` hay un comentario que marca dónde pegarla.

## Formulario de demo (Resend + Vercel)

El formulario "Agenda tu demo" hace `POST /api/demo` con los campos en JSON. Ese endpoint es una **función serverless** ([api/demo.js](api/demo.js)) que hace tres cosas:

1. **Avisa al equipo** por email vía [Resend] (`DEMO_TO`, con copia a `DEMO_CC`). El `reply_to` es el correo del lead, así que responder el aviso le contesta directo a él. El aviso trae la fila "Origen": la ruta y los parámetros (UTM) de la página desde donde se envió.
2. **Le confirma la recepción al cliente** por email.
3. **Empuja el lead a la planilla** que hace de CRM, si `CRM_WEBHOOK_URL` está definida.

Si la persona aceptó las cookies, además **manda el Lead a la API de conversiones de Meta** (ver [Analítica](#analítica-google-analytics-4)).

Solo el paso 1 puede voltear la respuesta: si falla, el front muestra el error. Los pasos 2 y 3 se intentan y, si fallan, quedan en los logs de Vercel sin afectar al visitante —el lead ya está a salvo en la bandeja del equipo—.

La API key vive solo en el servidor (variable de entorno), nunca en el front.

**Desplegar en Vercel:**

1. Importa este repo en Vercel (Root Directory por defecto: la raíz del repo, donde están `index.html` y `api/`).
2. **Verifica el dominio `cierra.cl` en Resend** (*Domains → Add Domain* y los registros DNS que te pida). Sin esto no funciona nada de lo anterior: el remitente de prueba `onboarding@resend.dev` solo entrega correos al dueño de la cuenta Resend, así que ni los avisos al equipo ni las confirmaciones al cliente llegan a destino.
3. En *Settings → Environment Variables* agrega:

   | Variable | Obligatoria | Default | Para qué |
   |---|---|---|---|
   | `RESEND_API_KEY` | sí | — | API key de Resend (empieza con `re_`). |
   | `DEMO_FROM` | recomendada | `Cierra.cl <no-reply@cierra.cl>` | Remitente. Debe ser del dominio verificado. |
   | `DEMO_TO` | no | `pedro@cierra.cl` | Destinatario(s) del aviso, separados por coma. |
   | `DEMO_CC` | no | `lukas@cierra.cl` | Copia(s), separadas por coma. |
   | `DEMO_REPLY_TO` | no | `contacto@cierra.cl` | Dirección a la que responde el cliente. |
   | `CRM_WEBHOOK_URL` | no | — | URL que recibe el lead en JSON para la planilla. |
   | `CRM_WEBHOOK_TOKEN` | no | — | Se manda como header `X-Auth-Token` al webhook. |
   | `META_PIXEL_ID` | para la API de conversiones | — | ID del píxel: `4526586427599697` (el mismo de `assets/meta-pixel.js`). |
   | `META_CAPI_ACCESS_TOKEN` | para la API de conversiones | — | Token de la API de conversiones. **Secreto.** Lo genera Andrés en el Administrador de eventos de Meta. Sin él (o sin el ID) no se manda nada a Meta desde el servidor. |
   | `META_TEST_EVENT_CODE` | no | — | Solo para probar: el código de "Probar eventos" del Administrador de eventos. Quitarlo después. |

4. Deploy. (Local: `vercel dev` corre la función; `python -m http.server` solo sirve el estático y el envío fallará con el mensaje de error.)

## Planilla como CRM (Google Sheets + Apps Script)

Los leads se escriben en la pestaña **Clientes Cierra** de la planilla *Development - impulsalA*. El código está en [docs/apps-script-crm.gs](docs/apps-script-crm.gs) —versionado aquí, pero **se ejecuta dentro de la planilla**, no en Vercel (por eso `docs/` está en `.vercelignore`)—. Sus instrucciones de instalación van en la cabecera del propio archivo.

⚠️ **Ese script atiende dos integraciones a la vez.** Apps Script admite una sola `doPost` por proyecto, y la planilla ya recibía los reportes del botón "Reportar error o sugerencia" de la app (pestaña *app report Cierra*, con las capturas subidas a Drive). Por eso el archivo trae un router: deriva a los leads solo cuando el JSON llega con `origen: "landing/demo"`, y cualquier otra cosa sigue el camino de los reportes. **No publiques una implementación web aparte para los leads**: hay que editar la que ya existe y publicar una versión nueva, o la app quedaría apuntando a una URL con el código antiguo.

El webhook recibe un `POST` con `Content-Type: application/json` y este cuerpo:

```json
{ "fecha": "2026-08-17T14:03:00.000Z", "origen": "landing/demo",
  "nombre": "…", "email": "…", "telefono": "…", "empresa": "…", "equipo": "…",
  "token": "…" }
```

El `token` viaja **dentro del cuerpo** porque Apps Script no recibe headers HTTP propios; el header `X-Auth-Token` se manda igual, por si el webhook algún día no es Apps Script.

El script no usa posiciones de columna fijas: lee los encabezados de la fila 1 y busca por nombre, ignorando mayúsculas y tildes. Puedes reordenar columnas o agregar una "Tamaño equipo" sin tocar el código. Las columnas que no conoce (`Cargo`, `Ticket mensual`) las deja vacías para que las llenes a mano. Cada lead entra como `Status: Lead` y `Project Stage: No comenzado`, que son valores válidos de tus listas desplegables.

[Resend]: https://resend.com

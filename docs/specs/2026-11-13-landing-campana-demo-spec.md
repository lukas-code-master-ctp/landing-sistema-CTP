# Landing de campaña "Solicita tu demo" (`/demo/`)

Fecha: 2026-11-13. Pedido por Lukas para una campaña de alcance en Meta.

## Problema

La campaña necesita un destino propio. La portada (`/`) tiene menú, precios, blog y diez
secciones antes del formulario: quien llega desde un anuncio se dispersa. Hace falta una
página con un solo objetivo: que la persona llene el formulario de demo.

## Decisiones tomadas con Lukas

| Tema | Decisión |
|---|---|
| Ruta | `cierra.cl/demo/` |
| Visibilidad | No indexada y sin enlaces desde el sitio: solo se llega por el anuncio |
| La demo | Reunión por Google Meet de unos 30 minutos |
| Prueba social | Franja de logos (con Laukén) y los 3 testimonios de la portada. No se inventan cifras |
| Formulario | 4 campos: nombre, email de trabajo, teléfono, inmobiliaria o corredora (sin tamaño del equipo) |
| Después de enviar | Página de gracias `cierra.cl/demo/gracias/` |
| Diseño | Sin menú, formulario visible al llegar en celular, sin botón de WhatsApp |

## Alcance

Entra:
- `demo/index.html` (landing) y `demo/gracias/index.html` (gracias).
- `assets/demo.css`, estilos compartidos por las dos páginas.
- El aviso al equipo (`api/demo.js`) suma una fila "Origen" con la página desde donde se
  envió (ruta y parámetros UTM), para distinguir los leads de la campaña.
- Pruebas (`tools/test_demo.js`, y las dos páginas dentro de `tools/test_html.js`) y README.

Queda fuera: cambios en la portada, en el consentimiento, en qué datos recibe Meta, en la
planilla CRM (`origen: 'landing/demo'` no cambia: el Apps Script rutea por ese valor),
pruebas A/B, WhatsApp, agenda en línea (Calendly).

## Principios de conversión aplicados

1. **Un solo objetivo**: sin menú, sin precios, sin blog, sin "Iniciar sesión". El logo no
   es enlace. Los únicos enlaces que salen son los legales del pie (obligatorios para
   anuncios de Meta: política de privacidad visible).
2. **Formulario arriba**: en celular (390 px) el título, una línea de apoyo y el inicio del
   formulario caben en la primera pantalla. En escritorio, texto a la izquierda y formulario
   a la derecha.
3. **Formulario corto**: 4 campos, `autocomplete`, `inputmode`, teclado correcto, inputs de
   16 px (iOS no hace zoom), botón de 52 px de alto.
4. **Qué pasa después, dicho antes**: "Te contactamos dentro de 1 día hábil" y los 3 pasos.
5. **Prueba social junto a la decisión**: logos bajo el hero y testimonios antes del CTA final.
6. **CTA repetido**: barra fija abajo en celular cuando el formulario no está a la vista, y
   banda final. Todos llevan a `#demo` (el formulario), no a otra página.
7. **Carga rápida**: sin Lucide (íconos SVG en línea), sin JetBrains Mono, imágenes con
   `loading="lazy"` y dimensiones, CSS en un archivo chico, sin animaciones de entrada que
   escondan contenido.
8. **Coherencia con el anuncio**: título centrado en el resultado (vender parcelas sin
   planillas) y la palabra "demo" visible en el eyebrow, el formulario y el botón.

## Contenido de `/demo/` (textos definitivos)

`<title>`: `Solicita tu demo — Cierra.cl`. Meta description: "Agenda una demo de 30 minutos
por Google Meet y mira cómo Cierra.cl opera la venta de tus parcelas, del lead a la
inscripción en el CBR." `robots`: `noindex, follow`. Canonical `https://cierra.cl/demo/`.
Open Graph con `og-cover.png` (para la vista previa si alguien comparte el link).

1. **Cabecera**: logo Cierra.cl (SVG en línea, sin enlace). A la derecha, solo en
   escritorio: "Demo de 30 minutos · por Google Meet".
2. **Hero** (`<section id="top">`):
   - Eyebrow: `Demo personalizada · 30 minutos`
   - H1: `Vende tus parcelas sin planillas, <span class="g">del lead al CBR</span>.`
   - Apoyo: `En una reunión de 30 minutos por Google Meet te mostramos cómo Cierra.cl ordena
     tus leads, reservas, financiamiento propio, firmas y comisiones en un solo sistema.`
   - Lista (3, con check): `30 minutos por Google Meet, sin compromiso` ·
     `La vemos con tus proyectos y tu forma de vender` · `Migración de tus datos incluida`
   - Mini testimonio bajo la lista (solo escritorio): la cita de Rubén Aguilera, con su foto.
   - **Formulario** (`<form class="form-card" id="demo-form" data-ubicacion="landing-demo">`,
     dentro de un contenedor `id="demo"`): título `Solicita tu demo`, bajada
     `Te contactamos dentro de 1 día hábil para coordinar la hora.`; campos Nombre, Email de
     trabajo, Teléfono de contacto, Inmobiliaria o corredora (mismos `name`, placeholders y
     `autocomplete` que la portada; ids `f-nombre`…); botón `Solicitar mi demo`
     (`data-ubicacion="landing-demo"`); bajo el botón `Sin compromiso · Respuesta en 1 día
     hábil`; texto legal igual al de la portada con enlace a `/legal.html#pp-datos`
     (se abre en pestaña nueva para no perder lo escrito).
   - En celular el orden es: eyebrow, H1, apoyo, formulario, lista.
3. **Logos**: `Inmobiliarias y corredoras que operan con Cierra.cl` + los 6 logos de la
   portada, en grilla que envuelve (sin carrusel).
4. **Qué vas a ver en la demo** — título `Lo que vas a ver en <span class="g">30 minutos</span>.`
   Cuatro tarjetas:
   - `Leads y reservas en un solo lugar` — `Cada lead, cotización y reserva con su estado y su responsable. Tu equipo entra en la mañana y sabe qué tiene pendiente.`
   - `Financiamiento propio, bajo control` — `Pie, cuotas y pagos de cada cliente al día. La reserva no avanza si el pago no está autorizado.`
   - `De la promesa a la inscripción en el CBR` — `Borradores, firma en notaría y Conservador con plazos y responsables, sin perseguir a nadie por WhatsApp.`
   - `Comisiones que se arman solas` — `Liquidaciones de asesores y corredores listas para pagar, sin planillas paralelas.`
   Debajo, la captura `assets/dashboard.png` (lazy, con ancho y alto).
5. **Testimonios** — título `Equipos de parcelas que <span class="g">dejaron las planillas</span>.`
   Los 3 de la portada, textuales, con sus fotos.
6. **Cómo funciona** — título `Así de simple.` Tres pasos:
   `1. Llenas el formulario` (`Te toma menos de un minuto.`) ·
   `2. Coordinamos la hora` (`Te contactamos dentro de 1 día hábil.`) ·
   `3. Nos reunimos por Google Meet` (`30 minutos para ver el sistema con tus proyectos y resolver tus dudas.`)
7. **Preguntas** (4, `<details>`):
   - `¿Cómo es la demo?` — `Es una reunión de unos 30 minutos por Google Meet con alguien de nuestro equipo. Te mostramos el sistema funcionando, lo aterrizamos a tus proyectos y respondemos tus dudas. Sin compromiso.`
   - `¿Sirve si vendo con financiamiento propio?` — respuesta de la portada.
   - `¿Tengo que dejar mis planillas de un día para otro?` — `No. Importamos tus proyectos, parcelas y clientes desde tus planillas de Excel y acompañamos a tu equipo en la puesta en marcha. La mayoría de los equipos parte operando en menos de dos semanas.`
   - `¿Trabaja con UF, pesos y corredores externos?` — `Sí. Los precios pueden ir en CLP, UF o USD, y cada reserva puede tener a tu asesor y a un corredor externo, con sus comisiones liquidadas por separado.`
8. **Banda final** (oscura): `Mira tu venta de parcelas <span class="g">funcionando en un solo lugar</span>.`
   + botón `Solicitar mi demo` (`href="#demo"`, `data-ubicacion="landing-demo-final"`).
9. **Pie mínimo**: `© 2026 Cierra.cl · Hecho en Chile`, `Términos y privacidad`
   (`/legal.html`), botón `Preferencias de cookies` (`data-preferencias-cookies`).
10. **Barra fija en celular** (≤ 760 px): botón `Solicitar mi demo` (`href="#demo"`,
    `data-ubicacion="landing-demo-barra"`). Aparece solo cuando el formulario no está a la
    vista (IntersectionObserver sobre `#demo-form`). Mientras el aviso de cookies esté
    abierto no se muestra (no tapar el aviso).

## Página de gracias `/demo/gracias/`

`noindex, nofollow`. Misma cabecera y pie. Contenido: check verde, H1 `¡Listo! Recibimos tu
solicitud.`, texto `Te contactamos dentro de 1 día hábil para coordinar tu demo de 30 minutos
por Google Meet. También te enviamos un correo de confirmación.`, los pasos 2 y 3 como "Qué
sigue", `¿Dudas? Escríbenos a contacto@cierra.cl` (`mailto`, `data-ubicacion="gracias"`) y un
botón secundario `Conocer más de Cierra.cl` (`href="/"`, `btn btn-outline`,
`data-ubicacion="gracias"`). Aquí ya se convirtió, así que el enlace a la portada no compite.

## Medición

Se reutiliza todo lo instalado; no cambia qué se mide ni qué recibe Meta, así que
`legal.html` no se toca.

- Las dos páginas cargan `/assets/analitica.css`, Vercel Web Analytics, y al final del body
  `/assets/analitica.js`, `/assets/meta-pixel.js` y `/assets/clarity.js`, en ese orden.
- `PageView` y `ViewContent` ("Página demo", porque el formulario vive en `#demo`) salen
  solos con el píxel actual.
- Envío: igual que la portada (`POST /api/demo` con `meta_event_id`, `meta_consentimiento`,
  `_fbp`/`_fbc` y `pagina`). El servidor manda el Lead por la API de conversiones.
- **El Lead del navegador se dispara en la página de gracias**, no antes de redirigir: un
  evento lanzado justo antes de cambiar de página se puede perder. Tras el 200, la landing
  hace `location.assign('/demo/gracias/#' + eventId)`. La página de gracias, después de
  cargar analitica.js y meta-pixel.js: si el hash es un UUID válido, llama
  `cierraEvento('enviar_formulario', { formulario: 'demo', ubicacion: 'landing-demo' })` y
  `cierraMeta.lead(eventId)` (mismo id que el servidor → Meta deduplica) y borra el hash con
  `history.replaceState`. Recargar, volver atrás o entrar directo a `/demo/gracias/` no
  cuenta nada.
- Para Meta queda además la URL `/demo/gracias/` como conversión personalizada si se quiere.
- Si el envío falla: mensaje de error en el formulario, igual que la portada, sin redirigir.

## Aviso al equipo: fila "Origen"

`api/demo.js` ya recibe `pagina`. En el correo al equipo (texto y HTML) se agrega
`Origen: /demo/?utm_source=…` (ruta + query, máx. 300 caracteres, solo si `pagina` es una
URL http(s) válida; si no, `—`). No cambia el correo al cliente ni el cuerpo del webhook.

## Criterios de aceptación

- `/demo/` no tiene `<nav>`, ni enlaces a `/#…`, `/blog/`, `app.cierra.cl` ni precios.
- En 390×844 el botón de envío o al menos los dos primeros campos se ven sin hacer scroll
  (con el aviso de cookies cerrado).
- Enviar con datos válidos lleva a `/demo/gracias/` y allí salen `enviar_formulario` y Lead
  una sola vez; recargar no los repite.
- Todas las rutas de las dos páginas son absolutas.
- `sitemap.xml` y `llms.txt` no nombran `/demo/`.
- Pasan todas las pruebas de `tools/`.

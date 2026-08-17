# Landing Cierra.cl

Landing page SaaS para vender **Cierra.cl** —el software de automatización operativa que opera la venta de parcelas de punta a punta, del lead a la inscripción en el CBR, incluyendo el financiamiento del propio desarrollador— a inmobiliarias y corredoras. Implementada desde el handoff de Claude Design, usando los tokens, colores y componentes exactos del design system.

## Estructura

- `index.html` — la landing completa (una sola página, es-CL).
- `api/demo.js` — función serverless (Vercel) que procesa el formulario de demo.
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

Dependencias externas cargadas por CDN: [Lucide](https://unpkg.com/lucide@latest) (íconos) y Google Fonts (Plus Jakarta Sans + JetBrains Mono).

## Secciones

Nav sticky · Hero con composición flotante de KPIs · logos de clientes · banda oscura de posicionamiento (flujo Lead → Reserva → Autorización → Firma → Inscripción CBR) · 6 módulos + 7 roles · showcase "Velo en acción" · testimonios · 4 planes (en UF, con toggle mensual/anual) · FAQ · CTA final con formulario de demo · footer.

## Para terminar de pulir

- **Captura real del dashboard:** el recuadro de "Velo en acción" es ahora un `<img src="assets/dashboard.png">`. Reemplaza ese archivo por la captura real cuando quieras actualizarla.
- **Precios:** los valores en UF y la capacidad de cada plan son referencias; ajústalos a los reales.

## Formulario de demo (Resend + Vercel)

El formulario "Agenda tu demo" hace `POST /api/demo` con los campos en JSON. Ese endpoint es una **función serverless** ([api/demo.js](api/demo.js)) que hace tres cosas:

1. **Avisa al equipo** por email vía [Resend] (`DEMO_TO`, con copia a `DEMO_CC`). El `reply_to` es el correo del lead, así que responder el aviso le contesta directo a él.
2. **Le confirma la recepción al cliente** por email.
3. **Empuja el lead a la planilla** que hace de CRM, si `CRM_WEBHOOK_URL` está definida.

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

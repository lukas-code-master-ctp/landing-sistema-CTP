# Landing Cierra.cl

Landing page SaaS para vender **Cierra.cl** —el software de automatización operativa que opera la venta de parcelas de punta a punta, del lead a la inscripción en el CBR, incluyendo el financiamiento del propio desarrollador— a inmobiliarias y corredoras. Implementada desde el handoff de Claude Design, usando los tokens, colores y componentes exactos del design system.

## Estructura

- `index.html` — la landing completa (una sola página, es-CL).
- `api/demo.js` — función serverless (Vercel) que envía el formulario de demo vía Resend.
- `assets/colors_and_type.css` — tokens de marca, tipografía, sombras y radios (fuente de verdad del sistema).
- `assets/dashboard.png` — captura real del dashboard que se muestra en "Velo en acción".
- `assets/logo-dark.png` / `logo-light.png` / `favicon.png` — logos y favicon.

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

El formulario "Agenda tu demo" hace `POST /api/demo` con los campos en JSON. Ese endpoint es una **función serverless** ([api/demo.js](api/demo.js)) que envía el lead por email con [Resend]. La API key vive solo en el servidor (variable de entorno), nunca en el front.

**Desplegar en Vercel:**
1. Importa este repo en Vercel (Root Directory por defecto: la raíz del repo, donde están `index.html` y `api/`).
2. En *Settings → Environment Variables* agrega:
   - `RESEND_API_KEY` — tu API key de Resend (obligatoria).
   - `DEMO_TO` — bandeja que recibe los leads (opcional; default `ventas@cierra.cl`).
   - `DEMO_FROM` — remitente; debe ser de un **dominio verificado en Resend**. Para probar sin verificar dominio usa `onboarding@resend.dev` (solo envía al dueño de la cuenta).
3. Deploy. (Local: `vercel dev` corre la función; `python -m http.server` solo sirve el estático y el envío fallará con el mensaje de error.)

[Resend]: https://resend.com

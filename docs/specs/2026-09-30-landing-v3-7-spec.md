# Spec — Actualización de la landing a la app v3.7.2

**Fecha:** 2026-09-30
**Rama:** `feat/landing-v3-7`
**Contexto:** ver el diagnóstico en `propuesta-actualizacion-landing-2026-09.md`, en esta misma carpeta.

## Decisiones de Lukas (2026-09-30)

1. **Geografía.** El mercado principal sigue siendo Chile. Como varios clientes operan en más de un país, la landing comunica **multi-país y multi-moneda** como capacidad, sin dejar de decir "Hecho en Chile".
2. **Nuevos públicos.** Se incluyen el **Portal del Inversionista** y los **Proyectos compartidos**.
3. **IA.** El Asistente Cierra y las Capacitaciones con IA van **incluidos en todos los planes**.
4. **Comisiones.** El mensaje se centra en que **Cierra genera las liquidaciones de comisiones**, en lugar de hablar del hito en que se crean.
5. **Se incluyen también:**
   - el **formulario de reserva generado desde la app**;
   - la **conexión con Google Calendar**.

## Reglas de copy

- Español de Chile, tratando de "tú". Se mantiene el tono actual: frases cortas y concretas.
- **No prometer lo que no existe:**
  - integración de WhatsApp;
  - firma electrónica;
  - portales inmobiliarios;
  - app nativa;
  - factura electrónica automática;
  - pago autoservicio con tarjeta;
  - Ley 21.719.
- **No afirmar** que el corredor externo "ve solo su cartera". Hoy hay un hueco conocido en esa restricción.
- **Asistente Cierra:** responde sobre reservas, clientes e inventario, y solo lee (no modifica datos). Sin sobreprometer.
- **Formulario de reserva:** se genera en PDF listo para firmar a mano. No mencionar firma electrónica.

## Alcance y copy final

### 1. Hero

- **Franja de confianza.** Cambia a: `Hecho en Chile · Multi-país y multi-moneda · Del lead al CBR · Financiamiento del desarrollador`.
- **Maqueta del dashboard.**
  - "Vista panorámica del negocio · junio 2026" pasa a "Vista panorámica del negocio · este mes".
  - Tarjeta de reserva: se reemplaza "03 jun 2026" por "Jue · 10:30".
  - Tarjeta de comisión: la etiqueta pasa a "Liquidación asesor", con estado "Pagada".
- **Resto del hero:** sin cambios.

### 2. Banda "No es un CRM" (`#producto`)

**Descripción:**
> Las planillas paralelas, los WhatsApp sueltos y los estados que nadie actualiza se acaban. Cierra.cl automatiza venta, financiamiento, finanzas y legal en una sola operación con disparadores automáticos —hasta la inscripción en el Conservador de Bienes Raíces, o su equivalente en cada país donde operes.

**Flujo de 5 pasos:**

| Paso | Nombre | Texto |
|---|---|---|
| 1 | Lead | Captura inbound, cotización con tu marca y asignación al asesor. |
| 2 | Reserva | Wizard de 4 pasos o pre-reserva express desde el celular, con financiamiento del desarrollador. |
| 3 | Autorización | Finanzas concilia el pago y la reserva avanza según el rol. |
| 4 | Firma | Promesa o escritura, con la firma en notaría agendada en Google Calendar. |
| 5 | Inscripción CBR + liquidación | Parcela inscrita en el Conservador y comisiones listas para liquidar. |

### 3. Módulos (`#modulos`)

Pasan de 6 a **9 tarjetas**, con la grilla actual de 3 columnas. Título, descripción y chips de roles no cambian.

| # | Ícono Lucide | Título | Texto | Tags |
|---|---|---|---|---|
| 1 | map-pinned | Proyectos y Parcelas | Cada loteo y cada parcela con su estado, fotos, plano y mapa. Superficie en m² o HA, precio en CLP, UF o USD, y campos propios para lo que tu empresa necesite registrar. | Estados · Mapa · Campos a medida |
| 2 | users | Leads y Clientes | Recibe leads desde tu web o chatbot, asígnalos al asesor y conviértelos en cliente con un clic. Persona natural o jurídica, con representante legal, cónyuge y documentos. | Webhook · Persona jurídica · RUT |
| 3 | receipt-text | Cotizaciones y Promociones | Cotiza en segundos un PDF con tu marca: fotos, precio contado y simulación con financiamiento, con folio y vigencia. Tus vendedores ven las promociones vigentes de cada proyecto. | PDF con tu marca · Simulación · Promociones |
| 4 | file-signature | Reservas | Wizard de 4 pasos con asesor interno y corredor externo, o pre-reserva express desde el celular en terreno. El formulario de reserva se genera desde Cierra con los datos de la venta, en tu formato. | 4 pasos · Pre-reserva express · Formulario PDF |
| 5 | wallet | Financiamiento y cobranza | Planes por proyecto con tasa, pie mínimo y cuotas. La cuota queda fija en la reserva, finanzas lleva el cronograma y el cliente recibe un recordatorio antes de cada vencimiento. | Pie y cuotas · Cronograma · Recordatorios |
| 6 | file-text | Pipeline legal y CBR | Borrador → Promesa → Firma → Escritura → Inscripción en el CBR. La firma en notaría se agenda en Google Calendar, con invitación al cliente, al abogado y al encargado. Al inscribir, la parcela pasa a vendida. | Notaría · Google Calendar · CBR |
| 7 | banknote | Comisiones y liquidaciones | Cierra genera las liquidaciones de comisiones de asesores y corredores —por venta, semanal, quincenal o mensual—, con la retención de boleta o el IVA de factura ya calculados. El asesor sube su boleta y finanzas paga con comprobante. | Liquidaciones · Boleta o factura · Tramos |
| 8 | layout-dashboard | Dashboards, Insights y reportes | Cada rol ve sus KPIs, su embudo y sus alertas SLA. Stock y metas por proyecto, y un reporte PDF que llega solo a tu correo cada semana o cada mes. | KPIs por rol · SLA · Reporte automático |
| 9 | graduation-cap | Capacitaciones | Microlearning para tu equipo de ventas: lecciones, quiz, niveles e insignias. Sube un PDF y la IA arma la capacitación; si quieres, el asesor nuevo no opera hasta aprobarla. | Onboarding · Gamificación · Con IA |

### 4. Sección nueva "Hecho a tu medida" (`#a-medida`)

Va después de Módulos y antes del Showcase. Tiene fondo claro y una grilla bento de 6 tarjetas. La tarjeta del Asistente es destacada: ocupa 2 columnas en escritorio y usa el acento de marca.

**Encabezado:**
- Eyebrow: "Hecho a tu medida".
- H2: "Tu proceso, tu marca, **tus países**." (la parte en negrita va con `<span class="g">`).
- Descripción: "Cierra se adapta a cómo vendes tú, no al revés."

**Tarjetas:**

| Ícono | Título | Texto |
|---|---|---|
| sparkles | Asistente Cierra con IA (destacada, con insignia "Incluido en todos los planes") | Pregúntale a Cierra en tus palabras: «¿Qué parcelas quedan disponibles?», «¿Cuántas reservas llevo este mes?», «¿A qué clientes les faltan datos?». Responde al instante sobre tus reservas, clientes e inventario, y respeta lo que cada usuario puede ver. |
| workflow | Tu flujo, sin programar | Define los pasos, roles, plazos SLA y rutas legales de tu venta en un editor visual: contado o financiado, con o sin promesa, escritura directa o escribanía. Partes de una plantilla probada y guardas versiones. |
| palette | Con tu marca | Tu subdominio, tu logo y tus colores en el login, los correos y los PDFs. Los correos a tus clientes salen desde tu propio dominio. |
| globe | Multi-país y multi-moneda | Proyectos en Chile y en otros países, cada venta en su moneda —CLP, UF, USD o EUR— con tipos de cambio oficiales y dashboards consolidados en tu moneda de informe. |
| plug | Integraciones | API con llaves y permisos, webhook para recibir leads desde tu web o chatbot, inventario sincronizado con Google Sheets y firmas en Google Calendar. |
| file-spreadsheet | Tus datos entran y salen | Importa proyectos, parcelas y clientes desde Excel con plantillas, y exporta a Excel, CSV o PDF cuando lo necesites. |

### 5. Sección nueva "Todo tu ecosistema" (`#ecosistema`)

Va después del Showcase y antes de Testimonios. Es una banda oscura (clase `band`, igual que `#producto`) o una sección clara con 3 tarjetas grandes. La elección visual es libre, siempre que se vea bien después del Showcase, que es claro, y no quede pegada a otra banda oscura.

**Encabezado:**
- Eyebrow: "Todo tu ecosistema".
- H2: "Tus socios, corredores e inversionistas, **en la misma operación**."
- Descripción: "La venta de un loteo no la hace una sola empresa. Cierra conecta a todos los que participan, cada uno con lo que le corresponde ver."

**Tarjetas:**

| Ícono | Título | Texto | Tags |
|---|---|---|---|
| landmark | Portal del inversionista | El dueño del terreno o inversionista entra a su propio portal y ve las ventas, lo que le corresponde, lo recaudado, sus próximos cobros y el retorno de su capital. Una sola cuenta, aunque invierta con varias loteadoras. | Te corresponde · Próximos cobros · Reporte PDF |
| share-2 | Proyectos compartidos | Comparte un proyecto con otra loteadora o corredora y vendan del mismo stock, cada una con su equipo. Tú decides quién puede vender y revocas el acceso cuando quieras. | Mismo stock · Permisos · Alianzas |
| handshake | Corredores externos | Suma un corredor externo a cada reserva, junto a tu asesor. Cada uno tiene su propio acceso y Cierra liquida sus comisiones por separado. | Corretaje · Multi-vendedor · Liquidación propia |

### 6. Showcase

- Las pills cambian a:
  - Vista cards ↔ lista ↔ mapa
  - Filtros por proyecto y estado
  - Notificaciones y recordatorios
  - @menciones en cada reserva
  - Exporta a Excel o PDF
- **Captura nueva.** `assets/dashboard.png` se reemplaza por una captura de `demo.cierra.cl`: dashboard del owner con datos presentables y sin "mes_actual" ni paneles vacíos.
  - Necesita que Lukas inicie sesión en el navegador. Se hace en la etapa de QA.
  - Si no se puede, se mantiene la captura actual.

### 7. Precios

- **Descripción:** "Precios en UF, sin costos de instalación ocultos. Implementación, migración de tus datos y créditos de IA incluidos en todos los planes."
- **Enterprise, texto "para quién":** "Para grupos con +30 usuarios, varias empresas o países e integraciones a medida."
- **"Todos los planes incluyen"** pasa a 12 ítems:
  1. Leads, cotizaciones y clientes
  2. Reservas con financiamiento y cobranza
  3. Pipeline legal hasta el CBR
  4. Liquidación de comisiones
  5. Dashboards, alertas SLA y reportes
  6. Asistente Cierra con IA
  7. Capacitaciones con IA
  8. Tu flujo y tu marca
  9. Portal del inversionista
  10. Multi-país y multi-moneda
  11. API, webhooks y Google Calendar
  12. Roles y permisos a medida
- Precios, planes, topes y botones **no cambian**.

### 8. FAQ

Se mantiene la Q1. Las Q2, Q3, Q5 y Q6 se reescriben y se agregan cuatro preguntas nuevas, en este orden.

1. **¿Sirve para vender parcelas con financiamiento del propio desarrollador?** Sin cambios.
2. **¿Maneja UF, CLP y otras monedas?** — "Sí. Los precios se expresan en CLP, UF, USD o la moneda de cada país, con formato chileno ($1.000.000, puntos como separador de miles) y RUT validado. Los tipos de cambio se toman de fuentes oficiales y los dashboards se consolidan en tu moneda de informe. Las superficies van en m² o HA."
3. **¿Puedo trabajar con corredores externos?** — "Claro. Cada reserva puede tener a tu asesor interno y a un corredor externo. Cierra genera las liquidaciones de comisiones de cada uno por separado —por venta o por período—, con su boleta o factura, y finanzas las paga con comprobante."
4. **¿Cómo funcionan los roles y permisos?** Sin cambios.
5. **¿Se conecta con notarías, Google Calendar y el CBR?** — "Sí. El pipeline legal te permite agendar la firma en notaría —con invitación en Google Calendar para el cliente, el abogado y el encargado— y dejar trazada la documentación de cada promesa y escritura hasta su inscripción en el Conservador de Bienes Raíces. En el plan Enterprise sumamos integraciones a medida según tus flujos y proveedores."
6. **¿Puedo usar mi propio formulario de reserva?** (nueva) — "Sí. Armas tu formulario una vez —con tus cláusulas, anexos y campos para cónyuge o empresa— y Cierra lo genera en PDF con los datos de cada venta ya completos, listo para firmar."
7. **¿Puedo adaptar el flujo a mi proceso?** (nueva) — "Sí. Con el editor de flujos defines los pasos, roles, plazos y rutas legales de tu venta: contado o financiado, con o sin promesa, escritura directa o escribanía. Partes desde una plantilla probada y la ajustas sin programar."
8. **¿Mis inversionistas o dueños del terreno pueden ver sus ventas?** (nueva) — "Sí. Registras a cada inversionista con su participación y le envías una invitación. Desde su portal ve las ventas, lo que le corresponde, lo recaudado y los próximos cobros, y descarga su reporte en PDF."
9. **¿Qué hace el Asistente Cierra?** (nueva) — "Responde preguntas en lenguaje natural sobre tus reservas, clientes e inventario —por ejemplo, «¿qué parcelas quedan disponibles?»— y respeta lo que cada usuario puede ver. Está incluido en todos los planes, con un cupo mensual de créditos de IA."
10. **¿Cuánto demora la implementación?** — "La mayoría de los equipos parte operando en menos de dos semanas. Importamos tus proyectos, parcelas y clientes desde tus planillas de Excel y acompañamos al equipo en el onboarding. No tienes que dejar tu operación a medias: hacemos la transición contigo."

### 9. Nav

Los enlaces pasan a: Producto · Módulos · A tu medida (`#a-medida`) · Precios · Preguntas, tanto en escritorio como en el menú móvil.

### 10. SEO y archivos para máquinas

- **Meta description y og:description:** "Cierra.cl automatiza la venta de parcelas de punta a punta: leads, cotizaciones, reservas, financiamiento del propio desarrollador, pipeline legal y liquidación de comisiones —hasta la inscripción en el CBR—, con IA incluida."
- **JSON-LD `Organization.areaServed`:** Chile y Uruguay.
- **JSON-LD `SoftwareApplication`:**
  - `audience.name`: "Loteadoras, inmobiliarias y corredoras que venden parcelas y loteos en Chile y Latinoamérica".
  - `featureList`: sincronizado con los 9 módulos más IA, flujo, marca, multi-moneda, inversionistas y proyectos compartidos.
- **JSON-LD `FAQPage`:** refleja **textualmente** las 10 preguntas visibles.
- **`llms.txt`:** se actualiza con módulos, secciones nuevas y multi-país.
- **`sitemap.xml`:** lastmod de `/` a 2026-09-30.
- **README:** actualizar la lista de secciones.

## Fuera de alcance

- Nueva imagen `og-cover.png`.
- Blog o casos de éxito.
- Checkout o registro autoservicio.
- Cambios de precios.
- Página legal.
- Ley 21.719.

## Criterios de aceptación

1. No queda ningún "3 pasos", "dots", "junio 2026", "03 jun 2026" ni "al escriturar" en `index.html`.
2. El JSON-LD es JSON válido y las preguntas de `FAQPage` coinciden 1:1 con los `<details>` visibles.
3. Los 9 módulos, las 2 secciones nuevas y el nav se ven bien a 1440, 1000, 768 y 375 px, sin scroll horizontal.
4. Sin errores en consola, y todos los íconos Lucide nuevos renderizan (ningún `data-lucide` sin reemplazar).
5. El formulario de demo, el toggle mensual/anual, el menú móvil y el `reveal` siguen funcionando.
6. Ningún texto promete algo de la lista "No prometer".

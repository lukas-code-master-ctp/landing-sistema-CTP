# Propuesta de actualización de la landing — Cierra.cl

**Fecha:** 2026-09-30.

**Base del análisis:**
- Landing: `landing/index.html`, último commit del 2026-09-07.
- App: `origin/master`, v3.7.2, en producción desde el 2026-09-29. Fuentes: `CLAUDE.md`, `ctp-crm/docs/historia-sprints.md` y el código.

## 1. Diagnóstico

La landing sigue explicando bien el núcleo del producto: lead → reserva → legal → CBR → comisiones, el financiamiento propio y los roles. Pero se quedó en la foto de junio y julio.

Desde entonces la app pasó de la v3.4 a la v3.7.2. Sumó capacidades que venden mucho y que hoy son invisibles en la landing: IA, capacitaciones, motor de flujos, marca propia, portal del inversionista, proyectos compartidos y multi-moneda. También hay datos que ya no son exactos.

## 2. Correcciones (lo que hoy dice algo incorrecto o desactualizado)

| # | Dónde | Hoy dice | Debería decir |
|---|---|---|---|
| C1 | Flujo `#producto`, módulo Reservas y JSON-LD | "Asistente de 3 pasos" | Wizard de **4 pasos**, más la **pre-reserva express desde el celular** en terreno |
| C2 | Flujo `#producto` | 5 pasos | El pipeline real tiene hitos más finos: Pre-reserva → Reserva → Borrador → Promesa/Escritura → Ingreso CBR → Salida CBR. Se puede mantener en 5 pasos visuales, pero conviene mencionar la promesa y el ingreso/salida del CBR |
| C3 | FAQ 3 y JSON-LD, contra el módulo Pipeline y los testimonios | Las comisiones se crean "al escriturar" en unos lugares y "al inscribir en el CBR" en otros | Unificar según el momento de pago configurable, que existe en la app desde la v3.6.0. Por ejemplo: "se generan solas según el hito que tú definas" |
| C4 | Precios, bloque "Todos los planes incluyen" | "Multi-sociedad" e "Integraciones y API" en todos los planes, mientras Enterprise se presenta como el plan "para múltiples sociedades e integraciones" | Decidir qué es de todos los planes (API keys y webhook de leads) y qué es Enterprise (integraciones a medida) |
| C5 | Showcase | Captura `dashboard.png` del 29 de julio, versión v2.4.0 | Nueva captura desde `demo.cierra.cl`, con datos vistosos y sin "mes_actual", Leads 0 ni Top asesores vacío |
| C6 | Maqueta del hero | "junio 2026" y firma el "03 jun 2026" | Fechas vigentes, o sin mes explícito |
| C7 | FAQ 2 | "dots como separador" (en inglés) | "puntos como separador" |
| C8 | Trust strip y FAQ 2 | "CLP y UF" | "CLP, UF y USD", según lo que se decida en la pregunta P1 |
| C9 | `sitemap.xml` | lastmod del 2026-08-20 | Fecha del deploy |
| C10 | `llms.txt` y JSON-LD `SoftwareApplication` | Features de agosto | Sincronizar con el nuevo contenido |

## 3. Funcionalidades nuevas para comunicar

La prioridad es según su valor comercial y su madurez en producción.

### Prioridad alta: listas para vender

1. **Capacitaciones ("Duolingo para vendedores")** — v3.4.3.
   - Microlearning con quiz y onboarding automático del asesor nuevo.
   - Bloqueo de la operación hasta aprobar.
   - Gamificación: XP, niveles e insignias.
   - Autoría con IA: subes un PDF y genera la capacitación.
   - Es un diferencial fuerte y poco común en un software de venta.
2. **Cotizador con tu marca** — v3.4.4.
   - PDF de cotización con fotos, precio contado y simulación financiada.
   - Folio, vigencia y envío por correo desde la app.
3. **Promociones** — ya aparece en la captura actual, pero no se menciona en ningún lado.
4. **Cobranza del financiamiento propio.**
   - Cronograma de cuotas y cálculo de cuota (PMT) congelado en la reserva.
   - Prepago con cálculo de saldo.
   - **Recordatorio automático de cuotas por vencer** al cliente.
   - Refuerza el mensaje central, el financiamiento del desarrollador, que hoy solo dice "pie y cuotas".
5. **Tu flujo, no el nuestro (motor de flujos no-code)** — v3.5.0.
   - Editor visual de pasos, roles, SLA y rutas legales, con versionado.
   - Responde a la objeción "mi proceso es distinto".
6. **Tu marca (whitelabel)** — v3.4.0 y v3.5.2.
   - Subdominio `tuempresa.cierra.cl`, login con tu logo y color.
   - Correos y PDFs con tu marca, enviados desde tu dominio.
7. **Reportes automáticos por correo** — PDF semanal o mensual con los KPIs del negocio.
8. **Migración e inventario.**
   - Importador XLSX con plantillas.
   - Campos personalizados por empresa.
   - Exports CSV, XLSX y PDF.
   - Sync diario con Google Sheets.
   - Hace concreta la promesa "operando en menos de 2 semanas".
9. **Integraciones concretas.**
   - API con API keys por permisos.
   - Webhook de leads, por ejemplo desde chatbots como Vambe.
   - Google Sheets.
   - Reemplaza el genérico "Integraciones y API".
10. **Colaboración.**
    - Notas con @menciones y **recordatorios** (v3.7.1).
    - Calendario de firmas en `/agendas`.
    - Línea de tiempo auditada por parcela y por reserva.

### Prioridad alta, pero dependen de una decisión (sección 5)

11. **Asistente Cierra (IA)** — v3.7.0.
    - Preguntas en lenguaje natural: "¿Qué parcelas quedan disponibles?".
    - Respeta la cartera de cada usuario.
    - **Límites:** solo lectura; solo cubre reservas, clientes e inventario; funciona con créditos (3.000 al mes por empresa).
    - Hay que comunicarlo sin sobreprometer.
12. **Portal del Inversionista / dueño del terreno** — v3.7.2, lanzado ayer.
    - El dueño del predio ve sus ventas, lo que le corresponde, lo recaudado, sus próximos cobros y su retorno.
    - Recibe un PDF automático.
    - Abre un argumento de venta nuevo: la loteadora le rinde cuentas al dueño del terreno sin planillas.
13. **Proyectos compartidos entre loteadoras** — v3.6.0.
    - Dos loteadoras venden el mismo stock, cada una con su equipo.
    - Aplica a alianzas y a corredoras.
14. **Formulario de reserva generado desde Cierra** — v3.7.0.
    - Genera el PDF con los datos de la venta ya puestos.
    - Requiere que el owner lo configure primero y no incluye firma electrónica.
15. **Multi-país y multi-moneda** — v3.7.2.
    - Uruguay operando, con escribanía y boleto.
    - USD y EUR con tipos de cambio de la CMF.

### No comunicar todavía

| Funcionalidad | Motivo |
|---|---|
| Ley 21.719 / derechos ARCO+ | Está apagada en todos los tenants y la fase 2 no está hecha. Se retoma cuando esté el piloto (la ley rige desde el 1-dic-2026 y será un buen gancho entonces). |
| Autoservicio de suscripción con tarjeta (Flow) y factura automática | El cobro está pausado, ningún tenant tiene plan y no hay DTE. Los botones de los planes siguen yendo a la demo. |
| Google Calendar | La app OAuth no está verificada por Google. Como mucho: "calendario de firmas". |
| WhatsApp, firma electrónica, portales inmobiliarios, app nativa | No existen. Hay que revisar que ningún copy nuevo los insinúe. |

## 4. Propuesta de estructura

Se conserva todo lo que funciona: hero, logos, banda "No es un CRM", testimonios, precios, FAQ y demo. Los cambios:

1. **Hero.**
   - Mantener el H1.
   - Actualizar la maqueta (C6).
   - Opcional: sumar al trust strip "IA incluida" o "Con tu marca".
2. **Banda "No es un CRM".** Corregir el flujo (C1, C2).
3. **Módulos:** pasar de 6 a 8 tarjetas.

   | Tarjeta | Qué cambia |
   |---|---|
   | Proyectos y Parcelas | Suma campos personalizados, importador y galería con mapa |
   | Leads, Cotizaciones y Promociones | Nueva: suma cotizador PDF y promociones |
   | Reservas y pre-reserva express | 4 pasos y uso desde el celular |
   | Financiamiento y cobranza | Nueva, separada de Reservas: cronograma, recordatorios y prepago |
   | Pipeline legal y CBR | Suma promesa, agenda de firmas y alzamiento |
   | Comisiones | Suma tramos, boleta o factura con retención, y liquidaciones |
   | Dashboards, Insights y reportes | Suma stock, metas y PDF automático por correo |
   | Capacitaciones | Nueva |
4. **Nueva sección "Hecho a la medida de tu operación"** (bento de 4 bloques):
   - Motor de flujos no-code.
   - Tu marca (whitelabel).
   - Asistente Cierra (IA).
   - Integraciones (API, webhooks y Sheets).
5. **Nueva sección "Para todo tu ecosistema":**
   - Portal del inversionista / dueño del terreno.
   - Proyectos compartidos entre loteadoras.
   - Corredores externos (ya existe; se mueve aquí desde la FAQ).
6. **Showcase.** Captura nueva (C5); idealmente 2 o 3 pestañas: Dashboard · Reserva · Capacitaciones.
7. **Precios.** Corregir el bloque "incluye" (C4) y agregar "Créditos de IA incluidos" si se decide promocionarlos (P3).
8. **FAQ.** Corregir C3, C7 y C8, y sumar 3 preguntas:
   - "¿Puedo adaptar el flujo a mi proceso legal?"
   - "¿Mis inversionistas o dueños del terreno pueden ver sus ventas?"
   - "¿Qué hace el Asistente con IA?"
9. **SEO.**
   - Actualizar meta, JSON-LD (features, FAQPage), `llms.txt` y `sitemap`.
   - Evaluar keywords nuevas: "software para loteadoras", "portal inversionistas loteo", "capacitación vendedores inmobiliarios".

## 5. Decisiones pendientes

- **P1 — Alcance geográfico:** mantener el foco en Chile o abrir el mensaje a Uruguay y LatAm.
- **P2 — Nuevos públicos:** incluir ya el portal del inversionista y los proyectos compartidos, o esperar a que maduren.
- **P3 — IA:** promocionar el Asistente Cierra y la IA de Capacitaciones como incluidos en todos los planes o como diferencial de algunos planes.
- **P4 — Momento de las comisiones:** confirmar qué frase usar en C3.

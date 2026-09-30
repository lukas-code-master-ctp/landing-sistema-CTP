# Plan — Actualización de la landing a la app v3.7.2

**Spec:** `docs/specs/2026-09-30-landing-v3-7-spec.md`. El copy final está ahí y se usa textual.

**Archivo principal:** `index.html`. Es un solo archivo, así que las tareas van en secuencia, nunca en paralelo.

**Ejecución:** un subagente por tarea. Otro subagente revisa cada tarea contra el spec antes de pasar a la siguiente. Se hace un commit por tarea en la rama `feat/landing-v3-7`.

**Verificación local:** preview `landing` (python http.server en el puerto 4321).

## Tareas

### T1 — Correcciones del copy existente
Son las secciones 1, 2 y 7 del spec, más las Q2, Q3, Q5 y Q6 de la FAQ.
- **Hero:** franja de confianza y maqueta (mes, fecha de firma, tarjeta de liquidación).
- **Banda `#producto`:** descripción y los 5 pasos del flujo.
- **Precios:**
  - descripción;
  - texto de Enterprise;
  - bloque "incluye" con 12 ítems (revisar que la grilla `included-grid` quede pareja).
- **FAQ:** reescribir las Q2, Q3 y Q5, y la de implementación. Las preguntas nuevas no van aquí; se agregan en T5.
- **Commit:** "Corrige el copy de la landing según la app v3.7.2".

### T2 — Módulos: 9 tarjetas
Sección 3 del spec. Se reemplazan las 6 `mod-card` por 9 y se verifica que existan los íconos Lucide (versión 1.35.0).
- **Commit:** "Amplía los módulos a nueve, con cotizaciones, cobranza y capacitaciones".

### T3 — Sección "Hecho a tu medida" (`#a-medida`)
Sección 4 del spec.
- Crear el HTML y el CSS en el bloque `<style>`, siguiendo los tokens y patrones existentes: `section`, `section-head`, `reveal` y `mod-card`.
- La tarjeta del Asistente va destacada y ocupa 2 columnas en escritorio.
- Responsive con los breakpoints existentes: 1000, 860 y 680 px.
- Agregar "A tu medida" al nav de escritorio y al menú móvil.
- **Commit:** "Agrega la sección Hecho a tu medida: IA, flujos, marca, multi-moneda e integraciones".

### T4 — Sección "Todo tu ecosistema" (`#ecosistema`) y pills del Showcase
Secciones 5 y 6 del spec (solo las pills; la captura va en T7).
- 3 tarjetas: inversionista, proyectos compartidos y corredores.
- La sección va entre el Showcase y Testimonios.
- **Commit:** "Agrega la sección de ecosistema: inversionistas, proyectos compartidos y corredores".

### T5 — FAQ nuevas y SEO
Secciones 8 y 10 del spec.
- Agregar las 4 preguntas nuevas en el orden del spec.
- Actualizar:
  - meta description y og:description;
  - JSON-LD: areaServed, audience, featureList y FAQPage (textual, las 10 preguntas);
  - `llms.txt`;
  - `sitemap.xml`;
  - `README.md`.
- **Commit:** "Actualiza FAQ, datos estructurados, llms.txt y sitemap".

### T6 — Verificación
Se hace en el preview local.
- **Script de chequeo:**
  - JSON-LD válido;
  - FAQPage igual 1:1 a los `<details>`;
  - no quedan textos prohibidos: "3 pasos", "dots", "junio 2026", "03 jun 2026", "al escriturar", "WhatsApp" como integración, "firma electrónica".
- **Consola** sin errores y ningún `[data-lucide]` sin reemplazar.
- **Capturas** a 1440, 1000, 768 y 375 px, verificando que no haya scroll horizontal (`scrollWidth <= innerWidth`).
- **Interacciones:** menú móvil, toggle mensual/anual, apertura de la FAQ y validación del formulario. El formulario no se envía.

### T7 — Captura nueva del dashboard
Se hace en la etapa de QA y requiere que Lukas inicie sesión en `demo.cierra.cl`.
- Tomar la captura del dashboard del owner a 1882×941 aproximado.
- Reemplazar `assets/dashboard.png` y ajustar `width`, `height` y `alt`.
- **Commit:** "Actualiza la captura del dashboard".

### T8 — PR
Push de la rama y PR a `main`, porque solo existe esa instancia. **No se mergea.**

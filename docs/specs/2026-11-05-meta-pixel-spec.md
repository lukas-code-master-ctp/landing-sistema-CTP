# Spec: píxel de Meta y API de conversiones en cierra.cl

**Pedido:** Lukas, 2026-11-05. Campaña de Meta Ads (Instagram y Facebook): medir
visitas y demos agendadas.
**Datos:** píxel `4526586427599697`, conjunto "Cierra.cl - Pixel" (portfolio Impulse AI),
con la API de conversiones habilitada.

## Decisiones (OK de Lukas, 2026-11-05)
1. **ID del píxel en una constante** de `assets/meta-pixel.js`, igual que el de GA4:
   el sitio no tiene build y el ID es público. El servidor lo lee de `META_PIXEL_ID`.
2. **Un solo "Aceptar"** cubre Google Analytics y Meta. El texto del aviso cambia y
   la versión del consentimiento sube a 2: una aceptación v1 no cubría a Meta, así que
   todos vuelven a decidir.
3. **La API de conversiones solo se usa si la persona aceptó**, con `em` y `ph`
   hasheados en SHA-256.
4. **Verificación del dominio por TXT en el DNS** (vive en Vercel). En el head de
   `index.html` queda además un comentario con el lugar del meta.

## Comportamiento
- **Sin consentimiento, Meta no recibe nada**: no se descarga `fbevents.js`, no hay
  `fbq`, no hay CAPI. Sin noscript: sin JavaScript no hay forma de pedir consentimiento.
- **Al aceptar** (ahora o en una visita anterior): se carga el píxel, `init` una sola vez
  y `PageView`. **Al rechazar**: se borran `_fbp` y `_fbc`, y `fbq('consent','revoke')` si
  ya estaba cargado (la página deja de mandar eventos).
- **ViewContent** `{content_name: 'Página demo'}`: una vez por página, cuando la sección
  `#demo` queda a la vista (IntersectionObserver, 40 %).
- **Lead** `{content_name: 'Demo Cierra'}` con `{eventID}`: solo cuando `/api/demo` responde
  200. El `eventID` es un UUID generado antes del envío y viaja en el cuerpo
  (`meta_event_id`), junto con `meta_consentimiento` y las cookies `_fbp`/`_fbc` si existen.
  Sin datos personales en los parámetros del píxel.
- **CAPI** (en `api/demo.js`, después de enviar el aviso al equipo): `POST
  https://graph.facebook.com/v21.0/{META_PIXEL_ID}/events` con `event_name: Lead`, el
  mismo `event_id`, `event_time`, `action_source: website`, `event_source_url`,
  `user_data` (`client_ip_address`, `client_user_agent`, `em`, `ph`, `fbp`, `fbc`) y
  `custom_data.content_name`. Solo si `meta_consentimiento === true` y están
  `META_PIXEL_ID` y `META_CAPI_ACCESS_TOKEN`. Best-effort: un error queda en el log y no
  cambia la respuesta. `META_TEST_EVENT_CODE` opcional para "Probar eventos".
- **GA4 no cambia**: sus permisos de publicidad siguen siempre denegados.

## Fuera de alcance
- Un "Configurar" por herramienta. El formato guardado (`{v:2, analitica, publicidad}`)
  ya separa las dos para poder agregarlo después.
- Eventos de Meta en los clics de los CTA.

## Pendiente de terceros
- Token de la API de conversiones (Andrés) → `META_CAPI_ACCESS_TOKEN` en Vercel.
- Valor de verificación del dominio (Andrés) → TXT en el DNS de cierra.cl.

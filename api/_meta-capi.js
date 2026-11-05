// API de conversiones de Meta: el Lead del formulario de demo, del lado del
// servidor. Lo llama api/demo.js. El prefijo "_" hace que Vercel NO lo
// publique como función (/api/_meta-capi no existe): es solo un módulo.
//
// Variables de entorno:
//   META_PIXEL_ID           — ID del píxel (el mismo de assets/meta-pixel.js).
//   META_CAPI_ACCESS_TOKEN  — token de la API de conversiones. Secreto.
//   META_TEST_EVENT_CODE    — opcional, para "Probar eventos" en Meta.
// Sin ID o sin token no se manda nada.
//
// Reglas (docs/specs/2026-11-05-meta-pixel-spec.md):
//   - Solo con consentimiento de publicidad (`meta_consentimiento === true`).
//   - Correo y teléfono van hasheados en SHA-256, nunca en claro.
//   - El event_id es el mismo del píxel, para que Meta deduplique.
//   - Best-effort: nunca lanza ni cambia la respuesta del formulario, y los
//     logs no llevan el token ni datos personales.

import { createHash } from 'node:crypto';

export const GRAPH_URL = 'https://graph.facebook.com/v21.0';
export const TIMEOUT_MS = 4000;
const SITIO = 'https://cierra.cl/';
const MAX_EVENT_ID = 100;

export function sha256Hex(s) {
  return createHash('sha256').update(String(s), 'utf8').digest('hex');
}

export function normalizarEmail(email) {
  const e = String(email ?? '').trim().toLowerCase();
  return e || null;
}

// Meta pide el teléfono con código de país y solo dígitos. Un celular
// chileno de 9 dígitos que empieza con 9 se completa con 56.
export function normalizarTelefono(telefono) {
  let d = String(telefono ?? '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 9 && d.startsWith('9')) d = '56' + d;
  return d || null;
}

export function clienteIp(headers) {
  const h = headers || {};
  const xff = h['x-forwarded-for'];
  const primera = String(Array.isArray(xff) ? xff[0] : xff ?? '').split(',')[0].trim();
  if (primera) return primera;
  const real = String(h['x-real-ip'] ?? '').trim();
  return real || null;
}

// Solo URLs del sitio (o de un deploy de Vercel). Lo que manda el navegador
// no se pasa a Meta tal cual.
export function urlDelSitio(u) {
  if (typeof u !== 'string' || !u) return false;
  if (u.startsWith('https://cierra.cl') || u.startsWith('https://www.cierra.cl')) {
    const resto = u.slice(u.startsWith('https://www.') ? 'https://www.cierra.cl'.length : 'https://cierra.cl'.length);
    return resto === '' || /^[/?#]/.test(resto);
  }
  try {
    const url = new URL(u);
    return url.protocol === 'https:' && url.hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

export function urlFuente(pagina, referer) {
  if (urlDelSitio(pagina)) return pagina;
  if (urlDelSitio(referer)) return referer;
  return SITIO;
}

export function eventIdValido(id) {
  return typeof id === 'string' && id.trim().length > 0 && id.length <= MAX_EVENT_ID;
}

// El evento tal cual lo espera Meta, sin claves vacías.
export function armarEventoLead({ eventId, email, telefono, ip, userAgent, fbp, fbc, url, ahora } = {}) {
  const user_data = {};
  if (ip) user_data.client_ip_address = ip;
  if (userAgent) user_data.client_user_agent = userAgent;
  const em = normalizarEmail(email);
  if (em) user_data.em = [sha256Hex(em)];
  const ph = normalizarTelefono(telefono);
  if (ph) user_data.ph = [sha256Hex(ph)];
  if (fbp) user_data.fbp = fbp;
  if (fbc) user_data.fbc = fbc;

  const ms = typeof ahora === 'number' ? ahora : ahora instanceof Date ? ahora.getTime() : Date.now();
  const evento = {
    event_name: 'Lead',
    event_time: Math.floor(ms / 1000),
  };
  if (eventId) evento.event_id = eventId;
  evento.action_source = 'website';
  if (url) evento.event_source_url = url;
  evento.user_data = user_data;
  evento.custom_data = { content_name: 'Demo Cierra' };
  return evento;
}

/**
 * Manda el Lead. Devuelve `{enviado: true, status}` o `{enviado: false, motivo}`.
 * Nunca lanza.
 */
export async function enviarLeadCapi(datos, env = {}, fetchImpl = globalThis.fetch) {
  try {
    const d = datos || {};
    const pixel = String(env.META_PIXEL_ID ?? '').trim();
    const token = String(env.META_CAPI_ACCESS_TOKEN ?? '').trim();
    if (!pixel || !token) return { enviado: false, motivo: 'sin_configurar' };
    if (d.consentimiento !== true) return { enviado: false, motivo: 'sin_consentimiento' };
    if (!eventIdValido(d.eventId)) return { enviado: false, motivo: 'event_id_invalido' };

    const evento = armarEventoLead(d);
    const testCode = String(env.META_TEST_EVENT_CODE ?? '').trim();
    // El token va en el cuerpo y no en la URL, para que no quede en logs.
    const cuerpo = { data: [evento], access_token: token };
    if (testCode) cuerpo.test_event_code = testCode;

    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT_MS) : null;
    try {
      const r = await fetchImpl(`${GRAPH_URL}/${encodeURIComponent(pixel)}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
        ...(ctrl ? { signal: ctrl.signal } : {}),
      });
      if (!r || !r.ok) {
        // Solo el status: el cuerpo de error de Meta puede repetir datos.
        console.error(`Meta CAPI respondió ${r ? r.status : 'sin respuesta'}.`);
        return { enviado: false, motivo: 'error_meta', status: r ? r.status : null };
      }
      return { enviado: true, status: r.status };
    } finally {
      if (timer) clearTimeout(timer);
    }
  } catch (err) {
    console.error('No se pudo mandar el Lead a Meta CAPI:', err && err.name === 'AbortError' ? 'timeout' : (err && err.name) || 'error');
    return { enviado: false, motivo: 'excepcion' };
  }
}

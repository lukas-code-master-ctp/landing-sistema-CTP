// Pruebas de api/_meta-capi.js (API de conversiones de Meta) y de
// api/demo.js (el Lead enchufado y la fila "Origen" del aviso al equipo).
// Sin dependencias ni red:  node tools/test_capi.mjs
//
// Lo que más importa vigilar: que sin consentimiento, sin token o sin
// píxel no salga nada; que correo y teléfono viajen hasheados; que el token
// no quede en la URL; y que un error nunca se propague al formulario.

import assert from 'node:assert';
import { createHash } from 'node:crypto';

const m = await import(new URL('../api/_meta-capi.js', import.meta.url));

let corridas = 0, fallos = 0;
async function prueba(nombre, fn) {
  corridas++;
  try {
    await fn();
    console.log('  ok  ' + nombre);
  } catch (e) {
    fallos++;
    console.log('  FALLA  ' + nombre);
    console.log('        ' + (e && e.message ? e.message.split('\n').join('\n        ') : e));
  }
}

const sha = (s) => createHash('sha256').update(s).digest('hex');
const ENV = { META_PIXEL_ID: '4526586427599697', META_CAPI_ACCESS_TOKEN: 'EAAtoken-secreto' };
const DATOS = {
  consentimiento: true,
  eventId: '3f1c2b4a-1111-4222-8333-444455556666',
  email: '  Pedro@Cierra.CL ',
  telefono: '+56 9 1234 5678',
  ip: '200.1.2.3',
  userAgent: 'Mozilla/5.0',
  fbp: 'fb.1.1700000000000.123',
  fbc: 'fb.1.1700000000000.abc',
  url: 'https://cierra.cl/#demo',
  ahora: 1762300000123,
};

// fetch falso: anota lo que se le pidió y responde lo que se le diga.
function fetchFalso(respuesta = { ok: true, status: 200 }) {
  const f = async (url, init) => {
    f.llamadas.push({ url, init, cuerpo: JSON.parse(init.body) });
    if (respuesta instanceof Error) throw respuesta;
    return respuesta;
  };
  f.llamadas = [];
  return f;
}

// Silencia console.error mientras corre fn y devuelve lo que se logueó.
async function sinLogs(fn) {
  const orig = console.error;
  const logs = [];
  console.error = (...a) => { logs.push(a.map(String).join(' ')); };
  try { return { valor: await fn(), logs }; } finally { console.error = orig; }
}

console.log('_meta-capi.js');

await prueba('sha256Hex da el hash conocido', () => {
  assert.strictEqual(m.sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

await prueba('normalizarEmail: trim y minúsculas; vacío → null', () => {
  assert.strictEqual(m.normalizarEmail('  Pedro@Cierra.CL '), 'pedro@cierra.cl');
  assert.strictEqual(m.normalizarEmail('   '), null);
  assert.strictEqual(m.normalizarEmail(undefined), null);
});

await prueba('normalizarTelefono: solo dígitos, sin 00, celular chileno con 56', () => {
  assert.strictEqual(m.normalizarTelefono('+56 9 1234 5678'), '56912345678');
  assert.strictEqual(m.normalizarTelefono('9 1234 5678'), '56912345678');
  assert.strictEqual(m.normalizarTelefono('0056912345678'), '56912345678');
  assert.strictEqual(m.normalizarTelefono('(2) 2345 6789'), '223456789', 'fijo de 9 dígitos que no empieza con 9 queda igual');
  assert.strictEqual(m.normalizarTelefono('sin número'), null);
  assert.strictEqual(m.normalizarTelefono(null), null);
});

await prueba('clienteIp: primera de x-forwarded-for, si no x-real-ip', () => {
  assert.strictEqual(m.clienteIp({ 'x-forwarded-for': '200.1.2.3, 10.0.0.1' }), '200.1.2.3');
  assert.strictEqual(m.clienteIp({ 'x-real-ip': '200.9.9.9' }), '200.9.9.9');
  assert.strictEqual(m.clienteIp({}), null);
  assert.strictEqual(m.clienteIp(undefined), null);
});

await prueba('urlFuente: solo URLs del sitio o de un deploy de Vercel', () => {
  assert.strictEqual(m.urlFuente('https://cierra.cl/?utm=x', ''), 'https://cierra.cl/?utm=x');
  assert.strictEqual(m.urlFuente('https://www.cierra.cl/', ''), 'https://www.cierra.cl/');
  assert.strictEqual(m.urlFuente('https://landing-abc.vercel.app/', ''), 'https://landing-abc.vercel.app/');
  assert.strictEqual(m.urlFuente('https://cierra.cl.evil.com/', 'https://cierra.cl/legal.html'), 'https://cierra.cl/legal.html');
  assert.strictEqual(m.urlFuente('http://cierra.cl/', 'https://otro.com/'), 'https://cierra.cl/');
  assert.strictEqual(m.urlFuente(undefined, undefined), 'https://cierra.cl/');
});

await prueba('armarEventoLead: forma completa, con em y ph hasheados', () => {
  const ev = m.armarEventoLead(DATOS);
  assert.deepStrictEqual(ev, {
    event_name: 'Lead',
    event_time: 1762300000,
    event_id: DATOS.eventId,
    action_source: 'website',
    event_source_url: 'https://cierra.cl/#demo',
    user_data: {
      client_ip_address: '200.1.2.3',
      client_user_agent: 'Mozilla/5.0',
      em: [sha('pedro@cierra.cl')],
      ph: [sha('56912345678')],
      fbp: DATOS.fbp,
      fbc: DATOS.fbc,
    },
    custom_data: { content_name: 'Demo Cierra' },
  });
  assert.ok(!JSON.stringify(ev).includes('Pedro'), 'el correo en claro no puede viajar');
});

await prueba('armarEventoLead: sin claves vacías', () => {
  const ev = m.armarEventoLead({ eventId: 'x', email: '', telefono: '', ahora: 1000 });
  assert.deepStrictEqual(ev.user_data, {});
  assert.ok(!('event_source_url' in ev));
  assert.strictEqual(ev.event_time, 1);
  assert.ok(Number.isInteger(m.armarEventoLead({}).event_time));
});

await prueba('no envía sin consentimiento', async () => {
  for (const c of [false, undefined, 'true', 1]) {
    const f = fetchFalso();
    const r = await m.enviarLeadCapi({ ...DATOS, consentimiento: c }, ENV, f);
    assert.deepStrictEqual(r, { enviado: false, motivo: 'sin_consentimiento' }, String(c));
    assert.strictEqual(f.llamadas.length, 0);
  }
});

await prueba('no envía sin token o sin píxel (también si son solo espacios)', async () => {
  for (const env of [{}, { META_PIXEL_ID: ENV.META_PIXEL_ID }, { META_CAPI_ACCESS_TOKEN: 't' }, { META_PIXEL_ID: ' ', META_CAPI_ACCESS_TOKEN: '  \n' }]) {
    const f = fetchFalso();
    const r = await m.enviarLeadCapi(DATOS, env, f);
    assert.deepStrictEqual(r, { enviado: false, motivo: 'sin_configurar' });
    assert.strictEqual(f.llamadas.length, 0);
  }
});

await prueba('no envía con un event_id raro', async () => {
  for (const id of ['', '   ', 42, null, 'x'.repeat(101)]) {
    const f = fetchFalso();
    const r = await m.enviarLeadCapi({ ...DATOS, eventId: id }, ENV, f);
    assert.strictEqual(r.motivo, 'event_id_invalido', String(id));
    assert.strictEqual(f.llamadas.length, 0);
  }
});

await prueba('envía: URL del píxel, token en el cuerpo y no en la URL', async () => {
  const f = fetchFalso();
  const r = await m.enviarLeadCapi(DATOS, { META_PIXEL_ID: ' 4526586427599697\n', META_CAPI_ACCESS_TOKEN: 'EAAtoken-secreto\r\n' }, f);
  assert.deepStrictEqual(r, { enviado: true, status: 200 });
  assert.strictEqual(f.llamadas.length, 1);
  const { url, init, cuerpo } = f.llamadas[0];
  assert.strictEqual(url, 'https://graph.facebook.com/v21.0/4526586427599697/events');
  assert.ok(!url.includes('token') && !url.includes('EAA'), 'el token no va en la URL');
  assert.strictEqual(init.method, 'POST');
  assert.strictEqual(init.headers['Content-Type'], 'application/json');
  assert.ok(init.signal, 'lleva AbortController para el timeout');
  assert.strictEqual(cuerpo.access_token, 'EAAtoken-secreto');
  assert.deepStrictEqual(cuerpo.data, [m.armarEventoLead(DATOS)]);
  assert.ok(!('test_event_code' in cuerpo));
});

await prueba('META_TEST_EVENT_CODE va en el cuerpo si está', async () => {
  const f = fetchFalso();
  await m.enviarLeadCapi(DATOS, { ...ENV, META_TEST_EVENT_CODE: ' TEST123 ' }, f);
  assert.strictEqual(f.llamadas[0].cuerpo.test_event_code, 'TEST123');
});

await prueba('un fetch que lanza no se propaga y no loguea el token ni datos', async () => {
  const f = fetchFalso(new Error('red caída EAAtoken-secreto pedro@cierra.cl'));
  const { valor, logs } = await sinLogs(() => m.enviarLeadCapi(DATOS, ENV, f));
  assert.deepStrictEqual(valor, { enviado: false, motivo: 'excepcion' });
  const todo = logs.join('\n');
  assert.ok(logs.length > 0, 'queda algo en el log');
  assert.ok(!todo.includes('EAAtoken') && !todo.includes('pedro'), todo);
});

await prueba('una respuesta de error de Meta se reporta sin lanzar', async () => {
  const f = fetchFalso({ ok: false, status: 400 });
  const { valor, logs } = await sinLogs(() => m.enviarLeadCapi(DATOS, ENV, f));
  assert.deepStrictEqual(valor, { enviado: false, motivo: 'error_meta', status: 400 });
  assert.ok(!logs.join('\n').includes('EAAtoken'));
});

await prueba('un timeout corta el request', async () => {
  const f = (url, init) => new Promise((_, rechazar) => {
    init.signal.addEventListener('abort', () => { const e = new Error('abort'); e.name = 'AbortError'; rechazar(e); });
  });
  const real = setTimeout;
  globalThis.setTimeout = (fn) => real(fn, 0); // no esperar los 4 s
  try {
    const { valor } = await sinLogs(() => m.enviarLeadCapi(DATOS, ENV, f));
    assert.deepStrictEqual(valor, { enviado: false, motivo: 'excepcion' });
  } finally {
    globalThis.setTimeout = real;
  }
});

// ── api/demo.js con la CAPI enchufada ──────────────────────────────
async function correrDemo(body, { resendOk = true, crm = false } = {}) {
  const demo = (await import(new URL('../api/demo.js', import.meta.url))).default;
  const pedidos = [];
  const fetchReal = globalThis.fetch;
  const envReal = { ...process.env };
  globalThis.fetch = async (url, init) => {
    pedidos.push({ url: String(url), cuerpo: init && init.body ? JSON.parse(init.body) : null });
    if (String(url).includes('resend') && !resendOk) return { ok: false, status: 500, text: async () => 'x' };
    return { ok: true, status: 200, json: async () => ({}), text: async () => '' };
  };
  Object.assign(process.env, { RESEND_API_KEY: 're_x', ...ENV });
  delete process.env.CRM_WEBHOOK_URL;
  delete process.env.CRM_WEBHOOK_TOKEN;
  if (crm) process.env.CRM_WEBHOOK_URL = 'https://planilla.example/webhook';
  const res = { code: 0, json(o) { this.body = o; return this; }, status(c) { this.code = c; return this; }, setHeader() {} };
  try {
    await sinLogs(() => demo({
      method: 'POST',
      headers: { 'x-forwarded-for': '200.1.2.3', 'user-agent': 'UA', referer: 'https://cierra.cl/' },
      body: { nombre: 'Pedro', email: 'pedro@cierra.cl', telefono: '912345678', empresa: 'X', ...body },
    }, res));
  } finally {
    globalThis.fetch = fetchReal;
    for (const k of Object.keys(process.env)) if (!(k in envReal)) delete process.env[k];
    Object.assign(process.env, envReal);
  }
  return {
    res,
    meta: pedidos.filter((p) => p.url.includes('graph.facebook.com')),
    // En orden: [0] el aviso al equipo, [1] la confirmación al cliente.
    correos: pedidos.filter((p) => p.url.includes('resend')).map((p) => p.cuerpo),
    planilla: pedidos.filter((p) => p.url.includes('planilla.example')).map((p) => p.cuerpo),
  };
}

await prueba('demo.js: con consentimiento manda el Lead después del aviso y responde 200', async () => {
  const { res, meta } = await correrDemo({ meta_consentimiento: true, meta_event_id: 'id-1', meta_fbp: 'fb.1.2.3', pagina: 'https://cierra.cl/?a=1' });
  assert.strictEqual(res.code, 200);
  assert.deepStrictEqual(res.body, { ok: true });
  assert.strictEqual(meta.length, 1);
  const ev = meta[0].cuerpo.data[0];
  assert.strictEqual(ev.event_id, 'id-1');
  assert.strictEqual(ev.event_source_url, 'https://cierra.cl/?a=1');
  assert.strictEqual(ev.user_data.client_ip_address, '200.1.2.3');
  assert.strictEqual(ev.user_data.fbp, 'fb.1.2.3');
  assert.deepStrictEqual(ev.user_data.ph, [sha('56912345678')]);
});

await prueba('demo.js: sin consentimiento (o con "true" string) no llama a Meta', async () => {
  for (const c of [undefined, false, 'true']) {
    const { res, meta } = await correrDemo({ meta_consentimiento: c, meta_event_id: 'id-1' });
    assert.strictEqual(res.code, 200);
    assert.strictEqual(meta.length, 0, String(c));
  }
});

await prueba('demo.js: si falla el aviso al equipo no se manda a Meta', async () => {
  const { res, meta } = await correrDemo({ meta_consentimiento: true, meta_event_id: 'id-1' }, { resendOk: false });
  assert.strictEqual(res.code, 502);
  assert.strictEqual(meta.length, 0);
});

// ── api/demo.js: fila "Origen" del aviso al equipo ─────────────────
const { origenLegible } = await import(new URL('../api/demo.js', import.meta.url));

await prueba('origenLegible: ruta y parámetros de una URL http(s), sin dominio ni hash', () => {
  assert.strictEqual(origenLegible('https://cierra.cl/demo/?utm_source=meta&utm_campaign=x'), '/demo/?utm_source=meta&utm_campaign=x');
  assert.strictEqual(origenLegible('https://cierra.cl/demo/?utm_source=meta#demo'), '/demo/?utm_source=meta');
  assert.strictEqual(origenLegible('https://cierra.cl/#demo'), '/');
  assert.strictEqual(origenLegible('http://localhost:8000/demo/'), '/demo/');
  assert.strictEqual(origenLegible('  https://cierra.cl/demo/  '), '/demo/');
});

await prueba('origenLegible: lo que no es una URL http(s) da "—", sin lanzar', () => {
  const raros = ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'mailto:a@b.cl',
    'texto suelto', '/demo/?utm_source=meta', '', '   ', 42, 0, null, undefined, true, {}, [], ['https://cierra.cl/'],
    { toString() { throw new Error('no'); } }];
  for (const v of raros) {
    assert.strictEqual(origenLegible(v), '—', typeof v === 'string' ? JSON.stringify(v) : Object.prototype.toString.call(v));
  }
  assert.strictEqual(origenLegible(), '—');
});

await prueba('origenLegible: recorta a 300 caracteres y no deja pasar HTML ni saltos de línea', () => {
  const largo = origenLegible('https://cierra.cl/demo/?utm_campaign=' + 'a'.repeat(1000));
  assert.strictEqual(largo.length, 300);
  assert.ok(largo.startsWith('/demo/?utm_campaign=aaa'));
  const sucio = origenLegible('https://cierra.cl/demo/?x=<script>alert(1)</script>&y="\n\rOtra: línea');
  assert.ok(!/[<>"\n\r]/.test(sucio), sucio);
});

await prueba('demo.js: el aviso al equipo trae "Origen" con la ruta y los UTM (texto y HTML)', async () => {
  const { res, correos } = await correrDemo({ pagina: 'https://cierra.cl/demo/?utm_source=meta&utm_campaign=x#demo' });
  assert.strictEqual(res.code, 200);
  assert.strictEqual(correos.length, 2, 'aviso al equipo y confirmación al cliente');
  const [equipo, cliente] = correos;
  assert.ok(equipo.subject.startsWith('Nueva solicitud de demo'), equipo.subject);
  const lineas = equipo.text.split('\n');
  const i = lineas.indexOf('Origen: /demo/?utm_source=meta&utm_campaign=x');
  assert.ok(i !== -1, equipo.text);
  assert.ok(lineas[i - 1].startsWith('Tamaño del equipo: '), 'Origen va después de "Tamaño del equipo"');
  assert.ok(/>Origen<\/td>\s*<td[^>]*>\/demo\/\?utm_source=meta&amp;utm_campaign=x<\/td>/.test(equipo.html), 'falta la fila Origen (con & escapado) en el HTML');
  assert.ok(!equipo.html.includes('utm_source=meta&utm_campaign'), 'el & del origen va escapado en el HTML');
  // El correo al cliente no cambia: no lleva el origen.
  assert.deepStrictEqual(cliente.to, ['pedro@cierra.cl']);
  assert.ok(!cliente.text.includes('Origen') && !cliente.html.includes('Origen'), 'el correo al cliente no lleva Origen');
  assert.ok(!cliente.text.includes('utm_source') && !cliente.html.includes('utm_source'));
});

await prueba('demo.js: sin `pagina` (o con algo que no es una URL) el aviso dice "Origen: —"', async () => {
  for (const pagina of [undefined, 'javascript:alert(1)', 42, { a: 1 }]) {
    const { res, correos } = await correrDemo({ pagina });
    assert.strictEqual(res.code, 200);
    assert.ok(correos[0].text.split('\n').includes('Origen: —'), String(pagina));
    assert.ok(/>Origen<\/td>\s*<td[^>]*>—<\/td>/.test(correos[0].html), String(pagina));
  }
});

await prueba('demo.js: un `pagina` con <script> no llega sin escapar al aviso', async () => {
  for (const pagina of [
    'https://cierra.cl/demo/?x=<script>alert(1)</script>',
    'https://cierra.cl/demo/<img src=x onerror=alert(1)>',
    '<script>alert(1)</script>',
    'https://cierra.cl/"><script>alert(1)</script>',
  ]) {
    const { res, correos } = await correrDemo({ pagina });
    assert.strictEqual(res.code, 200);
    for (const c of correos) {
      assert.ok(!/<script|<img src=x|onerror=alert\(1\)>/i.test(c.html), pagina);
    }
    assert.ok(!correos[0].text.includes('<script'), pagina);
  }
});

await prueba('demo.js: el cuerpo del webhook de la planilla no cambia (origen: landing/demo, sin la página)', async () => {
  const { res, planilla } = await correrDemo({ pagina: 'https://cierra.cl/demo/?utm_source=meta', equipo: '' }, { crm: true });
  assert.strictEqual(res.code, 200);
  assert.strictEqual(planilla.length, 1);
  assert.deepStrictEqual(Object.keys(planilla[0]).sort(), ['email', 'empresa', 'equipo', 'fecha', 'nombre', 'origen', 'telefono']);
  assert.strictEqual(planilla[0].origen, 'landing/demo');
});

console.log('');
console.log(corridas + ' pruebas, ' + fallos + ' fallo(s)');
process.exit(fallos ? 1 : 0);

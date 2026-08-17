// Vercel Serverless Function — recibe el formulario "Agenda tu demo" y:
//   1. avisa al equipo por email (Resend),
//   2. le confirma la recepción al cliente por email,
//   3. opcionalmente empuja el lead a la planilla que hace de CRM.
//
// La RESEND_API_KEY NUNCA va en el front: vive aquí, como variable de entorno.
//
// Variables de entorno (Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY   (obligatoria) — API key de Resend (empieza con "re_").
//   DEMO_FROM        (recomendada) — remitente. DEBE pertenecer a un dominio
//                                    verificado en Resend (cierra.cl). Sin
//                                    dominio verificado, Resend solo entrega al
//                                    dueño de la cuenta y el lead NO llega.
//                                    Default: Cierra.cl <no-reply@cierra.cl>
//   DEMO_TO          (opcional)    — destinatario(s), separados por coma.
//                                    Default: pedro@cierra.cl
//   DEMO_CC          (opcional)    — copia(s), separadas por coma.
//                                    Default: lukas@cierra.cl
//   DEMO_REPLY_TO    (opcional)    — dirección que ve el cliente al responder
//                                    su correo de confirmación.
//                                    Default: contacto@cierra.cl
//   CRM_WEBHOOK_URL  (opcional)    — URL que recibe el lead en JSON para
//                                    escribirlo en la planilla (por ejemplo, un
//                                    Google Apps Script publicado como Web App).
//                                    Si no está definida, ese paso se omite.
//   CRM_WEBHOOK_TOKEN(opcional)    — se manda como header X-Auth-Token al
//                                    webhook, por si quieres protegerlo.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const esc = (s) =>
  String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

// "a@x.cl, b@y.cl" → ["a@x.cl", "b@y.cl"]
const list = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

const SITIO = 'https://cierra.cl';
const LOGO = `${SITIO}/assets/cierra-lockup-email.png`;

/**
 * Envoltorio HTML de los correos. Va con tablas y estilos en línea a propósito:
 * Outlook y Gmail ignoran hojas de estilo, flexbox y grid. El logo es PNG
 * porque ningún cliente de correo renderiza SVG, y va sobre una banda oscura
 * para que se vea igual en modo claro y oscuro.
 */
function plantilla({ titulo, cuerpo }) {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titulo)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f4f5;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:100%;background:#ffffff;border:1px solid #e4e4e7;border-radius:14px;overflow:hidden;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
        <tr><td style="background:#09090b;padding:22px 28px;">
          <img src="${LOGO}" width="181" height="33" alt="Cierra.cl" style="display:block;border:0;">
        </td></tr>
        <tr><td style="padding:32px 28px 30px;color:#3f3f46;font-size:15px;line-height:1.65;">
          ${cuerpo}
        </td></tr>
        <tr><td style="background:#fafafa;border-top:1px solid #e4e4e7;padding:20px 28px;color:#71717a;font-size:12px;line-height:1.6;">
          <a href="${SITIO}" style="color:#007c10;text-decoration:none;font-weight:600;">Cierra.cl</a> — el software que opera la venta de parcelas, del primer lead a la inscripción en el CBR.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Filas de datos, en tabla porque los clientes de correo no hacen grid. */
function filasDatos(pares) {
  const filas = pares
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr>
        <td style="padding:7px 18px 7px 0;color:#71717a;font-size:13px;white-space:nowrap;vertical-align:top;">${esc(k)}</td>
        <td style="padding:7px 0;color:#18181b;font-size:14px;font-weight:600;">${esc(v)}</td>
      </tr>`).join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">${filas}</table>`;
}

async function sendEmail(apiKey, payload) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
  return r.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  // Vercel parsea JSON en req.body cuando Content-Type es application/json,
  // pero por si llega como string lo intentamos parsear igual.
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const nombre = String(body.nombre || '').trim();
  const email = String(body.email || '').trim();
  const telefono = String(body.telefono || '').trim();
  const empresa = String(body.empresa || '').trim();
  const equipo = String(body.equipo || '').trim();

  if (!nombre || !email || !telefono || !empresa) {
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Email inválido.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('Falta la variable de entorno RESEND_API_KEY.');
    return res.status(500).json({ error: 'Servicio sin configurar.' });
  }

  const from = process.env.DEMO_FROM || 'Cierra.cl <no-reply@cierra.cl>';
  const to = list(process.env.DEMO_TO || 'pedro@cierra.cl');
  const cc = list(process.env.DEMO_CC ?? 'lukas@cierra.cl');
  const replyTo = process.env.DEMO_REPLY_TO || 'contacto@cierra.cl';

  const fecha = new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Santiago',
  }).format(new Date());

  // ---------------------------------------------------------------- 1. Equipo
  // Este es el que no puede fallar: si no sale, devolvemos error al front para
  // que el visitante sepa que su solicitud no quedó registrada.
  try {
    await sendEmail(apiKey, {
      from,
      to,
      ...(cc.length ? { cc } : {}),
      reply_to: email,
      subject: `Nueva solicitud de demo — ${empresa}`,
      text: [
        'Nueva solicitud de demo',
        '',
        `Nombre: ${nombre}`,
        `Email: ${email}`,
        `Teléfono: ${telefono}`,
        `Inmobiliaria o corredora: ${empresa}`,
        `Tamaño del equipo: ${equipo || '—'}`,
        '',
        `Recibida el ${fecha}`,
        `Este correo responde a ${email}, así que puedes contestarle desde aquí.`,
      ].join('\n'),
      html: plantilla({
        titulo: `Nueva solicitud de demo — ${empresa}`,
        cuerpo: `
          <p style="margin:0 0 4px;color:#007c10;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Nuevo lead</p>
          <h1 style="margin:0 0 22px;color:#09090b;font-size:23px;line-height:1.3;font-weight:800;">${esc(empresa)}</h1>
          ${filasDatos([
            ['Nombre', nombre],
            ['Email', email],
            ['Teléfono', telefono],
            ['Tamaño del equipo', equipo || '—'],
          ])}
          <p style="margin:26px 0 0;padding-top:18px;border-top:1px solid #e4e4e7;color:#71717a;font-size:13px;line-height:1.6;">
            Recibida el ${esc(fecha)}<br>
            Este correo lleva configurado el <strong>Responder a: ${esc(email)}</strong>, así que puedes contestarle directamente desde aquí.
          </p>`,
      }),
    });
  } catch (err) {
    console.error('No se pudo avisar al equipo:', err);
    return res.status(502).json({ error: 'No se pudo enviar el email.' });
  }

  // ------------------------------------------- 2 y 3. Confirmación y planilla
  // Ninguno de los dos debe voltear la respuesta: el lead ya está a salvo en la
  // bandeja del equipo. Si fallan, quedan en los logs de Vercel.
  const extras = [];

  extras.push(
    sendEmail(apiKey, {
      from,
      to: [email],
      reply_to: replyTo,
      subject: 'Recibimos tu solicitud de demo — Cierra.cl',
      text: [
        `Hola ${nombre},`,
        '',
        `Recibimos tu solicitud de demo para ${empresa}. Te contactamos dentro de 1 día hábil para coordinar la sesión.`,
        '',
        'Qué vas a ver en la demo:',
        '· 30 minutos, sin compromiso.',
        '· El sistema funcionando con tus proyectos, no con datos de ejemplo.',
        '· Una recomendación de plan según el tamaño de tu equipo.',
        '',
        'Los datos que nos dejaste:',
        `Email: ${email}`,
        `Teléfono: ${telefono}`,
        `Inmobiliaria o corredora: ${empresa}`,
        equipo ? `Tamaño del equipo: ${equipo}` : '',
        '',
        'Si algo está mal o quieres agregar contexto, responde este correo.',
        '',
        'Equipo Cierra.cl',
        SITIO,
      ].filter(Boolean).join('\n'),
      html: plantilla({
        titulo: 'Recibimos tu solicitud de demo',
        cuerpo: `
          <h1 style="margin:0 0 18px;color:#09090b;font-size:24px;line-height:1.3;font-weight:800;">Recibimos tu solicitud</h1>
          <p style="margin:0 0 16px;">Hola <strong style="color:#18181b;">${esc(nombre)}</strong>, gracias por tu interés en Cierra.cl.</p>
          <p style="margin:0 0 26px;">Tenemos tu solicitud de demo para <strong style="color:#18181b;">${esc(empresa)}</strong> y te contactamos dentro de <strong style="color:#18181b;">1 día hábil</strong> para coordinar la sesión.</p>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f6faf6;border:1px solid #d8ebd9;border-radius:10px;">
            <tr><td style="padding:20px 22px;">
              <p style="margin:0 0 12px;color:#09090b;font-size:14px;font-weight:700;">Qué vas a ver en la demo</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="padding:3px 10px 3px 0;color:#007c10;font-size:14px;font-weight:700;">✓</td><td style="padding:3px 0;font-size:14px;">30 minutos, sin compromiso.</td></tr>
                <tr><td style="padding:3px 10px 3px 0;color:#007c10;font-size:14px;font-weight:700;">✓</td><td style="padding:3px 0;font-size:14px;">El sistema funcionando con tus proyectos, no con datos de ejemplo.</td></tr>
                <tr><td style="padding:3px 10px 3px 0;color:#007c10;font-size:14px;font-weight:700;">✓</td><td style="padding:3px 0;font-size:14px;">Una recomendación de plan según el tamaño de tu equipo.</td></tr>
              </table>
            </td></tr>
          </table>

          <p style="margin:28px 0 10px;color:#09090b;font-size:14px;font-weight:700;">Los datos que nos dejaste</p>
          ${filasDatos([
            ['Email', email],
            ['Teléfono', telefono],
            ['Inmobiliaria o corredora', empresa],
            ['Tamaño del equipo', equipo],
          ])}

          <p style="margin:26px 0 0;padding-top:18px;border-top:1px solid #e4e4e7;color:#71717a;font-size:13px;line-height:1.6;">
            ¿Algo está mal o quieres agregar contexto? Responde este correo y te leemos.
          </p>`,
      }),
    }).catch((err) => { console.error('No se pudo confirmarle al cliente:', err); }),
  );

  const crmUrl = process.env.CRM_WEBHOOK_URL;
  if (crmUrl) {
    extras.push(
      fetch(crmUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Se manda también como header por si algún día el webhook no es Apps
          // Script; Apps Script NO recibe headers propios, por eso el token va
          // además dentro del cuerpo.
          ...(process.env.CRM_WEBHOOK_TOKEN ? { 'X-Auth-Token': process.env.CRM_WEBHOOK_TOKEN } : {}),
        },
        body: JSON.stringify({
          fecha: new Date().toISOString(),
          origen: 'landing/demo',
          nombre, email, telefono, empresa, equipo,
          ...(process.env.CRM_WEBHOOK_TOKEN ? { token: process.env.CRM_WEBHOOK_TOKEN } : {}),
        }),
      })
        .then((r) => { if (!r.ok) throw new Error(`webhook ${r.status}`); })
        .catch((err) => { console.error('No se pudo escribir en la planilla:', err); }),
    );
  }

  await Promise.allSettled(extras);

  return res.status(200).json({ ok: true });
}

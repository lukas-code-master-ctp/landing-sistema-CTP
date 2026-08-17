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
      html: `
        <h2>Nueva solicitud de demo</h2>
        <p><strong>Nombre:</strong> ${esc(nombre)}</p>
        <p><strong>Email:</strong> ${esc(email)}</p>
        <p><strong>Teléfono:</strong> ${esc(telefono)}</p>
        <p><strong>Inmobiliaria / corredora:</strong> ${esc(empresa)}</p>
        <p><strong>Tamaño del equipo:</strong> ${esc(equipo) || '—'}</p>
        <hr>
        <p style="color:#71717a;font-size:13px">Recibida el ${esc(fecha)} · Responde este correo para contestarle directamente a ${esc(nombre)}.</p>
      `,
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
      html: `
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;color:#09090b;line-height:1.6">
          <p>Hola ${esc(nombre)},</p>
          <p>Recibimos tu solicitud de demo para <strong>${esc(empresa)}</strong>. Te contactamos dentro de <strong>1 día hábil</strong> para coordinar una sesión de 30 minutos, sin compromiso.</p>
          <p>Estos son los datos que nos dejaste:</p>
          <table cellpadding="0" cellspacing="0" style="font-size:14px;color:#3f3f46">
            <tr><td style="padding:2px 16px 2px 0"><strong>Email</strong></td><td>${esc(email)}</td></tr>
            <tr><td style="padding:2px 16px 2px 0"><strong>Teléfono</strong></td><td>${esc(telefono)}</td></tr>
            <tr><td style="padding:2px 16px 2px 0"><strong>Inmobiliaria</strong></td><td>${esc(empresa)}</td></tr>
            ${equipo ? `<tr><td style="padding:2px 16px 2px 0"><strong>Equipo</strong></td><td>${esc(equipo)}</td></tr>` : ''}
          </table>
          <p>Si algo está mal o quieres agregar contexto, responde este correo.</p>
          <p style="margin-top:24px">Equipo Cierra.cl<br>
            <span style="color:#71717a;font-size:13px">El software que opera la venta de parcelas, del lead a la inscripción en el CBR.</span>
          </p>
        </div>
      `,
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

// Vercel Serverless Function — recibe el formulario "Agenda tu demo" y envía el
// lead por email usando Resend.
//
// La RESEND_API_KEY NUNCA va en el front: vive aquí, como variable de entorno.
//
// Variables de entorno (Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY  (obligatoria) — API key de Resend (empieza con "re_").
//   DEMO_TO         (opcional)    — bandeja que recibe los leads.
//                                   Default: ventas@cierra.cl
//   DEMO_FROM       (opcional)    — remitente. DEBE pertenecer a un dominio
//                                   verificado en Resend (ej. cierra.cl). Para
//                                   probar sin verificar dominio usa:
//                                   onboarding@resend.dev (solo envía al dueño
//                                   de la cuenta Resend).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const esc = (s) =>
  String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

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

  const to = process.env.DEMO_TO || 'ventas@cierra.cl';
  const from = process.env.DEMO_FROM || 'Cierra.cl <onboarding@resend.dev>';

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `Nueva solicitud de demo — ${empresa}`,
        html: `
          <h2>Nueva solicitud de demo</h2>
          <p><strong>Nombre:</strong> ${esc(nombre)}</p>
          <p><strong>Email:</strong> ${esc(email)}</p>
          <p><strong>Teléfono:</strong> ${esc(telefono)}</p>
          <p><strong>Inmobiliaria / corredora:</strong> ${esc(empresa)}</p>
          <p><strong>Tamaño del equipo:</strong> ${esc(equipo) || '—'}</p>
        `,
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      console.error('Resend respondió error', r.status, detail);
      return res.status(502).json({ error: 'No se pudo enviar el email.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Fallo llamando a Resend:', err);
    return res.status(500).json({ error: 'Error interno.' });
  }
}

/**
 * Cierra.cl — Apps Script de la planilla "Development - impulsalA".
 *
 * Este archivo NO se despliega con la web: se pega dentro del editor de Apps
 * Script de la planilla (Extensiones → Apps Script) y se publica como Web App.
 * Está versionado aquí solo para no perderlo.
 *
 * ─── Atiende DOS orígenes con una sola doPost ─────────────────────────────────
 * Apps Script admite una única función doPost por proyecto, así que las dos
 * integraciones conviven en un router:
 *
 *   1. Botón "Reportar error o sugerencia" de la app  → pestaña "app report Cierra"
 *   2. Formulario "Agenda tu demo" de la landing      → pestaña "Clientes Cierra"
 *
 * El router deriva a la landing solo cuando el JSON trae `origen: "landing/demo"`.
 * Todo lo demás sigue el camino de siempre, así que el reporte de errores se
 * comporta exactamente igual que antes de agregar los leads.
 *
 * ─── Instalación ──────────────────────────────────────────────────────────────
 * 1. Reemplaza TODO el contenido del editor por este archivo y guarda.
 * 2. Configuración del proyecto → Propiedades del script. Deja intacta
 *    ULTIMO_TICKET (la usa el correlativo de tickets) y agrega:
 *       TOKEN = una cadena larga al azar (la misma que pondrás en Vercel)
 * 3. Implementar → Gestionar implementaciones → edita la implementación web que
 *    YA EXISTE (la que usa la app para los reportes) y publica una versión
 *    nueva. No crees una implementación aparte: la app seguiría apuntando a la
 *    URL vieja y esa URL quedaría con el código antiguo.
 *       Ejecutar como:        Yo
 *       Quién tiene acceso:   Cualquier persona          ← imprescindible
 * 4. En Vercel → Settings → Environment Variables:
 *       CRM_WEBHOOK_URL   = la misma URL /exec de esa implementación
 *       CRM_WEBHOOK_TOKEN = el mismo TOKEN del paso 2
 *    Vuelve a desplegar para que las variables tomen efecto.
 *
 * Cada vez que edites este código hay que publicar una versión nueva de la
 * implementación. Si no, Google sigue sirviendo la versión vieja.
 */

const SPREADSHEET_ID = '1WlO7QsWJoKB4_7yPYFahWQzwqdR7c31SDPItBCl2Z6U';
const DRIVE_FOLDER_ID = '1vjkRo8tt-l8gYfXN8QEpP5gW1Bfpoaqr';  // para guardar las fotos

const HOJA_REPORTES = 'app report cierra';
const HOJA_LEADS = 'clientes cierra';

// ═══════════════════════════════════════════════════════════════════ Router ══

function doPost(e) {
  try {
    const p = JSON.parse(e.postData.contents);
    // Queda en Ejecuciones. Sin esto, cuando algo no llega a la planilla no hay
    // forma de saber por que rama se fue el POST.
    console.log('POST recibido. origen=' + (p.origen || '(sin origen)'));
    return p.origen === 'landing/demo' ? guardarLead_(p) : guardarReporte_(p);
  } catch (err) {
    console.error('doPost fallo: ' + err);
    return responder_({ ok: false, error: String(err) });
  }
}

// ════════════════════════════════════════════════════════════════ Comunes ══

// Devuelve una pestaña tolerando espacios y mayúsculas/minúsculas.
function getHoja_(objetivo) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheets().find(function (s) {
    return s.getName().trim().toLowerCase() === objetivo;
  });
  if (!sheet) {
    const existentes = ss.getSheets().map(function (s) {
      return '"' + s.getName() + '"';
    }).join(', ');
    throw new Error('No encontré la pestaña "' + objetivo + '". Pestañas en este archivo: ' + existentes);
  }
  return sheet;
}

function responder_(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}

// ══════════════════════════════════ 1. Reportes de la app (código original) ══

// Correlativo automático y a prueba de concurrencia. Usa un contador propio
// (no depende del orden ni de la cantidad de filas), así que es estable aunque
// se borren o reordenen filas. Formato: TCK-0001, TCK-0002, ...
function generarTicketId_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000); // evita colisiones si llegan dos reportes al mismo tiempo
  try {
    const props = PropertiesService.getScriptProperties();
    const n = parseInt(props.getProperty('ULTIMO_TICKET') || '0', 10) + 1;
    props.setProperty('ULTIMO_TICKET', String(n));
    return 'TCK-' + ('0000' + n).slice(-4);
  } finally {
    lock.releaseLock();
  }
}

function guardarReporte_(p) {
  const sheet = getHoja_(HOJA_REPORTES);

  let fotoUrl = '';
  if (p.foto_base64) {
    const blob = Utilities.newBlob(
      Utilities.base64Decode(p.foto_base64),
      p.foto_mime_type || 'image/png',
      p.foto_filename || 'screenshot.png'
    );
    const file = DriveApp.getFolderById(DRIVE_FOLDER_ID).createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    fotoUrl = file.getUrl();
  }

  sheet.appendRow([
    new Date(p.timestamp_iso), // A - Fecha
    generarTicketId_(),        // B - Ticket ID
    p.tipo,                    // C - Tipo
    p.titulo,                  // D - Título
    p.descripcion,             // E - Descripción
    p.usuario_email,           // F - Email
    p.usuario_nombre,          // G - Nombre
    p.usuario_rol,             // H - Rol
    fotoUrl,                   // I - Foto
    'NUEVO'                    // J - Estado
  ]);

  return responder_({ ok: true });
}

// (Opcional) Ejecutar UNA sola vez desde el editor para rellenar el Ticket ID
// de las filas ya existentes que quedaron con la columna B vacía.
function backfillTicketIds() {
  const sheet = getHoja_(HOJA_REPORTES);
  const ultimaFila = sheet.getLastRow();
  if (ultimaFila < 2) return; // solo encabezado
  const rango = sheet.getRange(2, 2, ultimaFila - 1, 1); // columna B, desde la fila 2
  const valores = rango.getValues();
  for (let i = 0; i < valores.length; i++) {
    if (!valores[i][0]) {
      valores[i][0] = generarTicketId_();
    }
  }
  rango.setValues(valores);
}

// ═════════════════════════════════════════════ 2. Leads del formulario web ══

// A diferencia de los reportes, acá no se usan posiciones de columna fijas: se
// leen los encabezados de la fila 1 y se busca por nombre, ignorando mayúsculas
// y tildes. Así se pueden reordenar o insertar columnas sin tocar el código.
// Un encabezado que no esté en este mapa queda vacío.
const COLUMNAS_LEAD = {
  'fecha in':        function (lead, fecha) { return fecha; },
  'next step':       function ()            { return 'Contactar — demo solicitada en la web'; },
  'status':          function ()            { return 'Lead'; },
  'empresa':         function (lead)        { return lead.empresa; },
  'nombre contacto': function (lead)        { return lead.nombre; },
  'email':           function (lead)        { return lead.email; },
  'telefono':        function (lead)        { return lead.telefono; },
  'project stage':   function ()            { return 'No comenzado'; },
  // Si algún día agregas una columna para esto, se llena sola:
  'tamano equipo':   function (lead)        { return lead.equipo || ''; },
  'equipo':          function (lead)        { return lead.equipo || ''; },
  'origen':          function (lead)        { return lead.origen || 'landing/demo'; },
};

// minúsculas, sin tildes y sin espacios de más.
function normalizar_(texto) {
  return String(texto || '')
    .trim()
    .toLowerCase()
    .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
    .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').replace(/ñ/g, 'n')
    .replace(/\s+/g, ' ');
}

function construirFilaLead_(encabezados, lead, fecha) {
  return encabezados.map(function (encabezado) {
    const fn = COLUMNAS_LEAD[normalizar_(encabezado)];
    return fn ? fn(lead, fecha) : '';
  });
}

function guardarLead_(lead) {
  // Apps Script no recibe headers HTTP propios, así que el token viaja dentro
  // del JSON. Si no hay TOKEN configurado, no se valida nada.
  const esperado = PropertiesService.getScriptProperties().getProperty('TOKEN');
  if (esperado && lead.token !== esperado) {
    console.error(
      'Lead rechazado: el token no coincide. Recibido ' +
      (lead.token ? '"' + String(lead.token).slice(0, 6) + '…" (' + String(lead.token).length + ' caracteres)' : '(ninguno)') +
      ', esperado uno de ' + esperado.length + ' caracteres que empieza en "' + esperado.slice(0, 6) + '…". ' +
      'Revisa que CRM_WEBHOOK_TOKEN en Vercel sea identico a la propiedad TOKEN de este script.'
    );
    return responder_({ ok: false, error: 'token inválido' });
  }
  if (!lead.email || !lead.empresa) {
    console.error('Lead rechazado: faltan email o empresa. Recibido: ' + JSON.stringify(lead));
    return responder_({ ok: false, error: 'faltan campos' });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000); // evita que dos envíos simultáneos peleen por la fila
  try {
    const sheet = getHoja_(HOJA_LEADS);
    const encabezados = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const fecha = lead.fecha ? new Date(lead.fecha) : new Date();

    sheet.appendRow(construirFilaLead_(encabezados, lead, fecha));

    console.log('Lead de ' + lead.empresa + ' escrito en la fila ' + sheet.getLastRow());
    return responder_({ ok: true, fila: sheet.getLastRow() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Prueba manual: selecciónala en el editor y dale ▶ Ejecutar.
 * Escribe una fila de mentira en "Clientes Cierra" para confirmar el mapeo de
 * columnas; bórrala después.
 */
function probarConLeadFalso() {
  guardarLead_({
    fecha: new Date().toISOString(),
    origen: 'landing/demo',
    nombre: 'Lead de Prueba',
    email: 'prueba@ejemplo.cl',
    telefono: '+56 9 0000 0000',
    empresa: 'BORRAR — fila de prueba',
    equipo: '6 – 15 personas',
    token: PropertiesService.getScriptProperties().getProperty('TOKEN'),
  });
}

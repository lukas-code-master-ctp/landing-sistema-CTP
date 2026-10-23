// Pruebas de assets/analitica.js. Sin dependencias:  node tools/test_analitica.js
//
// Se prueban las funciones puras que el archivo exporta cuando corre en
// Node (leer y guardar la decisión, qué estado de consentimiento le
// corresponde, el orden de los comandos de gtag y qué cookies borrar) y
// además `iniciar(win)`, la parte del navegador, contra un DOM falso
// mínimo: doble carga, dónde queda el banner, qué pasa al rechazar y al
// aceptar. En Node no hay `window`, así que al hacer require el archivo
// no arranca solo.
//
// Lo que más importa vigilar: que nunca se conceda nada por un dato que no
// se pudo leer, y que los tres permisos de publicidad no se concedan nunca.

var assert = require('node:assert');
var path = require('node:path');
var a = require(path.join(__dirname, '..', 'assets', 'analitica.js'));

var corridas = 0, fallos = 0;

function prueba(nombre, fn) {
  corridas++;
  try {
    fn();
    console.log('  ok  ' + nombre);
  } catch (e) {
    fallos++;
    console.log('  FALLA  ' + nombre);
    console.log('        ' + (e && e.message ? e.message.split('\n').join('\n        ') : e));
  }
}

// ── Dobles de prueba ────────────────────────────────────────────────
// Un localStorage en memoria.
function storage(inicial) {
  var datos = {};
  for (var k in (inicial || {})) datos[k] = inicial[k];
  return {
    datos: datos,
    getItem: function (c) { return Object.prototype.hasOwnProperty.call(datos, c) ? datos[c] : null; },
    setItem: function (c, v) { datos[c] = String(v); }
  };
}

// Un storage que lanza en todo, como Safari en modo privado o Chrome con
// las cookies bloqueadas.
function storageRoto() {
  return {
    getItem: function () { throw new Error('SecurityError'); },
    setItem: function () { throw new Error('QuotaExceededError'); }
  };
}

function con(valor) {
  var o = {};
  o[a.CLAVE] = typeof valor === 'string' ? valor : JSON.stringify(valor);
  return storage(o);
}

var PUBLICIDAD = ['ad_storage', 'ad_user_data', 'ad_personalization'];

console.log('analitica.js');

// ── leerConsentimiento ──────────────────────────────────────────────
prueba('sin decisión guardada devuelve null', function () {
  assert.strictEqual(a.leerConsentimiento(storage()), null);
});

prueba('sin storage devuelve null', function () {
  assert.strictEqual(a.leerConsentimiento(null), null);
});

prueba('una aceptación guardada se lee como aceptada', function () {
  var r = a.leerConsentimiento(con({ v: 1, analitica: true, fecha: '2026-10-23T12:00:00.000Z' }));
  assert.deepStrictEqual(r, { analitica: true, fecha: '2026-10-23T12:00:00.000Z' });
});

prueba('un rechazo guardado se lee como rechazo (y no como "sin decidir")', function () {
  var r = a.leerConsentimiento(con({ v: 1, analitica: false, fecha: '2026-10-23T12:00:00.000Z' }));
  assert.deepStrictEqual(r, { analitica: false, fecha: '2026-10-23T12:00:00.000Z' });
});

prueba('JSON corrupto devuelve null', function () {
  assert.strictEqual(a.leerConsentimiento(con('{"v":1,"analitica":tru')), null);
});

prueba('un JSON que no es objeto devuelve null', function () {
  assert.strictEqual(a.leerConsentimiento(con('true')), null);
  assert.strictEqual(a.leerConsentimiento(con('null')), null);
});

prueba('otra versión devuelve null (hay que volver a preguntar)', function () {
  assert.strictEqual(a.leerConsentimiento(con({ v: 2, analitica: true })), null);
  assert.strictEqual(a.leerConsentimiento(con({ analitica: true })), null);
});

prueba('una analitica que no es booleana devuelve null', function () {
  assert.strictEqual(a.leerConsentimiento(con({ v: 1, analitica: 'true' })), null);
  assert.strictEqual(a.leerConsentimiento(con({ v: 1, analitica: 1 })), null);
});

prueba('un storage que lanza devuelve null y no lanza', function () {
  assert.strictEqual(a.leerConsentimiento(storageRoto()), null);
});

// ── guardarConsentimiento ───────────────────────────────────────────
prueba('guarda la aceptación con versión y fecha, y se vuelve a leer igual', function () {
  var s = storage();
  var ahora = new Date('2026-10-23T15:30:00.000Z');
  assert.strictEqual(a.guardarConsentimiento(s, true, ahora), true);
  assert.deepStrictEqual(JSON.parse(s.datos[a.CLAVE]), { v: 1, analitica: true, fecha: '2026-10-23T15:30:00.000Z' });
  assert.deepStrictEqual(a.leerConsentimiento(s), { analitica: true, fecha: '2026-10-23T15:30:00.000Z' });
});

prueba('guarda el rechazo', function () {
  var s = storage();
  a.guardarConsentimiento(s, false, new Date('2026-10-23T15:30:00.000Z'));
  assert.strictEqual(a.leerConsentimiento(s).analitica, false);
});

prueba('solo un true estricto se guarda como aceptación', function () {
  var s = storage();
  a.guardarConsentimiento(s, 'true', new Date());
  assert.strictEqual(a.leerConsentimiento(s).analitica, false);
});

prueba('un storage que lanza devuelve false y no lanza', function () {
  assert.strictEqual(a.guardarConsentimiento(storageRoto(), true, new Date()), false);
  assert.strictEqual(a.guardarConsentimiento(null, true, new Date()), false);
});

// ── estadoConsentimiento ────────────────────────────────────────────
prueba('aceptar concede solo analytics_storage', function () {
  assert.deepStrictEqual(a.estadoConsentimiento(true), {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  });
});

prueba('rechazar deja todo denegado', function () {
  var e = a.estadoConsentimiento(false);
  assert.strictEqual(e.analytics_storage, 'denied');
});

prueba('ningún valor concede los tres de publicidad', function () {
  [true, false, 'true', 1, null, undefined, {}].forEach(function (v) {
    var e = a.estadoConsentimiento(v);
    PUBLICIDAD.forEach(function (p) { assert.strictEqual(e[p], 'denied', p + ' con ' + String(v)); });
  });
});

prueba('solo un true estricto concede analytics_storage', function () {
  ['true', 1, {}, null, undefined].forEach(function (v) {
    assert.strictEqual(a.estadoConsentimiento(v).analytics_storage, 'denied', String(v));
  });
});

// ── comandosIniciales ───────────────────────────────────────────────
var AHORA = new Date('2026-10-23T12:00:00.000Z');

prueba('sin decisión: default denegado con wait_for_update, js y config, sin update', function () {
  var c = a.comandosIniciales(null, AHORA);
  assert.deepStrictEqual(c.map(function (x) { return x[0] + (x[0] === 'consent' ? ' ' + x[1] : ''); }),
    ['consent default', 'js', 'config']);
  var def = c[0][2];
  assert.strictEqual(def.wait_for_update, 500);
  assert.strictEqual(def.analytics_storage, 'denied');
  PUBLICIDAD.forEach(function (p) { assert.strictEqual(def[p], 'denied', p); });
  assert.strictEqual(c[1][1], AHORA);
  assert.strictEqual(c[2][1], a.ID);
  assert.deepStrictEqual(c[2][2], { cookie_domain: 'none' }, 'cookie de host y sin linker');
});

prueba('con aceptación guardada: el update va justo después del default y antes del config', function () {
  var c = a.comandosIniciales({ analitica: true, fecha: null }, AHORA);
  assert.deepStrictEqual(c[0].slice(0, 2), ['consent', 'default']);
  assert.deepStrictEqual(c[1], ['consent', 'update', a.estadoConsentimiento(true)]);
  assert.strictEqual(c[2][0], 'js');
  assert.strictEqual(c[3][0], 'config');
  assert.strictEqual(c.length, 4);
});

prueba('con rechazo guardado no hay update (sigue el default denegado)', function () {
  var c = a.comandosIniciales({ analitica: false, fecha: null }, AHORA);
  assert.strictEqual(c.filter(function (x) { return x[0] === 'consent'; }).length, 1);
});

prueba('el default nunca concede nada, ni con aceptación guardada', function () {
  var def = a.comandosIniciales({ analitica: true }, AHORA)[0][2];
  assert.strictEqual(def.analytics_storage, 'denied');
});

// ── fecha ───────────────────────────────────────────────────────────
prueba('guardar con una fecha inválida no lanza y guarda una fecha válida', function () {
  var s = storage();
  assert.strictEqual(a.guardarConsentimiento(s, true, new Date('no es fecha')), true);
  var f = JSON.parse(s.datos[a.CLAVE]).fecha;
  assert.ok(typeof f === 'string' && !isNaN(Date.parse(f)), f);
});

prueba('una fecha guardada ilegible se lee como null sin anular la decisión', function () {
  [123, { x: 1 }, 'ayer', null].forEach(function (f) {
    var r = a.leerConsentimiento(con({ v: 1, analitica: true, fecha: f }));
    assert.deepStrictEqual(r, { analitica: true, fecha: null }, JSON.stringify(f));
  });
});

// ── cookiesABorrar ──────────────────────────────────────────────────
prueba('borra _ga y _ga_<ID> sin dominio y en el host y cada dominio padre', function () {
  var r = a.cookiesABorrar('_ga=GA1.1.1; otra=1; _ga_ABC123=GS1', 'www.cierra.cl');
  assert.deepStrictEqual(r, [
    '_ga=; Max-Age=0; path=/',
    '_ga=; Max-Age=0; path=/; domain=.www.cierra.cl',
    '_ga=; Max-Age=0; path=/; domain=.cierra.cl',
    '_ga_ABC123=; Max-Age=0; path=/',
    '_ga_ABC123=; Max-Age=0; path=/; domain=.www.cierra.cl',
    '_ga_ABC123=; Max-Age=0; path=/; domain=.cierra.cl'
  ]);
});

prueba('no toca cookies de nombre parecido ni devuelve nada sin _ga', function () {
  assert.deepStrictEqual(a.cookiesABorrar('_gat=1; x_ga=2; _gax=3', 'cierra.cl'), []);
  assert.deepStrictEqual(a.cookiesABorrar('', 'cierra.cl'), []);
  assert.deepStrictEqual(a.cookiesABorrar(undefined, undefined), []);
});

// ── iniciar(win) con un DOM falso ───────────────────────────────────
// Lo justo para que corra el código del navegador: elementos con hijos,
// clases, atributos, texto (`textContent`) y clics; un document.cookie que se comporta como un
// frasco (Max-Age=0 borra), y un ResizeObserver que registra qué observa.
function elemento(tag) {
  var el = {
    tagName: String(tag).toUpperCase(), childNodes: [], parentNode: null,
    className: '', hidden: false, offsetHeight: 80, atributos: {}, oyentes: {},
    enfocado: false, textContent: ''
  };
  var props = {};
  el.style = {
    setProperty: function (k, v) { props[k] = v; },
    removeProperty: function (k) { delete props[k]; },
    getPropertyValue: function (k) { return props[k] || ''; }
  };
  el.classList = {
    add: function (c) { if (!this.contains(c)) el.className = (el.className + ' ' + c).trim(); },
    remove: function (c) { el.className = el.className.split(' ').filter(function (x) { return x && x !== c; }).join(' '); },
    contains: function (c) { return el.className.split(' ').indexOf(c) !== -1; }
  };
  el.setAttribute = function (k, v) { el.atributos[k] = String(v); };
  el.getAttribute = function (k) { return Object.prototype.hasOwnProperty.call(el.atributos, k) ? el.atributos[k] : null; };
  el.hasAttribute = function (k) { return Object.prototype.hasOwnProperty.call(el.atributos, k); };
  el.insertBefore = function (hijo, ref) {
    var i = ref ? el.childNodes.indexOf(ref) : -1;
    if (i === -1) el.childNodes.push(hijo); else el.childNodes.splice(i, 0, hijo);
    hijo.parentNode = el;
    return hijo;
  };
  el.appendChild = function (hijo) { return el.insertBefore(hijo, null); };
  Object.defineProperty(el, 'firstChild', { get: function () { return el.childNodes[0] || null; } });
  Object.defineProperty(el, 'nextSibling', {
    get: function () {
      if (!el.parentNode) return null;
      var hs = el.parentNode.childNodes;
      return hs[hs.indexOf(el) + 1] || null;
    }
  });
  el.addEventListener = function (tipo, fn) { (el.oyentes[tipo] = el.oyentes[tipo] || []).push(fn); };
  // Despacha un evento de mouse que sube hasta document. Devuelve el
  // evento para poder mirar si alguien llamó a preventDefault.
  el.disparar = function (tipo, button) {
    var ev = { type: tipo, target: el, button: button || 0, defaultPrevented: false,
      preventDefault: function () { ev.defaultPrevented = true; } };
    for (var n = el; n; n = n.parentNode) (n.oyentes[tipo] || []).forEach(function (fn) { fn(ev); });
    return ev;
  };
  el.click = function () { return el.disparar('click', 0); };
  // Lo que hace un navegador actual con el botón del medio (button 1) o el
  // derecho (2): solo `auxclick`, nunca `click`.
  el.auxclick = function (button) { return el.disparar('auxclick', button); };
  el.focus = function () { el.enfocado = true; if (el.dueno) el.dueno.activeElement = el; };
  el.blur = function () { el.enfocado = false; };
  el.todos = function (pred) {
    var r = [];
    (function rec(n) { n.childNodes.forEach(function (h) { if (pred(h)) r.push(h); if (h.childNodes) rec(h); }); })(el);
    return r;
  };
  el.querySelector = function (sel) {
    if (sel.charAt(0) !== '.') throw new Error('selector no soportado: ' + sel);
    var c = sel.slice(1);
    return el.todos(function (h) { return h.classList && h.classList.contains(c); })[0] || null;
  };
  // Soporta `[atributo]` y `etiqueta[atributo]`.
  el.closest = function (sel) {
    var m = /^([a-z]*)\[([\w-]+)\]$/.exec(sel);
    if (!m) throw new Error('selector no soportado: ' + sel);
    for (var n = el; n && n.hasAttribute; n = n.parentNode) {
      if ((!m[1] || n.tagName === m[1].toUpperCase()) && n.hasAttribute(m[2])) return n;
    }
    return null;
  };
  el.contains = function (otro) { for (var n = otro; n; n = n.parentNode) if (n === el) return true; return false; };
  return el;
}

function ventana(opciones) {
  opciones = opciones || {};
  var frasco = {};
  var observados = [];
  var doc = elemento('#document');
  doc.documentElement = elemento('html');
  // Los clics suben hasta document, donde escucha la delegación del pie.
  doc.appendChild(doc.documentElement);
  doc.head = elemento('head');
  doc.body = elemento('body');
  doc.documentElement.appendChild(doc.head);
  doc.documentElement.appendChild(doc.body);
  doc.createElement = function (t) { var e = elemento(t); e.dueno = doc; return e; };
  doc.createElementNS = function (ns, t) { var e = elemento(t); e.ns = ns; e.dueno = doc; return e; };
  doc.createTextNode = function (t) { return { texto: t, childNodes: [], parentNode: null }; };
  doc.activeElement = doc.body;
  Object.defineProperty(doc, 'cookie', {
    get: function () { return Object.keys(frasco).map(function (k) { return k + '=' + frasco[k]; }).join('; '); },
    set: function (v) {
      var par = String(v).split(';')[0];
      var nombre = par.split('=')[0].trim();
      if (/max-age=0/i.test(v)) delete frasco[nombre];
      else frasco[nombre] = par.slice(nombre.length + 1);
    }
  });
  // Lo que hay en el body ANTES del script, como en las páginas reales.
  if (opciones.salto !== false) {
    var salto = elemento('a'); salto.className = 'skip-link'; doc.body.appendChild(salto);
  }
  var nav = elemento('header'); nav.className = 'nav'; doc.body.appendChild(nav);
  var pie = elemento('button'); pie.setAttribute('data-preferencias-cookies', ''); pie.dueno = doc;
  doc.body.appendChild(pie);
  (opciones.cookies || []).forEach(function (c) { doc.cookie = c; });
  var win = {
    document: doc,
    location: { hostname: 'cierra.cl' },
    localStorage: opciones.storage || storage(),
    addEventListener: function () {},
    ResizeObserver: function (fn) { this.observe = function (el) { observados.push({ el: el, fn: fn }); }; }
  };
  win.observados = observados;
  win.pie = pie;
  return win;
}

function banners(win) {
  return win.document.body.todos(function (h) { return h.classList && h.classList.contains('cookies'); });
}
function consents(win) {
  return win.dataLayer.map(function (x) { return Array.prototype.slice.call(x); })
    .filter(function (x) { return x[0] === 'consent'; });
}
function botonDe(win, cual) {
  return win.document.body.todos(function (h) { return h.getAttribute && h.getAttribute('data-cookies') === cual; })[0];
}

prueba('iniciar dos veces no manda un segundo default ni deja un segundo banner', function () {
  var w = ventana();
  assert.strictEqual(a.iniciar(w), true);
  assert.strictEqual(a.iniciar(w), false);
  assert.strictEqual(consents(w).length, 1);
  assert.strictEqual(banners(w).length, 1);
  assert.strictEqual(w.document.head.childNodes.length, 1, 'un solo script de gtag');
});

prueba('Aceptar va en verde y Rechazar en blanco, del mismo tamaño y en la misma fila, Rechazar primero', function () {
  var w = ventana();
  a.iniciar(w);
  var si = botonDe(w, 'aceptar').className.split(' ');
  var no = botonDe(w, 'rechazar').className.split(' ');
  assert.ok(si.indexOf('btn') >= 0 && si.indexOf('btn-primary') >= 0, 'Aceptar verde de marca');
  assert.ok(no.indexOf('btn-outline') >= 0 && no.indexOf('btn-primary') < 0, 'Rechazar blanco con borde');
  assert.ok(si.indexOf('btn-md') >= 0 && no.indexOf('btn-md') >= 0, 'mismo tamaño');
  var fila = botonDe(w, 'aceptar').parentNode.childNodes;
  assert.deepStrictEqual(fila.map(function (b) { return b.getAttribute('data-cookies'); }), ['rechazar', 'aceptar']);
  assert.strictEqual(botonDe(w, 'aceptar').parentNode, botonDe(w, 'rechazar').parentNode, 'misma fila');
});

prueba('sin decisión: banner visible justo después de "Saltar al contenido"', function () {
  var w = ventana();
  a.iniciar(w);
  var hs = w.document.body.childNodes;
  assert.strictEqual(hs[0].className, 'skip-link');
  assert.strictEqual(hs[1].className, 'cookies');
  assert.strictEqual(hs[1].hidden, false);
  assert.strictEqual(hs[1].getAttribute('role'), 'region');
  assert.ok(w.document.documentElement.classList.contains('con-cookies'));
  assert.strictEqual(w.document.documentElement.style.getPropertyValue('--cookies-alto'), '80px');
});

prueba('sin "Saltar al contenido", el banner queda primero en el body', function () {
  var w = ventana({ salto: false });
  a.iniciar(w);
  assert.strictEqual(w.document.body.childNodes[0].className, 'cookies');
});

prueba('el alto se mide con ResizeObserver sobre el banner', function () {
  var w = ventana();
  a.iniciar(w);
  assert.strictEqual(w.observados.length, 1);
  assert.strictEqual(w.observados[0].el, banners(w)[0]);
  banners(w)[0].offsetHeight = 120; // cargó la fuente web: el texto creció
  w.observados[0].fn();
  assert.strictEqual(w.document.documentElement.style.getPropertyValue('--cookies-alto'), '120px');
});

prueba('Rechazar guarda, manda update denegado, borra las _ga y oculta el banner', function () {
  var w = ventana({ cookies: ['_ga=GA1.1.1', '_ga_ABC123=GS1', 'otra=1'] });
  a.iniciar(w);
  botonDe(w, 'rechazar').click();
  assert.strictEqual(a.leerConsentimiento(w.localStorage).analitica, false);
  var ult = consents(w).pop();
  assert.strictEqual(ult[1], 'update');
  assert.strictEqual(ult[2].analytics_storage, 'denied');
  assert.strictEqual(w.document.cookie, 'otra=1');
  assert.strictEqual(banners(w)[0].hidden, true);
  assert.ok(!w.document.documentElement.classList.contains('con-cookies'));
  assert.strictEqual(w.document.documentElement.style.getPropertyValue('--cookies-alto'), '');
});

prueba('Aceptar guarda, concede analytics_storage y no borra cookies', function () {
  var w = ventana({ cookies: ['_ga=GA1.1.1'] });
  a.iniciar(w);
  botonDe(w, 'aceptar').click();
  assert.strictEqual(a.leerConsentimiento(w.localStorage).analitica, true);
  assert.strictEqual(consents(w).pop()[2].analytics_storage, 'granted');
  assert.strictEqual(w.document.cookie, '_ga=GA1.1.1');
  assert.strictEqual(banners(w)[0].hidden, true);
});

prueba('con aceptación guardada: sin banner y el update granted va tras el default', function () {
  var s = storage();
  a.guardarConsentimiento(s, true, new Date());
  var w = ventana({ storage: s });
  a.iniciar(w);
  assert.strictEqual(banners(w).length, 0);
  var c = consents(w);
  assert.deepStrictEqual(c.map(function (x) { return x[1]; }), ['default', 'update']);
  assert.strictEqual(c[1][2].analytics_storage, 'granted');
});

prueba('el botón del pie reabre el banner y le pasa el foco', function () {
  var s = storage();
  a.guardarConsentimiento(s, false, new Date());
  var w = ventana({ storage: s });
  a.iniciar(w);
  assert.strictEqual(banners(w).length, 0);
  w.pie.click();
  assert.strictEqual(banners(w).length, 1);
  assert.strictEqual(banners(w)[0].hidden, false);
  assert.strictEqual(w.document.activeElement, botonDe(w, 'rechazar'));
  botonDe(w, 'aceptar').click();
  assert.strictEqual(w.document.activeElement, w.pie, 'el foco vuelve al pie');
});

prueba('un localStorage que lanza no rompe iniciar: el banner aparece igual', function () {
  var w = ventana();
  Object.defineProperty(w, 'localStorage', { get: function () { throw new Error('SecurityError'); } });
  assert.strictEqual(a.iniciar(w), true);
  assert.strictEqual(banners(w)[0].hidden, false);
  botonDe(w, 'aceptar').click();
  assert.strictEqual(banners(w)[0].hidden, true);
});

prueba('el aviso dice el texto acordado y enlaza a legal.html#pp-cookies', function () {
  var w = ventana();
  a.iniciar(w);
  var b = banners(w)[0];
  assert.strictEqual(b.getAttribute('aria-label'), 'Aviso de cookies');
  var p = b.querySelector('.cookies__texto');
  assert.strictEqual(p.childNodes[0].texto, 'Usamos cookies de Google Analytics para saber qué partes del sitio sirven. ');
  var mas = b.querySelector('.cookies__mas');
  assert.strictEqual(mas.href, 'legal.html#pp-cookies');
  assert.strictEqual(mas.childNodes[0].texto, 'Más información');
});

prueba('la galleta es un SVG decorativo (aria-hidden) dibujado en línea', function () {
  var w = ventana();
  a.iniciar(w);
  var svg = banners(w)[0].todos(function (h) { return h.tagName === 'SVG'; })[0];
  assert.ok(svg, 'hay un svg');
  assert.strictEqual(svg.ns, 'http://www.w3.org/2000/svg');
  assert.strictEqual(svg.getAttribute('class'), 'cookies__icono');
  assert.strictEqual(svg.getAttribute('aria-hidden'), 'true');
  assert.ok(svg.childNodes.filter(function (h) { return h.tagName === 'CIRCLE'; }).length >= 3, 'chispas');
});

prueba('en dataLayer: default, update (si aceptó), js y config con cookie_domain none, en ese orden', function () {
  var s = storage();
  a.guardarConsentimiento(s, true, new Date());
  var w = ventana({ storage: s });
  a.iniciar(w);
  var dl = w.dataLayer.map(function (x) { return Array.prototype.slice.call(x); });
  assert.deepStrictEqual(dl.map(function (x) { return x[0] + (x[0] === 'consent' ? ' ' + x[1] : ''); }),
    ['consent default', 'consent update', 'js', 'config']);
  assert.deepStrictEqual(dl[3], ['config', a.ID, { cookie_domain: 'none' }]);
  assert.strictEqual(w.document.head.childNodes[0].src, 'https://www.googletagmanager.com/gtag/js?id=' + a.ID);
});

prueba('la clave y la guarda son las de Cierra', function () {
  assert.strictEqual(a.CLAVE, 'cierra-consentimiento');
  var w = ventana();
  a.iniciar(w);
  assert.strictEqual(w.__cierraAnalitica, true);
  assert.strictEqual(typeof w.cierraEvento, 'function');
});

// ── eventoDeEnlace ──────────────────────────────────────────────────
var APP = 'https://app.cierra.cl';

prueba('un enlace a #demo es clic_solicitar_demo, con ubicación y texto', function () {
  assert.deepStrictEqual(a.eventoDeEnlace('#demo', 'hero', 'Solicitar demo'), {
    nombre: 'clic_solicitar_demo', params: { ubicacion: 'hero', texto: 'Solicitar demo' }
  });
});

prueba('las otras formas de llegar a #demo también cuentan', function () {
  ['/#demo', 'index.html#demo', '/index.html#demo', 'https://cierra.cl/#demo', 'https://cierra.cl#demo',
   'https://www.cierra.cl/#demo', 'HTTPS://CIERRA.CL/#DEMO', '  #demo  '].forEach(function (h) {
    assert.strictEqual((a.eventoDeEnlace(h, 'x', 'y') || {}).nombre, 'clic_solicitar_demo', h);
  });
});

prueba('otras anclas y otros dominios con #demo no son la demo', function () {
  ['#demo-x', '#demos', '#precios', 'legal.html#demo', 'https://otro.cl/#demo', 'https://cierra.cl.otro.com/#demo',
   'http://cierra.cl/#demo', 'https://app.cierra.cl/#demo'].forEach(function (h) {
    assert.notStrictEqual((a.eventoDeEnlace(h, 'x', 'y') || {}).nombre, 'clic_solicitar_demo', h);
  });
});

prueba('un enlace a la app es clic_ingresar, solo con ubicación (sin texto)', function () {
  assert.deepStrictEqual(a.eventoDeEnlace(APP, 'nav', 'Ingresar'), {
    nombre: 'clic_ingresar', params: { ubicacion: 'nav' }
  });
});

prueba('la app con ruta, query, hash o mayúsculas sigue siendo la app', function () {
  [APP + '/', APP + '/login', APP + '?ref=web', APP + '#x', 'HTTPS://APP.CIERRA.CL', '  ' + APP + '  '].forEach(function (h) {
    assert.strictEqual((a.eventoDeEnlace(h, 'x', 'y') || {}).nombre, 'clic_ingresar', h);
  });
});

prueba('otros dominios y rutas internas no se miden', function () {
  ['https://app.cierra.cl.otro.com', 'https://app.cierra.club', 'http://app.cierra.cl', 'https://cierra.cl',
   'https://compratuparcela.cierra.cl', 'legal.html', '#precios', '', null, undefined, 42].forEach(function (h) {
    assert.strictEqual(a.eventoDeEnlace(h, 'nav', 'x'), null, String(h));
  });
});

prueba('mailto es clic_correo con ubicación y sin texto', function () {
  assert.deepStrictEqual(a.eventoDeEnlace('mailto:contacto@cierra.cl', 'footer', 'contacto@cierra.cl'), {
    nombre: 'clic_correo', params: { ubicacion: 'footer' }
  });
  assert.strictEqual(a.eventoDeEnlace('MAILTO:x@y.cl', 'a', '').nombre, 'clic_correo');
});

prueba('ningún evento de enlace manda más de 2 propiedades (tope de Vercel Pro)', function () {
  [['#demo', 'hero', 'Solicitar demo'], [APP, 'nav', 'Ingresar'], ['mailto:x@y.cl', 'footer', 'Contacto']].forEach(function (c) {
    assert.ok(Object.keys(a.eventoDeEnlace.apply(null, c).params).length <= 2, c.join(' '));
  });
});

prueba('sin data-ubicacion (o vacío) se manda sin-ubicacion', function () {
  [null, undefined, '', '   '].forEach(function (u) {
    assert.strictEqual(a.eventoDeEnlace('#demo', u, 'x').params.ubicacion, 'sin-ubicacion', String(u));
    assert.strictEqual(a.eventoDeEnlace(APP, u, 'x').params.ubicacion, 'sin-ubicacion', String(u));
    assert.strictEqual(a.eventoDeEnlace('mailto:x@y.cl', u, '').params.ubicacion, 'sin-ubicacion', String(u));
  });
});

prueba('el texto se colapsa y se recorta a 60 caracteres', function () {
  assert.strictEqual(a.eventoDeEnlace('#demo', 'cta-final', '\n  Solicitar una demo\n          \n        ').params.texto,
    'Solicitar una demo');
  var largo = new Array(100).join('ab ');
  var t = a.eventoDeEnlace('#demo', 'x', largo).params.texto;
  assert.strictEqual(t.length, 60);
  assert.strictEqual(t, largo.slice(0, 60));
  assert.strictEqual(a.eventoDeEnlace('#demo', 'x', null).params.texto, '');
});

// ── cierraEvento ────────────────────────────────────────────────────
function eventos(win) {
  return win.dataLayer.map(function (x) { return Array.prototype.slice.call(x); })
    .filter(function (x) { return x[0] === 'event'; });
}

prueba('cierraEvento manda a gtag y a va con el mismo nombre y datos', function () {
  var w = ventana();
  var vas = [];
  w.va = function () { vas.push(Array.prototype.slice.call(arguments)); };
  a.iniciar(w);
  w.cierraEvento('enviar_formulario', { formulario: 'demo' });
  assert.deepStrictEqual(eventos(w), [['event', 'enviar_formulario', { formulario: 'demo' }]]);
  assert.deepStrictEqual(vas, [['event', { name: 'enviar_formulario', data: { formulario: 'demo' } }]]);
});

prueba('cierraEvento sin va (Vercel no cargó) manda igual a gtag y no lanza', function () {
  var w = ventana();
  a.iniciar(w);
  assert.strictEqual(w.va, undefined);
  w.cierraEvento('enviar_formulario', { formulario: 'demo' });
  assert.strictEqual(eventos(w).length, 1);
});

prueba('si gtag lanza, cierraEvento no lanza y va recibe el evento igual', function () {
  var w = ventana();
  var vas = [];
  w.va = function () { vas.push(arguments[1]); };
  a.iniciar(w);
  w.gtag = function () { throw new Error('gtag roto'); };
  assert.doesNotThrow(function () { w.cierraEvento('clic_correo', { ubicacion: 'footer' }); });
  assert.deepStrictEqual(vas, [{ name: 'clic_correo', data: { ubicacion: 'footer' } }]);
});

prueba('si va lanza, cierraEvento no lanza y gtag recibe el evento', function () {
  var w = ventana();
  w.va = function () { throw new Error('va roto'); };
  a.iniciar(w);
  assert.doesNotThrow(function () { w.cierraEvento('clic_correo', { ubicacion: 'x' }); });
  assert.strictEqual(eventos(w).length, 1);
});

prueba('cierraEvento sin gtag ni va, o con nombre inválido, no lanza ni manda nada', function () {
  var w = ventana();
  a.iniciar(w);
  w.cierraEvento('', { a: 1 });
  w.cierraEvento(null);
  assert.strictEqual(eventos(w).length, 0);
  w.gtag = undefined;
  assert.doesNotThrow(function () { w.cierraEvento('clic_correo', { ubicacion: 'x' }); });
});

prueba('cierraEvento sin params manda un objeto vacío', function () {
  var w = ventana();
  a.iniciar(w);
  w.cierraEvento('clic_correo');
  assert.deepStrictEqual(eventos(w), [['event', 'clic_correo', {}]]);
});

// ── Delegación de clics ─────────────────────────────────────────────
function enlace(win, href, attrs, texto, clase) {
  var el = win.document.createElement('a');
  el.setAttribute('href', href);
  for (var k in (attrs || {})) el.setAttribute(k, attrs[k]);
  el.className = clase || '';
  el.textContent = texto || '';
  win.document.body.appendChild(el);
  return el;
}

prueba('un clic en "Solicitar demo" manda el evento y no frena la navegación', function () {
  var w = ventana();
  a.iniciar(w);
  var el = enlace(w, '#demo', { 'data-ubicacion': 'hero' }, ' Solicitar demo\n ', 'btn btn-primary btn-lg');
  var ev = el.click();
  assert.strictEqual(ev.defaultPrevented, false);
  assert.deepStrictEqual(eventos(w), [['event', 'clic_solicitar_demo', { ubicacion: 'hero', texto: 'Solicitar demo' }]]);
});

prueba('un clic en el ícono de dentro del enlace sube hasta el enlace', function () {
  var w = ventana();
  a.iniciar(w);
  var el = enlace(w, '#demo', { 'data-ubicacion': 'cta-final' }, 'Solicitar demo');
  var icono = w.document.createElement('span');
  el.appendChild(icono);
  icono.click();
  assert.strictEqual(eventos(w)[0][2].ubicacion, 'cta-final');
});

prueba('un <use href> dentro del CTA no se come el clic: se mide el <a>', function () {
  var w = ventana();
  a.iniciar(w);
  var el = enlace(w, APP, { 'data-ubicacion': 'nav' }, 'Ingresar');
  var svg = w.document.createElement('svg');
  var use = w.document.createElement('use');
  use.setAttribute('href', '#flecha');
  svg.appendChild(use);
  el.appendChild(svg);
  use.click();
  assert.deepStrictEqual(eventos(w), [['event', 'clic_ingresar', { ubicacion: 'nav' }]]);
});

prueba('Ingresar y mailto se miden; un enlace interno no', function () {
  var w = ventana();
  a.iniciar(w);
  enlace(w, APP, { 'data-ubicacion': 'nav' }, 'Ingresar').click();
  enlace(w, 'mailto:contacto@cierra.cl', { 'data-ubicacion': 'footer' }, 'contacto@cierra.cl').click();
  var ev = enlace(w, 'legal.html', {}, 'Términos').click();
  assert.strictEqual(ev.defaultPrevented, false);
  assert.deepStrictEqual(eventos(w).map(function (x) { return x[1]; }), ['clic_ingresar', 'clic_correo']);
});

prueba('si medir falla, el clic sigue sin preventDefault y no lanza', function () {
  var w = ventana();
  a.iniciar(w);
  var el = enlace(w, '#demo', { 'data-ubicacion': 'hero' }, 'x');
  el.getAttribute = function () { throw new Error('DOM raro'); };
  var ev;
  assert.doesNotThrow(function () { ev = el.click(); });
  assert.strictEqual(ev.defaultPrevented, false);
});

prueba('el botón del medio (auxclick, button 1) se mide una vez y no frena nada', function () {
  var w = ventana();
  a.iniciar(w);
  var ev = enlace(w, APP, { 'data-ubicacion': 'nav' }, 'Ingresar').auxclick(1);
  assert.strictEqual(ev.defaultPrevented, false);
  assert.deepStrictEqual(eventos(w).map(function (x) { return x[1] + ':' + x[2].ubicacion; }), ['clic_ingresar:nav']);
});

prueba('el botón derecho (auxclick, button 2) no se mide', function () {
  var w = ventana();
  a.iniciar(w);
  enlace(w, 'mailto:x@y.cl', { 'data-ubicacion': 'footer' }, 'Contacto').auxclick(2);
  assert.strictEqual(eventos(w).length, 0);
});

prueba('un navegador que dispara click Y auxclick con el botón del medio no cuenta dos veces', function () {
  var w = ventana();
  a.iniciar(w);
  var el = enlace(w, APP, { 'data-ubicacion': 'nav' }, 'x');
  el.disparar('click', 1);
  el.auxclick(1);
  assert.strictEqual(eventos(w).length, 1);
});

prueba('el botón del pie no se cuenta como enlace', function () {
  var w = ventana();
  a.iniciar(w);
  w.pie.click();
  assert.strictEqual(eventos(w).length, 0);
});

console.log('');
console.log(corridas + ' pruebas, ' + fallos + ' fallo(s)');
process.exit(fallos ? 1 : 0);

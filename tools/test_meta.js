// Pruebas de assets/meta-pixel.js. Sin dependencias:  node tools/test_meta.js
//
// Se prueban las funciones puras que exporta en Node y `iniciar(win)`, la
// parte del navegador, contra un DOM falso mínimo (como tools/test_analitica.js):
// qué pasa sin consentimiento, con consentimiento guardado, al aceptar o
// rechazar en la página, el Lead y el ViewContent de #demo. Al final, una
// prueba junta los dos archivos reales para ver que se entienden.
//
// Lo que más importa vigilar: que sin `publicidad: true` Meta no reciba
// nada (ni el script, ni `fbq`), y que init y PageView salgan una sola vez.

var assert = require('node:assert');
var path = require('node:path');
var m = require(path.join(__dirname, '..', 'assets', 'meta-pixel.js'));

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

// ── DOM falso ───────────────────────────────────────────────────────
function nodo(tag) {
  var el = { tagName: String(tag).toUpperCase(), childNodes: [], parentNode: null, oyentes: {}, atributos: {} };
  el.appendChild = function (h) { el.childNodes.push(h); h.parentNode = el; return h; };
  el.addEventListener = function (t, fn) { (el.oyentes[t] = el.oyentes[t] || []).push(fn); };
  el.dispatchEvent = function (ev) {
    (el.oyentes[ev.type] || []).forEach(function (fn) { try { fn(ev); } catch (e) { /* no se propaga */ } });
    return true;
  };
  el.setAttribute = function (k, v) { el.atributos[k] = String(v); };
  el.getAttribute = function (k) { return Object.prototype.hasOwnProperty.call(el.atributos, k) ? el.atributos[k] : null; };
  return el;
}

// opciones.consentimiento: lo que devuelve cierraConsentimiento (o
// undefined para que no exista). opciones.demo: false para una página sin
// #demo (legal.html). opciones.sinObserver: sin IntersectionObserver.
function ventana(opciones) {
  opciones = opciones || {};
  var doc = nodo('#document');
  doc.documentElement = nodo('html');
  doc.head = nodo('head');
  doc.body = nodo('body');
  doc.documentElement.appendChild(doc.head);
  doc.documentElement.appendChild(doc.body);
  doc.createElement = function (t) { return nodo(t); };
  var demo = opciones.demo === false ? null : nodo('section');
  if (demo) { demo.id = 'demo'; doc.body.appendChild(demo); }
  doc.getElementById = function (id) { return id === 'demo' ? demo : null; };
  var observers = [];
  var win = { document: doc, observers: observers, demo: demo };
  if (!opciones.sinObserver) {
    win.IntersectionObserver = function (fn, init) {
      var o = this;
      o.fn = fn; o.init = init; o.observados = []; o.desconectado = false;
      o.observe = function (el) { o.observados.push(el); };
      o.disconnect = function () { o.desconectado = true; };
      observers.push(o);
    };
  }
  if (opciones.consentimiento !== undefined) {
    win.decision = opciones.consentimiento;
    win.cierraConsentimiento = function () { return win.decision; };
  }
  return win;
}

// Lo que se le pidió a fbq, como arreglos. Mientras fbevents.js no carga
// (nunca, en Node) todo queda en la cola del stub.
function llamadas(win) {
  if (!win.fbq || !win.fbq.queue) return [];
  return win.fbq.queue.map(function (x) { return Array.prototype.slice.call(x); });
}
function nombres(win) {
  return llamadas(win).map(function (x) { return x[0] + (x[0] === 'track' || x[0] === 'consent' ? ':' + x[1] : ''); });
}
function scripts(win) {
  return win.document.head.childNodes.filter(function (n) { return n.tagName === 'SCRIPT'; });
}
function decidir(win, d) {
  win.decision = d;
  win.document.dispatchEvent({ type: 'cierra:consentimiento', detail: d });
}
// El observer avisa que #demo está a la vista en esta fracción.
function verDemo(win, fraccion) {
  var o = win.observers[0];
  o.fn([{ target: win.demo, intersectionRatio: fraccion, isIntersecting: fraccion > 0 }], o);
}

var SI = { analitica: true, publicidad: true };
var NO = { analitica: false, publicidad: false };

console.log('meta-pixel.js');

// ── Funciones puras ─────────────────────────────────────────────────
prueba('el ID es el del píxel "Cierra.cl - Pixel"', function () {
  assert.strictEqual(m.ID, '4526586427599697');
  assert.strictEqual(m.SCRIPT, 'https://connect.facebook.net/en_US/fbevents.js');
});

prueba('publicidadConcedida solo con publicidad === true', function () {
  assert.strictEqual(m.publicidadConcedida(SI), true);
  assert.strictEqual(m.publicidadConcedida({ analitica: false, publicidad: true }), true);
  [null, undefined, NO, { analitica: true, publicidad: false }, { publicidad: 'true' }, { publicidad: 1 }, true, 'si']
    .forEach(function (d) { assert.strictEqual(m.publicidadConcedida(d), false, JSON.stringify(d)); });
});

prueba('argumentosLead: con eventID si hay, sin él si no; nunca datos personales', function () {
  assert.deepStrictEqual(m.argumentosLead('abc-123'), ['track', 'Lead', { content_name: 'Demo Cierra' }, { eventID: 'abc-123' }]);
  [undefined, null, '', 42].forEach(function (id) {
    assert.deepStrictEqual(m.argumentosLead(id), ['track', 'Lead', { content_name: 'Demo Cierra' }], String(id));
  });
});

// ── Sin consentimiento ──────────────────────────────────────────────
prueba('sin decisión: no hay fbq, ni script, ni _fbq', function () {
  var w = ventana({ consentimiento: null });
  assert.strictEqual(m.iniciar(w), true);
  assert.strictEqual(w.fbq, undefined);
  assert.strictEqual(w._fbq, undefined);
  assert.strictEqual(scripts(w).length, 0);
  assert.strictEqual(w.cierraMeta.activo(), false);
});

prueba('con rechazo guardado, o con solo analítica: tampoco', function () {
  [NO, { analitica: true, publicidad: false }].forEach(function (d) {
    var w = ventana({ consentimiento: d });
    m.iniciar(w);
    assert.strictEqual(w.fbq, undefined, JSON.stringify(d));
    assert.strictEqual(scripts(w).length, 0);
  });
});

prueba('sin analitica.js (no hay cierraConsentimiento) o si lanza: tampoco', function () {
  var w = ventana();
  m.iniciar(w);
  assert.strictEqual(w.fbq, undefined);
  var w2 = ventana({ consentimiento: null });
  w2.cierraConsentimiento = function () { throw new Error('roto'); };
  assert.doesNotThrow(function () { m.iniciar(w2); });
  assert.strictEqual(w2.fbq, undefined);
});

prueba('sin consentimiento, ver #demo no manda nada', function () {
  var w = ventana({ consentimiento: null });
  m.iniciar(w);
  verDemo(w, 1);
  assert.strictEqual(w.fbq, undefined);
});

// ── Con consentimiento guardado ─────────────────────────────────────
prueba('con aceptación guardada: un script async de fbevents.js, init y PageView', function () {
  var w = ventana({ consentimiento: SI });
  m.iniciar(w);
  var s = scripts(w);
  assert.strictEqual(s.length, 1);
  assert.strictEqual(s[0].src, m.SCRIPT);
  assert.strictEqual(s[0].async, true);
  assert.deepStrictEqual(llamadas(w), [['init', m.ID], ['track', 'PageView']]);
  assert.strictEqual(w.cierraMeta.activo(), true);
});

prueba('el stub es el oficial: _fbq, push, loaded, version y la cola', function () {
  var w = ventana({ consentimiento: SI });
  m.iniciar(w);
  assert.strictEqual(typeof w.fbq, 'function');
  assert.strictEqual(w._fbq, w.fbq);
  assert.strictEqual(w.fbq.push, w.fbq);
  assert.strictEqual(w.fbq.loaded, true);
  assert.strictEqual(w.fbq.version, '2.0');
  assert.ok(Array.isArray(w.fbq.queue));
  // Cuando fbevents.js carga, define callMethod y el stub le pasa todo.
  var pasadas = [];
  w.fbq.callMethod = function () { pasadas.push(Array.prototype.slice.call(arguments)); };
  w.fbq('track', 'X');
  assert.deepStrictEqual(pasadas, [['track', 'X']]);
});

prueba('iniciar dos veces (script incluido dos veces): un solo init, un PageView, un script', function () {
  var w = ventana({ consentimiento: SI });
  assert.strictEqual(m.iniciar(w), true);
  assert.strictEqual(m.iniciar(w), false);
  assert.deepStrictEqual(nombres(w), ['init', 'track:PageView']);
  assert.strictEqual(scripts(w).length, 1);
});

prueba('un fbq que ya existía no se pisa ni se duplica el script', function () {
  var w = ventana({ consentimiento: SI });
  var propias = [];
  w.fbq = function () { propias.push(Array.prototype.slice.call(arguments)); };
  m.iniciar(w);
  assert.strictEqual(scripts(w).length, 0);
  assert.deepStrictEqual(propias, [['init', m.ID], ['track', 'PageView']]);
});

// ── Decisión en la página ───────────────────────────────────────────
prueba('aceptar en la página activa el píxel: init y PageView una vez', function () {
  var w = ventana({ consentimiento: null });
  m.iniciar(w);
  decidir(w, SI);
  assert.deepStrictEqual(nombres(w), ['init', 'track:PageView']);
  assert.strictEqual(scripts(w).length, 1);
  decidir(w, SI); // reabrió el aviso y volvió a aceptar
  assert.deepStrictEqual(nombres(w), ['init', 'track:PageView']);
  assert.strictEqual(scripts(w).length, 1);
});

prueba('un evento sin detail usable vuelve a preguntar a cierraConsentimiento', function () {
  var w = ventana({ consentimiento: null });
  m.iniciar(w);
  w.decision = SI;
  w.document.dispatchEvent({ type: 'cierra:consentimiento' });
  assert.deepStrictEqual(nombres(w), ['init', 'track:PageView']);
});

prueba('un evento falso con publicidad: true no activa el píxel si cierraConsentimiento dice que no', function () {
  var w = ventana({ consentimiento: null });
  m.iniciar(w);
  w.document.dispatchEvent({ type: 'cierra:consentimiento', detail: SI });
  assert.strictEqual(w.fbq, undefined);
  assert.strictEqual(scripts(w).length, 0);
  w.decision = NO;
  w.document.dispatchEvent({ type: 'cierra:consentimiento', detail: SI });
  assert.strictEqual(w.fbq, undefined);
});

prueba('un evento falso con publicidad: false no apaga el píxel si cierraConsentimiento dice que sí', function () {
  var w = ventana({ consentimiento: SI });
  m.iniciar(w);
  w.document.dispatchEvent({ type: 'cierra:consentimiento', detail: NO });
  assert.strictEqual(w.cierraMeta.activo(), true);
  assert.deepStrictEqual(nombres(w), ['init', 'track:PageView']);
});

prueba('sin cierraConsentimiento, se usa el detail del evento', function () {
  var w = ventana();
  m.iniciar(w);
  w.document.dispatchEvent({ type: 'cierra:consentimiento', detail: SI });
  assert.deepStrictEqual(nombres(w), ['init', 'track:PageView']);
});

prueba('rechazar con el píxel activo: revoke y después no sale nada más', function () {
  var w = ventana({ consentimiento: SI });
  m.iniciar(w);
  decidir(w, NO);
  assert.deepStrictEqual(nombres(w), ['init', 'track:PageView', 'consent:revoke']);
  assert.strictEqual(w.cierraMeta.activo(), false);
  assert.strictEqual(w.cierraMeta.lead('x'), false);
  verDemo(w, 1);
  decidir(w, NO);
  assert.deepStrictEqual(nombres(w), ['init', 'track:PageView', 'consent:revoke'], 'ni Lead, ni ViewContent, ni otro revoke');
});

prueba('rechazar sin píxel cargado no crea fbq', function () {
  var w = ventana({ consentimiento: null });
  m.iniciar(w);
  decidir(w, NO);
  assert.strictEqual(w.fbq, undefined);
});

prueba('aceptar, rechazar y volver a aceptar: grant, sin segundo init ni PageView', function () {
  var w = ventana({ consentimiento: null });
  m.iniciar(w);
  decidir(w, SI);
  decidir(w, NO);
  decidir(w, SI);
  assert.deepStrictEqual(nombres(w), ['init', 'track:PageView', 'consent:revoke', 'consent:grant']);
  assert.strictEqual(w.cierraMeta.activo(), true);
});

// ── Lead ────────────────────────────────────────────────────────────
prueba('lead con el píxel activo: Lead con eventID y devuelve true', function () {
  var w = ventana({ consentimiento: SI });
  m.iniciar(w);
  assert.strictEqual(w.cierraMeta.lead('3f1c-uuid'), true);
  assert.deepStrictEqual(llamadas(w).pop(), ['track', 'Lead', { content_name: 'Demo Cierra' }, { eventID: '3f1c-uuid' }]);
});

prueba('lead sin consentimiento: false y no crea fbq', function () {
  var w = ventana({ consentimiento: null });
  m.iniciar(w);
  assert.strictEqual(w.cierraMeta.lead('x'), false);
  assert.strictEqual(w.fbq, undefined);
});

prueba('si fbq lanza, lead devuelve false y no lanza', function () {
  var w = ventana({ consentimiento: SI });
  m.iniciar(w);
  w.fbq = function () { throw new Error('fbq roto'); };
  var r;
  assert.doesNotThrow(function () { r = w.cierraMeta.lead('x'); });
  assert.strictEqual(r, false);
});

// ── ViewContent ─────────────────────────────────────────────────────
prueba('observa #demo con escalones hasta 0.4', function () {
  var w = ventana({ consentimiento: null });
  m.iniciar(w);
  assert.strictEqual(w.observers.length, 1);
  assert.deepStrictEqual(w.observers[0].observados, [w.demo]);
  assert.deepStrictEqual(w.observers[0].init, { threshold: [0, 0.1, 0.2, 0.3, 0.4] });
});

prueba('#demo más alta que 2,5 pantallas (celular): cuenta si lo visible cubre el 40 % de la pantalla', function () {
  // 1.600 px de sección en una pantalla de 600: la fracción nunca pasa de 0,375.
  assert.strictEqual(m.demoALaVista({ intersectionRatio: 0.375, rootBounds: { height: 600 }, intersectionRect: { height: 600 } }), true);
  assert.strictEqual(m.demoALaVista({ intersectionRatio: 0.1, rootBounds: { height: 600 }, intersectionRect: { height: 160 } }), false);
  assert.strictEqual(m.demoALaVista({ intersectionRatio: 0.2, rootBounds: { height: 600 }, intersectionRect: { height: 320 } }), true);
  // Sin rootBounds (iframe de otro origen) solo vale la fracción.
  assert.strictEqual(m.demoALaVista({ intersectionRatio: 0.375, rootBounds: null, intersectionRect: { height: 600 } }), false);
  assert.strictEqual(m.demoALaVista({ intersectionRatio: 0, rootBounds: { height: 600 }, intersectionRect: { height: 0 } }), false);
  var w = ventana({ consentimiento: SI });
  m.iniciar(w);
  var o = w.observers[0];
  o.fn([{ target: w.demo, intersectionRatio: 0.3, isIntersecting: true, rootBounds: { height: 600 }, intersectionRect: { height: 480 } }], o);
  var vistas = llamadas(w).filter(function (x) { return x[1] === 'ViewContent'; });
  assert.strictEqual(vistas.length, 1);
});

prueba('ViewContent una sola vez al ver #demo, y solo desde el 40 %', function () {
  var w = ventana({ consentimiento: SI });
  m.iniciar(w);
  verDemo(w, 0.2);
  assert.deepStrictEqual(nombres(w), ['init', 'track:PageView'], 'con 20 % no cuenta');
  verDemo(w, 0.5);
  verDemo(w, 0);
  verDemo(w, 0.9);
  var vistas = llamadas(w).filter(function (x) { return x[1] === 'ViewContent'; });
  assert.deepStrictEqual(vistas, [['track', 'ViewContent', { content_name: 'Página demo' }]]);
  assert.strictEqual(w.observers[0].desconectado, true, 'deja de observar tras enviarla');
});

prueba('#demo a la vista al aceptar: la vista sale en ese momento, después del PageView', function () {
  var w = ventana({ consentimiento: null });
  m.iniciar(w);
  verDemo(w, 0.6);
  decidir(w, SI);
  assert.deepStrictEqual(nombres(w), ['init', 'track:PageView', 'track:ViewContent']);
});

prueba('#demo vista y luego fuera de pantalla al aceptar: sale cuando se vuelva a ver', function () {
  var w = ventana({ consentimiento: null });
  m.iniciar(w);
  verDemo(w, 0.6);
  verDemo(w, 0);
  decidir(w, SI);
  assert.deepStrictEqual(nombres(w), ['init', 'track:PageView']);
  verDemo(w, 0.6);
  assert.deepStrictEqual(nombres(w), ['init', 'track:PageView', 'track:ViewContent']);
});

prueba('sin #demo (legal.html) o sin IntersectionObserver no hay ViewContent ni falla', function () {
  var w = ventana({ consentimiento: SI, demo: false });
  assert.doesNotThrow(function () { m.iniciar(w); });
  assert.strictEqual(w.observers.length, 0);
  var w2 = ventana({ consentimiento: SI, sinObserver: true });
  assert.doesNotThrow(function () { m.iniciar(w2); });
  assert.deepStrictEqual(nombres(w2), ['init', 'track:PageView']);
});

// ── Con analitica.js de verdad ──────────────────────────────────────
// Lo justo de DOM para que corran los dos archivos reales juntos: el
// píxel se entera del clic en Aceptar/Rechazar del aviso.
prueba('con analitica.js real: Aceptar en el aviso activa el píxel y Rechazar lo revoca', function () {
  var a = require(path.join(__dirname, '..', 'assets', 'analitica.js'));
  var w = ventana();
  var doc = w.document;
  var frasco = {};
  Object.defineProperty(doc, 'cookie', {
    get: function () { return Object.keys(frasco).map(function (k) { return k + '=' + frasco[k]; }).join('; '); },
    set: function (v) {
      var par = String(v).split(';')[0];
      var n = par.split('=')[0].trim();
      if (/max-age=0/i.test(v)) delete frasco[n]; else frasco[n] = par.slice(n.length + 1);
    }
  });
  function elemento(t) {
    var e = nodo(t);
    e.className = ''; e.hidden = false; e.offsetHeight = 80;
    e.style = { setProperty: function () {}, removeProperty: function () {} };
    e.classList = { add: function () {}, remove: function () {}, contains: function () { return false; } };
    e.insertBefore = function (h) { return e.appendChild(h); };
    e.querySelector = function () { return null; };
    e.contains = function () { return false; };
    e.click = function () { (e.oyentes.click || []).forEach(function (fn) { fn({ target: e }); }); };
    return e;
  }
  doc.createElement = elemento;
  doc.createElementNS = function (ns, t) { return elemento(t); };
  doc.createTextNode = function (t) { return { texto: t }; };
  doc.body.querySelector = function () { return null; };
  doc.body.insertBefore = function (h) { return doc.body.appendChild(h); };
  doc.documentElement.style = { setProperty: function () {}, removeProperty: function () {} };
  doc.documentElement.classList = { add: function () {}, remove: function () {} };
  w.location = { hostname: 'cierra.cl' };
  var datos = {};
  w.localStorage = { getItem: function (k) { return datos[k] || null; }, setItem: function (k, v) { datos[k] = v; } };
  w.addEventListener = function () {};
  w.CustomEvent = function (tipo, init) { this.type = tipo; this.detail = init.detail; };

  a.iniciar(w);
  m.iniciar(w);
  assert.strictEqual(w.fbq, undefined, 'sin decidir no hay fbq');

  function boton(cual) {
    var r = null;
    (function rec(n) { (n.childNodes || []).forEach(function (h) { if (h.getAttribute && h.getAttribute('data-cookies') === cual) r = h; rec(h); }); })(doc.body);
    return r;
  }
  boton('aceptar').click();
  assert.deepStrictEqual(nombres(w), ['init', 'track:PageView']);
  frasco._fbp = 'fb.1.1';
  boton('rechazar').click();
  assert.deepStrictEqual(nombres(w), ['init', 'track:PageView', 'consent:revoke']);
  assert.strictEqual(frasco._fbp, undefined, 'analitica.js borró _fbp');
});

console.log('');
console.log(corridas + ' pruebas, ' + fallos + ' fallo(s)');
process.exit(fallos ? 1 : 0);

// Pruebas de assets/clarity.js. Sin dependencias:  node tools/test_clarity.js
//
// Mismo esquema que tools/test_meta.js: funciones puras en Node y
// `iniciar(win)` contra un DOM falso. Lo que más importa vigilar: que sin
// `analitica: true` Microsoft no reciba nada (ni el script ni `clarity`).

var assert = require('node:assert');
var path = require('node:path');
var c = require(path.join(__dirname, '..', 'assets', 'clarity.js'));

var corridas = 0, fallos = 0;
function prueba(nombre, fn) {
  corridas++;
  try { fn(); console.log('  ok  ' + nombre); } catch (e) {
    fallos++;
    console.log('  FALLA  ' + nombre);
    console.log('        ' + (e && e.message ? e.message.split('\n').join('\n        ') : e));
  }
}

function nodo(tag) {
  var el = { tagName: String(tag).toUpperCase(), childNodes: [], parentNode: null, oyentes: {} };
  el.appendChild = function (h) { el.childNodes.push(h); h.parentNode = el; return h; };
  el.addEventListener = function (t, fn) { (el.oyentes[t] = el.oyentes[t] || []).push(fn); };
  el.dispatchEvent = function (ev) {
    (el.oyentes[ev.type] || []).forEach(function (fn) { try { fn(ev); } catch (e) { /* no se propaga */ } });
    return true;
  };
  return el;
}

function ventana(consentimiento) {
  var doc = nodo('#document');
  doc.documentElement = nodo('html');
  doc.head = nodo('head');
  doc.documentElement.appendChild(doc.head);
  doc.createElement = function (t) { return nodo(t); };
  var win = { document: doc };
  if (consentimiento !== undefined) {
    win.decision = consentimiento;
    win.cierraConsentimiento = function () { return win.decision; };
  }
  return win;
}
function scripts(win) { return win.document.head.childNodes.filter(function (n) { return n.tagName === 'SCRIPT'; }); }
function cola(win) {
  if (!win.clarity || !win.clarity.q) return [];
  return win.clarity.q.map(function (x) { return Array.prototype.slice.call(x); });
}
function decidir(win, d) {
  win.decision = d;
  win.document.dispatchEvent({ type: 'cierra:consentimiento', detail: d });
}

var SI = { analitica: true, publicidad: true };
var NO = { analitica: false, publicidad: false };
var CONCEDIDO = ['consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' }];
var DENEGADO = ['consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' }];

console.log('clarity.js');

prueba('el ID es el del proyecto de cierra.cl y el script sale de clarity.ms', function () {
  assert.strictEqual(c.ID, 'zcncl2qq0e');
  assert.strictEqual(c.SCRIPT, 'https://www.clarity.ms/tag/zcncl2qq0e');
});

prueba('solo un analitica === true estricto concede', function () {
  assert.strictEqual(c.analiticaConcedida(SI), true);
  assert.strictEqual(c.analiticaConcedida({ analitica: true, publicidad: false }), true);
  assert.strictEqual(c.analiticaConcedida({ analitica: false, publicidad: true }), false);
  assert.strictEqual(c.analiticaConcedida({ analitica: 'true' }), false);
  assert.strictEqual(c.analiticaConcedida(null), false);
  assert.strictEqual(c.analiticaConcedida(true), false);
});

prueba('la publicidad de Microsoft va siempre denegada', function () {
  assert.deepStrictEqual(c.estadoConsentimiento(true), CONCEDIDO[1]);
  assert.deepStrictEqual(c.estadoConsentimiento(false), DENEGADO[1]);
});

prueba('sin decisión no carga nada', function () {
  var w = ventana(null);
  c.iniciar(w);
  assert.strictEqual(scripts(w).length, 0);
  assert.strictEqual(w.clarity, undefined);
  assert.strictEqual(w.cierraClarity.activo(), false);
});

prueba('sin cierraConsentimiento (analitica.js no cargó) no carga nada', function () {
  var w = ventana(undefined);
  c.iniciar(w);
  assert.strictEqual(scripts(w).length, 0);
  assert.strictEqual(w.clarity, undefined);
});

prueba('con un rechazo guardado, o solo publicidad, no carga nada', function () {
  [NO, { analitica: false, publicidad: true }].forEach(function (d) {
    var w = ventana(d);
    c.iniciar(w);
    assert.strictEqual(scripts(w).length, 0);
    assert.strictEqual(w.clarity, undefined);
  });
});

prueba('con analítica aceptada carga el tag una vez y manda consentv2 concedido', function () {
  var w = ventana(SI);
  c.iniciar(w);
  var s = scripts(w);
  assert.strictEqual(s.length, 1);
  assert.strictEqual(s[0].src, c.SCRIPT);
  assert.strictEqual(s[0].async, true);
  assert.deepStrictEqual(cola(w), [CONCEDIDO]);
  assert.strictEqual(w.cierraClarity.activo(), true);
});

prueba('incluido dos veces no carga dos tags', function () {
  var w = ventana(SI);
  assert.strictEqual(c.iniciar(w), true);
  assert.strictEqual(c.iniciar(w), false);
  assert.strictEqual(scripts(w).length, 1);
});

prueba('aceptar en la página lo activa en ese momento', function () {
  var w = ventana(null);
  c.iniciar(w);
  decidir(w, SI);
  assert.strictEqual(scripts(w).length, 1);
  assert.deepStrictEqual(cola(w), [CONCEDIDO]);
});

prueba('rechazar con Clarity activo deniega y manda consent false; volver a aceptar no recarga el tag', function () {
  var w = ventana(SI);
  c.iniciar(w);
  decidir(w, NO);
  assert.deepStrictEqual(cola(w), [CONCEDIDO, DENEGADO, ['consent', false]]);
  assert.strictEqual(w.cierraClarity.activo(), false);
  decidir(w, SI);
  assert.strictEqual(scripts(w).length, 1);
  assert.deepStrictEqual(cola(w).slice(-1), [CONCEDIDO]);
});

prueba('el detail del evento no manda: se le pregunta a analitica.js', function () {
  var w = ventana(null);
  c.iniciar(w);
  w.document.dispatchEvent({ type: 'cierra:consentimiento', detail: SI });
  assert.strictEqual(scripts(w).length, 0);
});

console.log('\n' + corridas + ' pruebas, ' + fallos + ' fallo(s)');
if (fallos) process.exit(1);

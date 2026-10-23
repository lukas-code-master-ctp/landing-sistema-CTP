// Pruebas del HTML de las dos páginas, en lo que toca a la analítica.
// Sin dependencias:  node tools/test_html.js
//
// assets/analitica.js se prueba aparte (tools/test_analitica.js), pero esa
// prueba no ve el HTML. Lo que se rompe sin que ningún test lo note es lo
// que vive en las páginas:
//  - un CTA nuevo sin `data-ubicacion`, que sale como `sin-ubicacion` y ya
//    no se sabe de dónde vino el clic;
//  - una página que deja de cargar analitica.js, su CSS o Vercel Web
//    Analytics, o que pierde el botón "Preferencias de cookies" (la
//    política promete que la decisión siempre se puede cambiar);
//  - `enviar_formulario` movido fuera de la rama de éxito, que contaría
//    como conversión un envío que falló.
// Son verificaciones de texto, no un parser de HTML ni de JS: alcanzan para
// lo que hay en el sitio, que es HTML escrito a mano y ordenado.

var assert = require('node:assert');
var fs = require('node:fs');
var path = require('node:path');

var RAIZ = path.join(__dirname, '..');
var PAGINAS = ['index.html', 'legal.html'];

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

function leer(p) { return fs.readFileSync(path.join(RAIZ, p), 'utf8'); }

// El valor de un atributo en una etiqueta de apertura, o null si no está.
function atributo(tag, nombre) {
  var m = new RegExp('\\s' + nombre + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i').exec(tag);
  return m ? (m[1] != null ? m[1] : m[2] != null ? m[2] : m[3]) : null;
}

// Las etiquetas de apertura de <a> y <button> (aunque ocupen varias líneas)
// que tienen que llevar data-ubicacion: los enlaces que mide analitica.js
// (a #demo, a la app y mailto:) y todo lo que tenga la clase `btn`, se mida
// o no (así un CTA nuevo nace con su ubicación aunque hoy no se mida).
function ctas(html) {
  var tags = html.match(/<(?:a|button)\b[^>]*>/gi) || [];
  return tags.filter(function (t) {
    var href = (atributo(t, 'href') || '').trim();
    var clases = (atributo(t, 'class') || '').split(/\s+/);
    return /^(?:\/|\/?index\.html)?#demo$/i.test(href) ||
      /^https:\/\/app\.cierra\.cl(?=$|[\/?#:])/i.test(href) ||
      /^mailto:/i.test(href) ||
      clases.indexOf('btn') !== -1;
  });
}

// Los CTA sin data-ubicacion o con un valor que no está en kebab-case.
function ctasSinUbicacion(html) {
  return ctas(html).filter(function (t) {
    var u = atributo(t, 'data-ubicacion');
    return !u || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(u);
  });
}

// El cuerpo entre la llave que abre en `desde` y su llave de cierre.
// Cuenta llaves sin entender strings ni comentarios: basta porque el JS del
// formulario no tiene llaves dentro de textos.
function bloque(js, desde) {
  var abre = js.indexOf('{', desde);
  if (abre === -1) return null;
  var nivel = 0;
  for (var i = abre; i < js.length; i++) {
    if (js[i] === '{') nivel++;
    else if (js[i] === '}' && --nivel === 0) return js.slice(abre + 1, i);
  }
  return null;
}

console.log('autotest del chequeo');

prueba('el chequeo detecta un CTA sin data-ubicacion (y acepta uno bien puesto)', function () {
  var malo = '<a href="#demo" class="x">Demo</a>\n<a\n  href="https://app.cierra.cl/login">Entrar</a>' +
    '<a href="mailto:a@b.cl" data-ubicacion="">a@b.cl</a><button class="btn btn-lg" type="button">X</button>' +
    '<a href="index.html#demo" data-ubicacion="Hero">Demo</a>';
  assert.strictEqual(ctas(malo).length, 5);
  assert.strictEqual(ctasSinUbicacion(malo).length, 5);
  var bueno = '<a href="#demo" data-ubicacion="hero">Demo</a><a href="#precios">Precios</a>' +
    '<a href="https://app.cierra.cl.otro.com">Otro</a><button class="btn-x">no es btn</button>' +
    '<a class="btn btn-outline"\n   href="#modulos" data-ubicacion="hero-modulos">Ver</a>';
  assert.strictEqual(ctas(bueno).length, 2);
  assert.deepStrictEqual(ctasSinUbicacion(bueno), []);
});

console.log('html (dos páginas)');

PAGINAS.forEach(function (p) {
  var html = leer(p);

  prueba(p + ': todo CTA (#demo, app.cierra.cl, mailto, .btn) lleva data-ubicacion en kebab-case', function () {
    assert.ok(ctas(html).length > 0, 'no se encontró ningún CTA');
    assert.deepStrictEqual(ctasSinUbicacion(html), []);
  });

  prueba(p + ': carga analitica.js, analitica.css y Vercel Web Analytics', function () {
    assert.ok(/<script\s+src="assets\/analitica\.js"><\/script>/.test(html), 'falta assets/analitica.js');
    assert.ok(/<link\s+rel="stylesheet"\s+href="assets\/analitica\.css">/.test(html), 'falta assets/analitica.css');
    assert.ok(/<script\s+defer\s+src="\/_vercel\/insights\/script\.js"><\/script>/.test(html), 'falta Vercel Web Analytics');
  });

  prueba(p + ': tiene exactamente un [data-preferencias-cookies], y es un <button type="button">', function () {
    var tags = (html.match(/<[a-z]+\b[^>]*\sdata-preferencias-cookies(?=[\s>=])[^>]*>/gi) || []);
    assert.strictEqual(tags.length, 1, 'hay ' + tags.length);
    assert.ok(/^<button\b/i.test(tags[0]) && atributo(tags[0], 'type') === 'button', tags[0]);
  });
});

prueba("index.html: enviar_formulario 'demo' va dentro de la rama de éxito, una sola vez", function () {
  var html = leer('index.html');
  assert.strictEqual(html.split("cierraEvento('enviar_formulario'").length - 1, 1, 'enviar_formulario debe aparecer una sola vez');
  var envio = html.indexOf('await fetch(\'/api/demo\'');
  assert.ok(envio !== -1, 'no está el fetch a /api/demo');
  var tryExito = html.lastIndexOf('try {', envio);
  var cuerpo = bloque(html, tryExito);
  assert.ok(cuerpo, 'no se encontró el try del envío');
  var ok = cuerpo.indexOf('if (!res.ok) throw');
  var llamada = cuerpo.indexOf("window.cierraEvento('enviar_formulario', { formulario: 'demo'");
  assert.ok(ok !== -1, 'falta la guardia if (!res.ok) throw');
  assert.ok(llamada > ok, 'la llamada tiene que ir después de comprobar res.ok, dentro del try de éxito');
  assert.ok(/<form\b[^>]*id="demo-form"[^>]*data-ubicacion="demo"/.test(html), 'el <form> no tiene data-ubicacion="demo"');
});

console.log('');
console.log(corridas + ' pruebas, ' + fallos + ' fallo(s)');
process.exit(fallos ? 1 : 0);

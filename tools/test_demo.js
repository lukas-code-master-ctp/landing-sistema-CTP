// Pruebas de la landing de campaña (/demo/) y de su página de gracias
// (/demo/gracias/). Sin dependencias:  node tools/test_demo.js
//
// Spec: docs/specs/2026-11-13-landing-campana-demo-spec.md. Las dos páginas
// son HTML escrito a mano y viven fuera del sitio (solo se llega por el
// anuncio), así que lo que se rompe no lo avisa nadie:
//  - que se indexen, entren al sitemap o a llms.txt, o que otra página las
//    enlace;
//  - una ruta relativa: en /demo/ y en /demo/gracias/ apuntaría dentro de
//    la carpeta, a un archivo que no existe;
//  - que a la landing le vuelva el menú o un enlace que saque a la persona
//    del formulario, o un quinto campo;
//  - la conversión contada dos veces (en la landing y en la de gracias),
//    contada sin que el envío haya salido bien, o contada al recargar la
//    página de gracias;
//  - voseo.
// Los scripts de analítica, el botón de preferencias y los data-ubicacion
// los revisa tools/test_html.js, que también recorre estas dos páginas.
// Son verificaciones de texto, salvo el script de la página de gracias, que
// además se ejecuta contra una ventana falsa.

var assert = require('node:assert');
var fs = require('node:fs');
var path = require('node:path');

var RAIZ = path.join(__dirname, '..');
var URL_BASE = 'https://cierra.cl';
var LANDING = 'demo/index.html';
var GRACIAS = 'demo/gracias/index.html';
var CSS = 'assets/demo.css';

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
function veces(texto, trozo) { return texto.split(trozo).length - 1; }

// El valor de un atributo en una etiqueta de apertura, o null si no está.
function atributo(tag, nombre) {
  var m = new RegExp('\\s' + nombre + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i').exec(tag);
  return m ? (m[1] != null ? m[1] : m[2] != null ? m[2] : m[3]) : null;
}
function tieneAtributo(tag, nombre) {
  return new RegExp('\\s' + nombre + '(?=[\\s>=/])', 'i').test(tag);
}

function meta(html, nombre) {
  var tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (var i = 0; i < tags.length; i++) {
    if (atributo(tags[i], 'name') === nombre) return atributo(tags[i], 'content');
  }
  return null;
}

function canonical(html) {
  var tags = html.match(/<link\b[^>]*>/gi) || [];
  for (var i = 0; i < tags.length; i++) {
    if (atributo(tags[i], 'rel') === 'canonical') return atributo(tags[i], 'href');
  }
  return null;
}

// Una ruta sirve en /demo/ y en /demo/gracias/ solo si no depende de la
// carpeta: absoluta (/x, pero no //host), un ancla, https, mailto o data.
function rutaAbsoluta(r) {
  return /^(?:\/(?!\/)|#|https:\/\/|mailto:|data:)/.test(r);
}

// Las url(...) de un CSS o de un atributo style.
function urlsCss(texto) {
  var out = [];
  var re = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi, m;
  while ((m = re.exec(texto))) out.push((m[1] != null ? m[1] : m[2] != null ? m[2] : m[3]).trim());
  return out;
}

// Todas las rutas de una página: href, src, srcset, action y poster de
// cualquier etiqueta, más las url(...) (en atributos style o en <style>).
// Los &quot; y &#39; se deshacen antes, por si un style va entre comillas
// simples o escapado.
function rutasHtml(html) {
  var out = [];
  var re = /\s(href|src|srcset|action|poster)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi, m;
  while ((m = re.exec(html))) {
    var v = (m[2] != null ? m[2] : m[3]).trim();
    if (m[1].toLowerCase() === 'srcset') {
      v.split(',').forEach(function (c) { out.push(c.trim().split(/\s+/)[0]); });
    } else {
      out.push(v);
    }
  }
  return out.concat(urlsCss(html.replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")));
}

function rutasNoAbsolutas(rutas) {
  return rutas.filter(function (r) { return !rutaAbsoluta(r); });
}

// De las rutas absolutas locales, las que apuntan a un archivo que no
// existe. Las de Vercel (/_vercel/...) y las de páginas (/, /demo/) no son
// archivos del repo.
function archivosQueFaltan(rutas) {
  return rutas.filter(function (r) {
    if (!/^\/(?!\/)/.test(r)) return false;
    var archivo = r.split(/[?#]/)[0];
    if (archivo.indexOf('/_vercel/') === 0 || /\/$/.test(archivo)) return false;
    return !fs.existsSync(path.join(RAIZ, archivo));
  });
}

// Enlaces a la landing o a su página de gracias: href="/demo…", href="demo/…"
// o la URL completa. `#demo`, `/#demo` y `/api/demo` no cuentan.
function enlacesADemo(html) {
  return html.match(/\shref\s*=\s*["']?(?:https?:\/\/(?:www\.)?cierra\.cl)?\/?(?:\.\.?\/)*demo(?=[\/"'?#\s>])[^"'\s>]*/gi) || [];
}

// Los href de las etiquetas <a> y <area> (los <link> del head y los
// <use href="#i-…"> de los íconos no son enlaces).
function enlaces(html) {
  return (html.match(/<(?:a|area)\b[^>]*>/gi) || [])
    .map(function (t) { return atributo(t, 'href'); })
    .filter(function (h) { return h != null; });
}

function ids(html) {
  var out = {};
  var re = /\sid\s*=\s*"([^"]*)"/gi, m;
  while ((m = re.exec(html))) out[m[1]] = (out[m[1]] || 0) + 1;
  return out;
}

// Los <script> en línea (sin src), con la posición donde empieza cada uno.
function scriptsEnLinea(html) {
  var out = [];
  var re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi, m;
  while ((m = re.exec(html))) {
    if (/\ssrc\s*=/i.test(m[1])) continue;
    if (/application\/ld\+json/i.test(m[1])) continue;
    out.push({ codigo: m[2], inicio: m.index });
  }
  return out;
}

// El JS sin comentarios, para contar llamadas sin que cuente una mención en
// un comentario. No entiende strings: basta porque el JS de estas páginas no
// tiene `//` ni `/*` dentro de textos (las URL viven en el HTML).
function sinComentarios(js) {
  return js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');
}

// El cuerpo entre la llave que abre en `desde` y su llave de cierre (misma
// idea que tools/test_html.js: cuenta llaves sin entender strings).
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

// Misma idea que tools/test_blog.js, con más formas. Los límites son por
// letra (no \b, que no entiende tildes): "nuevos" o "mira" no son voseo.
var VOSEO = /(^|[^\p{L}])(tenés|querés|podés|sabés|necesitás|hacé|mirá|completá|dejá|llená|escribí|escribinos|contanos|contactá|agendá|solicitá|revisá|pedí|elegí|vos|sos)(?![\p{L}])/iu;
function voseo(html) {
  var m = VOSEO.exec(html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' '));
  return m ? m[2] : null;
}

// Corre el script de conversión de la página de gracias contra una ventana
// falsa y devuelve, en orden, lo que hizo.
function correrGracias(codigo, hash, opciones) {
  var o = opciones || {};
  var pasos = [];
  var location = { hash: hash, pathname: '/demo/gracias/', search: o.search || '', href: URL_BASE + '/demo/gracias/' + (o.search || '') + hash };
  var history = {
    replaceState: function (estado, titulo, url) {
      if (o.sinHistory) throw new Error('sin History API');
      pasos.push(['replaceState', url]);
      location.hash = '';
    },
  };
  var window = { location: location, history: history };
  if (!o.sinAnalitica) {
    window.cierraEvento = function (nombre, params) {
      pasos.push(['cierraEvento', nombre, params]);
      if (o.eventoLanza) throw new Error('falló la analítica');
    };
  }
  if (!o.sinMeta) {
    window.cierraMeta = { lead: function (id) { pasos.push(['lead', id]); } };
  }
  var document = { location: location };
  // eslint-disable-next-line no-new-func
  new Function('window', 'document', 'location', 'history', 'fetch', codigo)(
    window, document, location, history,
    function () { pasos.push(['fetch']); throw new Error('la página de gracias no hace fetch'); }
  );
  return pasos;
}

var UUID = '3f1c2b4a-1111-4222-8333-444455556666';

// ───────────────────────────────────────────────────────── autotest
console.log('autotest del chequeo');

prueba('detecta rutas relativas, también dentro de url(...) y de srcset (y deja pasar las absolutas)', function () {
  var malo = '<img src="assets/a.png"><link href="../assets/b.css"><a href="gracias/">x</a>' +
    '<span style="--logo:url(\'assets/c.png\')"></span><span style="background:url(../d.png)"></span>' +
    '<img srcset="/a.png 1x, b.png 2x"><script src="//unpkg.com/x.js"></script><a href="http://cierra.cl/">y</a>';
  assert.deepStrictEqual(rutasNoAbsolutas(rutasHtml(malo)),
    ['assets/a.png', '../assets/b.css', 'gracias/', 'b.png', '//unpkg.com/x.js', 'http://cierra.cl/', 'assets/c.png', '../d.png']);
  var bueno = '<img src="/assets/a.png"><a href="#demo">x</a><a href="https://x.cl/assets/y">y</a>' +
    '<a href="mailto:a@b.cl">z</a><img src="data:image/png;base64,AAAA">' +
    '<span style="--logo:url(\'/assets/c.png\'); height:28px;"></span><use href="#i-check"/>';
  assert.deepStrictEqual(rutasNoAbsolutas(rutasHtml(bueno)), []);
  assert.deepStrictEqual(rutasNoAbsolutas(urlsCss('a{background:url(img/x.png)} b{background:url("/assets/y.png")}')), ['img/x.png']);
});

prueba('detecta un enlace a /demo/ (y no confunde #demo, /#demo ni /api/demo)', function () {
  var malo = '<a href="/demo/">a</a><a href="demo/">b</a><a href="/demo">c</a><a href="https://cierra.cl/demo/?utm=x">d</a>' +
    '<a href="/demo/gracias/">e</a><a href="../demo/">f</a><a href=\'/demo/\'>g</a>';
  assert.strictEqual(enlacesADemo(malo).length, 7);
  var bueno = '<a href="#demo">a</a><a href="/#demo">b</a><a href="index.html#demo">c</a><a href="#tyc-demo">d</a>' +
    '<link href="/assets/demo.css"><a href="https://cierra.cl/#demo">e</a><a href="/demostracion/">f</a>' +
    "<script>fetch('/api/demo')</script>";
  assert.deepStrictEqual(enlacesADemo(bueno), []);
});

prueba('detecta voseo (y deja pasar el tuteo)', function () {
  assert.strictEqual(voseo('<p>Si querés, agendá una demo</p>'), 'querés');
  assert.strictEqual(voseo('<p>Completá el formulario</p>'), 'Completá');
  assert.strictEqual(voseo('<p>Es para vos.</p>'), 'vos');
  assert.strictEqual(voseo('<p>Mira tu venta: los nuevos leads, sin compromiso. Si quieres, completa y deja tus datos.</p>'), null);
});

prueba('el script de gracias se puede probar: uno que mide sin validar el hash, o que borra el hash después, se detecta', function () {
  var sinValidar = "var id = window.location.hash.replace(/^#/, ''); window.cierraEvento('enviar_formulario', {}); window.cierraMeta.lead(id);";
  assert.strictEqual(correrGracias(sinValidar, '').length, 2, 'un script que no valida mide aunque no haya hash');
  var alReves = "var id = window.location.hash.replace(/^#/, ''); window.cierraMeta.lead(id); history.replaceState(null, '', location.pathname);";
  assert.deepStrictEqual(correrGracias(alReves, '#' + UUID).map(function (p) { return p[0]; }), ['lead', 'replaceState']);
  assert.strictEqual(bloque('try { a(); if (x) { b(); } c(); } catch (e) { d(); }', 0), ' a(); if (x) { b(); } c(); ');
  assert.strictEqual(sinComentarios("a(); // cierraMeta.lead(\n/* cierraMeta.lead( */ b('https://x.cl');").indexOf('lead'), -1);
});

// ───────────────────────────────────────────────────────── las dos páginas
var sitemap = leer('sitemap.xml');
var llms = leer('llms.txt');
var css = leer(CSS);

// Las demás páginas del sitio: index, legal y todo el HTML de blog/.
function htmlBajo(dir) {
  var out = [];
  fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true }).forEach(function (d) {
    var rel = dir + '/' + d.name;
    if (d.isDirectory()) out = out.concat(htmlBajo(rel));
    else if (/\.html$/.test(d.name)) out.push(rel);
  });
  return out;
}
var OTRAS = ['index.html', 'legal.html'].concat(htmlBajo('blog'));

console.log('landing de campaña (' + LANDING + ', ' + GRACIAS + ')');

[
  { p: LANDING, url: URL_BASE + '/demo/', robots: 'noindex, follow' },
  { p: GRACIAS, url: URL_BASE + '/demo/gracias/', robots: 'noindex, nofollow' },
].forEach(function (pag) {
  var p = pag.p;
  var html = leer(p);

  prueba(p + ': robots "' + pag.robots + '", canonical con su URL y lang="es-CL"', function () {
    assert.strictEqual(veces(html, '<meta name="robots"'), 1, 'tiene que haber una sola meta robots');
    assert.strictEqual(meta(html, 'robots'), pag.robots);
    assert.strictEqual(canonical(html), pag.url);
    assert.ok(/<html\b[^>]*\slang="es-CL"/.test(html), 'falta <html lang="es-CL">');
  });

  prueba(p + ': todas las rutas (href, src, url(...)) son absolutas', function () {
    var rutas = rutasHtml(html);
    assert.ok(rutas.length > 0, 'no se encontró ninguna ruta');
    assert.deepStrictEqual(rutasNoAbsolutas(rutas), []);
  });

  prueba(p + ': los archivos locales que enlaza existen', function () {
    assert.deepStrictEqual(archivosQueFaltan(rutasHtml(html)), []);
  });

  prueba(p + ': los enlaces a un ancla (#x) apuntan a un id que existe, y no hay ids repetidos', function () {
    var hay = ids(html);
    var repetidos = Object.keys(hay).filter(function (k) { return hay[k] > 1; });
    assert.deepStrictEqual(repetidos, [], 'ids repetidos');
    var huerfanos = enlaces(html).filter(function (h) { return /^#./.test(h) && !hay[h.slice(1)]; });
    assert.deepStrictEqual(huerfanos, []);
  });

  prueba(p + ': no carga Lucide ni nada de unpkg', function () {
    assert.ok(!/lucide/i.test(html), 'la página nombra Lucide: los íconos van como SVG en línea');
    assert.ok(!/unpkg/i.test(html), 'la página carga algo de unpkg');
  });

  prueba(p + ': carga /assets/clarity.js después de /assets/meta-pixel.js', function () {
    var iMeta = html.indexOf('<script src="/assets/meta-pixel.js"></script>');
    var iClarity = html.indexOf('<script src="/assets/clarity.js"></script>');
    assert.ok(iMeta !== -1, 'falta /assets/meta-pixel.js');
    assert.ok(iClarity !== -1, 'falta /assets/clarity.js');
    assert.ok(iClarity > iMeta, 'clarity.js tiene que ir después de meta-pixel.js');
  });

  prueba(p + ': sin voseo', function () {
    var v = voseo(html);
    assert.ok(!v, 'voseo: "' + v + '"');
  });
});

prueba(CSS + ': sus url(...) y @import son rutas absolutas, y los archivos existen', function () {
  var rutas = urlsCss(css);
  var re = /@import\s+(?:"([^"]*)"|'([^']*)')/gi, m;
  while ((m = re.exec(css))) rutas.push(m[1] != null ? m[1] : m[2]);
  assert.deepStrictEqual(rutasNoAbsolutas(rutas), []);
  assert.deepStrictEqual(archivosQueFaltan(rutas), []);
});

prueba('sitemap.xml y llms.txt no nombran /demo/', function () {
  [['sitemap.xml', sitemap], ['llms.txt', llms]].forEach(function (par) {
    var m = /cierra\.cl\/demo(?![\p{L}\d-])|\/demo\//u.exec(par[1]);
    assert.ok(!m, par[0] + ' nombra la landing: "' + (m && m[0]) + '"');
  });
});

prueba('ninguna otra página del sitio (' + OTRAS.length + ': index, legal y blog/**) enlaza a /demo/', function () {
  assert.ok(OTRAS.length >= 4, 'no se encontraron las páginas del sitio');
  var hallados = [];
  OTRAS.forEach(function (o) {
    enlacesADemo(leer(o)).forEach(function (e) { hallados.push(o + ':' + e); });
  });
  assert.deepStrictEqual(hallados, []);
});

// ───────────────────────────────────────────────────────── la landing
var landing = leer(LANDING);
var jsLanding = scriptsEnLinea(landing).map(function (s) { return sinComentarios(s.codigo); }).join('\n');

prueba(LANDING + ': sin <nav>, sin la palabra "Precios" y sin botón de WhatsApp', function () {
  assert.ok(!/<nav\b/i.test(landing), 'la landing no lleva menú');
  assert.ok(landing.indexOf('Precios') === -1, 'la landing no nombra "Precios"');
  assert.ok(!/wa\.me|api\.whatsapp\.com/i.test(landing), 'la landing no lleva enlace a WhatsApp');
});

prueba(LANDING + ': los únicos enlaces que salen de la página van a /legal.html', function () {
  var hrefs = enlaces(landing);
  assert.ok(hrefs.length > 0, 'no se encontró ningún enlace');
  var fuga = hrefs.filter(function (h) { return !/^#./.test(h) && !/^\/legal\.html(?:#[\w-]+)?$/.test(h); });
  assert.deepStrictEqual(fuga, [], 'enlaces de fuga');
  assert.ok(hrefs.some(function (h) { return /^\/legal\.html/.test(h); }), 'falta el enlace a /legal.html (Meta exige la política visible)');
  // Explícito, por si un enlace nace fuera de un <a> (un onclick, un <form action>).
  assert.ok(!/href\s*=\s*["']\/(?:#[^"']*|index\.html[^"']*)?["']/i.test(landing), 'enlace a la portada (/ o /#…)');
  assert.ok(!/href\s*=\s*["']\/blog/i.test(landing), 'enlace a /blog');
  assert.ok(landing.indexOf('app.cierra.cl') === -1, 'la landing nombra app.cierra.cl');
  assert.ok(!/<form\b[^>]*\saction\s*=/i.test(landing), 'el formulario no lleva action: se envía con fetch');
});

prueba(LANDING + ': #demo-form con data-ubicacion="landing-demo" y 4 campos obligatorios (nombre, email, telefono, empresa)', function () {
  var forms = landing.match(/<form\b[^>]*>/gi) || [];
  assert.strictEqual(forms.length, 1, 'tiene que haber un solo <form>');
  assert.strictEqual(atributo(forms[0], 'id'), 'demo-form');
  assert.strictEqual(atributo(forms[0], 'data-ubicacion'), 'landing-demo');
  var desde = landing.indexOf(forms[0]);
  var cuerpo = landing.slice(desde, landing.indexOf('</form>', desde));
  var controles = (cuerpo.match(/<(?:input|select|textarea)\b[^>]*>/gi) || [])
    .filter(function (t) { return atributo(t, 'name') != null; });
  assert.deepStrictEqual(controles.map(function (t) { return atributo(t, 'name'); }), ['nombre', 'email', 'telefono', 'empresa']);
  controles.forEach(function (t) {
    assert.ok(tieneAtributo(t, 'required'), 'falta required en ' + t);
    assert.notStrictEqual((atributo(t, 'type') || '').toLowerCase(), 'hidden', 'campo oculto: ' + t);
  });
  assert.ok(!/\sname\s*=\s*["']?equipo\b/i.test(landing), 'la landing no pide el tamaño del equipo');
  assert.strictEqual((cuerpo.match(/<button\b[^>]*\stype="submit"[^>]*>/gi) || []).length, 1, 'un solo botón de envío');
});

prueba(LANDING + ': existe un elemento con id="demo" (ahí llevan los CTA y ahí mide el ViewContent) y contiene el formulario', function () {
  assert.strictEqual(ids(landing).demo, 1);
  var m = /<([a-z0-9]+)\b[^>]*\sid="demo"[^>]*>/i.exec(landing);
  assert.ok(m, 'no se encontró la etiqueta con id="demo"');
  var cierre = landing.indexOf('</' + m[1] + '>', landing.indexOf('</form>', m.index));
  var form = landing.indexOf('id="demo-form"');
  assert.ok(form > m.index && landing.indexOf('</form>', m.index) !== -1 && cierre !== -1, 'el formulario tiene que ir dentro de #demo');
  assert.ok(landing.slice(m.index, form).indexOf('</' + m[1] + '>') === -1, 'el formulario quedó fuera de #demo');
});

prueba(LANDING + ": envía a /api/demo y redirige a /demo/gracias/#<id> solo después de comprobar res.ok", function () {
  var envio = jsLanding.indexOf("await fetch('/api/demo'");
  assert.ok(envio !== -1, "no está el await fetch('/api/demo'");
  assert.strictEqual(veces(jsLanding, 'fetch('), 1, 'un solo fetch');
  var tryExito = jsLanding.lastIndexOf('try {', envio);
  assert.ok(tryExito !== -1, 'el fetch no está dentro de un try');
  var cuerpo = bloque(jsLanding, tryExito);
  assert.ok(cuerpo && cuerpo.indexOf("fetch('/api/demo'") !== -1, 'no se encontró el try del envío');
  var ok = cuerpo.indexOf('if (!res.ok) throw');
  var redir = cuerpo.indexOf("'/demo/gracias/#'");
  assert.ok(ok !== -1, 'falta la guardia if (!res.ok) throw');
  assert.ok(redir !== -1, 'la redirección a /demo/gracias/# no está dentro del try del envío');
  assert.ok(redir > ok, 'la redirección tiene que ir después de comprobar res.ok');
  assert.ok(/location\.assign\('\/demo\/gracias\/#' \+ eventId\)/.test(cuerpo), 'la redirección lleva el eventId del envío en el hash');
  // Una sola redirección en toda la página: ninguna en el catch ni fuera del try.
  assert.strictEqual(veces(jsLanding, '/demo/gracias/'), 1, 'la ruta de gracias aparece más de una vez en el script');
  assert.strictEqual((jsLanding.match(/location\.(?:assign|replace)\(|location(?:\.href)?\s*=[^=]/g) || []).length, 1, 'hay más de una redirección');
});

prueba(LANDING + ': el cuerpo del envío lleva meta_event_id, meta_consentimiento y pagina, puestos antes del fetch', function () {
  var envio = jsLanding.indexOf("await fetch('/api/demo'");
  var submit = jsLanding.lastIndexOf("addEventListener('submit'", envio);
  assert.ok(submit !== -1, 'no se encontró el manejador del submit');
  var antes = jsLanding.slice(submit, envio);
  assert.ok(/payload\.meta_event_id = eventId/.test(antes), 'falta payload.meta_event_id = eventId antes del fetch');
  assert.ok(/payload\.meta_consentimiento = /.test(antes), 'falta payload.meta_consentimiento antes del fetch');
  assert.ok(/payload\.pagina = /.test(antes), 'falta payload.pagina antes del fetch');
  assert.ok(/body:\s*JSON\.stringify\(payload\)/.test(jsLanding.slice(envio)), 'el fetch no manda el payload');
});

prueba(LANDING + ': NO dispara enviar_formulario ni el Lead (eso es de la página de gracias)', function () {
  assert.strictEqual(veces(landing, "cierraEvento('enviar_formulario'"), 0, "la landing contiene cierraEvento('enviar_formulario'");
  assert.strictEqual(veces(landing, 'cierraMeta.lead('), 0, 'la landing contiene cierraMeta.lead(');
  assert.ok(!/fbq\s*\(/.test(jsLanding), 'la landing llama a fbq directo');
});

// ───────────────────────────────────────────────────────── la de gracias
var gracias = leer(GRACIAS);
var scriptsGracias = scriptsEnLinea(gracias);
var LLAMADA_EVENTO = "window.cierraEvento('enviar_formulario', { formulario: 'demo', ubicacion: 'landing-demo' })";
var LLAMADA_LEAD = 'window.cierraMeta.lead(eventId)';
// El script de la conversión: el que llama al Lead.
var conversion = scriptsGracias.filter(function (s) { return sinComentarios(s.codigo).indexOf('cierraMeta.lead(') !== -1; })[0];
var jsGracias = conversion ? sinComentarios(conversion.codigo) : '';

prueba(GRACIAS + ': dispara enviar_formulario y el Lead exactamente una vez cada uno', function () {
  assert.ok(conversion, 'no se encontró el script en línea de la conversión');
  var todo = scriptsGracias.map(function (s) { return sinComentarios(s.codigo); }).join('\n');
  assert.strictEqual(veces(todo, LLAMADA_EVENTO), 1, LLAMADA_EVENTO);
  assert.strictEqual(veces(todo, LLAMADA_LEAD), 1, LLAMADA_LEAD);
  assert.strictEqual(veces(todo, 'cierraEvento('), 1, 'hay otra llamada a cierraEvento');
  assert.strictEqual(veces(todo, 'cierraMeta.lead('), 1, 'hay otra llamada a cierraMeta.lead');
  assert.ok(!/fbq\s*\(/.test(todo), 'la página llama a fbq directo');
});

prueba(GRACIAS + ': valida el hash con una regex de UUID y borra el hash (history.replaceState) ANTES de medir', function () {
  var iUuid = jsGracias.search(/\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{12\}/i);
  var iReplace = jsGracias.indexOf('history.replaceState(');
  var iEvento = jsGracias.indexOf(LLAMADA_EVENTO);
  var iLead = jsGracias.indexOf(LLAMADA_LEAD);
  assert.ok(iUuid !== -1, 'falta la regex de UUID');
  assert.ok(iReplace !== -1, 'falta history.replaceState');
  assert.ok(iEvento !== -1 && iLead !== -1, 'faltan las llamadas');
  assert.ok(/\^/.test(jsGracias.slice(iUuid - 3, iUuid)) && /^[^\n]*\$\//.test(jsGracias.slice(iUuid)), 'la regex de UUID tiene que estar anclada (^…$)');
  assert.ok(/\breturn\b/.test(jsGracias.slice(iUuid, Math.min(iReplace, iEvento, iLead))), 'si el hash no es un UUID hay que salir (return) antes de medir');
  assert.ok(iUuid < iReplace, 'la validación va antes de borrar el hash');
  assert.ok(iReplace < iEvento && iReplace < iLead, 'history.replaceState tiene que ir antes de las dos llamadas');
});

prueba(GRACIAS + ': el script en línea va después de analitica.js y meta-pixel.js, y la página no hace fetch', function () {
  var iAnalitica = gracias.indexOf('<script src="/assets/analitica.js"></script>');
  var iMeta = gracias.indexOf('<script src="/assets/meta-pixel.js"></script>');
  assert.ok(iAnalitica !== -1 && iMeta !== -1, 'faltan analitica.js o meta-pixel.js');
  assert.ok(conversion.inicio > iAnalitica && conversion.inicio > iMeta, 'el script de la conversión tiene que ir después de las dos etiquetas');
  scriptsGracias.forEach(function (s) {
    assert.ok(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon/.test(sinComentarios(s.codigo)), 'la página de gracias no manda nada por su cuenta');
  });
  assert.ok(!/<form\b/i.test(gracias), 'la página de gracias no lleva formulario');
});

prueba(GRACIAS + ' (ejecutado): con un UUID en el hash borra el hash y mide una vez, con ese id', function () {
  assert.deepStrictEqual(correrGracias(conversion.codigo, '#' + UUID), [
    ['replaceState', '/demo/gracias/'],
    ['cierraEvento', 'enviar_formulario', { formulario: 'demo', ubicacion: 'landing-demo' }],
    ['lead', UUID],
  ]);
  // Conserva los parámetros (UTM) al borrar el hash, y acepta mayúsculas.
  var pasos = correrGracias(conversion.codigo, '#' + UUID.toUpperCase(), { search: '?utm_source=meta' });
  assert.deepStrictEqual(pasos[0], ['replaceState', '/demo/gracias/?utm_source=meta']);
  assert.deepStrictEqual(pasos[2], ['lead', UUID.toUpperCase()]);
});

prueba(GRACIAS + ' (ejecutado): sin hash, o con uno que no es un UUID, no mide nada (entrar directo, recargar, volver atrás)', function () {
  ['', '#', '#demo', '#' + UUID.slice(0, -1), '#' + UUID + '0', '#x' + UUID, '#' + UUID + '&a=1',
    '#' + UUID.replace(/-/g, ''), '#<script>alert(1)</script>', '#' + UUID.replace('3', 'g'), '#' + UUID + '\n'].forEach(function (h) {
    assert.deepStrictEqual(correrGracias(conversion.codigo, h), [], 'midió con el hash ' + JSON.stringify(h));
  });
});

prueba(GRACIAS + ' (ejecutado): sin analítica o sin píxel no lanza, y un fallo de una medición no impide la otra', function () {
  assert.deepStrictEqual(correrGracias(conversion.codigo, '#' + UUID, { sinAnalitica: true, sinMeta: true }), [['replaceState', '/demo/gracias/']]);
  assert.deepStrictEqual(correrGracias(conversion.codigo, '#' + UUID, { sinAnalitica: true }).map(function (p) { return p[0]; }), ['replaceState', 'lead']);
  assert.deepStrictEqual(correrGracias(conversion.codigo, '#' + UUID, { eventoLanza: true }).map(function (p) { return p[0]; }), ['replaceState', 'cierraEvento', 'lead']);
  assert.deepStrictEqual(correrGracias(conversion.codigo, '#' + UUID, { sinHistory: true }).map(function (p) { return p[0]; }), ['cierraEvento', 'lead']);
});

console.log('');
console.log(corridas + ' pruebas, ' + fallos + ' fallo(s)');
process.exit(fallos ? 1 : 0);

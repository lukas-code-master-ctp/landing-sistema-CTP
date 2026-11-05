// Pruebas del blog. Sin dependencias:  node tools/test_blog.js
//
// Cada entrada es una página escrita a mano en blog/<slug>/index.html, sin
// build: lo que se olvida al agregar una no lo avisa nadie. Esto revisa,
// por cada carpeta de blog/ (salvo las que empiezan con _, como la
// plantilla):
//  - que tenga index.html, esté enlazada desde blog/index.html y en
//    sitemap.xml;
//  - que tenga canonical con su URL, og:title, description y un JSON-LD
//    BlogPosting que se pueda leer;
//  - que ninguna ruta a assets/ sea relativa (en /blog/<slug>/ una ruta
//    relativa apunta a /blog/<slug>/assets/, que no existe) y que los
//    archivos locales que enlaza existan;
//  - que no se haya colado voseo.
// Los scripts de analítica y el botón de preferencias los revisa
// tools/test_html.js, que también recorre las páginas del blog.

var assert = require('node:assert');
var fs = require('node:fs');
var path = require('node:path');

var RAIZ = path.join(__dirname, '..');
var BLOG = path.join(RAIZ, 'blog');
var URL_BASE = 'https://cierra.cl';

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

function meta(html, attr, valor) {
  var tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (var i = 0; i < tags.length; i++) {
    if (tags[i].indexOf(attr + '="' + valor + '"') !== -1) {
      var m = /\scontent="([^"]*)"/.exec(tags[i]);
      return m ? m[1] : '';
    }
  }
  return null;
}

function canonical(html) {
  var m = /<link\s+rel="canonical"\s+href="([^"]*)"/.exec(html);
  return m ? m[1] : null;
}

function jsonLd(html) {
  var out = [];
  var re = /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g, m;
  while ((m = re.exec(html))) out.push(JSON.parse(m[1]));
  return out;
}

// Rutas a assets que no empiezan con "/" (src="assets/..." o href="../assets/...").
function rutasRelativas(html) {
  return html.match(/\s(?:src|href)="(?:\.\.?\/)*assets\/[^"]*"/g) || [];
}

// Archivos locales enlazados con ruta absoluta (/assets/x, /legal.html),
// sin contar las rutas de Vercel (/_vercel/...) ni las de páginas (/, /blog/).
function archivosLocales(html) {
  var out = [];
  var re = /\s(?:src|href)="(\/[^"#?]*)/g, m;
  while ((m = re.exec(html))) {
    var r = m[1];
    if (r.indexOf('/_vercel/') === 0 || /\/$/.test(r)) continue;
    out.push(r);
  }
  return out;
}

var VOSEO = /(^|[^\p{L}])(tenés|querés|podés|sabés|necesitás|hacé|mirá|contactá|agendá|escribinos|contanos|revisá|elegí tu)(?![\p{L}])/iu;

var entradas = fs.readdirSync(BLOG, { withFileTypes: true })
  .filter(function (d) { return d.isDirectory() && d.name[0] !== '_'; })
  .map(function (d) { return d.name; });

var lista = leer('blog/index.html');
var sitemap = leer('sitemap.xml');

console.log('autotest del chequeo');

prueba('detecta rutas relativas a assets y voseo (y deja pasar lo correcto)', function () {
  assert.strictEqual(rutasRelativas('<img src="assets/a.svg"><link href="../assets/b.css">').length, 2);
  assert.strictEqual(rutasRelativas('<img src="/assets/a.svg"><a href="https://x.cl/assets/y">').length, 0);
  assert.ok(VOSEO.test('Si querés, agendá una demo'));
  assert.ok(VOSEO.test('Podés verlo.'));
  assert.ok(!VOSEO.test('Si quieres, agenda una demo y revisa tu cartera.'));
});

console.log('blog (' + entradas.length + ' entrada(s))');

prueba('hay al menos una entrada', function () {
  assert.ok(entradas.length > 0);
});

prueba('blog/index.html: canonical, og:title, description, JSON-LD Blog y en el sitemap', function () {
  assert.strictEqual(canonical(lista), URL_BASE + '/blog/');
  assert.ok(meta(lista, 'property', 'og:title'), 'falta og:title');
  assert.ok(meta(lista, 'name', 'description'), 'falta description');
  var ld = jsonLd(lista);
  assert.ok(ld.some(function (j) { return j['@type'] === 'Blog' || j['@type'] === 'CollectionPage'; }), 'falta JSON-LD Blog');
  assert.ok(sitemap.indexOf('<loc>' + URL_BASE + '/blog/</loc>') !== -1, 'falta /blog/ en sitemap.xml');
});

entradas.forEach(function (slug) {
  var rel = 'blog/' + slug + '/index.html';
  var url = URL_BASE + '/blog/' + slug + '/';

  prueba(rel + ': existe', function () {
    assert.ok(fs.existsSync(path.join(RAIZ, rel)), 'falta ' + rel);
  });
  if (!fs.existsSync(path.join(RAIZ, rel))) return;
  var html = leer(rel);

  prueba(rel + ': está enlazada desde blog/index.html y en sitemap.xml', function () {
    assert.ok(lista.indexOf('href="/blog/' + slug + '/"') !== -1, 'blog/index.html no la enlaza');
    assert.ok(sitemap.indexOf('<loc>' + url + '</loc>') !== -1, 'falta en sitemap.xml');
  });

  prueba(rel + ': canonical con su URL, og:title, og:url y description', function () {
    assert.strictEqual(canonical(html), url);
    assert.ok(meta(html, 'property', 'og:title'), 'falta og:title');
    assert.strictEqual(meta(html, 'property', 'og:url'), url);
    assert.ok(meta(html, 'name', 'description'), 'falta description');
  });

  prueba(rel + ': JSON-LD BlogPosting válido', function () {
    var post = jsonLd(html).filter(function (j) { return j['@type'] === 'BlogPosting'; })[0];
    assert.ok(post, 'falta un JSON-LD BlogPosting');
    ['headline', 'datePublished', 'author', 'publisher', 'image', 'mainEntityOfPage'].forEach(function (k) {
      assert.ok(post[k], 'al BlogPosting le falta ' + k);
    });
    assert.ok(/^\d{4}-\d{2}-\d{2}/.test(post.datePublished), 'datePublished no es una fecha: ' + post.datePublished);
    assert.strictEqual(post.mainEntityOfPage['@id'], url);
    assert.ok(html.indexOf('<time datetime="' + post.datePublished + '"') !== -1, 'el <time> no coincide con datePublished');
  });
});

['blog/index.html', 'blog/_plantilla.html'].concat(entradas.map(function (s) { return 'blog/' + s + '/index.html'; }))
  .forEach(function (rel) {
    if (!fs.existsSync(path.join(RAIZ, rel))) return;
    var html = leer(rel);

    prueba(rel + ': ninguna ruta relativa a assets/, y los archivos enlazados existen', function () {
      assert.deepStrictEqual(rutasRelativas(html), []);
      var faltan = archivosLocales(html).filter(function (r) {
        if (rel === 'blog/_plantilla.html' && r.indexOf('TODO') !== -1) return false;
        return !fs.existsSync(path.join(RAIZ, r));
      });
      assert.deepStrictEqual(faltan, []);
    });

    prueba(rel + ': sin voseo', function () {
      var m = VOSEO.exec(html.replace(/<[^>]+>/g, ' '));
      assert.ok(!m, 'voseo: "' + (m && m[2]) + '"');
    });
  });

console.log('');
console.log(corridas + ' pruebas, ' + fallos + ' fallo(s)');
process.exit(fallos ? 1 : 0);

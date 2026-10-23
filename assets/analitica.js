/* ===================================================================
   Cierra — Analítica (Google Analytics 4 + modo de consentimiento v2)

   Un solo archivo compartido por las dos páginas (index.html y
   legal.html), y no una copia incrustada en cada una: es lógica de
   consentimiento, y dos copias de esa lógica terminan diciendo cosas
   distintas.

   Qué hace, en orden:
     1. Arma `dataLayer` y `gtag`, y manda el `consent default` con todo
        DENEGADO antes de cargar Google. En ese estado gtag no escribe
        cookies: manda señales sin identificador que GA usa para modelar.
     2. Si la persona ya había aceptado, manda el `consent update` a
        granted JUSTO después del default y antes del `config`: si fuera
        después del `config`, la primera página vista de cada visita
        saldría sin cookie y GA la contaría como una visita nueva.
     3. Carga gtag.js (async) y, si no hay decisión guardada, muestra el
        aviso. Cualquier `[data-preferencias-cookies]` lo vuelve a abrir.
     4. Expone `window.cierraEvento(nombre, params)` (lo usa el formulario
        de demo) y mide por delegación los clics en enlaces a `#demo`, a
        app.cierra.cl y en `mailto:`.

   Los tres permisos de publicidad (`ad_storage`, `ad_user_data`,
   `ad_personalization`) van SIEMPRE denegados, también al aceptar: no
   hacemos publicidad y el texto legal lo promete.

   ES5 a propósito (var, function), como el JS inline del sitio: no hay
   bundler que lo traduzca. Además se puede `require` desde Node para
   tools/test_analitica.js: la parte del navegador vive en `iniciar(win)`,
   que solo se llama sola cuando existe `window`, y los tests la llaman
   con un DOM falso.
   =================================================================== */
(function () {
  'use strict';

  // ID de medición de la propiedad "Cierra" en GA4. Es un marcador hasta
  // que la propiedad exista: se reemplaza aquí y en ningún otro lugar.
  var ID = 'G-XXXXXXXXXX';
  var CLAVE = 'cierra-consentimiento';
  // Versión del formato guardado. Si algún día cambia lo que se pregunta
  // (por ejemplo, otra herramienta), se sube y todos vuelven a decidir:
  // una aceptación vieja no puede valer para algo que no se le mostró.
  var VERSION = 1;

  // ── Funciones puras (se prueban en Node) ─────────────────────────

  // Una fecha usable: un Date cuyo tiempo no es NaN. `new Date('x')` es
  // instancia de Date pero inválida, y su toISOString() LANZA.
  function fechaValida(f) {
    return f instanceof Date && !isNaN(f.getTime());
  }

  // Devuelve { analitica: true|false, fecha } o null si no hay una
  // decisión válida. Null cubre todo lo que no sea una decisión explícita
  // de esta versión: ausente, JSON roto, otra versión, `analitica` que no
  // es booleano o un storage que lanza (Safari en modo privado, cookies
  // bloqueadas). Ante la duda se vuelve a preguntar y gtag sigue
  // denegado: nunca se concede por un dato que no se pudo leer.
  // Una `fecha` ilegible no anula la decisión (la decisión es lo que
  // importa), pero se devuelve como null y no como vino: quien la lea
  // después no puede encontrarse un número o un objeto.
  function leerConsentimiento(storage) {
    var crudo;
    try {
      if (!storage) return null;
      crudo = storage.getItem(CLAVE);
    } catch (e) {
      return null;
    }
    if (typeof crudo !== 'string' || !crudo) return null;
    var dato;
    try {
      dato = JSON.parse(crudo);
    } catch (e) {
      return null;
    }
    if (!dato || typeof dato !== 'object') return null;
    if (dato.v !== VERSION) return null;
    if (typeof dato.analitica !== 'boolean') return null;
    var fecha = typeof dato.fecha === 'string' && !isNaN(Date.parse(dato.fecha)) ? dato.fecha : null;
    return { analitica: dato.analitica, fecha: fecha };
  }

  // Guarda la decisión. Devuelve true si quedó escrita. Si el storage
  // lanza, devuelve false y no pasa nada más: la decisión vale para esta
  // página y el aviso vuelve a aparecer en la siguiente, que es mejor que
  // romper la página o asumir un sí. La fecha se valida ANTES de armar el
  // dato: con un Date inválido, toISOString() lanzaría fuera del try y el
  // clic en Aceptar/Rechazar no cerraría el aviso.
  function guardarConsentimiento(storage, analitica, ahora) {
    var dato = {
      v: VERSION,
      analitica: analitica === true,
      fecha: (fechaValida(ahora) ? ahora : new Date()).toISOString()
    };
    try {
      if (!storage) return false;
      storage.setItem(CLAVE, JSON.stringify(dato));
      return true;
    } catch (e) {
      return false;
    }
  }

  // El estado de consentimiento que corresponde a una decisión. Solo
  // `analitica === true` (estricto) concede: un "true" en texto o un 1 no
  // cuentan. Publicidad, siempre denegada.
  function estadoConsentimiento(analitica) {
    return {
      analytics_storage: analitica === true ? 'granted' : 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    };
  }

  // Los comandos de gtag que van al cargar, en el orden en que deben ir.
  // Separado de la ejecución para poder probar el ORDEN en Node, que es
  // lo que se rompe fácil (un update después del config pierde la
  // primera página vista).
  function comandosIniciales(guardado, ahora) {
    var porDefecto = estadoConsentimiento(false);
    // wait_for_update: cuánto espera gtag a un `consent update` asíncrono
    // antes de mandar el primer hit. NO cubre al visitante nuevo: en su
    // primera visita no hay decisión hasta que toca el aviso, así que su
    // primer page_view sale siempre denegado y sin cookie (modo avanzado).
    // Con una decisión guardada tampoco hace falta: el update va
    // sincrónico en la línea siguiente.
    porDefecto.wait_for_update = 500;
    var cmds = [['consent', 'default', porDefecto]];
    if (guardado && guardado.analitica === true) {
      cmds.push(['consent', 'update', estadoConsentimiento(true)]);
    }
    cmds.push(['js', fechaValida(ahora) ? ahora : new Date()]);
    // cookie_domain 'none': la cookie queda de HOST, solo en cierra.cl.
    // Con el valor automático GA la pondría en .cierra.cl y viajaría a
    // app.cierra.cl y a los subdominios de cada loteadora
    // ({slug}.cierra.cl), que son otro producto y otro aviso legal.
    // Sin linker por lo mismo: no se le agrega `_gl` a los enlaces a la app.
    cmds.push(['config', ID, { cookie_domain: 'none' }]);
    return cmds;
  }

  // Las asignaciones a document.cookie que borran las cookies de GA
  // (`_ga` y `_ga_<ID>`) presentes en `cookies`. Se borran sin dominio y
  // en el host y cada dominio padre: hoy la cookie es de host, pero si
  // alguna vez quedó una de dominio (.cierra.cl) solo se borra con el
  // mismo dominio con que se creó. Un nombre parecido (`_gat`, `x_ga`) no
  // se toca.
  function cookiesABorrar(cookies, hostname) {
    var nombres = [];
    var partes = String(cookies || '').split(';');
    for (var j = 0; j < partes.length; j++) {
      var nombre = partes[j].split('=')[0].replace(/^\s+|\s+$/g, '');
      if ((nombre === '_ga' || nombre.indexOf('_ga_') === 0) && nombres.indexOf(nombre) === -1) nombres.push(nombre);
    }
    var dominios = [''];
    var trozos = String(hostname || '').split('.');
    for (var k = 0; k < trozos.length - 1; k++) dominios.push('; domain=.' + trozos.slice(k).join('.'));
    var asignaciones = [];
    for (var n = 0; n < nombres.length; n++) {
      for (var d = 0; d < dominios.length; d++) {
        asignaciones.push(nombres[n] + '=; Max-Age=0; path=/' + dominios[d]);
      }
    }
    return asignaciones;
  }

  // Texto visible con los espacios colapsados (el HTML trae saltos de
  // línea y la sangría de los íconos) y recortado: GA corta los
  // parámetros a 100 caracteres y un texto largo solo ensucia el informe.
  function textoCorto(texto) {
    return String(texto == null ? '' : texto).replace(/\s+/g, ' ').replace(/^ | $/g, '').slice(0, 60);
  }

  // El evento que corresponde a un clic en un enlace, o null si ese enlace
  // no se mide. Recibe el atributo `href` tal como está escrito, el
  // `data-ubicacion` y el texto del enlace.
  //  - `#demo` (también `/#demo`, `index.html#demo` y la URL absoluta de
  //    cierra.cl): `clic_solicitar_demo`, con `ubicacion` y `texto`, porque
  //    hay varios CTA con textos distintos que comparar.
  //  - app.cierra.cl: `clic_ingresar`, solo con `ubicacion`.
  //  - mailto: `clic_correo`, solo con `ubicacion`.
  // Ningún evento manda más de dos propiedades (tope de Vercel, ver
  // cierraEvento).
  // El dominio de la app se compara entero (seguido de fin, `/`, `?`, `#`
  // o `:`) y no como prefijo de texto: `https://app.cierra.cl.otro.com` no
  // es la app.
  // Sin `data-ubicacion` se manda `sin-ubicacion` y no se omite el
  // parámetro: así un enlace nuevo al que le faltó el atributo se nota en
  // los informes en vez de perderse en "(not set)".
  function eventoDeEnlace(href, ubicacion, texto) {
    var h = typeof href === 'string' ? href.replace(/^\s+|\s+$/g, '') : '';
    var u = typeof ubicacion === 'string' ? ubicacion.replace(/^\s+|\s+$/g, '') : '';
    var params = { ubicacion: u || 'sin-ubicacion' };
    if (/^(?:https:\/\/(?:www\.)?cierra\.cl)?(?:\/|\/?index\.html)?#demo$/i.test(h)) {
      params.texto = textoCorto(texto);
      return { nombre: 'clic_solicitar_demo', params: params };
    }
    if (/^https:\/\/app\.cierra\.cl(?=$|[\/?#:])/i.test(h)) return { nombre: 'clic_ingresar', params: params };
    if (/^mailto:/i.test(h)) return { nombre: 'clic_correo', params: params };
    return null;
  }

  // Dibuja la galleta del aviso: un círculo color galleta con un mordisco
  // arriba a la derecha y cuatro chispas de chocolate. SVG en línea, sin
  // archivo ni petición aparte. Es decorativa: aria-hidden y sin título,
  // el lector de pantalla solo lee el texto.
  function crearGalleta(doc) {
    var NS = 'http://www.w3.org/2000/svg';
    function nodo(tag, attrs) {
      var el = doc.createElementNS(NS, tag);
      for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) el.setAttribute(k, attrs[k]);
      return el;
    }
    var svg = nodo('svg', {
      'class': 'cookies__icono', viewBox: '0 0 40 40', width: '32', height: '32',
      'aria-hidden': 'true', focusable: 'false'
    });
    // El mordisco es un arco que entra en el borde: el círculo "comido".
    svg.appendChild(nodo('path', {
      d: 'M20 3a17 17 0 1 0 17 17 5 5 0 0 1-5.5-5 5 5 0 0 1-5.5-5.5A5 5 0 0 1 20 3z',
      fill: '#e0a35c', stroke: '#b9793a', 'stroke-width': '1.6'
    }));
    var chispas = [[13, 15, 2.4], [22, 23, 2.6], [12, 26, 2], [27, 30, 2]];
    for (var i = 0; i < chispas.length; i++) {
      svg.appendChild(nodo('circle', { cx: String(chispas[i][0]), cy: String(chispas[i][1]), r: String(chispas[i][2]), fill: '#5c3517' }));
    }
    return svg;
  }

  // ── Navegador ────────────────────────────────────────────────────
  // Todo lo que toca window/document. Recibe la ventana por parámetro
  // para que tools/test_analitica.js la pueda correr con un DOM falso.
  function iniciar(win) {
    var doc = win.document;
    // Si el script quedara incluido dos veces, el segundo no debe mandar
    // otro default denegado encima de un update concedido, ni dejar un
    // segundo aviso.
    if (win.__cierraAnalitica) return false;
    win.__cierraAnalitica = true;

    // Acceder a `window.localStorage` ya puede lanzar (cookies bloqueadas
    // en Chrome), así que se pide dentro de un try y no en cada uso.
    var almacen = null;
    try { almacen = win.localStorage; } catch (e) { almacen = null; }

    win.dataLayer = win.dataLayer || [];
    // `arguments` y no un arreglo: gtag.js solo reconoce los comandos que
    // llegan como objeto arguments.
    win.gtag = win.gtag || function () { win.dataLayer.push(arguments); };

    // Un evento va a GA y a Vercel Web Analytics, para poder comparar los
    // dos. Ojo con Vercel: los eventos personalizados solo existen en los
    // planes Pro y Enterprise; en Hobby `va('event')` no registra nada (no
    // falla, simplemente no aparece en el panel). Y en Pro cada evento
    // admite como máximo 2 propiedades, por eso ningún evento manda más.
    // Se busca `gtag` y `va` al momento de mandar (no al cargar): `va` lo
    // define el script de Vercel y podría no existir.
    // Cada envío va en su propio try: si uno lanza, el otro sale igual, y
    // quien llama (el formulario que acaba de mostrar "enviado") nunca
    // recibe una excepción. Medir no puede romper la página.
    // Con el consentimiento denegado gtag manda el evento sin cookie ni
    // identificador (modo avanzado): no hace falta preguntar aquí.
    win.cierraEvento = function (nombre, params) {
      if (typeof nombre !== 'string' || !nombre) return;
      var datos = params && typeof params === 'object' ? params : {};
      try { if (typeof win.gtag === 'function') win.gtag('event', nombre, datos); } catch (e) { /* sin GA */ }
      try { if (typeof win.va === 'function') win.va('event', { name: nombre, data: datos }); } catch (e) { /* sin Vercel */ }
    };

    var guardado = leerConsentimiento(almacen);
    var iniciales = comandosIniciales(guardado, new Date());
    for (var i = 0; i < iniciales.length; i++) win.gtag.apply(win, iniciales[i]);

    // Si Google está bloqueado (adblock, red), el script simplemente no
    // carga: dataLayer se queda como cola y la página sigue igual.
    var tag = doc.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
    (doc.head || doc.documentElement).appendChild(tag);

    // ── Aviso ──────────────────────────────────────────────────────
    // Se crea por DOM y no va en el HTML de las páginas: así existe una
    // sola versión del texto y quien no tiene JavaScript (y por lo tanto
    // tampoco GA) no ve un aviso que no aplica.
    var banner = null;
    var quienAbrio = null;
    var raiz = doc.documentElement;

    function boton(etiqueta, analitica) {
      var btn = doc.createElement('button');
      btn.type = 'button';
      // Aceptar en el verde de la marca y Rechazar en blanco con borde.
      // Los dos con el mismo tamaño y en la misma fila: rechazar sigue a
      // un clic, igual de visible que aceptar.
      btn.className = 'btn ' + (analitica ? 'btn-primary' : 'btn-outline') + ' btn-md cookies__btn';
      btn.setAttribute('data-cookies', analitica ? 'aceptar' : 'rechazar');
      btn.appendChild(doc.createTextNode(etiqueta));
      btn.addEventListener('click', function () { decidir(analitica); });
      return btn;
    }

    function crearBanner() {
      var b = doc.createElement('div');
      b.className = 'cookies';
      b.setAttribute('role', 'region');
      b.setAttribute('aria-label', 'Aviso de cookies');
      b.hidden = true;

      var inner = doc.createElement('div');
      inner.className = 'cookies__inner';

      var texto = doc.createElement('p');
      texto.className = 'cookies__texto';
      texto.appendChild(doc.createTextNode(
        'Usamos cookies de Google Analytics para saber qué partes del sitio sirven. '
      ));
      var mas = doc.createElement('a');
      mas.className = 'cookies__mas';
      mas.href = 'legal.html#pp-cookies';
      mas.appendChild(doc.createTextNode('Más información'));
      texto.appendChild(mas);

      // Los dos botones del mismo tamaño y en la misma fila: rechazar no
      // puede costar más clics que aceptar.
      var acciones = doc.createElement('div');
      acciones.className = 'cookies__acciones';
      acciones.appendChild(boton('Rechazar', false));
      acciones.appendChild(boton('Aceptar', true));

      // La galleta va al lado del texto para que el aviso se sienta amable
      // y no un trámite.
      var cabeza = doc.createElement('div');
      cabeza.className = 'cookies__cabeza';
      cabeza.appendChild(crearGalleta(doc));
      cabeza.appendChild(texto);

      inner.appendChild(cabeza);
      inner.appendChild(acciones);
      b.appendChild(inner);

      // Al PRINCIPIO del body (tras "Saltar al contenido" si existe) y no
      // al final: con teclado o lector de pantalla se encuentra de
      // inmediato, y no después de recorrer la página entera. Visualmente
      // da igual: es position: fixed abajo.
      var salto = doc.body.querySelector('.skip-link');
      var antesDe = salto && salto.parentNode === doc.body ? salto.nextSibling : doc.body.firstChild;
      doc.body.insertBefore(b, antesDe);

      // El alto cambia cuando carga la fuente web o cambia el ancho;
      // ResizeObserver lo ve en ambos casos. El resize de la ventana
      // queda de respaldo para navegadores sin ResizeObserver.
      if (typeof win.ResizeObserver === 'function') {
        try { new win.ResizeObserver(ajustarEspacio).observe(b); } catch (e) { /* respaldo: resize */ }
      }
      return b;
    }

    // Mientras el aviso está visible, la página reserva abajo su alto real
    // en --cookies-alto, sobre <html> y no sobre <body>, porque lo usan
    // las dos: el padding-bottom del body (el pie no queda tapado al
    // llegar al fondo) y el scroll-padding-bottom del html (al avanzar con
    // Tab, el navegador desplaza el elemento con foco para que no quede
    // debajo del aviso fijo; WCAG 2.4.11).
    function ajustarEspacio() {
      if (!banner || banner.hidden) return;
      raiz.style.setProperty('--cookies-alto', banner.offsetHeight + 'px');
    }

    function mostrarBanner() {
      if (!banner) banner = crearBanner();
      banner.hidden = false;
      raiz.classList.add('con-cookies');
      ajustarEspacio();
    }

    function ocultarBanner() {
      if (!banner) return;
      banner.hidden = true;
      raiz.classList.remove('con-cookies');
      raiz.style.removeProperty('--cookies-alto');
    }

    function decidir(analitica) {
      guardarConsentimiento(almacen, analitica, new Date());
      win.gtag('consent', 'update', estadoConsentimiento(analitica));
      // El update a denied hace que gtag deje de escribir cookies, pero
      // las que ya estaban (si antes había aceptado) se quedarían hasta 2
      // años.
      if (!analitica) {
        var borrar = cookiesABorrar(doc.cookie, win.location && win.location.hostname);
        for (var c = 0; c < borrar.length; c++) doc.cookie = borrar[c];
      }
      ocultarBanner();
      // El botón con el foco acaba de desaparecer. Si el aviso lo abrió
      // el pie, el foco vuelve a ese botón para que el teclado no salte
      // al inicio de la página; si apareció solo al cargar, se suelta
      // (queda en el body).
      if (quienAbrio && doc.body.contains(quienAbrio)) {
        quienAbrio.focus();
      } else if (doc.activeElement && doc.activeElement.blur) {
        doc.activeElement.blur();
      }
      quienAbrio = null;
    }

    if (!guardado) mostrarBanner();

    win.addEventListener('resize', ajustarEspacio);

    // Mide un clic en un enlace. NO llama a preventDefault ni frena la
    // navegación: el evento se encola y GA4 lo manda con sendBeacon, que
    // sobrevive al cambio de página. Si gtag.js todavía no cargó, ese clic
    // se pierde, y es preferible a retrasar al visitante. Todo va en un try
    // porque un error aquí no puede impedir que el enlace funcione.
    function medirEnlace(enlace) {
      try {
        if (!enlace || !enlace.getAttribute) return;
        var ev = eventoDeEnlace(
          enlace.getAttribute('href'),
          enlace.getAttribute('data-ubicacion'),
          enlace.textContent
        );
        if (ev) win.cierraEvento(ev.nombre, ev.params);
      } catch (e) { /* medir nunca rompe un enlace */ }
    }

    // El enlace del clic. closest sube desde el ícono que va dentro de los
    // CTA hasta el <a>. Se pide `a[href]` y no `[href]`: un
    // `<use href="#icono">` dentro del enlace también tiene href, y
    // closest se quedaría con él en vez de llegar al enlace.
    function enlaceDe(t) {
      return t && t.closest ? t.closest('a[href]') : null;
    }

    // Botón del medio (abrir en otra pestaña): el navegador NO dispara
    // `click` para ese botón, solo `auxclick`, así que sin esto ese clic se
    // perdería. Solo button === 1: el derecho (2) abre el menú contextual y
    // no es una intención de ir. Para no contar dos veces, el listener de
    // `click` de abajo ignora todo botón que no sea el principal.
    doc.addEventListener('auxclick', function (ev) {
      if (ev.button !== 1) return;
      medirEnlace(enlaceDe(ev.target));
    });

    // Delegación en document: un solo listener para el botón del pie y
    // para los enlaces medidos de las dos páginas, y sirve aunque alguno
    // se agregue después.
    doc.addEventListener('click', function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;
      var abridor = t.closest('[data-preferencias-cookies]');
      if (!abridor) {
        // Navegadores viejos disparaban `click` también con el botón del
        // medio; ese ya lo midió `auxclick`.
        if (ev.button) return;
        medirEnlace(enlaceDe(t));
        return;
      }
      ev.preventDefault();
      quienAbrio = abridor;
      mostrarBanner();
      // Abierto a pedido, el foco va al aviso: si no, quien navega con
      // teclado o lector de pantalla no se entera de que apareció.
      var primero = banner.querySelector('.cookies__btn');
      if (primero) primero.focus();
    });
    return true;
  }

  // Exporta para tools/test_analitica.js. En el navegador `module` no
  // existe y esto no hace nada.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      ID: ID,
      CLAVE: CLAVE,
      VERSION: VERSION,
      leerConsentimiento: leerConsentimiento,
      guardarConsentimiento: guardarConsentimiento,
      estadoConsentimiento: estadoConsentimiento,
      comandosIniciales: comandosIniciales,
      cookiesABorrar: cookiesABorrar,
      eventoDeEnlace: eventoDeEnlace,
      iniciar: iniciar
    };
  }

  if (typeof window !== 'undefined' && typeof document !== 'undefined') iniciar(window);
})();

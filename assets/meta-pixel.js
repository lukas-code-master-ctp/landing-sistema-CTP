/* ===================================================================
   Cierra — Píxel de Meta (Facebook e Instagram Ads)

   Mide visitas y demos agendadas de las campañas de Meta. NO decide
   nada sobre el consentimiento: lo pregunta a assets/analitica.js, que
   tiene que cargarse ANTES que este archivo.

   Qué hace, en orden:
     1. Si `window.cierraConsentimiento()` dice `publicidad: true` (la
        persona aceptó ahora o en una visita anterior), arma el stub de
        `fbq`, descarga fbevents.js y manda `init` y `PageView`. Sin esa
        respuesta Meta no recibe NADA: ni el script, ni `fbq`, ni cookies.
     2. Escucha `cierra:consentimiento` en document. Si la persona acepta
        en esta página, activa el píxel en ese momento; si rechaza con el
        píxel activo, manda `fbq('consent', 'revoke')` y no manda nada más.
        (Las cookies `_fbp`/`_fbc` las borra analitica.js.)
     3. ViewContent `{content_name: 'Página demo'}` una vez por página,
        cuando la sección #demo queda a la vista (40 %).
     4. Expone `window.cierraMeta.lead(eventId)` para el formulario de demo
        y `window.cierraMeta.activo()`.

   Nunca manda datos personales: los parámetros son fijos. Sin noscript a
   propósito: sin JavaScript no hay forma de pedir consentimiento.

   ES5, como analitica.js, y con el mismo patrón para las pruebas
   (tools/test_meta.js): `iniciar(win)` solo corre sola cuando existe
   `window`, y en Node se exporta para llamarla con un DOM falso.
   =================================================================== */
(function () {
  'use strict';

  // ID del píxel "Cierra.cl - Pixel" (portfolio Impulse AI). Vive solo
  // aquí: cambiarlo es cambiar esta línea. El servidor (API de
  // conversiones) lo lee de la variable META_PIXEL_ID, aparte.
  var ID = '4526586427599697';
  var SCRIPT = 'https://connect.facebook.net/en_US/fbevents.js';
  // Qué fracción de #demo tiene que verse para contar como vista.
  var UMBRAL_DEMO = 0.4;

  // ── Funciones puras (se prueban en Node) ─────────────────────────

  // ¿Esta decisión permite el píxel? Solo un `publicidad === true`
  // estricto; null, un objeto raro o un "true" en texto no.
  function publicidadConcedida(decision) {
    return !!decision && typeof decision === 'object' && decision.publicidad === true;
  }

  // Los argumentos de `fbq` para el Lead. Con un eventId (texto no vacío)
  // va como `eventID`, que es lo que Meta usa para deduplicar contra el
  // mismo evento enviado por la API de conversiones; sin él, el Lead sale
  // igual pero sin deduplicar.
  function argumentosLead(eventId) {
    var args = ['track', 'Lead', { content_name: 'Demo Cierra' }];
    if (typeof eventId === 'string' && eventId) args.push({ eventID: eventId });
    return args;
  }

  // Escalones en que el observer avisa. No basta con UMBRAL_DEMO solo: en
  // un celular #demo (texto + formulario apilados) puede medir más de 2,5
  // pantallas, y entonces su fracción visible NUNCA llega a 0,4 y la vista
  // no saldría jamás. Por eso también cuenta como vista si lo visible
  // cubre el 40 % de la pantalla, y para enterarse hacen falta avisos
  // intermedios.
  var UMBRALES_OBSERVER = [0, 0.1, 0.2, 0.3, UMBRAL_DEMO];

  // ¿Esta entrada del observer cuenta como #demo a la vista? El 40 % de la
  // sección o, si la sección es más alta que eso, el 40 % de la pantalla.
  function demoALaVista(e) {
    if (!e) return false;
    if (e.intersectionRatio >= UMBRAL_DEMO) return true;
    var raiz = e.rootBounds;
    var vis = e.intersectionRect;
    return !!(raiz && vis && raiz.height > 0 && e.intersectionRatio > 0 &&
      vis.height >= raiz.height * UMBRAL_DEMO);
  }

  // ── Navegador ────────────────────────────────────────────────────
  function iniciar(win) {
    var doc = win.document;
    // Incluido dos veces, el segundo no puede mandar otro init ni otro
    // PageView, ni escuchar dos veces el consentimiento.
    if (win.__cierraMeta) return false;
    win.__cierraMeta = true;

    var activo = false;      // el píxel puede mandar eventos ahora
    var iniciado = false;    // ya se mandaron init y PageView en esta página
    var demoVisible = false; // #demo está a la vista (>= UMBRAL_DEMO)
    var vistaEnviada = false;

    function fbq() {
      if (typeof win.fbq === 'function') win.fbq.apply(win, arguments);
    }

    // El stub oficial de Meta: encola las llamadas hasta que fbevents.js
    // carga y las procesa. Si `fbq` ya existe (otro snippet, o una
    // activación anterior), no se pisa.
    function crearStub() {
      if (win.fbq) return;
      var n = win.fbq = function () {
        if (n.callMethod) n.callMethod.apply(n, arguments);
        else n.queue.push(arguments);
      };
      if (!win._fbq) win._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      // Si Meta está bloqueado (adblock, red), el script no carga y `fbq`
      // se queda como cola: la página sigue igual.
      var tag = doc.createElement('script');
      tag.async = true;
      tag.src = SCRIPT;
      (doc.head || doc.documentElement).appendChild(tag);
    }

    // ViewContent pendiente: sale si el píxel está activo, #demo se ve y
    // todavía no salió en esta página.
    function intentarVista() {
      if (!activo || !demoVisible || vistaEnviada) return;
      vistaEnviada = true;
      try { fbq('track', 'ViewContent', { content_name: 'Página demo' }); } catch (e) { /* medir no rompe */ }
    }

    function activar() {
      if (activo) return;
      try {
        if (!iniciado) {
          crearStub();
          fbq('init', ID);
          fbq('track', 'PageView');
          iniciado = true;
        } else {
          // Aceptó, rechazó y volvió a aceptar en la misma página: el
          // PageView de esta página ya salió, solo se levanta el revoke.
          fbq('consent', 'grant');
        }
        activo = true;
      } catch (e) { return; }
      // Si #demo ya estaba a la vista cuando aceptó, la vista cuenta.
      intentarVista();
    }

    function desactivar() {
      if (!activo) return;
      activo = false;
      try { fbq('consent', 'revoke'); } catch (e) { /* sin Meta */ }
    }

    function aplicar(decision) {
      if (publicidadConcedida(decision)) activar();
      else desactivar();
    }

    var inicial = null;
    try {
      if (typeof win.cierraConsentimiento === 'function') inicial = win.cierraConsentimiento();
    } catch (e) { inicial = null; }
    if (publicidadConcedida(inicial)) activar();

    // La decisión tomada en esta página. El evento solo avisa que algo
    // cambió: la decisión se le pregunta SIEMPRE a analitica.js, que es la
    // fuente de verdad, así un `cierra:consentimiento` despachado por otro
    // script con `detail: {publicidad: true}` no activa el píxel. El
    // `detail` se usa solo si cierraConsentimiento no existe.
    if (doc.addEventListener) {
      doc.addEventListener('cierra:consentimiento', function (ev) {
        var d = null;
        if (typeof win.cierraConsentimiento === 'function') {
          try { d = win.cierraConsentimiento(); } catch (e) { d = null; }
        } else {
          d = ev && ev.detail && typeof ev.detail === 'object' ? ev.detail : null;
        }
        aplicar(d);
      });
    }

    // ViewContent: se observa #demo desde el inicio, con o sin
    // consentimiento, porque observar no manda nada: solo anota si está a
    // la vista. Así, si la persona acepta con la sección en pantalla, la
    // vista sale en ese momento; si acepta antes, sale cuando la vea. Se
    // usa intersectionRatio y no isIntersecting: el primer aviso del
    // observer llega al observar, y ahí isIntersecting es true con
    // cualquier fracción visible. Sin IntersectionObserver no se mide.
    var demo = doc.getElementById ? doc.getElementById('demo') : null;
    if (demo && typeof win.IntersectionObserver === 'function') {
      try {
        var obs = new win.IntersectionObserver(function (entradas) {
          for (var i = 0; i < entradas.length; i++) demoVisible = demoALaVista(entradas[i]);
          intentarVista();
          if (vistaEnviada && obs && obs.disconnect) obs.disconnect();
        }, { threshold: UMBRALES_OBSERVER });
        obs.observe(demo);
      } catch (e) { /* sin ViewContent */ }
    }

    win.cierraMeta = {
      // Manda el Lead del formulario de demo. Devuelve true si salió y
      // false si el píxel no está activo o algo falló. Nunca lanza: lo
      // llama el formulario que acaba de mostrar "enviado".
      lead: function (eventId) {
        if (!activo) return false;
        try {
          fbq.apply(null, argumentosLead(eventId));
          return true;
        } catch (e) {
          return false;
        }
      },
      activo: function () { return activo; }
    };
    return true;
  }

  // Exporta para tools/test_meta.js. En el navegador `module` no existe y
  // esto no hace nada.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      ID: ID,
      SCRIPT: SCRIPT,
      UMBRAL_DEMO: UMBRAL_DEMO,
      UMBRALES_OBSERVER: UMBRALES_OBSERVER,
      demoALaVista: demoALaVista,
      publicidadConcedida: publicidadConcedida,
      argumentosLead: argumentosLead,
      iniciar: iniciar
    };
  }

  if (typeof window !== 'undefined' && typeof document !== 'undefined') iniciar(window);
})();

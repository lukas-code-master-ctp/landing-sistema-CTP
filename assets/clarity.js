/* ===================================================================
   Cierra — Microsoft Clarity (mapas de calor y grabaciones de sesión)

   Muestra cómo se usa el sitio: dónde se hace clic, hasta dónde se baja
   y grabaciones anónimas de las visitas. NO decide nada sobre el
   consentimiento: lo pregunta a assets/analitica.js, que tiene que
   cargarse ANTES que este archivo, igual que assets/meta-pixel.js.

   Va con la parte `analitica` de la decisión (la misma que Google
   Analytics): Clarity mide el uso del sitio, no anuncios.

   Qué hace, en orden:
     1. Si `window.cierraConsentimiento()` dice `analitica: true`, arma el
        stub de `clarity`, descarga el tag y manda `consentv2` con
        analytics_Storage concedido (ad_Storage siempre denegado). Sin esa
        respuesta Microsoft no recibe NADA: ni el script, ni cookies.
     2. Escucha `cierra:consentimiento` en document. Si la persona acepta
        en esta página, activa Clarity en ese momento; si rechaza con
        Clarity activo, manda `clarity('consent', false)`, que detiene la
        grabación y borra sus cookies (analitica.js las borra igual).

   Clarity enmascara por defecto lo que se escribe en los formularios: no
   graba el nombre, el correo ni el teléfono del formulario de demo.

   ES5 y con el mismo patrón de pruebas que meta-pixel.js
   (tools/test_clarity.js): `iniciar(win)` solo corre sola cuando existe
   `window`, y en Node se exporta para llamarla con un DOM falso.
   =================================================================== */
(function () {
  'use strict';

  // ID del proyecto de Clarity de cierra.cl. Vive solo aquí: cambiarlo es
  // cambiar esta línea.
  var ID = 'zcncl2qq0e';
  var SCRIPT = 'https://www.clarity.ms/tag/' + ID;

  // ¿Esta decisión permite Clarity? Solo un `analitica === true` estricto.
  function analiticaConcedida(decision) {
    return !!decision && typeof decision === 'object' && decision.analitica === true;
  }

  // El estado que se le manda a Clarity. La publicidad de Microsoft queda
  // siempre denegada: no usamos Clarity para anuncios.
  function estadoConsentimiento(analitica) {
    return { ad_Storage: 'denied', analytics_Storage: analitica === true ? 'granted' : 'denied' };
  }

  function iniciar(win) {
    var doc = win.document;
    if (win.__cierraClarity) return false;
    win.__cierraClarity = true;

    var activo = false;
    var cargado = false;

    function clarity() {
      if (typeof win.clarity === 'function') win.clarity.apply(win, arguments);
    }

    // El stub oficial de Clarity: encola las llamadas hasta que el tag
    // carga. Si Clarity está bloqueado (adblock, red), queda como cola y
    // la página sigue igual.
    function cargar() {
      if (cargado) return;
      cargado = true;
      if (typeof win.clarity !== 'function') {
        win.clarity = function () { (win.clarity.q = win.clarity.q || []).push(arguments); };
      }
      var tag = doc.createElement('script');
      tag.async = true;
      tag.src = SCRIPT;
      (doc.head || doc.documentElement).appendChild(tag);
    }

    function activar() {
      if (activo) return;
      try {
        cargar();
        clarity('consentv2', estadoConsentimiento(true));
        activo = true;
      } catch (e) { /* medir no rompe */ }
    }

    function desactivar() {
      if (!activo) return;
      activo = false;
      try {
        clarity('consentv2', estadoConsentimiento(false));
        clarity('consent', false);
      } catch (e) { /* sin Clarity */ }
    }

    function aplicar(decision) {
      if (analiticaConcedida(decision)) activar();
      else desactivar();
    }

    var inicial = null;
    try {
      if (typeof win.cierraConsentimiento === 'function') inicial = win.cierraConsentimiento();
    } catch (e) { inicial = null; }
    if (analiticaConcedida(inicial)) activar();

    // El evento solo avisa que algo cambió: la decisión se le pregunta
    // SIEMPRE a analitica.js (mismo criterio que meta-pixel.js).
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

    win.cierraClarity = { activo: function () { return activo; } };
    return true;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      ID: ID,
      SCRIPT: SCRIPT,
      analiticaConcedida: analiticaConcedida,
      estadoConsentimiento: estadoConsentimiento,
      iniciar: iniciar
    };
  }

  if (typeof window !== 'undefined' && typeof document !== 'undefined') iniciar(window);
})();

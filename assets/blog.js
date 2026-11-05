// Comportamiento del nav en las páginas del blog: íconos de Lucide, sombra
// del nav al hacer scroll y el menú de celular. Es el mismo JS de
// index.html (que lo trae incrustado junto con el resto de la landing),
// separado acá para que cada entrada no tenga que copiarlo.
(function () {
  if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 2 } });

  var nav = document.getElementById('nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  var burger = document.getElementById('nav-burger');
  var navMobile = document.getElementById('nav-mobile');
  if (burger && navMobile) {
    var setOpen = function (open) {
      navMobile.hidden = !open;
      burger.setAttribute('aria-expanded', String(open));
    };
    burger.addEventListener('click', function () { setOpen(navMobile.hidden); });
    navMobile.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 1000) setOpen(false); });
  }
})();

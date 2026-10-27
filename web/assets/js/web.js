/* Amazona Verse · comportamiento de la web: idioma ES/EN, menú móvil, videos diferidos, copiar, contacto. Compartido por todas las páginas. */
(function () {
  'use strict';
  var root = document.documentElement;
  var CFG = window.AV_WEB || {};
  var reduceMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var T = {
    es: { pause: 'Pausar video', play: 'Reproducir video', copied: 'Copiado', copyFail: 'No se pudo copiar: el texto quedó seleccionado; usa Ctrl+C o ⌘C.', menuOpen: 'Abrir menú', menuClose: 'Cerrar menú', sending: 'Enviando…', sent: 'Recibimos tu mensaje. Te contestamos pronto.', sendFail: 'No se pudo enviar. Copia el correo y escríbenos desde tu cuenta.' },
    en: { pause: 'Pause video', play: 'Play video', copied: 'Copied', copyFail: 'Could not copy: the text is selected; press Ctrl+C or ⌘C.', menuOpen: 'Open menu', menuClose: 'Close menu', sending: 'Sending…', sent: 'We got your message. We will reply soon.', sendFail: 'Could not send. Copy the email address and write to us from your account.' }
  };
  function lang() { return root.lang === 'en' ? 'en' : 'es'; }
  function t(k) { return T[lang()][k]; }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- Idioma ---------- */
  var ATTRS = ['alt', 'aria-label', 'title'];
  function setLang(l) {
    root.lang = l;
    document.querySelectorAll('[data-lang]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.lang === l)); });
    ATTRS.forEach(function (a) {
      document.querySelectorAll('[data-en-' + a + ']').forEach(function (el) {
        var keyEs = 'data-es-' + a;
        if (!el.hasAttribute(keyEs)) el.setAttribute(keyEs, el.getAttribute(a) || '');
        el.setAttribute(a, l === 'en' ? el.getAttribute('data-en-' + a) : el.getAttribute(keyEs));
      });
    });
    document.querySelectorAll('option[data-en]').forEach(function (o) {
      if (!o.dataset.es) o.dataset.es = o.textContent;
      o.textContent = l === 'en' ? o.dataset.en : o.dataset.es;
    });
    var og = document.querySelector('meta[property="og:locale"]'); if (og) og.content = l === 'en' ? 'en_US' : 'es_PR';
    updateMenuLabel(); updateVideoLabels();
    var pv = document.querySelector('#pitch video');
    if (pv && pv.textTracks) [].forEach.call(pv.textTracks, function (tt) { tt.mode = tt.language === l ? 'showing' : 'disabled'; });
    store('av-web-lang', l);
  }
  document.querySelectorAll('[data-lang]').forEach(function (b) { b.addEventListener('click', function () { setLang(b.dataset.lang); }); });

  /* ---------- Menú móvil ---------- */
  var nav = document.getElementById('nav'), menuBtn = document.getElementById('menu-btn');
  function updateMenuLabel() {
    if (!menuBtn) return;
    var open = menuBtn.getAttribute('aria-expanded') === 'true';
    menuBtn.setAttribute('aria-label', t(open ? 'menuClose' : 'menuOpen'));
    menuBtn.dataset.icon = open ? 'close' : 'menu';
  }
  function setMenu(open) { nav.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', String(open)); updateMenuLabel(); }
  if (nav && menuBtn) {
    menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });
  }

  /* ---------- Video: carga diferida, solo si el archivo existe; sin autoplay con movimiento reducido ---------- */
  var screens = [].slice.call(document.querySelectorAll('[data-video]'));
  function updateVideoLabels() {
    screens.forEach(function (s) {
      var btn = s.querySelector('.vid-btn'), v = s.querySelector('video'); if (!btn || !v) return;
      var playing = !v.paused;
      btn.querySelector('.vid-lbl').textContent = t(playing ? 'pause' : 'play');
      btn.dataset.icon = playing ? 'pause' : 'play';
    });
  }
  /* Los videos disponibles se listan en assets/video/videos.json (así no hay peticiones 404 mientras no existan). */
  var manifest = null;
  function getManifest() {
    if (!manifest) manifest = fetch('assets/video/videos.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; });
    return manifest;
  }
  var pesado = (window.matchMedia && window.matchMedia('(max-width: 899px)').matches) || (navigator.connection && navigator.connection.saveData);
  function prepare(s) {
    if (s.dataset.ready) return; s.dataset.ready = '1';
    if (s.hasAttribute('data-solo-escritorio') && pesado) return; // móvil: solo el póster, nada pesado arriba
    var v = s.querySelector('video'), btn = s.querySelector('.vid-btn');
    getManifest().then(function (m) {
      var entry = m && m[v.dataset.key];
      if (!entry) return; // sin video todavía: queda el póster
      var src = (entry.webm && v.canPlayType('video/webm; codecs="vp9"')) ? entry.webm : entry.mp4;
      if (!src) return;
      v.src = src; v.load();
      v.addEventListener('playing', function () { s.classList.add('is-playing'); updateVideoLabels(); });
      v.addEventListener('pause', updateVideoLabels);
      v.addEventListener('error', function () { s.classList.remove('is-playing'); btn.hidden = true; });
      btn.hidden = false;
      btn.addEventListener('click', function () {
        if (v.paused) { s.dataset.userPaused = ''; v.play().catch(function () {}); }
        else { s.dataset.userPaused = '1'; v.pause(); }
      });
      if (!reduceMQ.matches && s.dataset.visible === '1') v.play().catch(function () {});
      updateVideoLabels();
    });
  }
  /* Video pitch en Prensa: aparece solo cuando videos.json trae "pitch" (mp4, poster y subtítulos). */
  getManifest().then(function (m) {
    var e = m && m.pitch, fig = document.getElementById('pitch');
    if (!e || !e.mp4 || !fig) return;
    var v = fig.querySelector('video');
    if (e.poster) v.poster = e.poster;
    v.src = e.mp4;
    Object.keys(e.vtt || {}).forEach(function (l) {
      var tr = document.createElement('track');
      tr.kind = 'subtitles'; tr.srclang = l; tr.src = e.vtt[l];
      tr.label = l === 'en' ? 'English' : 'Español';
      if (l === lang()) tr.default = true;
      v.appendChild(tr);
    });
    fig.hidden = false;
  });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var s = en.target, v = s.querySelector('video');
        s.dataset.visible = en.isIntersecting ? '1' : '';
        if (en.isIntersecting) {
          prepare(s);
          if (v.src && v.paused && !s.dataset.userPaused && !reduceMQ.matches) v.play().catch(function () {});
        } else if (v && v.src && !v.paused) { v.pause(); }
      });
    }, { rootMargin: '200px 0px' });
    screens.forEach(function (s) { io.observe(s); });
  } else { screens.forEach(function (s) { s.dataset.visible = '1'; prepare(s); }); }

  /* ---------- ¿Dónde construirías? ---------- */
  var decide = document.getElementById('decide');
  if (decide) {
    decide.addEventListener('click', function (e) {
      var pick = e.target.closest('[data-pick]'), reset = e.target.closest('[data-reset]');
      if (pick) {
        var id = pick.dataset.pick;
        ['A', 'B'].forEach(function (k) {
          document.getElementById('res-' + k).hidden = k !== id;
          document.getElementById('card-' + k).classList.toggle('picked', k === id);
        });
        var res = document.getElementById('res-' + id);
        res.focus({ preventScroll: true });
        res.scrollIntoView({ behavior: reduceMQ.matches ? 'auto' : 'smooth', block: 'nearest' });
      }
      if (reset) {
        ['A', 'B'].forEach(function (k) { document.getElementById('res-' + k).hidden = true; document.getElementById('card-' + k).classList.remove('picked'); });
        var first = decide.querySelector('[data-pick="A"]'); if (first) first.focus();
      }
    });
  }

  /* ---------- Copiar (portapapeles con selección como respaldo) ---------- */
  function selectText(el) {
    try { var r = document.createRange(); r.selectNodeContents(el); var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); } catch (e) {}
  }
  function copyFrom(el, statusEl) {
    var text = el.innerText.trim();
    function ok() { if (statusEl) { statusEl.dataset.state = 'ok'; statusEl.textContent = t('copied'); setTimeout(function () { statusEl.textContent = ''; }, 2500); } }
    function fail() { selectText(el); if (statusEl) { statusEl.dataset.state = 'fail'; statusEl.textContent = t('copyFail'); } }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fail);
      else fail();
    } catch (e) { fail(); }
  }
  document.querySelectorAll('[data-copy-es]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var el = document.getElementById(lang() === 'en' ? btn.dataset.copyEn : btn.dataset.copyEs);
      copyFrom(el, btn.parentElement.querySelector('.copied'));
    });
  });
  /* Correo de contacto en texto (data-correo): se rellena desde AV_WEB.correo en cualquier página */
  document.querySelectorAll('[data-correo]').forEach(function (el) { if (CFG.correo) { el.textContent = CFG.correo; el.classList.remove('pending'); } });

  /* ---------- Contacto ---------- */
  var emailText = document.getElementById('email-text'), emailCopy = document.getElementById('email-copy');
  if (CFG.correo && emailText) {
    emailText.classList.remove('pending');
    emailText.textContent = CFG.correo;
    if (emailCopy) emailCopy.hidden = false;
    if (emailCopy) emailCopy.addEventListener('click', function () { copyFrom(emailText, emailCopy.parentElement.querySelector('.copied')); });
  }
  var form = document.getElementById('form-contacto'), formStatus = document.getElementById('form-status');
  if (form && CFG.formulario) {
    form.hidden = false;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      formStatus.textContent = t('sending');
      var data = new FormData(form), req;
      if (CFG.formulario === 'netlify') {
        req = fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data).toString() });
      } else {
        req = fetch(CFG.formulario, { method: 'POST', headers: { Accept: 'application/json' }, body: data });
      }
      req.then(function (r) {
        if (!r.ok) throw new Error(r.status);
        formStatus.textContent = t('sent'); form.reset();
      }).catch(function () { formStatus.textContent = t('sendFail'); });
    });
  }

  /* ---------- Arranque ---------- */
  var saved = store('av-web-lang');
  setLang(saved === 'en' ? 'en' : 'es');
})();

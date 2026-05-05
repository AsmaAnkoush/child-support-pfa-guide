/* ═══════════════════════════════════════════════════
   دليل الميسّرات والميسّرين — Hash-based SPA Router
   ═══════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Route → source HTML file ───────────────────── */
  var ROUTES = {
    '/':                    null,
    '/about':               null,
    '/conclusion':          null,
    '/principles':          'principles.html',
    '/group-management':    'group-management.html',
    '/group-procedures':    'group-procedures.html',
    '/emotions':            'emotions.html',
    '/group-interaction':   'group-interaction.html',
    '/pfa-approach':        'pfa.html',
    '/difficult-behaviors': 'difficult-behaviors.html',
    '/sessions':            'sessions.html',
    '/sessions/1':          'session-1.html',
    '/sessions/2':          'session-2.html',
    '/sessions/3':          'session-3.html',
    '/sessions/4':          'session-4.html',
    '/sessions/5':          'session-5.html',
    '/sessions/6':          'session-6.html',
  };

  /* ── Nav href → routes it makes "active" ────────── */
  var NAV_ACTIVE = {
    '#/':               ['/', '/about', ''],
    '#/conclusion':     ['/conclusion'],
    '#/principles':     ['/principles'],
    '#/group-management': ['/group-management', '/group-procedures',
                           '/group-interaction', '/difficult-behaviors'],
    '#/emotions':       ['/emotions'],
    '#/pfa-approach':   ['/pfa-approach'],
    '#/sessions':       ['/sessions', '/sessions/1', '/sessions/2', '/sessions/3', '/sessions/4', '/sessions/5', '/sessions/6'],
  };

  /* ── Reveal-class map for all pages ─────────────── */
  var REVEAL_MAP = [
    ['.ptl-block',         'ptl-visible'],
    ['.ptl-point',         'ptl-point-vis'],
    ['.gm-age-card',       'gm-age-visible'],
    ['.gm-practice',       'gm-practice-vis'],
    ['.gp-block',          'gp-visible'],
    ['.gp-point',          'gp-point-vis'],
    ['.em-card',           'em-card-vis'],
    ['.em-closing-card',   'em-closing-vis'],
    ['.gi-obs-card',       'gi-vis'],
    ['.gi-action-card',    'gi-vis'],
    ['.pfa-block',         'pfa-visible'],
    ['.pfa-point',         'pfa-point-vis'],
    ['.db-card',           'db-vis'],
    ['.sess-card',         'sess-vis'],
    ['.s1-activity',       's1-vis'],
    ['.s1-session-close',  's1-vis'],
    ['.s4-secret-key',     's1-vis'],
    ['.s6-congrats',       's1-vis'],
    ['.concl-card',        'concl-vis'],
  ];

  /* ── Shared CSS already present in index.html ───── */
  var SKIP_CSS = ['variables.css', '/style.css', 'responsive.css',
                  'fonts.googleapis', 'fonts.gstatic'];

  var homeView, pageView;
  var pageCache  = {};
  var loadedCSS  = {};

  /* ─────────────────── Helpers ─────────────────── */

  function getRoute() {
    var h = window.location.hash;
    if (!h || h === '#' || h === '#/') return '/';
    return h.slice(1);   /* '#/principles' → '/principles' */
  }

  function updateActiveNav(route) {
    document.querySelectorAll('.navbar-menu a, .mobile-drawer-nav a').forEach(function (a) {
      var href   = a.getAttribute('href') || '';
      var group  = NAV_ACTIVE[href];
      var active = group ? group.indexOf(route) !== -1 : false;
      a.classList.toggle('active', active);
    });
  }

  function injectCSS(href) {
    if (loadedCSS[href]) return;
    var link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
    loadedCSS[href] = true;
  }

  function loadPageCSS(doc) {
    doc.querySelectorAll('link[rel="stylesheet"]').forEach(function (link) {
      var href = link.getAttribute('href') || '';
      if (!href) return;
      for (var i = 0; i < SKIP_CSS.length; i++) {
        if (href.indexOf(SKIP_CSS[i]) !== -1) return;
      }
      injectCSS(href);
    });
  }

  function runPageInit(route, container) {
    /* ── Session 3: age-track tab switching ── */
    if (route === '/sessions/3') {
      container.querySelectorAll('.s3-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
          var activity = tab.closest('.s1-activity');
          var target   = tab.getAttribute('data-track');

          activity.querySelectorAll('.s3-tab').forEach(function (t) {
            var active = t.getAttribute('data-track') === target;
            t.classList.toggle('s3-tab--active', active);
            t.setAttribute('aria-selected', active ? 'true' : 'false');
          });

          activity.querySelectorAll('.s3-track').forEach(function (panel) {
            panel.classList.toggle('s3-track--hidden', panel.getAttribute('data-track') !== target);
          });

          activity.querySelectorAll('[data-title-for], [data-duration-for]').forEach(function (el) {
            var forTrack = el.getAttribute('data-title-for') || el.getAttribute('data-duration-for');
            el.style.display = (forTrack === target) ? '' : 'none';
          });
        });
      });
    }
  }

  function runScrollReveal(container) {
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    REVEAL_MAP.forEach(function (pair) {
      var sel = pair[0], vis = pair[1];
      container.querySelectorAll(sel).forEach(function (el, i) {
        if (!('IntersectionObserver' in window)) {
          el.classList.add(vis);
          return;
        }
        new IntersectionObserver(function (entries, obs) {
          if (!entries[0].isIntersecting) return;
          obs.disconnect();
          setTimeout(function () { el.classList.add(vis); }, reduced ? 0 : i * 80);
        }, { threshold: 0.06 }).observe(el);
      });
    });
  }

  /* ─────────────────── View rendering ──────────── */

  function showHome(scrollTarget) {
    pageView.style.display = 'none';
    pageView.innerHTML = '';
    homeView.style.display = '';
    updateActiveNav('/');
    if (scrollTarget) {
      setTimeout(function () {
        var el = document.querySelector(scrollTarget);
        if (!el) return;
        var navbar = document.querySelector('.navbar');
        var off    = navbar ? navbar.offsetHeight : 0;
        var top    = el.getBoundingClientRect().top + window.pageYOffset - off - 12;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }, 60);
    } else {
      window.scrollTo(0, 0);
    }
  }

  function showPage(doc, route) {
    var main = doc.querySelector('main');
    if (!main) { showHome(); return; }

    loadPageCSS(doc);

    /* Fade transition */
    pageView.style.opacity = '0';
    pageView.innerHTML = main.outerHTML;
    homeView.style.display = 'none';
    pageView.style.display  = '';
    window.scrollTo(0, 0);
    updateActiveNav(route);

    /* Two rAF frames so browser paints the opacity:0 state first */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        pageView.style.opacity = '1';
        runScrollReveal(pageView);
        runPageInit(route, pageView);
      });
    });
  }

  function loadPage(route, filename) {
    /* Use cached document when available */
    if (pageCache[filename]) {
      showPage(pageCache[filename], route);
      return;
    }

    /* Show loading placeholder */
    homeView.style.display = 'none';
    pageView.style.opacity = '1';
    pageView.style.display = '';
    pageView.innerHTML =
      '<div style="min-height:60vh;display:flex;align-items:center;' +
      'justify-content:center;"><div class="router-spinner"></div></div>';
    updateActiveNav(route);

    fetch(filename)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        pageCache[filename] = doc;
        showPage(doc, route);
      })
      .catch(function (err) {
        pageView.innerHTML =
          '<div class="container" style="padding:80px 0;text-align:center;direction:rtl;">' +
          '<p style="color:var(--color-text-light,#94a3b8);font-size:1.1rem;">' +
          'تعذّر تحميل الصفحة.</p></div>';
        console.error('[Router] fetch error for ' + filename + ':', err);
      });
  }

  /* ─────────────────── Route handler ───────────── */

  function handleRoute() {
    var route = getRoute();

    /* About → scroll to guide-about section on home */
    if (route === '/about') {
      showHome('.guide-about-section');
      return;
    }

    /* Conclusion → scroll to خاتمة section on home */
    if (route === '/conclusion') {
      showHome('#conclusion-home');
      return;
    }

    /* No mapped file → show home */
    if (!ROUTES.hasOwnProperty(route) || ROUTES[route] === null) {
      showHome();
      return;
    }

    loadPage(route, ROUTES[route]);
  }

  /* ─────────────────── Init ─────────────────────── */

  function init() {
    homeView = document.getElementById('home-view');
    pageView = document.getElementById('page-view');
    if (!homeView || !pageView) {
      console.warn('[Router] #home-view or #page-view not found — routing disabled.');
      return;
    }

    /* Apply transition style once */
    pageView.style.transition = 'opacity 0.22s ease';

    /* Inject spinner CSS */
    var style = document.createElement('style');
    style.textContent =
      '.router-spinner{width:34px;height:34px;border-radius:50%;' +
      'border:3px solid rgba(91,168,90,.18);' +
      'border-top-color:var(--color-primary-green,#5BA85A);' +
      'animation:rt-spin .75s linear infinite}' +
      '@keyframes rt-spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(style);

    window.addEventListener('hashchange', handleRoute);
    handleRoute();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

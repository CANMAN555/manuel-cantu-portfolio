// Motion for the portfolio: page transitions, the header, a scroll progress bar and reveal-on-scroll for anything marked data-reveal.
// Loaded in <head> so the "motion" class lands before the page paints. If anything goes wrong,
// the class comes off again and the page shows as plain, fully visible content.
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var animate = !reduce && "IntersectionObserver" in window;
  var STAGGER = 80;          // ms between siblings that enter together
  var MAX_STEPS = 8;         // cap so long lists never wait too long
  var TIME = { base: 900, image: 1200, line: 1400 };

  var INTRO_TIME = 900;      // first-visit cover, matches --page-intro-time
  var WIPE_TIME = 600;       // panel up when leaving, matches --page-wipe-time
  var LIFT_TIME = 700;       // cover off when arriving, matches --page-lift-time
  var nativeTransitions = "CSSViewTransitionRule" in window;
  var startDelay = 0;        // reveals wait until a cover has mostly lifted

  if (animate) root.classList.add("motion");
  root.classList.add("nav-js");   // the header upgrade runs with or without reduced motion

  // sessionStorage can be blocked (private modes, strict settings); then transitions simply don't play.
  function store(key, value) {
    try {
      if (value === undefined) return window.sessionStorage.getItem(key);
      if (value === null) window.sessionStorage.removeItem(key);
      else window.sessionStorage.setItem(key, value);
    } catch (err) { return null; }
  }

  // ---------- Page transitions: decided here in <head>, so the cover is there on the first paint ----------
  if (!reduce) {
    var arrived = store("mc-pt-arrive");
    store("mc-pt-arrive", null);
    if (arrived && Date.now() - Number(arrived) < 4000) {
      cover("pt-arrive", LIFT_TIME);
      startDelay = 350;
    } else if (!store("mc-intro-seen")) {
      store("mc-intro-seen", "1");
      if (store("mc-intro-seen")) {   // only play it if we could remember it, so it never repeats every page
        cover("pt-intro", INTRO_TIME);
        startDelay = 600;
      }
    }
  }

  function cover(name, time) {
    root.classList.add(name);
    window.setTimeout(function () { root.classList.remove(name); }, time + 80);
  }

  // A page arriving through the fallback panel shouldn't also run a native transition.
  window.addEventListener("pagereveal", function (e) {
    if (e.viewTransition && root.classList.contains("pt-arrive")) e.viewTransition.skipTransition();
  });

  // Back and forward can restore a page from memory exactly as it was left, panel and all. Clear it.
  window.addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    leaving = false;
    root.classList.remove("pt-intro", "pt-arrive");
    var old = document.querySelectorAll(".pt-panel");
    for (var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]);
  });

  // Fallback for browsers without View Transitions: wipe a panel up, then go.
  // Keyboard Enter on a link fires this same click, so keyboard users get the same path.
  var leaving = false;
  if (!reduce && !nativeTransitions) document.addEventListener("click", leave);

  function leave(e) {
    if (leaving || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var link = e.target.closest ? e.target.closest("a[href]") : null;
    if (!link) return;
    if (link.target && link.target !== "_self") return;                 // new tab or window
    if (link.hasAttribute("download")) return;                           // the resume PDF
    if (link.protocol !== "http:" && link.protocol !== "https:") return; // mailto:, tel:
    if (link.origin !== location.origin) return;                         // other sites
    if (/\.pdf$/i.test(link.pathname)) return;
    if (link.pathname === location.pathname && link.search === location.search && link.hash) return; // same-page anchor

    e.preventDefault();
    leaving = true;
    var href = link.href;
    var panel = document.createElement("div");
    panel.className = "pt-panel";
    panel.setAttribute("aria-hidden", "true");
    document.body.appendChild(panel);
    void panel.offsetWidth;
    panel.classList.add("is-covering");

    var gone = false;
    function go() {
      if (gone) return;
      gone = true;
      store("mc-pt-arrive", String(Date.now()));
      window.location.href = href;
      // If the browser stays on this page for any reason, lift the panel back off.
      window.setTimeout(function () {
        if (!document.body.contains(panel)) return;
        leaving = false;
        store("mc-pt-arrive", null);
        panel.classList.remove("is-covering");
        window.setTimeout(function () { if (panel.parentNode) panel.parentNode.removeChild(panel); }, WIPE_TIME + 50);
      }, 4000);
    }
    panel.addEventListener("transitionend", go);
    window.setTimeout(go, WIPE_TIME + 100);
  }

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    try {
      header();
    } catch (err) {
      root.classList.remove("nav-js", "menu-open");
    }
    try {
      progressBar();
      addLines();
      if (animate) {
        if (startDelay) window.setTimeout(observe, startDelay);
        else observe();
      }
    } catch (err) {
      root.classList.remove("motion");
    }
  });

  // ---------- Header: scroll states, hide on scroll down, phone menu, skip link ----------
  function header() {
    var nav = document.getElementById("nav");
    var tabs = nav && nav.querySelector(".tabs");
    if (!tabs) { root.classList.remove("nav-js"); return; }
    var brand = nav.querySelector(".brand");
    var links = tabs.querySelectorAll("a");
    var phone = window.matchMedia("(max-width: 900px)");

    // Skip to content: move keyboard focus into the page, not just the scroll position.
    var skip = document.querySelector(".skip");
    var main = document.getElementById("main");
    if (skip && main) {
      skip.addEventListener("click", function () {
        if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
        window.setTimeout(function () { main.focus({ preventScroll: true }); }, 0);
      });
    }

    // Scrolled look past 40px; hide going down, return going up.
    var lastY = Math.max(0, window.scrollY);
    var queued = false;
    function update() {
      queued = false;
      var y = Math.max(0, window.scrollY);
      nav.classList.toggle("is-scrolled", y > 40);
      if (root.classList.contains("menu-open")) { lastY = y; return; }
      var moved = y - lastY;
      if (y < 120 || moved < -6) nav.classList.remove("is-hidden");
      else if (moved > 6 && !nav.contains(document.activeElement)) nav.classList.add("is-hidden");
      if (Math.abs(moved) > 6 || y < 120) lastY = y;
    }
    window.addEventListener("scroll", function () {
      if (!queued) { queued = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    update();
    // A keyboard user tabbing back up to the header always finds it in view.
    nav.addEventListener("focusin", function () { nav.classList.remove("is-hidden"); });

    // Phone menu.
    if (!tabs.id) tabs.id = "site-menu";
    for (var i = 0; i < links.length; i++) links[i].style.setProperty("--i", i);
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "menu-btn";
    btn.setAttribute("aria-controls", tabs.id);
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-label", "Open menu");
    btn.innerHTML = '<span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>';
    nav.querySelector(".nav-inner").appendChild(btn);

    var inerted = [];
    function isOpen() { return root.classList.contains("menu-open"); }
    function open() {
      // Keep the page from shifting sideways when its scrollbar goes away.
      var gap = window.innerWidth - root.clientWidth;
      if (gap > 0) document.body.style.paddingRight = gap + "px";
      root.classList.add("menu-open");
      nav.classList.remove("is-hidden");
      btn.setAttribute("aria-expanded", "true");
      btn.setAttribute("aria-label", "Close menu");
      // Everything outside the header is out of reach while the menu is open.
      var kids = document.body.children;
      for (var k = 0; k < kids.length; k++) {
        var el = kids[k];
        if (el !== nav && !el.inert && el.tagName !== "SCRIPT") { el.inert = true; inerted.push(el); }
      }
    }
    function close(giveFocusBack) {
      if (!isOpen()) return;
      root.classList.remove("menu-open");
      document.body.style.paddingRight = "";
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-label", "Open menu");
      inerted.forEach(function (el) { el.inert = false; });
      inerted = [];
      if (giveFocusBack) btn.focus();
    }
    btn.addEventListener("click", function () { if (isOpen()) close(false); else open(); });
    tabs.addEventListener("click", function (e) { if (e.target.closest("a")) close(false); });

    // Escape closes. Tab and Shift+Tab loop through the logo, the links and the close button.
    document.addEventListener("keydown", function (e) {
      if (!isOpen()) return;
      if (e.key === "Escape" || e.key === "Esc") { e.preventDefault(); close(true); return; }
      if (e.key !== "Tab") return;
      var stops = [brand].concat(Array.prototype.slice.call(links), [btn]).filter(Boolean);
      var first = stops[0], last = stops[stops.length - 1];
      var at = stops.indexOf(document.activeElement);
      if (e.shiftKey && (at <= 0)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (at === -1 || at === stops.length - 1)) { e.preventDefault(); first.focus(); }
    });

    // Turning a phone sideways into a wide screen, or coming back with the back button, closes it.
    var onWidth = function () { if (!phone.matches) close(false); };
    if (phone.addEventListener) phone.addEventListener("change", onWidth);
    else if (phone.addListener) phone.addListener(onWidth);
    window.addEventListener("pageshow", function (e) { if (e.persisted) { close(false); update(); } });
  }

  // A 2px bar across the top that fills as the page scrolls.
  function progressBar() {
    var bar = document.createElement("div");
    bar.className = "scroll-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.insertBefore(bar, document.body.firstChild);

    var queued = false;
    function update() {
      queued = false;
      var max = root.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.transform = "scaleX(" + p + ")";
    }
    function queue() {
      if (!queued) { queued = true; window.requestAnimationFrame(update); }
    }
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    update();
  }

  // The thin line under headings. Without animation it simply shows, already drawn.
  function addLines() {
    var heads = document.querySelectorAll('[data-reveal="heading"], [data-reveal="line"]');
    for (var i = 0; i < heads.length; i++) {
      var line = document.createElement("span");
      line.className = "reveal-line";
      line.setAttribute("aria-hidden", "true");
      heads[i].appendChild(line);
    }
  }

  function observe() {
    var items = document.querySelectorAll("[data-reveal]");
    var io = new IntersectionObserver(function (entries) {
      // Group what entered together by parent, so siblings follow one another in page order.
      var groups = [];
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        var parent = entry.target.parentNode;
        var group = null;
        for (var g = 0; g < groups.length; g++) if (groups[g].parent === parent) group = groups[g];
        if (!group) { group = { parent: parent, els: [] }; groups.push(group); }
        group.els.push(entry.target);
      });
      groups.forEach(function (group) {
        group.els.sort(function (a, b) {
          return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
        });
        group.els.forEach(function (el, i) { reveal(el, Math.min(i, MAX_STEPS) * STAGGER); });
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });

    for (var i = 0; i < items.length; i++) io.observe(items[i]);
  }

  // Each element animates once. When it's finished, its motion styles are dropped
  // so the site's own hover effects work exactly as before.
  function reveal(el, delay) {
    var kind = el.getAttribute("data-reveal");
    var time = kind === "image" ? TIME.image : kind === "heading" || kind === "line" ? TIME.line : TIME.base;
    if (kind === "image") {
      el.classList.add("is-armed");   // jump to fully clipped with no transition
      void el.offsetWidth;            // let the browser apply that before the wipe starts
    }
    if (delay) el.style.transitionDelay = delay + "ms";
    el.classList.add("is-revealed");
    window.setTimeout(function () {
      el.classList.add("reveal-done");
      el.style.transitionDelay = "";
    }, delay + time + 150);
  }
})();

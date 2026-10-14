// Motion for the portfolio: page transitions, a scroll progress bar and reveal-on-scroll for anything marked data-reveal.
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

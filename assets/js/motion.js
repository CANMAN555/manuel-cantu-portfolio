// Motion for the portfolio: a scroll progress bar and reveal-on-scroll for anything marked data-reveal.
// Loaded in <head> so the "motion" class lands before the page paints. If anything goes wrong,
// the class comes off again and the page shows as plain, fully visible content.
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var animate = !reduce && "IntersectionObserver" in window;
  var STAGGER = 80;          // ms between siblings that enter together
  var MAX_STEPS = 8;         // cap so long lists never wait too long
  var TIME = { base: 900, image: 1200, line: 1400 };

  if (animate) root.classList.add("motion");

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    try {
      progressBar();
      addLines();
      if (animate) observe();
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

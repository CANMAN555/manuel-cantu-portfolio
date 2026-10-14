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
      hero();
    } catch (err) { /* the hero simply stays as written */ }
    try {
      progressBar();
      addLines();
      if (animate) {
        if (startDelay) window.setTimeout(safeObserve, startDelay);
        else observe();
      }
    } catch (err) {
      root.classList.remove("motion");
      finishCounts();
    }
  });
  function safeObserve() {
    try { observe(); } catch (err) { root.classList.remove("motion"); finishCounts(); }
  }
  // Printing should never catch a number mid-count.
  window.addEventListener("beforeprint", finishCounts);

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

  // ---------- Home hero ----------
  function hero() {
    var section = document.querySelector(".hero");
    if (!section) return;
    var fine = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 901px)");

    // Name: words become masks, letters rise from behind them.
    var h1 = section.querySelector("h1");
    if (h1 && animate) {
      var text = h1.textContent;
      var words = text.split(" ");
      var holder = document.createElement("span");
      holder.setAttribute("aria-hidden", "true");
      var n = 0;
      words.forEach(function (word, w) {
        var mask = document.createElement("span");
        mask.className = "hw";
        for (var c = 0; c < word.length; c++) {
          var ch = document.createElement("span");
          ch.className = "hc";
          ch.textContent = word.charAt(c);
          ch.style.setProperty("--ci", n++);
          mask.appendChild(ch);
        }
        holder.appendChild(mask);
        if (w < words.length - 1) holder.appendChild(document.createTextNode(" "));
      });
      h1.setAttribute("aria-label", text);
      h1.textContent = "";
      h1.appendChild(holder);
      h1.classList.add("is-split");

      // The name goes first; the rest fades up in order once it's mostly in.
      var order = [h1].concat(Array.prototype.slice.call(
        section.querySelectorAll(".hero-text > .kicker, .hero-text > .tagline, .hero-text > .lede, .hero-text > .actions, .hero-text > .mission-line")));
      order.forEach(function (el) { el.classList.add("hero-seq"); });
      window.setTimeout(function () {
        order.forEach(function (el, i) { reveal(el, i === 0 ? 0 : 420 + (i - 1) * 130); });
      }, startDelay + 100);
    }

    // Headshot: wrap it so its terracotta ring can sit behind it and both can drift together.
    var photo = section.querySelector(".glance-photo");
    if (photo) {
      var wrap = document.createElement("div");
      wrap.className = "photo-wrap";
      var frame = document.createElement("span");
      frame.className = "photo-frame";
      frame.setAttribute("aria-hidden", "true");
      photo.parentNode.insertBefore(wrap, photo);
      wrap.appendChild(photo);
      wrap.appendChild(frame);

      if (!reduce) {
        // Parallax: across the scroll that takes the photo off screen, it trails the page by 40px in all.
        var queued = false, shift = 0;
        var drift = function () {
          queued = false;
          // Where the photo would sit without the drift, measured to the point it slides under the header.
          var end = wrap.getBoundingClientRect().bottom - shift + window.scrollY - 70;
          var p = end > 0 ? Math.min(1, Math.max(0, window.scrollY / end)) : 0;
          shift = -16 + 40 * p;
          wrap.style.transform = "translate3d(0," + shift.toFixed(1) + "px,0)";
        };
        var queue = function () { if (!queued) { queued = true; window.requestAnimationFrame(drift); } };
        window.addEventListener("scroll", queue, { passive: true });
        window.addEventListener("resize", queue);
        drift();

        // The ring follows the mouse a little, up to 12px, on desktop only.
        var mx = 0, my = 0, moving = false;
        window.addEventListener("mousemove", function (e) {
          if (!fine.matches) return;
          mx = (e.clientX / window.innerWidth - 0.5) * 2;
          my = (e.clientY / window.innerHeight - 0.5) * 2;
          if (!moving) {
            moving = true;
            window.requestAnimationFrame(function () {
              moving = false;
              frame.style.transform = "translate3d(" + (8 + mx * 12).toFixed(1) + "px," + (8 + my * 12).toFixed(1) + "px,0)";
            });
          }
        }, { passive: true });
      }
    }

    // Buttons: add the arrow, and on desktop a gentle pull toward the cursor (6px at most).
    var ARROWS = {
      right: '<svg width="16" height="10" viewBox="0 0 16 10" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M0 5h14.5M10.5 1l4 4-4 4"/></svg>',
      down: '<svg width="10" height="14" viewBox="0 0 10 14" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M5 0v12.5M1 8.5l4 4 4-4"/></svg>'
    };
    var buttons = section.querySelectorAll(".hero-text .actions .btn");
    for (var b = 0; b < buttons.length; b++) {
      var btn = buttons[b];
      var dir = btn.hasAttribute("download") ? "down" : "right";
      var arrow = document.createElement("span");
      arrow.className = "btn-arrow to-" + dir;
      arrow.setAttribute("aria-hidden", "true");
      arrow.innerHTML = ARROWS[dir];
      btn.appendChild(arrow);
      if (!reduce) magnet(btn);
    }
    function magnet(el) {
      el.addEventListener("mousemove", function (e) {
        if (!fine.matches) return;
        var r = el.getBoundingClientRect();
        var x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        var y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        el.style.setProperty("--mx", (Math.max(-1, Math.min(1, x)) * 6).toFixed(1) + "px");
        el.style.setProperty("--my", (Math.max(-1, Math.min(1, y)) * 6).toFixed(1) + "px");
      });
      el.addEventListener("mouseleave", function () {
        el.style.removeProperty("--mx");
        el.style.removeProperty("--my");
      });
    }

    // Scroll cue above the numbers.
    var results = section.querySelector(".results");
    if (results && results.parentNode) {
      results.parentNode.classList.add("results-wrap");
      var cue = document.createElement("div");
      cue.className = "scroll-cue";
      cue.setAttribute("aria-hidden", "true");
      cue.innerHTML = '<span class="scroll-cue-label">Scroll</span><span class="scroll-cue-line"><i></i></span>';
      results.parentNode.insertBefore(cue, results);
    }
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

  // ---------- Number tiles: count up from 0 once, keeping "~", "+" and commas exactly as written ----------
  var counters = [];
  function prepCounts() {
    var nums = document.querySelectorAll("[data-count]");
    for (var i = 0; i < nums.length; i++) {
      var el = nums[i];
      var text = el.textContent;
      var parts = text.match(/^(\D*)([\d,]+)(\D*)$/);
      var target = Number(el.getAttribute("data-count"));
      if (!parts || !isFinite(target)) continue;   // anything unexpected stays exactly as written
      var c = { el: el, text: text, before: parts[1], after: parts[3], target: target, commas: parts[2].indexOf(",") > -1, done: false };
      counters.push(c);
      el.textContent = c.before + "0" + c.after;
    }
  }
  function format(c, n) {
    return c.before + (c.commas ? n.toLocaleString("en-US") : String(n)) + c.after;
  }
  function countUp(el, delay) {
    var c = null;
    for (var i = 0; i < counters.length; i++) if (counters[i].el === el) c = counters[i];
    if (!c || c.done || c.running) return;
    c.running = true;
    var DURATION = 1800, start = 0;
    function frame(now) {
      if (c.done) return;
      if (!start) start = now;
      var t = Math.min(1, (now - start) / DURATION);
      var eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);   // ease-out-expo
      if (t === 1) { finish(c); return; }
      c.el.textContent = format(c, Math.round(c.target * eased));
      window.requestAnimationFrame(frame);
    }
    window.setTimeout(function () { window.requestAnimationFrame(frame); }, delay);
  }
  function finish(c) {
    c.done = true;
    c.el.textContent = c.text;   // always land on the original text, character for character
  }
  function finishCounts() {
    counters.forEach(finish);
  }

  function observe() {
    prepCounts();
    var items = document.querySelectorAll("[data-reveal]:not(.hero-seq)");
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
    var num = el.querySelector("[data-count]");
    if (num) countUp(num, delay + 150);
    window.setTimeout(function () {
      el.classList.add("reveal-done");
      el.style.transitionDelay = "";
    }, delay + time + 150);
  }
})();

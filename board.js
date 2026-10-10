// Split-flap board: turns each row's text into letter cells and flips them into place.
(function () {
  var CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function buildRow(row, cols) {
    var cells = new Array(cols).fill(null).map(function () { return { ch: " ", tone: "" }; });
    if (row.dataset.segs) {
      JSON.parse(row.dataset.segs).forEach(function (seg) {
        for (var i = 0; i < seg[1].length && seg[0] + i < cols; i++) {
          cells[seg[0] + i] = { ch: seg[1][i], tone: seg[2] || "" };
        }
      });
    } else {
      var text = row.dataset.text || "";
      var start = Math.max(0, Math.floor((cols - text.length) / 2));
      for (var i = 0; i < text.length && start + i < cols; i++) {
        cells[start + i] = { ch: text[i], tone: row.dataset.tone || "" };
      }
    }
    row.setAttribute("aria-label", row.textContent.trim());
    row.textContent = "";
    var spans = cells.map(function (c) {
      var s = document.createElement("span");
      s.className = "cell" + (c.tone ? " " + c.tone : "");
      s.setAttribute("aria-hidden", "true");
      s.dataset.final = c.ch;
      s.textContent = reduceMotion ? c.ch : " ";
      row.appendChild(s);
      return s;
    });
    return spans;
  }

  function flip(cell, delay) {
    var target = cell.dataset.final;
    if (target === " ") return;
    var steps = 4 + Math.floor(Math.random() * 6);
    setTimeout(function tick() {
      if (steps-- <= 0) {
        cell.textContent = target;
        cell.classList.remove("turning");
        return;
      }
      cell.textContent = target === "•" ? "•" : CHARS[1 + Math.floor(Math.random() * (CHARS.length - 1))];
      cell.classList.remove("turning");
      void cell.offsetWidth;
      cell.classList.add("turning");
      setTimeout(tick, 70);
    }, delay);
  }

  function animate(cells) {
    cells.forEach(function (cell, i) { flip(cell, (i % 30) * 25 + Math.random() * 120); });
  }

  function whenVisible(el, fn) {
    if (reduceMotion || !("IntersectionObserver" in window)) { fn(); return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { io.disconnect(); fn(); }
    }, { threshold: 0.3 });
    io.observe(el);
  }

  document.querySelectorAll(".board-face").forEach(function (face) {
    var cols = parseInt(face.dataset.cols, 10);
    // On narrow screens the opening board uses fewer, bigger letters and splits long lines.
    if (face.dataset.narrowCols && face.clientWidth < 520) {
      cols = parseInt(face.dataset.narrowCols, 10);
      face.querySelectorAll(".flap-row[data-split]").forEach(function (row) {
        row.dataset.split.split("|").forEach(function (part, i) {
          var r = i === 0 ? row : row.parentNode.insertBefore(row.cloneNode(false), row.nextSibling);
          r.removeAttribute("data-split");
          r.dataset.text = part;
          r.textContent = part;
          row = r;
        });
      });
      face.querySelectorAll(".flap-row[data-segs]").forEach(function (row) {
        var segs = JSON.parse(row.dataset.segs);
        if (segs.length === 1) {
          segs[0][0] = Math.max(0, Math.min(2, cols - segs[0][1].length));
          row.dataset.segs = JSON.stringify(segs);
        }
      });
    }
    face.style.setProperty("--cols", cols);
    var all = [];
    face.querySelectorAll(".flap-row").forEach(function (row) { all = all.concat(buildRow(row, cols)); });
    if (!reduceMotion) whenVisible(face, function () { animate(all); });
  });

  // Number tiles in Results
  document.querySelectorAll(".digits").forEach(function (box) {
    var text = box.dataset.digits;
    box.setAttribute("aria-label", text);
    box.textContent = "";
    var cells = text.split("").map(function (ch) {
      var s = document.createElement("span");
      s.className = "cell";
      s.setAttribute("aria-hidden", "true");
      s.dataset.final = ch;
      s.textContent = reduceMotion ? ch : " ";
      box.appendChild(s);
      return s;
    });
    if (!reduceMotion) whenVisible(box, function () {
      cells.forEach(function (c, i) {
        if (/[0-9]/.test(c.dataset.final)) {
          var n = 6 + i * 2;
          (function spin() {
            if (n-- <= 0) { c.textContent = c.dataset.final; return; }
            c.textContent = String(Math.floor(Math.random() * 10));
            c.classList.remove("turning"); void c.offsetWidth; c.classList.add("turning");
            setTimeout(spin, 80);
          })();
        } else {
          setTimeout(function () { c.textContent = c.dataset.final; }, 300);
        }
      });
    });
  });
})();

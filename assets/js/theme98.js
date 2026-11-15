/* hugo-theme-98 — tiny window manager. Everything degrades gracefully without JS. */
(function () {
  'use strict';
  var doc = document;

  /* ---- Tray clock ---- */
  var clock = doc.getElementById('tray-clock');
  function tick() {
    if (!clock) return;
    var now = new Date();
    clock.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    clock.setAttribute('datetime', now.toISOString());
    clock.title = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
  tick();
  setInterval(tick, 10000);

  /* ---- Start menu (a <details>; JS only adds outside-click / Escape) ---- */
  var start = doc.querySelector('.start-menu-wrap');
  if (start) {
    doc.addEventListener('click', function (e) {
      if (start.open && !start.contains(e.target)) start.open = false;
    });
  }

  /* ---- Windows + taskbar buttons ---- */
  var tasks = doc.getElementById('taskbar-tasks');
  var wins = Array.prototype.slice.call(doc.querySelectorAll('.window[data-task]'));

  function setActive(win) {
    wins.forEach(function (w) {
      var on = w === win && !w.hidden;
      var bar = w.querySelector('.title-bar');
      if (bar) bar.classList.toggle('inactive', !on);
      if (w._task) {
        w._task.classList.toggle('is-pressed', on);
        w._task.setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    });
  }

  // The window to activate after one goes away: the front-most floating one, else the first.
  function topVisible() {
    var best = null;
    wins.forEach(function (w) {
      if (!w.hidden && (!best || (w._z || 0) > (best._z || 0))) best = w;
    });
    return best;
  }

  function syncMax() {
    doc.documentElement.classList.toggle('has-maximized', !!doc.querySelector('.window.is-maximized:not([hidden])'));
  }

  // An invisible stand-in that keeps a window's spot in the page layout, so the other
  // windows don't jump when it floats, minimizes or closes.
  function holdSpot(win, r) {
    if (win._ph) return;
    r = r || win.getBoundingClientRect();
    var ph = doc.createElement('div');
    ph.className = 'window-placeholder';
    ph.setAttribute('aria-hidden', 'true');
    ph.style.width = r.width + 'px';
    ph.style.height = r.height + 'px';
    win.parentNode.insertBefore(ph, win.nextSibling);
    win._ph = ph;
  }

  // Windows 2000's minimize/restore animation: a title-bar-coloured box flies between
  // the window's title bar and its taskbar button.
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function zoom(from, to, done) {
    if (reduceMotion.matches || !from || !to || !from.width || !to.width) { if (done) done(); return; }
    var g = doc.createElement('div');
    g.className = 'zoom-ghost';
    g.setAttribute('aria-hidden', 'true');
    function at(r) {
      g.style.left = r.left + 'px'; g.style.top = r.top + 'px';
      g.style.width = r.width + 'px'; g.style.height = r.height + 'px';
    }
    at(from);
    doc.body.appendChild(g);
    g.getBoundingClientRect();   // commit the start position so the move animates
    at(to);
    setTimeout(function () { g.remove(); if (done) done(); }, 230);
  }

  function hideWin(win) {
    holdSpot(win);
    win.hidden = true;
    syncMax();
  }

  function minimize(win) {
    if (!win._task) { win.classList.toggle('is-collapsed'); return; }
    var bar = win.querySelector('.title-bar');
    var from = bar && bar.getBoundingClientRect();
    hideWin(win);
    setActive(topVisible());
    zoom(from, win._task.getBoundingClientRect());
  }

  function restore(win) {
    // A window still in the page layout takes its spot back from the stand-in.
    if (!win.classList.contains('is-floating') && win._ph) { win._ph.remove(); win._ph = null; }
    win.style.visibility = 'hidden';
    win.hidden = false;
    syncMax();
    setActive(win);
    raise(win);
    var bar = win.querySelector('.title-bar');
    zoom(win._task && win._task.getBoundingClientRect(), bar && bar.getBoundingClientRect(), function () {
      win.style.visibility = '';
    });
    if (!win.classList.contains('is-floating') && !win.classList.contains('is-maximized')) {
      win.scrollIntoView({ block: 'nearest' });
    }
  }

  function toggleMax(win) {
    var btn = win.querySelector('.title-bar-controls [aria-label="Maximize"], .title-bar-controls [aria-label="Restore"]');
    if (!btn) return;
    var max = win.classList.toggle('is-maximized');
    btn.setAttribute('aria-label', max ? 'Restore' : 'Maximize');
    syncMax();
  }

  // Close really closes: the window and its taskbar button go away; its spot stays empty.
  // Reopen it from the desktop icons or the Start menu (or reload the page).
  function close(win) {
    hideWin(win);
    if (win._task) { win._task.remove(); win._task = null; }
    wins = wins.filter(function (w) { return w !== win; });
    setActive(topVisible());
  }

  if (tasks) {
    wins.forEach(function (win) {
      var b = doc.createElement('button');
      b.type = 'button';
      b.className = 'task-button';
      b.title = win.getAttribute('data-task');
      var icon = win.querySelector('.title-bar-text img');
      if (icon) { var i = icon.cloneNode(); i.alt = ''; b.appendChild(i); }
      var s = doc.createElement('span');
      s.textContent = win.getAttribute('data-task');
      b.appendChild(s);
      b.addEventListener('click', function () {
        if (win.hidden) restore(win);
        else if (b.classList.contains('is-pressed')) minimize(win);
        else { setActive(win); raise(win); }
      });
      win._task = b;
      tasks.appendChild(b);
    });
  }
  setActive(wins[0]);

  doc.addEventListener('mousedown', function (e) {
    var win = e.target.closest('.window[data-task]');
    if (win) setActive(win);
  });

  doc.addEventListener('click', function (e) {
    var btn = e.target.closest('.title-bar-controls button');
    if (btn) {
      var win = btn.closest('.window');
      var label = btn.getAttribute('aria-label');
      if (label === 'Minimize') minimize(win);
      else if (label === 'Maximize' || label === 'Restore') toggleMax(win);
      else if (label === 'Close') close(win);
      return;
    }
    var dismiss = e.target.closest('[data-dismiss]');
    if (dismiss) { close(dismiss.closest('.window')); return; }

    var row = e.target.closest('table.interactive tbody tr');
    if (row) {
      var sel = row.parentNode.querySelectorAll('tr.highlighted');
      for (var k = 0; k < sel.length; k++) sel[k].classList.remove('highlighted');
      row.classList.add('highlighted');
    }
  });

  doc.addEventListener('dblclick', function (e) {
    var row = e.target.closest('tr[data-href]');
    if (row) { location.href = row.getAttribute('data-href'); return; }
    var bar = e.target.closest('.title-bar');
    if (bar && !e.target.closest('.title-bar-controls')) toggleMax(bar.closest('.window'));
  });

  /* ---- Move windows by the title bar, resize from the edges (desktop with a mouse only).
     A window leaves the page layout the first time it's moved or resized; an invisible placeholder
     keeps its spot so nothing else jumps. Positions reset on every page load. ---- */
  var canMove = window.matchMedia('(min-width: 721px) and (pointer: fine)');
  var MIN_W = 260, MIN_H = 140, zTop = 10;
  var taskbarH = parseFloat(getComputedStyle(doc.documentElement).getPropertyValue('--taskbar-h')) || 30;

  function place(win, x, y, w, h) {
    var vw = doc.documentElement.clientWidth, vh = window.innerHeight;
    w = Math.max(MIN_W, Math.min(w, vw));
    h = Math.max(MIN_H, Math.min(h, vh - taskbarH));
    // Keep enough of the title bar on screen to grab it again.
    x = Math.min(Math.max(x, 80 - w), vw - 80);
    y = Math.min(Math.max(y, 0), vh - taskbarH - 24);
    win._box = { x: x, y: y, w: w, h: h };
    win.style.setProperty('--x', x + 'px');
    win.style.setProperty('--y', y + 'px');
    win.style.setProperty('--w', w + 'px');
    win.style.setProperty('--h', h + 'px');
  }

  function raise(win) {
    if (!win.classList.contains('is-floating') || win._z === zTop) return;
    if (zTop >= 45) {
      // Stay below maximized windows (50) and the taskbar (100): renumber in the current order.
      var fl = wins.filter(function (w) { return w._z; }).sort(function (a, b) { return a._z - b._z; });
      zTop = 10;
      fl.forEach(function (w) { w._z = ++zTop; w.style.setProperty('--z', w._z); });
    }
    win._z = ++zTop;
    win.style.setProperty('--z', win._z);
  }

  function floatWin(win) {
    var r = win.getBoundingClientRect();
    holdSpot(win, r);
    place(win, r.left, r.top, r.width, r.height);
    win.classList.add('is-floating');
    raise(win);
  }

  wins.forEach(function (win) {
    ['e', 's', 'w', 'se', 'sw'].forEach(function (edge) {
      var h = doc.createElement('div');
      h.className = 'resize-handle';
      h.setAttribute('data-edge', edge);
      h.setAttribute('aria-hidden', 'true');
      win.appendChild(h);
    });
    // Windows with a status bar get the classic size grip in its corner.
    if (win.querySelector(':scope > .status-bar')) win.classList.add('has-grip');
  });

  var drag = null;
  doc.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 || !canMove.matches) return;
    var handle = e.target.closest('.resize-handle');
    var bar = !handle && e.target.closest('.title-bar');
    if (!handle && !bar) return;
    if (bar && e.target.closest('.title-bar-controls')) return;
    var grab = handle || bar;
    var win = grab.closest('.window[data-task]');
    if (!win || win.classList.contains('is-maximized') || win.classList.contains('is-collapsed')) return;
    setActive(win);
    drag = { win: win, el: grab, id: e.pointerId, edge: handle ? handle.getAttribute('data-edge') : null,
             sx: e.clientX, sy: e.clientY, started: false };
    grab.setPointerCapture(e.pointerId);
    if (handle) e.preventDefault();
  });

  doc.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.started) {
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;   // a click, not a drag
      drag.started = true;
      if (!drag.win.classList.contains('is-floating')) floatWin(drag.win);
      var b0 = drag.win._box;
      drag.box = { x: b0.x, y: b0.y, w: b0.w, h: b0.h };
      doc.documentElement.classList.add('is-moving');
      if (drag.edge) doc.documentElement.style.cursor = getComputedStyle(drag.el).cursor;
    }
    var b = drag.box, x = b.x, y = b.y, w = b.w, h = b.h, ed = drag.edge;
    if (!ed) { x += dx; y += dy; }
    else {
      if (ed.indexOf('e') >= 0) w = b.w + dx;
      if (ed.indexOf('s') >= 0) h = b.h + dy;
      if (ed.indexOf('w') >= 0) { w = Math.max(MIN_W, b.w - dx); x = b.x + b.w - w; }
    }
    place(drag.win, x, y, w, h);
  });

  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    doc.documentElement.classList.remove('is-moving');
    doc.documentElement.style.cursor = '';
  }
  doc.addEventListener('pointerup', endDrag);
  doc.addEventListener('pointercancel', endDrag);

  // Clicking anywhere in a floating window brings it to the front.
  doc.addEventListener('pointerdown', function (e) {
    var win = e.target.closest('.window.is-floating');
    if (win) raise(win);
  }, true);

  // Keep floating windows reachable when the browser window is resized.
  window.addEventListener('resize', function () {
    wins.forEach(function (w) { if (w._box) place(w, w._box.x, w._box.y, w._box.w, w._box.h); });
  });

  /* ---- Contents pane: collapsed by default on small screens, highlights the current section ---- */
  var toc = doc.querySelector('.toc-pane');
  if (toc) {
    var wide = window.matchMedia('(min-width: 1280px)');
    if (!wide.matches) toc.open = false;
    wide.addEventListener('change', function (m) { if (m.matches) toc.open = true; });

    var links = Array.prototype.slice.call(toc.querySelectorAll('a[href^="#"]'));
    var heads = links.map(function (a) { return doc.getElementById(decodeURIComponent(a.hash.slice(1))); });
    var scroller = toc.closest('.window-body');
    var onScroll = function () {
      // The window body scrolls on desktop; the page scrolls on phones.
      var top = (scroller && scroller.scrollHeight > scroller.clientHeight) ? scroller.getBoundingClientRect().top : 0;
      var current = 0;
      for (var i = 0; i < heads.length; i++) {
        if (heads[i] && heads[i].getBoundingClientRect().top - top < 48) current = i;
      }
      // At the very bottom the last sections can't reach the top, so pick the last one.
      var atEnd = (scroller && scroller.scrollHeight > scroller.clientHeight)
        ? scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2
        : window.innerHeight + window.scrollY >= doc.documentElement.scrollHeight - 2;
      if (atEnd && (scroller.scrollTop > 0 || window.scrollY > 0)) current = heads.length - 1;
      links.forEach(function (a, i) { a.classList.toggle('is-current', i === current); });
    };
    doc.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', onScroll);
    onScroll();
  }

  doc.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (start && start.open) { start.open = false; start.querySelector('summary').focus(); return; }
    var max = doc.querySelector('.window.is-maximized');
    if (max) toggleMax(max);
  });
})();

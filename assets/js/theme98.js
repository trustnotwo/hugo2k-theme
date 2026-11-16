/* hugo2k-theme — tiny window manager, plus Search, Command Prompt, Display Properties and two games. Everything degrades gracefully without JS. */
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
    if (win._ph || win._app) return;
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
  var T = window.theme98 || { cfg: {}, load: function () { return {}; }, save: function () { return false; }, apply: function () {} };
  var prefs = T.load();
  function zoom(from, to, done) {
    if (reduceMotion.matches || prefs.anim === false || !from || !to || !from.width || !to.width) { if (done) done(); return; }
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
    if (win._cleanup) win._cleanup();   // stop a program's timers
    hideWin(win);
    if (win._task) { win._task.remove(); win._task = null; }
    wins = wins.filter(function (w) { return w !== win; });
    if (win._app) { win.remove(); delete apps[win._app]; }
    setActive(topVisible());
  }

  function addTask(win) {
    if (!tasks) return;
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
  }
  wins.forEach(addTask);
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
    // Whole pixels only: a window at a fractional position draws its edges and icons blurry.
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
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

  function addHandles(win) {
    ['e', 's', 'w', 'se', 'sw'].forEach(function (edge) {
      var h = doc.createElement('div');
      h.className = 'resize-handle';
      h.setAttribute('data-edge', edge);
      h.setAttribute('aria-hidden', 'true');
      win.appendChild(h);
    });
    // Windows with a status bar get the classic size grip in its corner.
    if (win.querySelector(':scope > .status-bar')) win.classList.add('has-grip');
  }
  wins.forEach(addHandles);

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
    if (ctx) { closeCtx(); return; }
    if (start && start.open) { start.open = false; start.querySelector('summary').focus(); return; }
    var max = doc.querySelector('.window.is-maximized');
    if (max) toggleMax(max);
  });

  /* =====================================================================================
     Programs opened from the Start menu: Search, Command Prompt and Display Properties.
     They're windows built here, managed like the page's own (taskbar button, move, resize).
     ===================================================================================== */
  var cfg = T.cfg || {};
  var mainEl = doc.getElementById('main');
  var floatMQ = window.matchMedia('(min-width: 721px)');
  var apps = {}, opened = 0, uid = 0;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function iconUrl(name, size) {
    var i = cfg.icons && cfg.icons[name], url = i ? i[size || 16] : '';
    return T.iconUrl ? T.iconUrl(url) : url;   // the current look's icon set, if it has one
  }
  function nextId(p) { return 'app' + (++uid) + '-' + p; }

  // Formats a date with a Go layout like "1/2/2006" (the site's dateFormat).
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function pad(n, w) { n = String(n); while (n.length < (w || 2)) n = '0' + n; return n; }
  function goDate(d, layout) {
    if (!d) return '';
    var h12 = d.getHours() % 12 || 12;
    return layout.replace(/2006|January|Jan|Monday|Mon|01|02|15|03|04|05|PM|1|2|3/g, function (t) {
      switch (t) {
        case '2006': return d.getFullYear();
        case 'January': return MONTHS[d.getMonth()];
        case 'Jan': return MONTHS[d.getMonth()].slice(0, 3);
        case 'Monday': return DAYS[d.getDay()];
        case 'Mon': return DAYS[d.getDay()].slice(0, 3);
        case '01': return pad(d.getMonth() + 1);
        case '02': return pad(d.getDate());
        case '15': return pad(d.getHours());
        case '03': return pad(h12);
        case '04': return pad(d.getMinutes());
        case '05': return pad(d.getSeconds());
        case 'PM': return d.getHours() < 12 ? 'AM' : 'PM';
        case '1': return d.getMonth() + 1;
        case '2': return d.getDate();
        case '3': return h12;
      }
    });
  }
  function kb(bytes) { return Math.max(1, Math.floor(bytes / 1024)) + 'KB'; }

  /* ---- The page index (search-index.json), loaded the first time a program needs it ---- */
  var indexP = null;
  function getIndex() {
    if (indexP) return indexP;
    indexP = fetch(cfg.index).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    }).then(function (list) {
      var byUrl = {}, root = null;
      list.forEach(function (e) {
        e.dir = e.k !== 'page';
        e.kids = [];
        var segs = e.u.replace(/^\/|\/$/g, '').split('/').filter(Boolean).map(function (x) {
          try { return decodeURIComponent(x); } catch (err) { return x; }
        });
        e.segs = segs;
        e.name = segs.length ? segs[segs.length - 1] + (e.dir ? '' : '.md') : '';
        e.date = e.d ? new Date(e.d) : null;
        e.r = (e.r || '').replace(/\r/g, '');
        e.hay = (e.t + ' ' + (e.g || []).join(' ') + ' ' + e.c).toLowerCase();
        byUrl[e.u] = e;
        if (e.k === 'home') root = e;
      });
      list.forEach(function (e) {
        var parent = e.p && byUrl[e.p];
        if (parent && parent !== e) { parent.kids.push(e); e.parent = parent; }
      });
      // Folders (and undated pages) take the date of their newest file.
      var newest = null;
      (function stampDir(e) {
        e.kids.forEach(function (k) {
          if (k.dir) stampDir(k);
          if (k.date && (!e.date || k.date > e.date)) e.date = k.date;
        });
        if (e.date && (!newest || e.date > newest)) newest = e.date;
      })(root || list[0]);
      list.forEach(function (e) {
        if (!e.date) e.date = newest;
        e.kids.sort(function (a, b) { return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1; });
      });
      return { list: list, byUrl: byUrl, root: root || list[0] };
    });
    indexP.catch(function () { indexP = null; });   // try again next time
    return indexP;
  }

  /* ---- Building a program window ---- */
  function makeWindow(o) {
    var win = doc.createElement('section');
    win.className = 'window app-window app-' + o.app + (o.dialog ? ' app-dialog' : '');
    win.setAttribute('data-task', o.title);
    win.setAttribute('aria-label', o.title);
    win.innerHTML =
      '<div class="title-bar"><div class="title-bar-text">' +
        '<img src="' + esc(iconUrl(o.icon, 16)) + '" alt="" width="16" height="16">' +
        '<span class="title-bar-label">' + esc(o.title) + '</span></div>' +
        '<div class="title-bar-controls">' +
          (o.dialog ? '' : '<button type="button" aria-label="Minimize"></button><button type="button" aria-label="Maximize"></button>') +
          '<button type="button" aria-label="Close"></button></div></div>' +
      '<div class="window-body">' + o.body + '</div>' +
      (o.status ? '<div class="status-bar">' + o.status + '</div>' : '');
    win._app = o.app;

    if (floatMQ.matches) {
      mainEl.appendChild(win);
      var vw = doc.documentElement.clientWidth, vh = window.innerHeight - taskbarH;
      var w = Math.min(o.w, vw - 24);
      win.style.setProperty('--w', w + 'px');
      win.style.setProperty('--h', 'auto');
      win.classList.add('is-floating');
      var h = Math.min(o.h || win.offsetHeight, vh - 24);
      var step = (opened++ % 5) * 26;   // cascade like Windows does
      place(win, Math.max(8, (vw - w) / 2 - 52 + step), Math.max(8, (vh - h) / 2 - 52 + step), w, h);
    } else {
      mainEl.insertBefore(win, mainEl.firstChild);
      window.scrollTo(0, 0);
    }
    wins.push(win);
    addTask(win);
    if (!o.dialog) addHandles(win);
    apps[o.app] = win;
    raise(win);
    setActive(win);
    return win;
  }

  function openApp(name, arg) {
    var win = apps[name];
    if (win) {
      if (win.hidden) restore(win); else { setActive(win); raise(win); }
      if (win._reopen) win._reopen(arg);
      return;
    }
    if (programs[name]) programs[name](arg);
  }

  doc.addEventListener('click', function (e) {
    var a = e.target.closest('[data-app]');
    if (!a) return;
    e.preventDefault();
    if (start) start.open = false;
    openApp(a.getAttribute('data-app'));
  });

  var programs = {};

  /* ---------------------------------- Search ---------------------------------- */
  programs.search = function (query) {
    var id = nextId('s');
    var win = makeWindow({
      app: 'search', title: 'Search Results', icon: 'search', w: 760, h: 440,
      body:
        '<div class="search-layout">' +
          '<form class="search-pane" autocomplete="off">' +
            '<p class="search-head"><img src="' + esc(iconUrl('search', 32)) + '" alt="" width="32" height="32"><b>Search for Files and Folders</b></p>' +
            '<label for="' + id + '-n">Search for files or folders named:</label>' +
            '<input type="text" id="' + id + '-n" name="named">' +
            '<label for="' + id + '-t">Containing text:</label>' +
            '<input type="text" id="' + id + '-t" name="text">' +
            '<label for="' + id + '-l">Look in:</label>' +
            '<select id="' + id + '-l" name="look"><option value="/">' + esc(cfg.title) + ' (C:)</option></select>' +
            '<div class="search-buttons"><button type="submit">Search Now</button><button type="button" data-act="new">New Search</button></div>' +
          '</form>' +
          '<div class="sunken-panel file-table search-results"><table class="interactive">' +
            '<thead><tr><th class="col-name">Name</th><th class="col-folder">In Folder</th><th class="col-size">Size</th><th class="col-type">Type</th><th class="col-date">Modified</th></tr></thead>' +
            '<tbody></tbody></table></div>' +
        '</div>',
      status: '<p class="status-bar-field search-status">Enter your search criteria and click Search Now.</p>'
    });
    var form = win.querySelector('form'), tbody = win.querySelector('tbody');
    var status = win.querySelector('.search-status');
    var fmt = cfg.dateFormat || '1/2/2006';

    getIndex().then(function (ix) {
      ix.list.forEach(function (e) {
        if (e.k !== 'section') return;
        var o = doc.createElement('option');
        o.value = e.u;
        o.textContent = '\u00a0\u00a0'.repeat(e.segs.length) + e.t;
        form.look.appendChild(o);
      });
    }, function () { status.textContent = 'The search index could not be loaded.'; });

    function terms(v) { return v.toLowerCase().split(/\s+/).filter(Boolean); }

    function snippet(e, words) {
      if (!words.length) return e.s;
      var c = e.c, i = c.toLowerCase().indexOf(words[0]);
      if (i < 0) return e.s;
      var a = Math.max(0, i - 60);
      return (a ? '…' : '') + c.slice(a, i + 100).replace(/\s+/g, ' ').trim() + '…';
    }

    function run() {
      var named = terms(form.named.value), text = terms(form.text.value), look = form.look.value;
      status.textContent = 'Searching…';
      getIndex().then(function (ix) {
        var hits = [];
        ix.list.forEach(function (e) {
          if (e.k === 'home' || e.u === look || e.u.indexOf(look) !== 0) return;
          var name = (e.t + ' ' + e.name + ' ' + (e.g || []).join(' ')).toLowerCase();
          if (!named.every(function (t) { return name.indexOf(t) >= 0; })) return;
          if (!text.every(function (t) { return e.hay.indexOf(t) >= 0; })) return;
          var score = 0, title = e.t.toLowerCase();
          named.concat(text).forEach(function (t) { if (title.indexOf(t) >= 0) score += 10; });
          hits.push({ e: e, score: score });
        });
        hits.sort(function (a, b) { return b.score - a.score || (b.e.date || 0) - (a.e.date || 0); });
        tbody.innerHTML = hits.map(function (h) {
          var e = h.e;
          return '<tr data-href="' + esc(e.u) + '">' +
            '<td class="col-name"><a href="' + esc(e.u) + '" title="' + esc(snippet(e, text)) + '">' +
              '<img src="' + esc(iconUrl(e.dir ? 'folder' : 'document', 16)) + '" alt="" width="16" height="16"><span>' + esc(e.t) + '</span></a></td>' +
            '<td class="col-folder">' + esc(e.f || '') + '</td>' +
            '<td class="col-size">' + (e.dir ? '' : kb(e.b)) + '</td>' +
            '<td class="col-type">' + esc(e.y) + '</td>' +
            '<td class="col-date">' + esc(goDate(e.date, fmt)) + '</td></tr>';
        }).join('');
        status.textContent = hits.length
          ? hits.length + ' file(s) found'
          : 'Search is complete. There are no results to display.';
      }, function () { status.textContent = 'The search index could not be loaded.'; });
    }

    form.addEventListener('submit', function (e) { e.preventDefault(); run(); });
    win.querySelector('[data-act="new"]').addEventListener('click', function () {
      form.reset();
      tbody.innerHTML = '';
      status.textContent = 'Enter your search criteria and click Search Now.';
      form.named.focus();
    });
    win._reopen = function (q) {
      if (q) { form.reset(); form.text.value = q; run(); }
      form.named.focus();
    };
    win._reopen(query);
  };

  /* ------------------------------- Command Prompt ------------------------------- */
  var BS = '\\';
  programs.cmd = function () {
    var win = makeWindow({
      app: 'cmd', title: 'Command Prompt', icon: 'command-prompt', w: 680, h: 420,
      body:
        '<div class="console">' +
          '<div class="console-out" aria-live="polite"></div>' +
          '<form class="console-line" autocomplete="off"><label class="console-prompt"></label>' +
          '<input class="console-input" type="text" aria-label="Command" spellcheck="false" autocapitalize="off" autocorrect="off"></form>' +
        '</div>'
    });
    var con = win.querySelector('.console'), out = win.querySelector('.console-out');
    var form = win.querySelector('.console-line'), input = win.querySelector('.console-input');
    var promptEl = win.querySelector('.console-prompt');
    var ix = null, cwd = null, history = [], hpos = 0, tabState = null;
    var label = win.querySelector('.title-bar-label');

    function print(text) {
      out.appendChild(doc.createTextNode(text + '\n'));
      con.scrollTop = con.scrollHeight;
    }
    function pathOf(e) { return 'C:' + BS + e.segs.join(BS); }
    function prompt() { promptEl.textContent = (cwd ? pathOf(cwd) : 'C:' + BS) + '>'; }

    function resolve(arg) {
      if (!ix) return null;
      var p = arg.replace(/^"|"$/g, '').replace(/\//g, BS), cur = cwd;
      if (/^c:/i.test(p)) p = p.slice(2);
      if (p.charAt(0) === BS) cur = ix.root;
      var parts = p.split(BS).filter(Boolean);
      for (var i = 0; i < parts.length; i++) {
        var part = parts[i].toLowerCase();
        if (part === '.') continue;
        if (part === '..') { cur = cur.parent || ix.root; continue; }
        if (!cur.dir) return null;
        var next = null;
        cur.kids.forEach(function (k) {
          var n = k.name.toLowerCase();
          if (n === part || (!k.dir && n === part + '.md')) next = next || k;
        });
        if (!next) return null;
        cur = next;
      }
      return cur;
    }

    function stamp(d) {
      if (!d) return pad('', 20).replace(/0/g, ' ');
      return pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + '/' + d.getFullYear() + '  ' +
        pad(d.getHours() % 12 || 12) + ':' + pad(d.getMinutes()) + ' ' + (d.getHours() < 12 ? 'AM' : 'PM');
    }
    function num(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
    function lpad(s, w) { s = String(s); while (s.length < w) s = ' ' + s; return s; }
    function rpad(s, w) { s = String(s); while (s.length < w) s += ' '; return s; }

    function open(e) {
      print('');
      location.href = e.u;
    }

    var cmds = {
      help: function () {
        print([
          'For more information on a command, there is none. Try them.',
          '',
          'CD       Displays the name of or changes the current directory.',
          'CLS      Clears the screen.',
          'COLOR    Sets the console colours, e.g. COLOR 0A.',
          'DATE     Displays the date.',
          'DIR      Displays a list of files and subdirectories in a directory.',
          'ECHO     Displays messages.',
          'EXIT     Closes the Command Prompt.',
          'FIND     Searches for a text string in all files.',
          'HELP     Provides Help information for commands.',
          'SEARCH   Opens the Search window.',
          'START    Opens a file or folder in its window.',
          'TIME     Displays the time.',
          'TITLE    Sets the window title.',
          'TREE     Graphically displays the folder structure.',
          'TYPE     Displays the contents of a file.',
          'VER      Displays the version.',
          '',
          'Typing the name of a file opens it.'
        ].join('\n'));
      },
      cls: function () { out.textContent = ''; },
      ver: function () { print('\n' + cfg.title + ' [Version 5.00.2026]\n'); },
      echo: function (a, raw) { print(raw === '.' || raw === '' ? (raw === '' ? 'ECHO is on.' : '') : raw); },
      date: function () { var d = new Date(); print('The current date is: ' + DAYS[d.getDay()].slice(0, 3) + ' ' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + '/' + d.getFullYear()); },
      time: function () { var d = new Date(); print('The current time is: ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + '.' + pad(Math.floor(d.getMilliseconds() / 10))); },
      exit: function () { close(win); },
      title: function (a, raw) {
        var t = raw || 'Command Prompt';
        label.textContent = t;
        if (win._task) { win._task.title = t; win._task.querySelector('span').textContent = t; }
      },
      color: function (a) {
        var c = (a[0] || '07').toLowerCase();
        if (!/^[0-9a-f]{1,2}$/.test(c)) { cmds.help(); return; }
        if (c.length === 1) c = '0' + c;
        if (c[0] === c[1]) return;   // same foreground and background: Windows refuses too
        var pal = ['#000', '#000080', '#008000', '#008080', '#800000', '#800080', '#808000', '#c0c0c0',
                   '#808080', '#0000ff', '#00ff00', '#00ffff', '#ff0000', '#ff00ff', '#ffff00', '#fff'];
        con.style.setProperty('--con-bg', pal[parseInt(c[0], 16)]);
        con.style.setProperty('--con-fg', pal[parseInt(c[1], 16)]);
      },
      cd: function (a, raw) {
        if (!raw) { print(pathOf(cwd)); return; }
        var t = resolve(raw);
        if (!t || !t.dir) { print('The system cannot find the path specified.'); return; }
        cwd = t;
      },
      dir: function (a, raw) {
        var t = raw ? resolve(raw) : cwd;
        if (!t) { print(' Volume in drive C is ' + vol() + '\n\nFile Not Found'); return; }
        var list = t.dir ? t.kids : [t], dirAt = t.dir ? t : t.parent;
        var lines = [' Volume in drive C is ' + vol(), ' Volume Serial Number is 2000-0098', '', ' Directory of ' + pathOf(dirAt), ''];
        var files = 0, bytes = 0, dirs = 0;
        if (t.dir && t.parent) {
          lines.push(stamp(t.date) + '    <DIR>          .');
          lines.push(stamp((t.parent || t).date) + '    <DIR>          ..');
          dirs += 2;
        }
        list.forEach(function (e) {
          if (e.dir) { dirs++; lines.push(stamp(e.date) + '    <DIR>          ' + e.name); }
          else { files++; bytes += e.b; lines.push(stamp(e.date) + ' ' + lpad(num(e.b), 17) + ' ' + e.name); }
        });
        lines.push(lpad(files, 16) + ' File(s) ' + lpad(num(bytes), 14) + ' bytes');
        lines.push(lpad(dirs, 16) + ' Dir(s)  ' + lpad(num(1999000000), 14) + ' bytes free');
        print(lines.join('\n'));
      },
      tree: function (a, raw) {
        var t = raw ? resolve(raw) : cwd;
        if (!t || !t.dir) { print('Invalid path - ' + (raw || '').toUpperCase()); return; }
        var lines = ['Folder PATH listing for volume ' + vol(), pathOf(t).toUpperCase() + (t.segs.length ? '' : '.')];
        (function walk(e, pre) {
          var ds = e.kids.filter(function (k) { return k.dir; });
          ds.forEach(function (k, i) {
            var last = i === ds.length - 1;
            lines.push(pre + (last ? '\u2514\u2500\u2500\u2500' : '\u251c\u2500\u2500\u2500') + k.name);
            walk(k, pre + (last ? '    ' : '\u2502   '));
          });
        })(t, '');
        if (lines.length === 2) lines.push('No subfolders exist');
        print(lines.join('\n'));
      },
      type: function (a, raw) {
        if (!raw) { print('The syntax of the command is incorrect.'); return; }
        var t = resolve(raw);
        if (!t) { print('The system cannot find the file specified.'); return; }
        if (t.dir) { print('Access is denied.'); return; }
        print(t.r || '');
      },
      start: function (a, raw) {
        if (!raw) { print('Usage: START <file or folder>'); return; }
        var t = resolve(raw);
        if (!t) { print('The system cannot find the file ' + raw + '.'); return; }
        open(t);
      },
      find: function (a, raw) {
        var q = raw.replace(/^"|"$/g, '');
        if (!q) { print('FIND: Parameter format not correct'); return; }
        var lq = q.toLowerCase(), n = 0;
        ix.list.forEach(function (e) {
          if (e.dir || (e.r || '').toLowerCase().indexOf(lq) < 0) return;
          n++;
          print('\n---------- ' + pathOf(e).toUpperCase());
          e.r.split('\n').forEach(function (line) {
            if (line.toLowerCase().indexOf(lq) >= 0) print(line);
          });
        });
        if (!n) print('\nNo files contain "' + q + '".');
      },
      search: function (a, raw) { openApp('search', raw.replace(/^"|"$/g, '')); }
    };
    cmds.chdir = cmds.cd;
    cmds.notepad = cmds.explorer = cmds.open = cmds.start;

    function vol() { return (cfg.title || 'DESKTOP').replace(/[^a-z0-9]/gi, '').slice(0, 11).toUpperCase(); }

    function exec(line) {
      print((cwd ? pathOf(cwd) : 'C:' + BS) + '>' + line);
      line = line.trim();
      if (!line) return;
      // "cd..", "cd\" and "dir\" work without a space, as in DOS
      var m = line.match(/^([a-z]+)([\\.].*)?$/i);
      if (m && m[2] && cmds[m[1].toLowerCase()]) line = m[1] + ' ' + m[2];
      var sp = line.search(/\s/), name = (sp < 0 ? line : line.slice(0, sp)).toLowerCase();
      var raw = sp < 0 ? '' : line.slice(sp + 1).trim();
      if (/^c:$/i.test(name)) return;
      if (cmds[name]) { cmds[name](raw.split(/\s+/).filter(Boolean), raw); }
      else {
        var t = resolve(line);
        if (t && !t.dir) open(t);
        else print("'" + (sp < 0 ? line : line.slice(0, sp)) + "' is not recognized as an internal or external command,\noperable program or batch file.");
      }
      if (name !== 'cls') print('');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var line = input.value;
      input.value = '';
      tabState = null;
      if (line.trim()) { history.push(line); }
      hpos = history.length;
      if (!ix) return;
      exec(line);
      prompt();
      con.scrollTop = con.scrollHeight;
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        hpos = Math.max(0, Math.min(history.length, hpos + (e.key === 'ArrowUp' ? -1 : 1)));
        input.value = history[hpos] || '';
      } else if (e.key === 'Tab' && ix) {
        // Completes file and folder names in the current folder; Tab again cycles.
        e.preventDefault();
        if (!tabState) {
          var v = input.value, cut = Math.max(v.lastIndexOf(' '), v.lastIndexOf(BS), v.lastIndexOf('/')) + 1;
          var head = v.slice(0, cut), part = v.slice(cut).toLowerCase();
          var dirPart = head.slice(head.lastIndexOf(' ') + 1);
          var base = dirPart ? resolve(dirPart) : cwd;
          var names = base && base.dir ? base.kids.map(function (k) { return k.name; })
            .filter(function (n) { return n.toLowerCase().indexOf(part) === 0; }) : [];
          tabState = { head: head, names: names, i: -1 };
        }
        if (tabState.names.length) {
          tabState.i = (tabState.i + 1) % tabState.names.length;
          input.value = tabState.head + tabState.names[tabState.i];
        }
      } else if (e.key !== 'Shift') {
        tabState = null;
      }
    });

    // Clicking anywhere in the console types into it (unless you're selecting text to copy).
    con.addEventListener('mouseup', function () {
      if (!String(window.getSelection())) input.focus({ preventScroll: true });
    });
    win._reopen = function () { input.focus(); };

    print(cfg.title + ' Command Prompt\n(C) ' + new Date().getFullYear() + ' ' + cfg.title + '. Type HELP for a list of commands.\n');
    prompt();
    input.focus();
    getIndex().then(function (data) {
      ix = data;
      // Start in the folder of the page you're on.
      var here = ix.byUrl[location.pathname];
      cwd = here ? (here.dir ? here : here.parent || ix.root) : ix.root;
      prompt();
    }, function () { print('The file index could not be loaded. Close this window and try again.'); });
  };

  /* ------------------------------ Display Properties ------------------------------ */
  // The looks from data/themes.yaml, grouped for the Scheme list.
  function schemeOptions() {
    var themes = cfg.themes || {}, groups = [], byGroup = {};
    (cfg.order || Object.keys(themes)).forEach(function (k) {
      var g = themes[k].group || 'Other';
      if (!byGroup[g]) { byGroup[g] = []; groups.push(g); }
      byGroup[g].push(k);
    });
    var def = themes[cfg.style] ? themes[cfg.style].name : cfg.style;
    var dark = cfg.autoDark && themes[cfg.darkStyle] ? themes[cfg.darkStyle].name : '';
    function short(n) { return String(n).replace(/^Windows (XP )?/, ''); }
    return '<option value="">Site default (' + esc(short(def)) + (dark ? ', ' + esc(short(dark)) + ' in dark mode' : '') + ')</option>' +
      groups.map(function (g) {
        return '<optgroup label="' + esc(g) + '">' + byGroup[g].map(function (k) {
          return '<option value="' + esc(k) + '">' + esc(themes[k].name) + '</option>';
        }).join('') + '</optgroup>';
      }).join('');
  }

  programs.display = function (tab) {
    var id = nextId('d');
    var wps = cfg.wallpapers || [];
    var win = makeWindow({
      app: 'display', title: 'Display Properties', icon: 'settings', dialog: true, w: 404,
      body:
        '<menu role="tablist" class="dp-tabs">' +
          '<li role="tab" aria-selected="true"><a href="#bg">Background</a></li>' +
          '<li role="tab"><a href="#ap">Appearance</a></li>' +
          '<li role="tab"><a href="#fx">Effects</a></li>' +
        '</menu>' +
        '<div class="dp-pages">' +
        '<div class="window dp-panel" role="tabpanel" data-tab="bg">' +
          '<div class="dp-monitor" aria-hidden="true"><div class="dp-screen"></div></div>' +
          '<label for="' + id + '-wp">Select a picture for the desktop background:</label>' +
          '<div class="dp-row">' +
            '<select id="' + id + '-wp" class="dp-wallpapers" size="5">' +
              '<option value="">(None)</option>' +
              wps.map(function (w) { return '<option value="' + esc(w.url) + '"' + (w.tile ? ' data-tile="' + (w.size || 256) + '"' : '') + '>' + esc(w.name) + '</option>'; }).join('') +
            '</select>' +
            '<div class="dp-side">' +
              '<button type="button" data-act="browse">Browse...</button>' +
              '<input type="file" accept="image/*" hidden>' +
              '<label for="' + id + '-pos">Picture Display:</label>' +
              '<select id="' + id + '-pos" class="dp-position"><option value="">Stretch</option><option value="center">Center</option><option value="tile">Tile</option></select>' +
              '<label for="' + id + '-col">Color:</label>' +
              '<input type="color" id="' + id + '-col" class="dp-color">' +
            '</div>' +
          '</div>' +
          '<p class="dp-note" role="status"></p>' +
        '</div>' +
        '<div class="window dp-panel is-off" role="tabpanel" data-tab="ap" inert>' +
          '<div class="dp-preview" aria-hidden="true">' +
            '<div class="dp-mini inactive"><div class="dp-mini-title"><span>Inactive Window</span><span class="dp-mini-btns"><i class="min"></i><i class="max"></i><i class="close"></i></span></div></div>' +
            '<div class="dp-mini active"><div class="dp-mini-title"><span>Active Window</span><span class="dp-mini-btns"><i class="min"></i><i class="max"></i><i class="close"></i></span></div><div class="dp-mini-body">Window Text</div></div>' +
          '</div>' +
          '<div class="field-row-stacked"><label for="' + id + '-sch">Scheme:</label>' +
            '<select id="' + id + '-sch" class="dp-style">' +
              schemeOptions() +
            '</select></div>' +
          '<div class="field-row-stacked"><label for="' + id + '-fs">Font size:</label>' +
            '<select id="' + id + '-fs" class="dp-size"><option value="normal">Normal</option><option value="large">Large</option></select></div>' +
        '</div>' +
        '<div class="window dp-panel is-off" role="tabpanel" data-tab="fx" inert>' +
          '<fieldset><legend>Visual effects</legend>' +
            '<div class="field-row"><input type="checkbox" id="' + id + '-anim" class="dp-anim"><label for="' + id + '-anim">Use transition effects when minimizing and restoring windows</label></div>' +
            '<div class="field-row"><input type="checkbox" id="' + id + '-big" class="dp-big"><label for="' + id + '-big">Use large icons</label></div>' +
          '</fieldset>' +
          '<p class="dp-note">Settings are saved in this browser only.</p>' +
        '</div>' +
        '</div>' +
        '<div class="dp-buttons">' +
          '<button type="button" data-act="defaults">Defaults</button>' +
          '<span class="dp-gap"></span>' +
          '<button type="button" data-act="ok">OK</button>' +
          '<button type="button" data-act="cancel">Cancel</button>' +
          '<button type="button" data-act="apply" disabled>Apply</button>' +
        '</div>'
    });
    var $ = function (s) { return win.querySelector(s); };
    var draft, custom = null;
    var wpSel = $('.dp-wallpapers'), posSel = $('.dp-position'), colIn = $('.dp-color');
    var styleSel = $('.dp-style'), sizeSel = $('.dp-size'), animIn = $('.dp-anim'), bigIn = $('.dp-big');
    var applyBtn = $('[data-act="apply"]'), note = $('.dp-note'), fileIn = $('input[type="file"]');

    function scheme() {
      var th = cfg.themes[T.themeId(draft)] || {};
      return th.pv || {};
    }
    function color() { return draft.color || cfg.desktopColor || scheme().desktop || '#3a6ea5'; }
    function wpValue() { return 'wallpaper' in draft ? draft.wallpaper : (T.defaultWallpaper(draft) || ''); }
    function posValue() { return 'position' in draft ? draft.position : ('wallpaper' in draft ? '' : T.defaultPosition(draft)); }
    function wpUrl(v) { return v === 'custom' ? (custom || T.customWallpaper() || '') : v; }

    function ensureCustomOption() {
      if (wpSel.querySelector('option[value="custom"]')) return;
      var o = doc.createElement('option');
      o.value = 'custom';
      o.textContent = '(My picture)';
      wpSel.appendChild(o);
    }

    function load() {
      draft = JSON.parse(JSON.stringify(prefs));
      if (draft.wallpaper === 'custom' || T.customWallpaper()) ensureCustomOption();
      wpSel.value = wpValue();
      if (wpSel.selectedIndex < 0) wpSel.value = '';
      posSel.value = posValue() || '';
      colIn.value = color();
      styleSel.value = draft.style && cfg.themes[draft.style] ? draft.style : '';
      sizeSel.value = ('large' in draft ? draft.large : cfg.readableProse) ? 'large' : 'normal';
      animIn.checked = draft.anim !== false;
      bigIn.checked = !!draft.bigIcons;
      applyBtn.disabled = true;
      note.textContent = '';
      preview();
    }

    function preview() {
      var s = scheme(), scr = $('.dp-screen'), u = wpUrl(wpValue()), pos = posValue();
      scr.style.backgroundColor = color();
      scr.style.backgroundImage = u ? 'url("' + u + '")' : 'none';
      // A rough small-scale stand-in for how the picture sits on the real screen.
      // The monitor's screen is ~1/8 of a real one, so a tile shows at 1/8 of its size.
      var opt = wpSel.querySelector('option[value="' + (window.CSS && CSS.escape ? CSS.escape(wpValue()) : wpValue()) + '"]');
      var tileSize = opt && opt.getAttribute('data-tile');
      scr.style.backgroundSize = pos === 'tile' ? (tileSize ? Math.round(tileSize / 8) + 'px auto' : '25% auto') : pos === 'center' ? '45% auto' : 'cover';
      scr.style.backgroundRepeat = pos === 'tile' ? 'repeat' : 'no-repeat';
      scr.style.backgroundPosition = pos === 'tile' ? '0 0' : 'center';
      var pv = $('.dp-preview');
      pv.style.setProperty('--pv-desktop', color());
      pv.style.setProperty('--pv-face', s.face);
      pv.style.setProperty('--pv-a', s.a);
      pv.style.setProperty('--pv-b', s.b);
      pv.style.setProperty('--pv-ia', s.ia);
      pv.style.setProperty('--pv-ib', s.ib);
      pv.style.setProperty('--pv-window', s.window || '#fff');
      pv.style.setProperty('--pv-text', s.text || '#000');
      pv.style.setProperty('--pv-title-text', s.titleText || '#fff');
      // XP looks: draw the mini windows with the theme's own title bar, frame and button images
      var thm = cfg.themes[T.themeId(draft)] || {}, chrome = thm.chrome;
      pv.classList.toggle('pv-xp', !!chrome);
      pv.style.setProperty('--pv-bw', thm.bw || 4);
      if (s.titleShadow) pv.style.setProperty('--pv-title-shadow', s.titleShadow); else pv.style.removeProperty('--pv-title-shadow');
      if (s.inactiveText) pv.style.setProperty('--pv-inactive-text', s.inactiveText); else pv.style.removeProperty('--pv-inactive-text');
      if (chrome) {
        var dir = cfg.skinBase + chrome + '/';
        ['title-left', 'title-middle', 'title-right', 'frame', 'minimize', 'maximize', 'close'].forEach(function (n) {
          pv.style.setProperty('--pv-' + n, 'url("' + dir + n + '.png")');
        });
      }
    }

    function changed() { applyBtn.disabled = false; preview(); }

    function apply() {
      if (custom) {
        try { localStorage.setItem('theme98.customWallpaper', custom); custom = null; }
        catch (e) {
          note.textContent = 'That picture is too large to save. Try a smaller one.';
          return false;
        }
      }
      prefs = draft;
      T.save(prefs);
      T.apply(prefs);
      arrangeIcons(prefs.arrange);
      draft = JSON.parse(JSON.stringify(prefs));
      applyBtn.disabled = true;
      return true;
    }

    // Tabs
    var tabs = win.querySelectorAll('[role="tab"]');
    function showTab(name) {
      Array.prototype.forEach.call(tabs, function (t) {
        t.setAttribute('aria-selected', t.querySelector('a').hash === '#' + name ? 'true' : 'false');
      });
      Array.prototype.forEach.call(win.querySelectorAll('.dp-panel'), function (p) {
        // Hidden pages keep their space (visibility, not display) so every tab is as tall as the tallest
        var off = p.getAttribute('data-tab') !== name;
        p.classList.toggle('is-off', off);
        if (off) p.setAttribute('inert', ''); else p.removeAttribute('inert');
      });
    }
    win.querySelector('.dp-tabs').addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a) return;
      e.preventDefault();
      showTab(a.hash.slice(1));
    });

    wpSel.addEventListener('change', function () {
      draft.wallpaper = wpSel.value;
      // Seamless tiles default to Tile; going back to a photo undoes that.
      var o = wpSel.options[wpSel.selectedIndex];
      if (o && o.hasAttribute('data-tile')) draft.position = 'tile';
      else if (draft.position === 'tile') delete draft.position;
      posSel.value = draft.position || '';
      changed();
    });
    posSel.addEventListener('change', function () {
      draft.position = posSel.value;   // "" = Stretch, kept so it overrides a default of Tile
      changed();
    });
    colIn.addEventListener('input', function () { draft.color = colIn.value; changed(); });
    styleSel.addEventListener('change', function () {
      if (styleSel.value) draft.style = styleSel.value; else delete draft.style;
      if (!draft.color) colIn.value = color();
      if (!('wallpaper' in draft)) wpSel.value = wpValue() || '';
      posSel.value = posValue() || '';
      changed();
    });
    sizeSel.addEventListener('change', function () { draft.large = sizeSel.value === 'large'; changed(); });
    animIn.addEventListener('change', function () { draft.anim = animIn.checked; changed(); });
    bigIn.addEventListener('change', function () { draft.bigIcons = bigIn.checked; changed(); });

    // Browse...: a picture from your computer, scaled down so it fits in browser storage.
    $('[data-act="browse"]').addEventListener('click', function () { fileIn.click(); });
    fileIn.addEventListener('change', function () {
      var f = fileIn.files && fileIn.files[0];
      if (!f) return;
      var url = URL.createObjectURL(f), img = new Image();
      img.onload = function () {
        var k = Math.min(1, 1920 / img.naturalWidth, 1200 / img.naturalHeight);
        var c = doc.createElement('canvas');
        c.width = Math.round(img.naturalWidth * k);
        c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        custom = c.toDataURL('image/jpeg', 0.85);
        URL.revokeObjectURL(url);
        ensureCustomOption();
        wpSel.value = 'custom';
        draft.wallpaper = 'custom';
        note.textContent = '';
        changed();
      };
      img.onerror = function () { note.textContent = 'That file is not a picture this browser can open.'; };
      img.src = url;
      fileIn.value = '';
    });

    win.querySelector('.dp-buttons').addEventListener('click', function (e) {
      var act = e.target.closest('[data-act]');
      if (!act) return;
      var a = act.getAttribute('data-act');
      if (a === 'apply') apply();
      else if (a === 'ok') { if (applyBtn.disabled || apply()) close(win); }
      else if (a === 'cancel') close(win);
      else if (a === 'defaults') {
        var keepArrange = draft.arrange;
        draft = {};
        if (keepArrange) draft.arrange = keepArrange;
        custom = null;
        wpSel.value = T.defaultWallpaper(draft) || '';
        posSel.value = T.defaultPosition(draft) || '';
        styleSel.value = '';
        colIn.value = color();
        sizeSel.value = cfg.readableProse ? 'large' : 'normal';
        animIn.checked = true;
        bigIn.checked = false;
        changed();
      }
    });

    win._reopen = function (t) { load(); showTab(t || 'bg'); };
    win._reopen(tab);
  };

  /* =====================================================================================
     Games (Start menu): Minefield, a mine-clearing puzzle, and Pairs, a card-matching game.
     Both are original and need no server. Best results are kept in this browser only.
     ===================================================================================== */
  var SCORE_KEY = 'theme98.scores';
  function scoreGet(game, key) {
    try { return ((JSON.parse(localStorage.getItem(SCORE_KEY) || '{}') || {})[game] || {})[key]; } catch (e) { return undefined; }
  }
  function scoreSet(game, key, val) {
    try {
      var all = JSON.parse(localStorage.getItem(SCORE_KEY) || '{}') || {};
      (all[game] = all[game] || {})[key] = val;
      localStorage.setItem(SCORE_KEY, JSON.stringify(all));
    } catch (e) {}
  }
  function num3(n) { return n < 0 ? '-' + pad(Math.min(99, -n), 2) : pad(Math.min(999, n), 3); }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function levelOptions(levels) {
    return Object.keys(levels).map(function (k) { return '<option value="' + k + '">' + esc(levels[k].label) + '</option>'; }).join('');
  }
  // Resize a floating game window to fit its board (the board changes size with the level).
  function fitWindow(win) {
    if (!win.classList.contains('is-floating') || win.classList.contains('is-maximized')) return;
    var b = win._box || { x: 40, y: 40 };
    win.style.setProperty('--w', 'max-content');
    win.style.setProperty('--h', 'auto');
    var r = win.getBoundingClientRect();
    place(win, b.x, b.y, Math.ceil(r.width), Math.ceil(r.height));
  }

  /* ---------------------------------- Minefield ---------------------------------- */
  var MF_LEVELS = {
    easy: { c: 9, r: 9, m: 10, label: 'Easy' },
    medium: { c: 16, r: 16, m: 40, label: 'Medium' },
    hard: { c: 30, r: 16, m: 99, label: 'Hard' }
  };

  programs.minefield = function () {
    var id = nextId('mf');
    var win = makeWindow({
      app: 'minefield', title: 'Minefield', icon: 'minefield', w: 300,
      body:
        '<div class="game game-mines">' +
          '<div class="game-bar">' +
            '<div class="game-lcd" title="Mines left (flags subtracted)"><span class="visually-hidden">Mines left</span><b class="mf-left">000</b></div>' +
            '<button type="button" class="mf-new">New Game</button>' +
            '<div class="game-lcd" title="Seconds"><span class="visually-hidden">Seconds</span><b class="mf-time">000</b></div>' +
          '</div>' +
          '<div class="game-bar game-opts">' +
            '<label for="' + id + '-lv">Level:</label>' +
            '<select id="' + id + '-lv" class="mf-level">' + levelOptions(MF_LEVELS) + '</select>' +
            '<span class="field-row"><input type="checkbox" id="' + id + '-fm" class="mf-flagmode"><label for="' + id + '-fm">Flag mode</label></span>' +
          '</div>' +
          '<div class="game-board-wrap"><div class="mf-field" tabindex="0" role="application" ' +
            'aria-label="Minefield. Arrow keys move, Space opens a square, F plants a flag."></div></div>' +
          '<p class="game-hint mf-hint"></p>' +
          '<span class="visually-hidden mf-sr" role="status"></span>' +
        '</div>',
      status: '<p class="status-bar-field mf-status" role="status"></p><p class="status-bar-field mf-best"></p>'
    });
    var $ = function (s) { return win.querySelector(s); };
    var field = $('.mf-field'), leftEl = $('.mf-left'), timeEl = $('.mf-time'), statusEl = $('.mf-status'), bestEl = $('.mf-best'), hintEl = $('.mf-hint');
    var levelSel = $('.mf-level'), flagMode = $('.mf-flagmode'), srEl = $('.mf-sr');
    var lv, cols, rows, mines, total, cells, els, opened, flags, started, over, cur, t0, timer, lastType = '';
    var saved = scoreGet('minefield', 'level');
    if (MF_LEVELS[saved]) levelSel.value = saved;

    function nb(i) {
      var c = i % cols, r = (i - c) / cols, out = [];
      for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        var rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) out.push(rr * cols + cc);
      }
      return out;
    }
    function label(i) {
      var c = cells[i], pos = 'Row ' + (Math.floor(i / cols) + 1) + ', column ' + (i % cols + 1) + ': ';
      if (c.flag && !c.open) return pos + 'flagged';
      if (!c.open) return pos + 'hidden';
      if (c.mine) return pos + 'mine';
      return pos + (c.n ? c.n + (c.n === 1 ? ' mine' : ' mines') + ' nearby' : 'clear');
    }
    function paint(i) {
      var c = cells[i], cls = 'mf-cell';
      if (c.open) {
        cls += ' is-open';
        if (c.mine) cls += c.boom ? ' is-mine is-boom' : ' is-mine';
        else if (c.n) cls += ' n' + c.n;
      } else if (c.flag) cls += c.wrong ? ' is-flag is-wrong' : ' is-flag';
      if (i === cur) cls += ' is-cursor';
      els[i].className = cls;
      els[i].textContent = c.open && !c.mine && c.n ? c.n : '';
    }
    function setLeft() { leftEl.textContent = num3(mines - flags); }
    function secs() { return t0 ? Math.min(999, Math.floor((Date.now() - t0) / 1000)) : 0; }
    function tick() { timeEl.textContent = num3(secs()); }
    function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
    function showBest() {
      var b = scoreGet('minefield', lv);
      bestEl.textContent = b ? 'Best ' + b + ' s' : 'No best yet';
    }
    function setCursor(i) {
      var old = cur;
      cur = i;
      if (old != null && els[old]) paint(old);
      paint(i);
      srEl.textContent = label(i);
    }

    function newGame() {
      stopTimer();
      lv = levelSel.value;
      var L = MF_LEVELS[lv];
      cols = L.c; rows = L.r; mines = L.m; total = cols * rows;
      cells = [];
      var html = '';
      for (var i = 0; i < total; i++) { cells.push({ mine: false, n: 0, open: false, flag: false }); html += '<div class="mf-cell" data-i="' + i + '"></div>'; }
      opened = 0; flags = 0; started = false; over = false; t0 = 0; cur = null;
      field.innerHTML = html;
      field.style.setProperty('--cols', cols);
      els = Array.prototype.slice.call(field.children);
      timeEl.textContent = '000';
      setLeft();
      statusEl.textContent = 'Click a square to start.';
      hintEl.textContent = cols + ' x ' + rows + ' squares, ' + mines + ' mines. Right-click or press F to plant a flag; long-press on a touch screen. Click a number to open its neighbours once its flags add up.';
      showBest();
      scoreSet('minefield', 'level', lv);
      setCursor(Math.floor(rows / 2) * cols + Math.floor(cols / 2));
      fitWindow(win);
    }

    // Mines go down on the first click, never on it (or, where there's room, next to it).
    function layMines(safe) {
      var avoid = {};
      avoid[safe] = 1;
      if (total - 9 >= mines) nb(safe).forEach(function (j) { avoid[j] = 1; });
      var pool = [];
      for (var i = 0; i < total; i++) if (!avoid[i]) pool.push(i);
      shuffle(pool);
      for (i = 0; i < mines; i++) cells[pool[i]].mine = true;
      for (i = 0; i < total; i++) cells[i].n = nb(i).filter(function (k) { return cells[k].mine; }).length;
    }

    function finish(won, hit) {
      over = true;
      stopTimer();
      var s = secs(), i, c;
      timeEl.textContent = num3(s);
      if (won) {
        for (i = 0; i < total; i++) if (cells[i].mine && !cells[i].flag) { cells[i].flag = true; paint(i); }
        flags = mines;
        setLeft();
        var sc = Math.max(1, s), best = scoreGet('minefield', lv), fresh = !best || sc < best;
        if (fresh) scoreSet('minefield', lv, sc);
        showBest();
        statusEl.textContent = 'Cleared in ' + s + ' s!' + (fresh ? ' New best.' : '');
      } else {
        cells[hit].open = true;
        cells[hit].boom = true;
        for (i = 0; i < total; i++) {
          c = cells[i];
          if (c.mine && !c.flag) c.open = true;
          else if (c.flag && !c.mine) c.wrong = true;
          paint(i);
        }
        statusEl.textContent = 'Boom! Press New Game.';
      }
    }

    function reveal(i) {
      var c = cells[i];
      if (over || c.open || c.flag) return;
      if (!started) { started = true; layMines(i); t0 = Date.now(); timer = setInterval(tick, 250); statusEl.textContent = 'Clear every safe square.'; }
      if (c.mine) { finish(false, i); return; }
      var stack = [i];
      while (stack.length) {
        var k = stack.pop(), ck = cells[k];
        if (ck.open || ck.flag) continue;
        ck.open = true;
        opened++;
        paint(k);
        if (ck.n === 0) nb(k).forEach(function (j) { if (!cells[j].open && !cells[j].flag) stack.push(j); });
      }
      if (opened === total - mines) finish(true);
    }
    function toggleFlag(i) {
      var c = cells[i];
      if (over || c.open) return;
      c.flag = !c.flag;
      flags += c.flag ? 1 : -1;
      paint(i);
      setLeft();
    }
    // Opening a number whose flags add up opens the rest of its neighbours.
    function chord(i) {
      var c = cells[i];
      if (!c.open || !c.n) return;
      var around = nb(i), f = around.filter(function (k) { return cells[k].flag; }).length;
      if (f === c.n) around.forEach(function (k) { reveal(k); });
    }
    function activate(i) { if (cells[i].open) chord(i); else reveal(i); }

    // Mouse: click opens, right-click flags. Touch: tap opens (or flags in Flag mode), long-press flags.
    var press = null, longPressed = false;
    field.addEventListener('pointerdown', function (e) {
      lastType = e.pointerType;
      longPressed = false;
      if (e.pointerType !== 'touch') return;
      var el = e.target.closest('.mf-cell');
      if (!el) return;
      press = setTimeout(function () {
        longPressed = true;
        toggleFlag(+el.getAttribute('data-i'));
        try { if (navigator.vibrate) navigator.vibrate(15); } catch (err) {}
      }, 420);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      field.addEventListener(ev, function () { clearTimeout(press); });
    });
    field.addEventListener('click', function (e) {
      var el = e.target.closest('.mf-cell');
      if (!el) return;
      if (longPressed) { longPressed = false; return; }
      var i = +el.getAttribute('data-i');
      if (flagMode.checked) toggleFlag(i); else activate(i);
      setCursor(i);
    });
    field.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      var el = e.target.closest('.mf-cell');
      if (el && lastType !== 'touch') { var i = +el.getAttribute('data-i'); toggleFlag(i); setCursor(i); }
    });
    field.addEventListener('keydown', function (e) {
      var r = Math.floor(cur / cols), c = cur % cols, k = e.key, moved = true;
      if (k === 'ArrowLeft') c = Math.max(0, c - 1);
      else if (k === 'ArrowRight') c = Math.min(cols - 1, c + 1);
      else if (k === 'ArrowUp') r = Math.max(0, r - 1);
      else if (k === 'ArrowDown') r = Math.min(rows - 1, r + 1);
      else if (k === 'Home') c = 0;
      else if (k === 'End') c = cols - 1;
      else moved = false;
      if (moved) { e.preventDefault(); setCursor(r * cols + c); return; }
      if (k === ' ' || k === 'Enter') { e.preventDefault(); activate(cur); srEl.textContent = label(cur); }
      else if (k === 'f' || k === 'F') { e.preventDefault(); toggleFlag(cur); srEl.textContent = label(cur); }
    });
    levelSel.addEventListener('change', newGame);
    $('.mf-new').addEventListener('click', newGame);
    win._cleanup = stopTimer;
    newGame();
    field.focus({ preventScroll: true });
  };

  /* ------------------------------------ Pairs ------------------------------------ */
  var PR_NAMES = ['computer', 'document', 'folder', 'help', 'image', 'info', 'internet', 'my-documents',
                  'network', 'notepad', 'recycle-bin', 'run', 'search', 'settings', 'warning', 'zip'];
  var PR_LEVELS = {
    easy: { c: 4, r: 3, label: 'Easy' },
    medium: { c: 4, r: 4, label: 'Medium' },
    hard: { c: 6, r: 4, label: 'Hard' }
  };

  programs.pairs = function () {
    var id = nextId('pr');
    var win = makeWindow({
      app: 'pairs', title: 'Pairs', icon: 'pairs', w: 320,
      body:
        '<div class="game game-pairs">' +
          '<div class="game-bar">' +
            '<div class="game-lcd" title="Moves"><span class="visually-hidden">Moves</span><b class="pr-moves">000</b></div>' +
            '<button type="button" class="pr-new">New Game</button>' +
            '<div class="game-lcd" title="Seconds"><span class="visually-hidden">Seconds</span><b class="pr-time">000</b></div>' +
          '</div>' +
          '<div class="game-bar game-opts">' +
            '<label for="' + id + '-lv">Level:</label>' +
            '<select id="' + id + '-lv" class="pr-level">' + levelOptions(PR_LEVELS) + '</select>' +
          '</div>' +
          '<div class="game-board-wrap"><div class="pr-board" role="group" aria-label="Cards"></div></div>' +
          '<p class="game-hint pr-hint"></p>' +
        '</div>',
      status: '<p class="status-bar-field pr-status" role="status"></p><p class="status-bar-field pr-best"></p>'
    });
    var $ = function (s) { return win.querySelector(s); };
    var board = $('.pr-board'), movesEl = $('.pr-moves'), timeEl = $('.pr-time'), statusEl = $('.pr-status'), bestEl = $('.pr-best'), hintEl = $('.pr-hint');
    var levelSel = $('.pr-level');
    var lv, cards, first, busy, moves, matched, t0, timer, hideTimer;
    var saved = scoreGet('pairs', 'level');
    if (PR_LEVELS[saved]) levelSel.value = saved;

    function secs() { return t0 ? Math.min(999, Math.floor((Date.now() - t0) / 1000)) : 0; }
    function tick() { timeEl.textContent = num3(secs()); }
    function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
    function showBest() {
      var b = scoreGet('pairs', lv);
      bestEl.textContent = b ? 'Best ' + b + ' moves' : 'No best yet';
    }
    function paintCard(i) {
      var c = cards[i], el = board.children[i];
      el.className = 'pr-card' + (c.done ? ' is-done' : c.up ? ' is-up' : '');
      el.setAttribute('aria-label', 'Card ' + (i + 1) + ', ' + (c.up || c.done ? c.name.replace(/-/g, ' ') + (c.done ? ', matched' : '') : 'face down'));
    }

    function newGame() {
      clearTimeout(hideTimer);
      stopTimer();
      lv = levelSel.value;
      var L = PR_LEVELS[lv], n = L.c * L.r / 2;
      var pool = shuffle(PR_NAMES.slice()).slice(0, n);
      cards = shuffle(pool.concat(pool)).map(function (name) { return { name: name, up: false, done: false }; });
      first = -1; busy = false; moves = 0; matched = 0; t0 = 0;
      board.style.setProperty('--cols', L.c);
      board.innerHTML = cards.map(function (c, i) {
        return '<div class="pr-card" role="button" tabindex="0" data-i="' + i + '" aria-label="Card ' + (i + 1) + ', face down">' +
          '<img src="' + esc(iconUrl(c.name, 32)) + '" alt="" width="32" height="32"></div>';
      }).join('');
      movesEl.textContent = '000';
      timeEl.textContent = '000';
      statusEl.textContent = 'Find the matching pairs.';
      hintEl.textContent = cards.length + ' cards, ' + (cards.length / 2) + ' pairs. Flip two at a time; the fewer moves the better.';
      showBest();
      scoreSet('pairs', 'level', lv);
      fitWindow(win);
    }

    function finish() {
      stopTimer();
      var s = secs(), best = scoreGet('pairs', lv), fresh = !best || moves < best;
      if (fresh) scoreSet('pairs', lv, moves);
      showBest();
      statusEl.textContent = 'Done: ' + moves + ' moves, ' + s + ' s!' + (fresh ? ' New best.' : '');
    }

    function flip(i) {
      var c = cards[i];
      if (busy || c.up || c.done) return;
      if (!t0) { t0 = Date.now(); timer = setInterval(tick, 250); }
      c.up = true;
      paintCard(i);
      if (first < 0) { first = i; return; }
      moves++;
      movesEl.textContent = num3(moves);
      var a = cards[first], f = first;
      first = -1;
      if (a.name === c.name) {
        a.done = c.done = true;
        a.up = c.up = false;
        paintCard(f); paintCard(i);
        matched++;
        statusEl.textContent = 'A match! ' + matched + ' of ' + (cards.length / 2) + '.';
        if (matched === cards.length / 2) finish();
      } else {
        busy = true;
        statusEl.textContent = 'Not a match.';
        hideTimer = setTimeout(function () {
          a.up = false; c.up = false;
          paintCard(f); paintCard(i);
          busy = false;
        }, 850);
      }
    }

    board.addEventListener('click', function (e) {
      var el = e.target.closest('.pr-card');
      if (el) flip(+el.getAttribute('data-i'));
    });
    board.addEventListener('keydown', function (e) {
      var el = e.target.closest('.pr-card');
      if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); flip(+el.getAttribute('data-i')); }
    });
    levelSel.addEventListener('change', newGame);
    $('.pr-new').addEventListener('click', newGame);
    win._cleanup = function () { stopTimer(); clearTimeout(hideTimer); };
    newGame();
  };


  /* ---------------------------- Desktop right-click menu ---------------------------- */
  var iconBox = doc.querySelector('.desktop-icons');
  var iconOrder = iconBox ? Array.prototype.slice.call(iconBox.children) : [];
  function arrangeIcons(by) {
    if (!iconBox) return;
    var list = iconOrder.slice();
    function key(a) { return a.textContent.trim().toLowerCase(); }
    function type(a) { var m = (a.querySelector('img') || {}).src || ''; return m.replace(/.*\/|-\d+\.\w+$/g, ''); }
    if (by === 'name') list.sort(function (a, b) { return key(a) < key(b) ? -1 : 1; });
    if (by === 'type') list.sort(function (a, b) { return type(a) < type(b) ? -1 : type(a) > type(b) ? 1 : key(a) < key(b) ? -1 : 1; });
    list.forEach(function (a) { iconBox.appendChild(a); });
  }
  function setArrange(by) {
    if (by) prefs.arrange = by; else delete prefs.arrange;
    T.save(prefs);
    arrangeIcons(by);
  }
  arrangeIcons(prefs.arrange);
  T.apply(prefs);   // again now that <body> exists (wallpaper class, font size)
  if (window.matchMedia) {
    var darkMQ = matchMedia('(prefers-color-scheme: dark)');
    var onDark = function () { if (!prefs.style) T.apply(prefs); };
    if (darkMQ.addEventListener) darkMQ.addEventListener('change', onDark); else if (darkMQ.addListener) darkMQ.addListener(onDark);
  }

  var ctx = null;
  function closeCtx() {
    if (!ctx) return;
    ctx.remove();
    ctx = null;
    if (ctx_return && ctx_return.focus) ctx_return.focus({ preventScroll: true });
  }
  var ctx_return = null;

  function buildMenu(items) {
    var ul = doc.createElement('ul');
    ul.className = 'ctx-menu';
    ul.setAttribute('role', 'menu');
    items.forEach(function (it) {
      var li = doc.createElement('li');
      if (it.sep) { li.className = 'ctx-sep'; li.setAttribute('role', 'separator'); ul.appendChild(li); return; }
      li.setAttribute('role', 'none');
      var item = doc.createElement('div');
      item.className = 'ctx-item' + (it.checked ? ' is-checked' : '') + (it.bold ? ' is-default' : '');
      item.setAttribute('role', it.checked !== undefined ? 'menuitemradio' : 'menuitem');
      if (it.checked !== undefined) item.setAttribute('aria-checked', it.checked ? 'true' : 'false');
      item.tabIndex = -1;
      item.textContent = it.label;
      li.appendChild(item);
      if (it.sub) {
        li.className = 'has-sub';
        item.setAttribute('aria-haspopup', 'menu');
        var sub = buildMenu(it.sub);
        sub.classList.add('ctx-sub');
        li.appendChild(sub);
      } else {
        item._action = it.action;
      }
      ul.appendChild(li);
    });
    return ul;
  }

  function showCtx(x, y, items) {
    closeCtx();
    ctx_return = doc.activeElement;
    ctx = buildMenu(items);
    ctx.classList.add('ctx-root');
    doc.body.appendChild(ctx);
    var vw = doc.documentElement.clientWidth, vh = window.innerHeight;
    var r = ctx.getBoundingClientRect();
    if (x + r.width > vw) x = Math.max(0, x - r.width);
    if (y + r.height > vh - taskbarH) y = Math.max(0, y - r.height);
    if (x + r.width * 2 > vw) ctx.classList.add('flip');
    ctx.style.left = x + 'px';
    ctx.style.top = y + 'px';
    ctx.querySelector('.ctx-item').focus({ preventScroll: true });
  }

  function desktopMenu() {
    var by = prefs.arrange || '';
    return [
      { label: 'Arrange Icons', sub: [
        { label: 'by Name', checked: by === 'name', action: function () { setArrange('name'); } },
        { label: 'by Type', checked: by === 'type', action: function () { setArrange('type'); } },
        { label: 'Original Order', checked: by === '', action: function () { setArrange(''); } }
      ] },
      { sep: true },
      { label: 'Refresh', action: function () { location.reload(); } },
      { sep: true },
      { label: 'Command Prompt', action: function () { openApp('cmd'); } },
      { label: 'Search...', action: function () { openApp('search'); } },
      { sep: true },
      { label: 'Properties', action: function () { openApp('display'); } }
    ];
  }

  doc.addEventListener('contextmenu', function (e) {
    // Windows, links, form fields and the taskbar keep the browser's own menu; Shift+right-click too.
    if (e.shiftKey || e.target.closest('.window, .taskbar, a, input, textarea, select, iframe, .ctx-menu')) return;
    e.preventDefault();
    var x = e.clientX, y = e.clientY;
    if (!x && !y) { x = 24; y = 24; }   // opened from the keyboard
    showCtx(x, y, desktopMenu());
  });

  function runItem(item) {
    if (!item || item.parentNode.classList.contains('has-sub')) return;
    var fn = item._action;
    closeCtx();
    if (fn) fn();
  }

  doc.addEventListener('click', function (e) {
    if (!ctx) return;
    var item = e.target.closest('.ctx-item');
    if (item && ctx.contains(item)) runItem(item);
    else if (!ctx.contains(e.target)) closeCtx();
  });
  doc.addEventListener('pointerdown', function (e) {
    if (ctx && !ctx.contains(e.target)) closeCtx();
  }, true);
  window.addEventListener('blur', closeCtx);
  window.addEventListener('resize', closeCtx);

  doc.addEventListener('mouseover', function (e) {
    var item = ctx && e.target.closest('.ctx-item');
    if (item && ctx.contains(item)) item.focus({ preventScroll: true });
  });

  doc.addEventListener('keydown', function (e) {
    if (!ctx || !ctx.contains(doc.activeElement)) return;
    var item = doc.activeElement, menu = item.closest('.ctx-menu');
    var items = Array.prototype.filter.call(menu.children, function (li) { return li.getAttribute('role') !== 'separator'; })
      .map(function (li) { return li.querySelector('.ctx-item'); });
    var i = items.indexOf(item), li = item.parentNode;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus();
    } else if (e.key === 'ArrowRight' && li.classList.contains('has-sub')) {
      e.preventDefault();
      li.classList.add('open');
      li.querySelector('.ctx-sub .ctx-item').focus();
    } else if (e.key === 'ArrowLeft' && menu.classList.contains('ctx-sub')) {
      e.preventDefault();
      menu.parentNode.classList.remove('open');
      menu.parentNode.querySelector('.ctx-item').focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (li.classList.contains('has-sub')) { li.classList.add('open'); li.querySelector('.ctx-sub .ctx-item').focus(); }
      else runItem(item);
    } else if (e.key === 'Tab') {
      e.preventDefault();
    }
  });
})();

'use strict';
/* Gate Escape — analytics beacon (client half; the server half is tools/beacon/).
   Wraps the existing local telemetry: every track(ev, data) call ALSO enqueues an
   anonymous event for the collector, batched and flushed in the background.

   Privacy posture: no PII, no fingerprinting. The install id is a random UUID in
   localStorage (ge_iid), the session id a random UUID per page load; the only
   device facts sent are screen size / dpr / coarse language / timezone offset in
   the one session_start event (needed to sanity-check viewports and cohort hours).

   Fail-safety: everything is wrapped in try/catch, nothing throws, nothing blocks
   gameplay, and with window.BEACON_URL empty this file does nothing at all — zero
   network. Offline, the queue is capped at 200 events and simply drops the rest. */
(function () {
  var V = 'p01.20260831'; // build version, stamped on every event
  var URL_ = '';
  try { URL_ = (typeof window.BEACON_URL === 'string' && window.BEACON_URL) || ''; } catch (e) {}
  if (!URL_) { window.GE_BEACON = { enabled: false, queue: [], flush: function () {} }; return; }
  try {
    var uuid = function () {
      try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
      var s = '';
      for (var i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
      return s;
    };
    var iid = null;
    try { iid = localStorage.getItem('ge_iid'); } catch (e) {}
    if (!iid || !/^[0-9a-f-]{8,36}$/i.test(iid)) {
      iid = uuid();
      try { localStorage.setItem('ge_iid', iid); } catch (e) {}
    }
    var sid = uuid(), seq = 0, q = [];
    var MAX_Q = 200, BATCH_AT = 20, FLUSH_MS = 15000, HEARTBEAT_MS = 60000;
    var lvl = function () { try { return window.GE ? window.GE.level + 1 : null; } catch (e) { return null; } };
    var enqueue = function (ev, data) {
      try {
        if (q.length >= MAX_Q) return; // offline / endpoint down: drop, never grow
        q.push({ iid: iid, sid: sid, seq: seq++, t: Date.now(), ev: ev, data: data === undefined ? null : data, lvl: lvl(), v: V });
        if (q.length >= BATCH_AT) flush();
      } catch (e) {}
    };
    var restore = function (batch) { try { if (q.length + batch.length <= MAX_Q) q = batch.concat(q); } catch (e) {} };
    var flush = function (sync) {
      try {
        if (!q.length) return;
        var batch = q.splice(0, 64); // the worker caps a batch at 64 events
        var body = JSON.stringify(batch);
        // text/plain keeps both paths a "simple" CORS request (no preflight); the worker
        // parses the body as JSON regardless of content type
        if (sync && navigator.sendBeacon) {
          if (!navigator.sendBeacon(URL_, new Blob([body], { type: 'text/plain' }))) restore(batch);
        } else if (window.fetch) {
          fetch(URL_, { method: 'POST', body: body, keepalive: true, headers: { 'Content-Type': 'text/plain' } })
            .then(function (r) { if (!r.ok) restore(batch); })
            .catch(function () { restore(batch); });
        } else if (navigator.sendBeacon) {
          navigator.sendBeacon(URL_, new Blob([body], { type: 'text/plain' }));
        }
      } catch (e) {}
    };
    // wrap the game's telemetry: the local ge_stats counters keep working untouched
    var orig = window.track;
    window.track = function (ev, data) {
      try { if (orig) orig(ev, data); } catch (e) {}
      enqueue(ev, data);
    };
    enqueue('session_start', {
      v: V,
      w: (screen && screen.width) || 0, h: (screen && screen.height) || 0,
      dpr: Math.round((window.devicePixelRatio || 1) * 100) / 100,
      lang: String((navigator.language || '')).slice(0, 8),
      tz: -new Date().getTimezoneOffset(),
    });
    // game.js fired its first level_start before this script loaded: restore parity
    enqueue('level_start', lvl());
    setInterval(function () { try { flush(); } catch (e) {} }, FLUSH_MS);
    // heartbeat for playtime metrics: one per minute while the tab is visible
    setInterval(function () { try { if (!document.hidden) enqueue('heartbeat', null); } catch (e) {} }, HEARTBEAT_MS);
    document.addEventListener('visibilitychange', function () { try { if (document.hidden) flush(true); } catch (e) {} });
    window.addEventListener('pagehide', function () { try { flush(true); } catch (e) {} });
    window.GE_BEACON = { enabled: true, iid: iid, sid: sid, get queue() { return q; }, flush: flush };
  } catch (e) {
    try { window.GE_BEACON = { enabled: false, queue: [], flush: function () {} }; } catch (e2) {}
  }
})();

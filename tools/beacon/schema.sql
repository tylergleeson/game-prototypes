-- Gate Escape beacon: one row per client event. No PII — iid/sid are random
-- client-generated ids; ip_country is Cloudflare's coarse country code from the
-- edge request (the IP itself is never stored).
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  iid TEXT NOT NULL,            -- anonymous install id (localStorage ge_iid)
  sid TEXT NOT NULL,            -- session id (one per page load)
  seq INTEGER NOT NULL,         -- client event counter within the session
  t INTEGER NOT NULL,           -- client timestamp (ms epoch)
  ev TEXT NOT NULL,             -- event name (session_start, level_start, win, fail, ...)
  lvl INTEGER,                  -- 1-based level in play when the event fired
  data TEXT,                    -- event payload, JSON (<= 1 KB)
  v TEXT,                       -- client build version
  received_at INTEGER NOT NULL, -- server timestamp (ms epoch)
  ip_country TEXT               -- coarse country from cf headers only
);
CREATE INDEX IF NOT EXISTS idx_events_iid ON events (iid);
CREATE INDEX IF NOT EXISTS idx_events_ev_lvl ON events (ev, lvl);
CREATE INDEX IF NOT EXISTS idx_events_t ON events (t);

CREATE TABLE wt_moderators (
 user_id INTEGER PRIMARY KEY REFERENCES users(id),
 role TEXT NOT NULL DEFAULT 'moderator' CHECK(role IN ('moderator','admin')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE wt_reports (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 reporter_id INTEGER REFERENCES users(id),
 reporter_name TEXT,
 reporter_email TEXT,
 work_id INTEGER NOT NULL REFERENCES wt_works(id) ON DELETE CASCADE,
 chapter_id INTEGER REFERENCES wt_chapters(id) ON DELETE SET NULL,
 reason TEXT NOT NULL CHECK(reason IN ('copyright','illegal','adult','spam','other')),
 details TEXT NOT NULL DEFAULT '',
 original_url TEXT,
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_review','actioned','dismissed')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 resolved_by INTEGER REFERENCES users(id),
 resolved_at TEXT
);
CREATE INDEX idx_wt_reports_status ON wt_reports(status,created_at);
CREATE TABLE wt_moderation_log (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 actor_id INTEGER REFERENCES users(id),
 action TEXT NOT NULL,
 work_id INTEGER,
 chapter_id INTEGER,
 report_id INTEGER,
 note TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_wt_modlog_work ON wt_moderation_log(work_id,created_at);

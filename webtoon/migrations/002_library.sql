CREATE TABLE wt_library (
 user_id INTEGER NOT NULL REFERENCES users(id),
 work_id INTEGER NOT NULL REFERENCES wt_works(id) ON DELETE CASCADE,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,work_id)
);
CREATE TABLE wt_collections (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL REFERENCES users(id),
 name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 60),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(user_id,name)
);
CREATE TABLE wt_collection_items (
 collection_id INTEGER NOT NULL REFERENCES wt_collections(id) ON DELETE CASCADE,
 work_id INTEGER NOT NULL REFERENCES wt_works(id) ON DELETE CASCADE,
 added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(collection_id,work_id)
);
CREATE TABLE wt_history (
 user_id INTEGER NOT NULL REFERENCES users(id),
 work_id INTEGER NOT NULL REFERENCES wt_works(id) ON DELETE CASCADE,
 chapter_id INTEGER NOT NULL REFERENCES wt_chapters(id) ON DELETE CASCADE,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,work_id)
);
CREATE INDEX idx_wt_history_user ON wt_history(user_id,updated_at);
CREATE TABLE wt_progress (
 user_id INTEGER NOT NULL REFERENCES users(id),
 chapter_id INTEGER NOT NULL REFERENCES wt_chapters(id) ON DELETE CASCADE,
 position REAL NOT NULL DEFAULT 0 CHECK(position>=0 AND position<=1),
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,chapter_id)
);
CREATE TABLE wt_stats_daily (
 work_id INTEGER NOT NULL REFERENCES wt_works(id) ON DELETE CASCADE,
 day TEXT NOT NULL,
 views INTEGER NOT NULL DEFAULT 0,
 reads INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(work_id,day)
);

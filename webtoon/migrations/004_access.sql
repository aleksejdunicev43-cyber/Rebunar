-- Entitlements foundation only. Payment processing is not enabled.
CREATE TABLE wt_entitlements (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL REFERENCES users(id),
 chapter_id INTEGER NOT NULL REFERENCES wt_chapters(id) ON DELETE CASCADE,
 source TEXT NOT NULL DEFAULT 'grant' CHECK(source IN ('grant','purchase','promo')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(user_id,chapter_id)
);

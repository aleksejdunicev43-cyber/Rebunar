-- Catalog tables. All references point to existing Rebunar accounts.
CREATE TABLE wt_genres (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE);
INSERT INTO wt_genres(name) VALUES
('Фэнтези'),('Романтика'),('Драма'),('Экшен'),('Комедия'),('Мистика'),('Фантастика'),
('Детектив'),('Повседневность'),('Хоррор'),('Киберпанк'),('Спорт'),('Исторический');
CREATE TABLE wt_works (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 owner_id INTEGER NOT NULL REFERENCES users(id),
 title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 120),
 description TEXT NOT NULL DEFAULT '',
 format TEXT NOT NULL DEFAULT 'webtoon' CHECK(format IN ('webtoon','manhwa','manga','manhua','comic')),
 language TEXT NOT NULL DEFAULT 'ru',
 is_color INTEGER NOT NULL DEFAULT 1 CHECK(is_color IN (0,1)),
 serial_status TEXT NOT NULL DEFAULT 'ongoing' CHECK(serial_status IN ('ongoing','completed','hiatus')),
 publication_status TEXT NOT NULL DEFAULT 'draft' CHECK(publication_status IN ('draft','pending','published','hidden','rejected')),
 cover_path TEXT,
 monetization_enabled INTEGER NOT NULL DEFAULT 0 CHECK(monetization_enabled IN (0,1)),
 views INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 published_at TEXT
);
CREATE INDEX idx_wt_works_owner ON wt_works(owner_id);
CREATE INDEX idx_wt_works_pub ON wt_works(publication_status,published_at);
CREATE TABLE wt_work_genres (
 work_id INTEGER NOT NULL REFERENCES wt_works(id) ON DELETE CASCADE,
 genre_id INTEGER NOT NULL REFERENCES wt_genres(id),
 PRIMARY KEY(work_id,genre_id)
);
CREATE TABLE wt_chapters (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 work_id INTEGER NOT NULL REFERENCES wt_works(id) ON DELETE CASCADE,
 position INTEGER NOT NULL,
 title TEXT NOT NULL DEFAULT '',
 publication_status TEXT NOT NULL DEFAULT 'draft' CHECK(publication_status IN ('draft','published','hidden')),
 price_cents INTEGER NOT NULL DEFAULT 0 CHECK(price_cents>=0),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 published_at TEXT
);
CREATE INDEX idx_wt_chapters_work ON wt_chapters(work_id,position);
CREATE TABLE wt_pages (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 chapter_id INTEGER NOT NULL REFERENCES wt_chapters(id) ON DELETE CASCADE,
 position INTEGER NOT NULL,
 path TEXT NOT NULL,
 width INTEGER,
 height INTEGER,
 bytes INTEGER
);
CREATE INDEX idx_wt_pages_chapter ON wt_pages(chapter_id,position);

-- ============================================================
-- LJD Task Management — Supabase Setup
-- Jalankan keseluruhan script ini dalam SQL Editor Supabase
-- ============================================================


-- ─── 1. TABLE: tasks ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  priority      TEXT NOT NULL CHECK (priority IN ('urgent', 'asap', 'normal')),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
  due_date      DATE,
  assigned_to   TEXT NOT NULL,
  created_by    TEXT NOT NULL,
  attachment_url  TEXT,
  attachment_name TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ─── 2. TABLE: comments ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author     TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ─── 3. AUTO-UPDATE updated_at ──────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON tasks;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- ─── 4. INDEXES (untuk performance) ─────────────────────────

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to  ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date     ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status       ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority     ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_comments_task_id   ON comments(task_id);


-- ─── 5. ROW LEVEL SECURITY ──────────────────────────────────
-- App guna anon key + hardcoded auth, so kita allow semua ops.

ALTER TABLE tasks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Buang policy lama kalau ada (elak conflict)
DROP POLICY IF EXISTS "Allow all on tasks"    ON tasks;
DROP POLICY IF EXISTS "Allow all on comments" ON comments;

-- Buat policy baru
CREATE POLICY "Allow all on tasks"
  ON tasks FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all on comments"
  ON comments FOR ALL
  USING (true)
  WITH CHECK (true);


-- ─── 6. VERIFY ──────────────────────────────────────────────
-- Selepas run, check output bawah — patut ada 2 table.

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('tasks', 'comments');

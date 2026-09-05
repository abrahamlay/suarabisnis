import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import path from "path";
import * as schema from "./schema";

const DB_PATH = process.env.DATABASE_URL || path.join(process.cwd(), "data", "demo.db");

// Ensure data directory exists
import fs from "fs";
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const client = createClient({ url: `file:${DB_PATH}` });

// Auto-create tables on first run (synchronous, libsql execute is sync-friendly)
const INIT_SQL = `
  CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    plan TEXT NOT NULL DEFAULT 'free',
    owner_email TEXT,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#0ea5e9',
    accent_color TEXT DEFAULT '#1e293b',
    greeting_text TEXT DEFAULT 'Halo! Beri kami kritik dan saran',
    thankyou_text TEXT DEFAULT 'Terima kasih! Kritik dan saran Anda sangat berharga',
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'staff',
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    current_period_end INTEGER,
    mock_subscription_id TEXT UNIQUE,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS branches (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    address TEXT,
    google_place_id TEXT,
    google_place_lat REAL,
    google_place_lng REAL,
    google_place_name TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'message',
    "order" INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    rating INTEGER,
    outcome TEXT,
    customer_name TEXT,
    customer_contact TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'medium',
    assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
    ip_hash TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS feedback_replies (
    id TEXT PRIMARY KEY,
    feedback_id TEXT NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL DEFAULT 'Owner',
    message TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS feedback_notes (
    id TEXT PRIMARY KEY,
    feedback_id TEXT NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL DEFAULT 'Owner',
    note TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_feedback_notes_feedback ON feedback_notes(feedback_id);
  CREATE TABLE IF NOT EXISTS review_qr_tokens (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    google_place_id TEXT NOT NULL,
    google_place_name TEXT,
    google_original_url TEXT,
    google_place_lat REAL,
    google_place_lng REAL,
    label TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS review_scans (
    id TEXT PRIMARY KEY,
    token_id TEXT NOT NULL REFERENCES review_qr_tokens(id) ON DELETE CASCADE,
    scanned_at INTEGER NOT NULL DEFAULT (unixepoch()),
    user_agent TEXT,
    ip_hash TEXT,
    converted_to_review INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_feedback_tenant ON feedback(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
  CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at);
  CREATE INDEX IF NOT EXISTS idx_branches_tenant ON branches(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_scans_token ON review_scans(token_id);
  CREATE INDEX IF NOT EXISTS idx_scans_time ON review_scans(scanned_at);
  CREATE TABLE IF NOT EXISTS device_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    fcm_token TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL,
    device_name TEXT,
    user_agent TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    last_active INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    revoked_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id);
  CREATE INDEX IF NOT EXISTS idx_device_tokens_active ON device_tokens(active);
  CREATE TABLE IF NOT EXISTS notification_prefs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    push_enabled INTEGER NOT NULL DEFAULT 1,
    email_enabled INTEGER NOT NULL DEFAULT 1,
    email_address TEXT,
    notify_on_positive INTEGER NOT NULL DEFAULT 0,
    notify_on_negative INTEGER NOT NULL DEFAULT 1,
    notify_on_neutral INTEGER NOT NULL DEFAULT 0,
    quiet_hours_enabled INTEGER NOT NULL DEFAULT 0,
    quiet_hours_start TEXT DEFAULT '22:00',
    quiet_hours_end TEXT DEFAULT '07:00',
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    channel TEXT NOT NULL,
    trigger_type TEXT NOT NULL,
    feedback_id TEXT REFERENCES feedback(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    external_id TEXT,
    error_message TEXT,
    sent_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

  -- visits (Phase 1) - funnel analytics
  CREATE TABLE IF NOT EXISTS visits (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    qr_token_id TEXT REFERENCES review_qr_tokens(id) ON DELETE SET NULL,
    user_agent TEXT,
    ip_hash TEXT,
    action TEXT NOT NULL DEFAULT 'viewed',
    duration_ms INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_visits_tenant ON visits(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_visits_created ON visits(created_at);
  CREATE INDEX IF NOT EXISTS idx_visits_branch ON visits(branch_id);
  CREATE INDEX IF NOT EXISTS idx_visits_action ON visits(action);

  -- social_proof_images (Phase 3) - generated review images
  CREATE TABLE IF NOT EXISTS social_proof_images (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    feedback_id TEXT REFERENCES feedback(id) ON DELETE SET NULL,
    template TEXT NOT NULL,
    image_data TEXT NOT NULL,
    width INTEGER NOT NULL DEFAULT 1080,
    height INTEGER NOT NULL DEFAULT 1920,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_social_proof_tenant ON social_proof_images(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_social_proof_created ON social_proof_images(created_at);

  -- Migrations for existing DBs (additive only, idempotent via try/catch at runtime)
  -- tenants branding
  ALTER TABLE tenants ADD COLUMN primary_color TEXT DEFAULT '#0ea5e9';
  ALTER TABLE tenants ADD COLUMN accent_color TEXT DEFAULT '#1e293b';
  ALTER TABLE tenants ADD COLUMN greeting_text TEXT DEFAULT 'Halo! Beri kami kritik dan saran';
  ALTER TABLE tenants ADD COLUMN thankyou_text TEXT DEFAULT 'Terima kasih! Kritik dan saran Anda sangat berharga';
  -- feedback outcome
  ALTER TABLE feedback ADD COLUMN outcome TEXT;
  CREATE INDEX IF NOT EXISTS idx_feedback_outcome ON feedback(outcome);
`;

// Split by semicolons and execute each statement (libsql executeMultiple handles this but tx version requires sync)
const statements = INIT_SQL.split(";").map(s => s.trim()).filter(Boolean);

let initPromise: Promise<void> | null = null;
function ensureSchema() {
  if (!initPromise) {
    initPromise = (async () => {
      for (const stmt of statements) {
        try {
          await client.execute(stmt);
        } catch (err) {
          // Swallow "duplicate column" / "table already exists" errors (idempotent migrations)
          const msg = err instanceof Error ? err.message : String(err);
          if (
            msg.includes("duplicate column name") ||
            msg.includes("already exists") ||
            msg.includes("no such column")
          ) {
            continue;
          }
          console.error("[db] init statement failed:", stmt.slice(0, 80), "->", msg);
          throw err;
        }
      }
      // Backfill outcome for existing feedback rows based on rating
      try {
        await client.execute("UPDATE feedback SET outcome = 'positive' WHERE rating >= 4 AND outcome IS NULL");
        await client.execute("UPDATE feedback SET outcome = 'neutral' WHERE rating = 3 AND outcome IS NULL");
        await client.execute("UPDATE feedback SET outcome = 'negative' WHERE rating <= 2 AND outcome IS NULL");
      } catch (err) {
        console.error("[db] outcome backfill failed:", err);
      }
    })();
  }
  return initPromise;
}

export const db = drizzle(client, { schema });
export { ensureSchema };

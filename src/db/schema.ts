import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const tenants = sqliteTable("tenants", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: text("plan", { enum: ["free", "basic", "pro"] }).default("free").notNull(),
  ownerEmail: text("owner_email"),
  logoUrl: text("logo_url"),
  /** Phase 4: branding customization */
  primaryColor: text("primary_color").default("#0ea5e9"),
  accentColor: text("accent_color").default("#1e293b"),
  greetingText: text("greeting_text").default("Halo! Beri kami kritik dan saran"),
  thankYouText: text("thankyou_text").default("Terima kasih! Kritik dan saran Anda sangat berharga."),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  role: text("role", { enum: ["owner", "admin", "staff"] }).default("staff").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  plan: text("plan", { enum: ["free", "basic", "pro"] }).notNull(),
  status: text("status", { enum: ["active", "trialing", "canceled", "past_due"] }).default("active").notNull(),
  currentPeriodEnd: integer("current_period_end", { mode: "timestamp" }),
  mockSubscriptionId: text("mock_subscription_id").unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const branches = sqliteTable("branches", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  address: text("address"),
  googlePlaceId: text("google_place_id"),
  // Latitude/longitude of this branch (used to embed Google Maps in the
  // public feedback form so customers can see the location before reviewing)
  googlePlaceLat: real("google_place_lat"),
  googlePlaceLng: real("google_place_lng"),
  googlePlaceName: text("google_place_name"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  icon: text("icon").default("message"),
  order: integer("order").default(0).notNull(),
  active: integer("active").default(1).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const feedback = sqliteTable("feedback", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  branchId: text("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
  message: text("message").notNull(),
  rating: integer("rating"),
  /** Phase 1: derived from rating for funnel analytics. positive (4-5) | neutral (3) | negative (1-2) | null (no rating) */
  outcome: text("outcome", { enum: ["positive", "negative", "neutral"] }),
  customerName: text("customer_name"),
  customerContact: text("customer_contact"),
  status: text("status", { enum: ["open", "in_progress", "closed"] }).default("open").notNull(),
  priority: text("priority", { enum: ["low", "medium", "high"] }).default("medium").notNull(),
  assignedTo: text("assigned_to").references(() => users.id, { onDelete: "set null" }),
  ipHash: text("ip_hash"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const feedbackReplies = sqliteTable("feedback_replies", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  feedbackId: text("feedback_id").notNull().references(() => feedback.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  authorName: text("author_name").notNull().default("Owner"),
  message: text("message").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

/** Phase 2: internal notes on a feedback (only visible to team, not to customer) */
export const feedbackNotes = sqliteTable("feedback_notes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  feedbackId: text("feedback_id").notNull().references(() => feedback.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  authorName: text("author_name").notNull().default("Owner"),
  note: text("note").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const reviewQrTokens = sqliteTable("review_qr_tokens", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  branchId: text("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  googlePlaceId: text("google_place_id").notNull(),
  googlePlaceName: text("google_place_name"),
  // Original Google Maps link as pasted by the owner (Share link verbatim).
  // This is the primary redirect target: Google maintains this link format,
  // maps.app.goo.gl links open the native Maps app on mobile, and it never
  // breaks when Google changes their internal URL structure. Do NOT
  // reconstruct URLs from Place ID — that has broken repeatedly (2024 URL
  // format change). Keep for reference only.
  googleOriginalUrl: text("google_original_url"),
  // Latitude/longitude of the place (used ONLY for the OpenStreetMap embed
  // in the public feedback form, not for the Google redirect)
  googlePlaceLat: real("google_place_lat"),
  googlePlaceLng: real("google_place_lng"),
  label: text("label"),
  active: integer("active").default(1).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const reviewScans = sqliteTable("review_scans", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tokenId: text("token_id").notNull().references(() => reviewQrTokens.id, { onDelete: "cascade" }),
  scannedAt: integer("scanned_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  userAgent: text("user_agent"),
  ipHash: text("ip_hash"),
  convertedToReview: integer("converted_to_review").default(0).notNull(),
});

/** Phase 1: funnel analytics — track visits to /f/{slug} and what visitors do */
export const visits = sqliteTable(
  "visits",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    branchId: text("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
    source: text("source", { enum: ["qr_scan", "direct_link", "bio_link"] }).notNull(),
    qrTokenId: text("qr_token_id").references(() => reviewQrTokens.id, { onDelete: "set null" }),
    userAgent: text("user_agent"),
    ipHash: text("ip_hash"),
    action: text("action", { enum: ["viewed", "clicked_google", "submitted_feedback", "bounced"] })
      .default("viewed")
      .notNull(),
    durationMs: integer("duration_ms"),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  },
  (t) => ({
    tenantIdx: index("idx_visits_tenant").on(t.tenantId),
    createdIdx: index("idx_visits_created").on(t.createdAt),
    branchIdx: index("idx_visits_branch").on(t.branchId),
    actionIdx: index("idx_visits_action").on(t.action),
  })
);

/** Phase 3: social proof image generator — track generated review-to-image jobs */
export const socialProofImages = sqliteTable(
  "social_proof_images",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    feedbackId: text("feedback_id").references(() => feedback.id, { onDelete: "set null" }),
    template: text("template", { enum: ["star-five", "star-quote", "minimal-card"] }).notNull(),
    /** PNG buffer (base64) for download */
    imageData: text("image_data").notNull(),
    width: integer("width").default(1080).notNull(),
    height: integer("height").default(1920).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  },
  (t) => ({
    tenantIdx: index("idx_social_proof_tenant").on(t.tenantId),
    createdIdx: index("idx_social_proof_created").on(t.createdAt),
  })
);

// ============================================================================
// FCM Push Notification tables (Phase 6)
// ============================================================================

/** Device tokens for push notifications (FCM) - one user can have many devices */
export const deviceTokens = sqliteTable("device_tokens", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  /** FCM registration token (can rotate, hence unique constraint) */
  fcmToken: text("fcm_token").notNull().unique(),
  /** Platform: web (browser), android (native), ios (native) */
  platform: text("platform", { enum: ["web", "android", "ios"] }).notNull(),
  /** Optional device label e.g. "iPhone 13", "Chrome on Mac" */
  deviceName: text("device_name"),
  userAgent: text("user_agent"),
  /** Active = 1 means we send push, 0 means revoked */
  active: integer("active").default(1).notNull(),
  lastActive: integer("last_active", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  revokedAt: integer("revoked_at", { mode: "timestamp" }),
}, (t) => ({
  userIdx: index("idx_device_tokens_user").on(t.userId),
  activeIdx: index("idx_device_tokens_active").on(t.active),
}));

/** Per-user notification preferences */
export const notificationPreferences = sqliteTable("notification_prefs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  /** Master toggle for push channel */
  pushEnabled: integer("push_enabled").default(1).notNull(),
  /** Email as backup channel (Phase 6.7 - can be added later) */
  emailEnabled: integer("email_enabled").default(1).notNull(),
  emailAddress: text("email_address"),
  /** Per-event triggers */
  notifyOnPositive: integer("notify_on_positive").default(0).notNull(),  // 4-5 stars
  notifyOnNegative: integer("notify_on_negative").default(1).notNull(),  // 1-2 stars (urgent)
  notifyOnNeutral: integer("notify_on_neutral").default(0).notNull(),    // 3 stars
  /** Quiet hours (no push between start-end) */
  quietHoursEnabled: integer("quiet_hours_enabled").default(0).notNull(),
  quietHoursStart: text("quiet_hours_start").default("22:00"),
  quietHoursEnd: text("quiet_hours_end").default("07:00"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

/** Notification log (for audit + debugging) */
export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  /** Channel: push (FCM), email, in_app */
  channel: text("channel", { enum: ["push", "email", "in_app"] }).notNull(),
  /** Trigger: new_feedback_positive, new_feedback_negative, etc */
  triggerType: text("trigger_type").notNull(),
  feedbackId: text("feedback_id").references(() => feedback.id, { onDelete: "set null" }),
  /** Status: pending, sent, failed, invalid_token */
  status: text("status", { enum: ["pending", "sent", "failed", "invalid_token"] }).default("pending").notNull(),
  /** Content snapshot */
  title: text("title").notNull(),
  body: text("body").notNull(),
  /** External IDs (FCM message ID, etc) */
  externalId: text("external_id"),
  errorMessage: text("error_message"),
  sentAt: integer("sent_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (t) => ({
  tenantIdx: index("idx_notifications_tenant").on(t.tenantId),
  createdIdx: index("idx_notifications_created").on(t.createdAt),
}));

export type Tenant = typeof tenants.$inferSelect;
export type User = typeof users.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Branch = typeof branches.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type FeedbackReply = typeof feedbackReplies.$inferSelect;
export type FeedbackNote = typeof feedbackNotes.$inferSelect;
export type ReviewQrToken = typeof reviewQrTokens.$inferSelect;
export type ReviewScan = typeof reviewScans.$inferSelect;
export type Visit = typeof visits.$inferSelect;
export type SocialProofImage = typeof socialProofImages.$inferSelect;
export type Plan = "free" | "basic" | "pro";

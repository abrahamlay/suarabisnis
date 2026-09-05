import { db, ensureSchema } from "./index";
import {
  tenants, users, subscriptions, branches, categories, feedback, feedbackReplies, reviewQrTokens,
} from "./schema";
import bcrypt from "bcryptjs";

async function seed() {
  await ensureSchema();
  console.log("🌱 Seeding demo data...");

  // Clear existing demo data
  await db.delete(tenants);

  // ─── Tenant + Owner user ─────────────────────────────────────────
  const [tenant] = await db.insert(tenants).values({
    name: "Warung Pak Bam",
    slug: "warung-demo",
    plan: "pro",
    ownerEmail: "demo@suarabisnis.id",
  }).returning();
  console.log("✓ Tenant:", tenant.name);

  const ownerHash = await bcrypt.hash("demo1234", 10);
  await db.insert(users).values({
    tenantId: tenant.id,
    email: "demo@suarabisnis.id",
    passwordHash: ownerHash,
    name: "Pak Bam",
    role: "owner",
  });

  // Active Pro subscription
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  await db.insert(subscriptions).values({
    tenantId: tenant.id,
    plan: "pro",
    status: "active",
    currentPeriodEnd: periodEnd,
    mockSubscriptionId: "mock_sub_seed_pro",
  });

  // ─── Branches ────────────────────────────────────────────────────
  const [branch1] = await db.insert(branches).values({
    tenantId: tenant.id,
    name: "Cabang Sudirman",
    slug: "warung-demo",
    address: "Jl. Sudirman No. 1, Jakarta Pusat",
    googlePlaceId: "ChIJn2ZdQ5mKa4cR6kf_Pj9xY3M",
  }).returning();
  const [branch2] = await db.insert(branches).values({
    tenantId: tenant.id,
    name: "Cabang Kemang",
    slug: "kemang",
    address: "Jl. Kemang Raya No. 23, Jakarta Selatan",
    googlePlaceId: "ChIJa4xv-PuLci4R4kf_Pj9xY4N",
  }).returning();
  console.log("✓ 2 branches");

  // ─── Categories ──────────────────────────────────────────────────
  const cats = await db.insert(categories).values([
    { tenantId: tenant.id, name: "Pelayanan", icon: "user", order: 1, active: 1 },
    { tenantId: tenant.id, name: "Makanan & Minuman", icon: "utensils", order: 2, active: 1 },
    { tenantId: tenant.id, name: "Kebersihan", icon: "sparkles", order: 3, active: 1 },
    { tenantId: tenant.id, name: "Fasilitas", icon: "home", order: 4, active: 1 },
    { tenantId: tenant.id, name: "Lainnya", icon: "message", order: 5, active: 1 },
  ]).returning();
  console.log("✓ 5 categories");

  // ─── Sample feedback ─────────────────────────────────────────────
  const fb1 = await db.insert(feedback).values({
    tenantId: tenant.id,
    branchId: branch1.id,
    categoryId: cats[0].id,
    message: "Pelayanannya sangat ramah dan cepat! Saya pasti akan datang lagi. Soto ayamnya juga enak banget, kuahnya gurih.",
    rating: 5,
    customerName: "Ibu Siti",
    customerContact: "081234567890",
    priority: "low",
    status: "open",
  }).returning();

  await db.insert(feedback).values({
    tenantId: tenant.id,
    branchId: branch1.id,
    categoryId: cats[1].id,
    message: "Nasi gorengnya agak berminyak dan terlalu asin. Mungkin bisa dikurangi garamnya?",
    rating: 3,
    customerName: "Budi Santoso",
    customerContact: "budisantoso@email.com",
    status: "in_progress",
    priority: "medium",
  });

  await db.insert(feedback).values({
    tenantId: tenant.id,
    branchId: branch1.id,
    categoryId: cats[2].id,
    message: "Kamar mandi di lantai 2 kotor, tissu habis. Mohon dicek rutin ya.",
    rating: 2,
    customerName: "Anonim",
    priority: "high",
    status: "open",
  });

  await db.insert(feedback).values({
    tenantId: tenant.id,
    branchId: branch2.id,
    categoryId: cats[3].id,
    message: "AC-nya kurang dingin, ruangannya panas. Mungkin perlu ditambah AC atau dicek freon-nya.",
    rating: 2,
    customerName: "Pak Darmawan",
    priority: "high",
    status: "open",
  });

  await db.insert(feedback).values({
    tenantId: tenant.id,
    branchId: branch2.id,
    categoryId: cats[4].id,
    message: "Saran: bisa ditambah menu vegetarian? Lokasi vegan friendly bagus untuk customer vegetarian.",
    rating: 4,
    customerName: "Mbak Rina",
    customerContact: "rina@email.com",
    priority: "low",
    status: "closed",
  });

  // Reply to first feedback
  await db.insert(feedbackReplies).values({
    feedbackId: fb1[0].id,
    authorName: "Pak Bam",
    message: "Terima kasih Ibu Siti atas feedback-nya! Senang sekali mendengar Anda puas. Kami tunggu kunjungan berikutnya 🙏",
  });

  console.log("✓ 5 feedback + 1 reply");

  // ─── Review QR tokens ────────────────────────────────────────────
  // Note: these are Googleplex (Google HQ) as demo placeholders.
  // In production, owners add their OWN real business Place ID.
  await db.insert(reviewQrTokens).values([
    {
      tenantId: tenant.id, branchId: branch1.id,
      token: "demoQRsudirman01abc", googlePlaceId: "ChIJtcaxrqlBw4cRwdJ8nA8C5d0",
      label: "QR Meja Utama (demo: Googleplex)", active: 1,
    },
    {
      tenantId: tenant.id, branchId: branch2.id,
      token: "demoQRkemang01xyz123", googlePlaceId: "ChIJtcaxrqlBw4cRwdJ8nA8C5d0",
      label: "QR Kasir (demo: Googleplex)", active: 1,
    },
  ]);
  console.log("✓ 2 review QR tokens");

  console.log("\n✅ Seed done!\n");
  console.log("🔑 Login credentials:");
  console.log("  Email:    demo@suarabisnis.id");
  console.log("  Password: demo1234");
  console.log("\n📋 Akses demo:");
  console.log("  • Landing:        https://bamboy.my.id/");
  console.log("  • Pricing:        https://bamboy.my.id/pricing");
  console.log("  • Signup:         https://bamboy.my.id/signup");
  console.log("  • Login:          https://bamboy.my.id/login");
  console.log("  • Demo pilih:     https://bamboy.my.id/demo");
  console.log("  • Form customer:  https://bamboy.my.id/f/warung-demo");
  console.log("  • Dashboard:      https://bamboy.my.id/app/warung-demo");
  console.log("  • Review QR:      https://bamboy.my.id/app/warung-demo/reviews");
}

seed().catch((e) => { console.error(e); process.exit(1); });

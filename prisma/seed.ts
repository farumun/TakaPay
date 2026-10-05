import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const sections = [
  {
    key: "hero",
    type: "hero",
    sortOrder: 10,
    content: {
      eyebrow: "PAYMENTS, WITHOUT THE BUSYWORK",
      title:
        "Payment automation software for startups & small businesses in Bangladesh",
      description:
        "Automate MFS (bKash, Nagad, Rocket, Upay), bank transfer, and global payment collection with our self-hosted, ready-to-use software.",
      primaryCta: { label: "Get Started", href: "/register" },
      secondaryCta: { label: "View Live Demo", href: "/demo" },
      paymentMethods: ["bKash", "Nagad", "Rocket", "Bank Transfer", "QR Code"],
    },
  },
  {
    key: "features",
    type: "feature-grid",
    sortOrder: 20,
    content: {
      title: "Everything you need to move money forward",
      description:
        "One reliable platform to collect payments, automate operations, and grow with confidence.",
      items: [
        { icon: "Zap", title: "Instant API integration", description: "Connect your product to a consistent, developer-friendly payments API." },
        { icon: "ShieldCheck", title: "Automated verification", description: "Keep payment status and reconciliation in sync." },
        { icon: "Webhook", title: "Reliable webhooks", description: "Get notified when payment events happen." },
        { icon: "BadgePercent", title: "Clear commission rates", description: "Understand fees before you process a transaction." },
        { icon: "Globe2", title: "Multi-currency ready", description: "Design your checkout for customers across markets." },
        { icon: "ChartNoAxesCombined", title: "Real-time analytics", description: "See transaction activity and performance in one place." },
      ],
    },
  },
  {
    key: "integrations",
    type: "integration-list",
    sortOrder: 30,
    content: {
      title: "Works with the tools you already use",
      items: ["WHMCS", "WooCommerce", "WordPress", "Shopify", "Laravel", "PHP", "Custom REST API"],
    },
  },
  {
    key: "pricing",
    type: "pricing",
    sortOrder: 35,
    content: {
      title: "Straightforward plans for every stage",
      description: "Choose a payment model that fits your business today, with room to grow as your needs change.",
      plans: [
        { name: "Pay as you go", price: "Custom", priceNote: "Pricing tailored to your usage", description: "A flexible way to get started without a fixed monthly plan.", features: ["Usage-based pricing", "Core integrations", "Transaction reporting"], cta: "Get started", href: "/register" },
        { name: "Monthly", price: "Custom", description: "For growing businesses", features: ["Predictable monthly billing", "Priority support", "Advanced reporting"], cta: "Get started", href: "/register", highlighted: true },
        { name: "Self-hosted", price: "Custom", priceNote: "One-time license options", description: "Keep deployment in your own environment with a self-hosted setup.", features: ["One-time license", "Deploy in your environment", "Source-code updates"], cta: "Explore self-hosted", href: "/docs" },
      ],
      noteTitle: "Looking for a custom plan?",
      note: "Tell us about your business and we’ll help you find a suitable setup.",
      noteCta: "Create an account",
      noteHref: "/register",
    },
  },
  {
    key: "footer",
    type: "footer",
    sortOrder: 40,
    content: {
      tagline: "Payments that let your business move.",
      copyright: "Takapay",
    },
  },
];

const navigation = [
  { location: "header", label: "Features", href: "#features", sortOrder: 10 },
  { location: "header", label: "Integrations", href: "#integrations", sortOrder: 20 },
  { location: "header", label: "Pricing", href: "#pricing", sortOrder: 30 },
  { location: "header", label: "Resources", href: "/resources", sortOrder: 40 },
  { location: "footer", label: "Terms of Service", href: "/terms", sortOrder: 10 },
  { location: "footer", label: "Privacy Policy", href: "/privacy", sortOrder: 20 },
  { location: "footer", label: "Developer Docs", href: "/docs", sortOrder: 30 },
  { location: "footer-products", label: "Features", href: "#features", sortOrder: 10 },
  { location: "footer-products", label: "Integrations", href: "#integrations", sortOrder: 20 },
  { location: "footer-products", label: "Pricing", href: "#pricing", sortOrder: 30 },
  { location: "footer-resources", label: "Documentation", href: "/docs", sortOrder: 10 },
  { location: "footer-resources", label: "API reference", href: "/docs", sortOrder: 20 },
  { location: "footer-resources", label: "FAQs", href: "/docs#faq", sortOrder: 30 },
  { location: "footer-company", label: "About", href: "/#about", sortOrder: 10 },
  { location: "footer-company", label: "Contact", href: "/docs", sortOrder: 20 },
  { location: "footer-company", label: "Brand assets", href: "/#brand", sortOrder: 30 },
  { location: "footer-support", label: "Submit a ticket", href: "/docs", sortOrder: 10 },
  { location: "footer-support", label: "Report abuse", href: "/docs", sortOrder: 20 },
];

async function main() {
  for (const section of sections) {
    await prisma.cmsSection.upsert({
      where: { key: section.key },
      update: { type: section.type, sortOrder: section.sortOrder, content: section.content },
      create: section,
    });
  }

  for (const item of navigation) {
    await prisma.navigationItem.upsert({
      where: { location_label: { location: item.location, label: item.label } },
      update: { href: item.href, sortOrder: item.sortOrder, enabled: true },
      create: item,
    });
  }

  await prisma.systemSetting.upsert({
    where: { key: "brand" },
    update: {
      value: {
        name: "Takapay",
        signInLabel: "Sign In",
        signInHref: "/login",
        primaryCtaLabel: "Get Started",
        primaryCtaHref: "/register",
      },
    },
    create: {
      key: "brand",
      value: {
        name: "Takapay",
        signInLabel: "Sign In",
        signInHref: "/login",
        primaryCtaLabel: "Get Started",
        primaryCtaHref: "/register",
      },
    },
  });

  await prisma.systemSetting.upsert({
    where: { key: "login_announcement" },
    update: {},
    create: {
      key: "login_announcement",
      value: {
        date: "TAKAPAY MERCHANT UPDATE",
        title: "A clearer view of your payments",
        body: "Track transactions, manage gateway settings, and keep day-to-day payment operations organized from one secure merchant workspace.",
      },
    },
  });

  for (const flag of [
    { key: "live_payments_enabled", description: "Allow live payment processing after provider integration is verified.", enabled: false },
    { key: "live_api_keys_enabled", description: "Allow live API keys for KYC-approved merchants.", enabled: false },
    { key: "merchant_registration_enabled", description: "Allow new merchant registrations.", enabled: true },
  ]) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: { description: flag.description },
      create: flag,
    });
  }

  const adminEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    if (adminPassword.length < 16) throw new Error("INITIAL_ADMIN_PASSWORD must contain at least 16 characters");
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        email: adminEmail,
        emailVerified: new Date(),
        emailVerifiedAt: new Date(),
        passwordHash: await hash(adminPassword, 12),
        role: "SUPER_ADMIN",
        status: "ACTIVE",
      },
    });
  }

  for (const [code, displayName] of [
    ["bkash", "bKash"],
    ["nagad", "Nagad"],
    ["rocket", "Rocket"],
    ["upay", "Upay"],
    ["bank-transfer", "Bank Transfer"],
  ]) {
    await prisma.gateway.upsert({
      where: { code },
      update: { displayName },
      create: { code, displayName, enabled: false },
    });
  }
}

main()
  .catch((error: unknown) => {
    console.error("Takapay seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());

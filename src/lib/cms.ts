import { db } from "@/lib/db";

export type CmsContent = Record<string, unknown>;

export async function getEnabledSections() {
  return db.cmsSection.findMany({
    where: { enabled: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getNavigation(location: string) {
  return db.navigationItem.findMany({
    where: { location, enabled: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getBrandContent() {
  return getSystemSetting("brand");
}

export async function getSystemSetting(key: string) {
  const setting = await db.systemSetting.findUnique({ where: { key } });
  return asRecord(setting?.value);
}

export async function isFeatureEnabled(key: string) {
  const flag = await db.featureFlag.findUnique({ where: { key }, select: { enabled: true } });
  return flag?.enabled ?? false;
}

export function asRecord(value: unknown): CmsContent {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  return value as CmsContent;
}

export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function asStringList(value: unknown): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : [];
}

export function safeContentHref(value: unknown, fallback: string) {
  if (typeof value !== "string" || value.length > 500 || /[\u0000-\u001f\\]/.test(value)) return fallback;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  if (value.startsWith("#") && value.length > 1) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

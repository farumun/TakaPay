import { AuthForm } from "@/components/auth/auth-form";
import { asRecord, asString, getSystemSetting } from "@/lib/cms";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const announcement = asRecord(await getSystemSetting("login_announcement"));
  return (
    <AuthForm
      mode="register"
      googleEnabled={Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)}
      facebookEnabled={Boolean(process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET)}
      announcement={{
        title: asString(announcement.title),
        body: asString(announcement.body),
        date: asString(announcement.date),
      }}
    />
  );
}

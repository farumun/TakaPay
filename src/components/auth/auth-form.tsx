"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Facebook } from "lucide-react";
import { signIn } from "next-auth/react";

type Props = { mode: "login" | "register" | "reset"; googleEnabled?: boolean; facebookEnabled?: boolean };
type LoginAnnouncement = { title: string; body: string; date: string };
type ApiResponse = { error?: string; message?: string; destination?: string };

async function readApiResponse(response: Response): Promise<ApiResponse> {
  const body = await response.text();
  if (!body.trim()) {
    throw new Error(response.ok
      ? "The server returned an empty response. Please try again."
      : `The server returned an empty response (${response.status}). Please try again.`);
  }
  try {
    const result: unknown = JSON.parse(body);
    if (typeof result !== "object" || result === null || Array.isArray(result)) {
      throw new Error("The server returned an invalid response. Please try again.");
    }
    return result as ApiResponse;
  } catch (cause) {
    if (cause instanceof SyntaxError) {
      throw new Error(response.ok
        ? "The server returned an invalid response. Please try again."
        : `The server returned a non-JSON response (${response.status}). Please try again.`);
    }
    throw cause;
  }
}

export function AuthForm({ mode, googleEnabled = false, facebookEnabled = false, announcement }: Props & { announcement?: LoginAnnouncement }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [destination, setDestination] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [otpLogin, setOtpLogin] = useState(false);
  const [useMfa, setUseMfa] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      if (mode === "login") {
        if (form.get("code")) {
          await signIn("credentials", { destination: form.get("destination"), code: form.get("code"), mfaCode: form.get("mfaCode") || undefined, redirectTo: "/dashboard" });
          return;
        }
        await signIn("credentials", { email: form.get("email"), password: form.get("password"), mfaCode: form.get("mfaCode") || undefined, redirectTo: "/dashboard" });
        return;
      }

      if (mode === "register" && !codeSent) {
        const contact = String(form.get("contact") || "").trim();
        form.delete("contact");
        form.set(contact.includes("@") ? "email" : "phone", contact);
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Object.fromEntries(form.entries())),
        });
        const result = await readApiResponse(response);
        const pendingDeliveryFailure = response.status === 503 && typeof result.error === "string" && result.error.startsWith("Account created but");
        if (!response.ok && !pendingDeliveryFailure) throw new Error(result.error || "Registration failed");
        setDestination(String(result.destination || contact));
        setCodeSent(true);
        setMessage(response.ok ? "We sent a verification code. Enter it below to activate your account." : result.error || "The account was created, but verification delivery failed.");
        return;
      }

      if (mode === "reset" && !codeSent) {
        const response = await fetch("/api/auth/otp/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ destination: form.get("destination"), purpose: "PASSWORD_RESET" }),
        });
        const result = await readApiResponse(response);
        if (!response.ok) throw new Error(result.error || "Unable to request code");
        setDestination(String(form.get("destination")));
        setCodeSent(true);
        setMessage(result.message || "If your account exists, a verification code has been sent.");
        return;
      }

      const purpose = mode === "register" ? "REGISTRATION" : "PASSWORD_RESET";
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination,
          purpose,
          code: form.get("code"),
          newPassword: mode === "reset" ? form.get("password") : undefined,
        }),
      });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(result.error || "Verification failed");
      setMessage(mode === "register" ? "Account verified. You can now sign in." : "Password updated. You can sign in.");
      setCodeSent(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  const heading = mode === "login" ? "Welcome back" : mode === "register" ? (codeSent ? "Verify your account" : "Create your account") : (codeSent ? "Set a new password" : "Reset your password");
  const subheading = mode === "login" ? "Sign in to your Takapay workspace." : mode === "register" ? "Start managing business payments with Takapay." : "We’ll verify your identity before changing your password.";
  const isLogin = mode === "login";
  const isSplitAuth = mode === "login" || mode === "register";

  return (
    <main className={isSplitAuth ? "grid min-h-screen bg-white lg:grid-cols-[minmax(360px,31.5%)_1fr]" : "grid min-h-screen place-items-center bg-slate-50 px-5 py-12"}>
      {isSplitAuth && (
        <aside className="relative isolate flex min-h-[340px] flex-col overflow-hidden bg-gradient-to-br from-blue-600 via-blue-800 to-blue-950 px-7 py-8 text-white sm:px-12 lg:min-h-screen lg:px-10 xl:px-14">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-1/4 -z-10 h-80 w-80 rounded-full border border-white/10 bg-blue-400/10 blur-2xl" />
          <Link href="/" className="w-fit text-3xl font-extrabold tracking-tight text-white">
            Takapay<span className="text-sky-300">.</span>
          </Link>
          <div className="my-auto max-w-lg py-14 lg:py-0">
            <p className="text-sm font-medium text-blue-100">Payments, made simpler</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">What&apos;s new</h2>
            <article className="mt-8 max-w-md">
              <p className="text-xs font-medium text-blue-200">{announcement?.date || "TAKAPAY MERCHANT UPDATE"}</p>
              <h3 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">{announcement?.title || "A clearer view of your payments"}</h3>
              <p className="mt-4 text-sm leading-7 text-blue-100 sm:text-base">{announcement?.body || "Track transactions, manage gateway settings, and keep day-to-day payment operations organized from one secure merchant workspace."}</p>
            </article>
            <span aria-hidden="true" className="mt-7 block h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_0_5px_rgba(255,255,255,0.14)]" />
          </div>
          <p className="text-xs text-blue-200">Secure access for Takapay merchants</p>
        </aside>
      )}
      <div className={isSplitAuth ? "flex min-h-screen items-center justify-center px-5 py-8 sm:px-8" : "w-full"}>
      <section className={isSplitAuth ? "w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white" : "mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-soft sm:p-9"}>
        <div className={isSplitAuth ? "p-7 sm:p-10" : ""}>
        {!isSplitAuth && <Link href="/" className="text-2xl font-extrabold tracking-tight text-brand-700">Takapay<span className="text-brand-500">.</span></Link>}
        {isLogin && <p className="text-center text-sm text-slate-500">Welcome back</p>}
        <h1 className={isSplitAuth ? "mt-2 text-center text-3xl font-bold tracking-tight text-slate-950" : "mt-8 text-2xl font-bold tracking-tight"}>{isLogin ? "Secure Merchant Login" : mode === "register" && !codeSent ? "Create Merchant Account" : heading}</h1>
        <p className={`mt-2 text-sm text-slate-500 ${isSplitAuth ? "text-center" : ""}`}>{subheading}</p>
        <form className={isSplitAuth ? "mt-7 space-y-4" : "mt-7 space-y-4"} onSubmit={handleSubmit}>
          {mode === "register" && !codeSent && (
            <>
              <Field label="Your name" name="displayName" required minLength={2} autoComplete="name" />
              <Field label="Business name (optional)" name="businessName" autoComplete="organization" />
              <Field label="Password (12+ characters)" name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" />
            </>
          )}
          {mode === "login" && !codeSent && !otpLogin && (
            <>
              <Field label="Email address" name="email" type="email" required autoComplete="email" />
              <div className="relative">
                <Field label="Password" name="password" type="password" required autoComplete="current-password" />
                <Link href="/password-reset" className="absolute right-0 top-0 text-sm font-medium text-brand-600 hover:text-brand-700">Forgot?</Link>
              </div>
              {useMfa ? (
                <Field label="Authenticator code" name="mfaCode" inputMode="numeric" pattern="[0-9]{6}" />
              ) : (
                  <button type="button" onClick={() => setUseMfa(true)} className="text-left text-xs font-medium text-slate-500 hover:text-brand-700">Use an authenticator code</button>
              )}
            </>
          )}
              {mode === "register" && !codeSent && <Field label="Email or phone (+880...)" name="contact" type="text" required autoComplete="email" />}
          {(mode === "reset" || (mode === "login" && otpLogin)) && !codeSent && (
            <Field label="Email or phone (+880...)" name="destination" required autoComplete="email" onValue={setDestination} />
          )}
          {mode === "login" && codeSent && <input type="hidden" name="destination" value={destination} />}
          {codeSent && (
            <>
              <Field label="6-digit verification code" name="code" inputMode="numeric" pattern="[0-9]{6}" required autoComplete="one-time-code" />
              {mode === "login" && <Field label="Authenticator code (if enabled)" name="mfaCode" inputMode="numeric" pattern="[0-9]{6}" />}
              {mode === "reset" && <Field label="New password (12+ characters)" name="password" type="password" required minLength={12} autoComplete="new-password" />}
            </>
          )}
          {codeSent && (mode === "register" || mode === "reset") && (
            <button
              type="button"
              onClick={async () => {
                const response = await fetch("/api/auth/otp/request", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ destination, purpose: mode === "register" ? "REGISTRATION" : "PASSWORD_RESET" }),
                });
                const result = await readApiResponse(response);
                setMessage(response.ok ? result.message || "Verification code sent." : result.error || "Could not resend code.");
              }}
              className="text-sm font-semibold text-brand-700"
            >
              Resend verification code
            </button>
          )}
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
          <button disabled={busy} className="w-full rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60">
            {busy ? "Please wait…" : buttonLabel(mode, codeSent)}
          </button>
        </form>
        {mode === "login" && !codeSent && (
          <button
            type="button"
            onClick={async () => {
              if (!otpLogin) { setOtpLogin(true); return; }
              if (!destination) { setError("Enter your email or phone first"); return; }
              const response = await fetch("/api/auth/otp/request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ destination, purpose: "LOGIN" }),
              });
              const result = await readApiResponse(response);
              if (!response.ok) { setError(result.error || "Could not send a code"); return; }
              setCodeSent(true);
              setMessage(result.message || "Verification code sent.");
            }}
            className="mt-4 text-sm font-medium text-brand-700"
          >
            {otpLogin ? "Send one-time code" : "Sign in with a one-time code"}
          </button>
        )}
        {isSplitAuth && !codeSent && (
        <div className="mt-5">
          <div className="flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" /></div>
          <div className="mt-4 grid gap-2">
            <button type="button" disabled={!facebookEnabled} onClick={() => signIn("facebook", { redirectTo: "/dashboard" })} aria-label="Continue with Facebook" title={facebookEnabled ? "Continue with Facebook" : "Configure Facebook OAuth to enable sign-in"} className="mx-auto inline-flex w-full max-w-[220px] items-center justify-center gap-2 rounded-md bg-[#4267B2] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#365899] disabled:cursor-not-allowed disabled:opacity-50">
              <Facebook size={17} fill="currentColor" aria-hidden="true" />
              {isLogin ? "Sign in with Facebook" : "Continue with Facebook"}
            </button>
            <button type="button" disabled={!googleEnabled} onClick={() => signIn("google", { redirectTo: "/dashboard" })} aria-label="Continue with Google" title={googleEnabled ? "Continue with Google" : "Configure Google OAuth to enable sign-in"} className="mx-auto inline-flex w-full max-w-[220px] items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
              <span aria-hidden="true" className="bg-gradient-to-br from-blue-600 via-green-500 to-yellow-500 bg-clip-text text-lg font-black leading-none text-transparent">G</span>
              {isLogin ? "Sign in with Google" : "Continue with Google"}
            </button>
          </div>
          {(!facebookEnabled || !googleEnabled) && <p className="mt-3 text-center text-xs text-slate-400">Social sign-in is available when enabled by the site administrator.</p>}
        </div>
        )}
        {isLogin && <p className="mt-6 text-center text-sm text-slate-600">Not a merchant yet? <Link href="/register" className="font-medium text-brand-600 hover:text-brand-700">Create a new account</Link></p>}
        {mode === "register" && <p className="mt-6 text-center text-sm text-slate-600">Already a merchant? <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">Sign in</Link></p>}
        </div>
        {isSplitAuth && <div className="border-t border-slate-200 px-6 py-4 text-center text-sm text-slate-500">Language: <span className="font-medium text-brand-600">English</span> <span aria-hidden="true" className="text-xs">▼</span></div>}
      </section>
      </div>
    </main>
  );
}

function buttonLabel(mode: Props["mode"], codeSent: boolean) {
  if (codeSent) return mode === "login" ? "Sign in with code" : mode === "register" ? "Verify account" : "Update password";
  return mode === "login" ? "Login" : mode === "register" ? "Create account" : "Send verification code";
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode; onValue?: (value: string) => void }) {
  const { label, onValue, ...inputProps } = props;
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input {...inputProps} onChange={onValue ? (event) => onValue(event.target.value) : undefined} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
    </label>
  );
}

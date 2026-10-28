"use client";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Globe2,
  Users,
} from "lucide-react";
import { api, csrf, errorMessage, safeNext } from "@/lib/api";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const subscribeToHydration = () => () => {};
type Mode =
  | "login"
  | "register"
  | "forgot-password"
  | "reset-password"
  | "verify-email"
  | "invitation";
const titles: Record<Mode, string> = {
  login: "Welcome back",
  register: "Your next chapter starts here",
  "forgot-password": "Forgot your password?",
  "reset-password": "Choose a new password",
  "verify-email": "Check your inbox",
  invitation: "Join your team",
};
export function AuthScreen({ mode }: { mode: Mode }) {
  const router = useRouter();
  const query = useSearchParams();
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");
  const next = safeNext(query.get("next"));
  useEffect(() => {
    if (mode !== "verify-email" && mode !== "invitation") return;
    let active = true;
    api
      .get("/api/v1/me")
      .then(({ data }) => {
        if (active) {
          setSignedIn(true);
          setAccountEmail(data.data.user.email);
        }
        if (
          mode === "verify-email" &&
          data.data.user.email_verified_at &&
          !query.get("verification_url")
        )
          router.replace(next);
      })
      .catch(() => {
        if (active) setSignedIn(false);
      });
    return () => {
      active = false;
    };
  }, [mode, query, router, next]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const form = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await csrf();
      if (mode === "login" || mode === "register") {
        await api.post(`/api/v1/auth/${mode}`, form);
        const { data } = await api.get("/api/v1/me");
        if (!data.data.user.email_verified_at)
          sessionStorage.setItem("mekong.auth.next", next);
        router.push(
          data.data.user.email_verified_at
            ? next
            : `/verify-email?next=${encodeURIComponent(next)}`,
        );
      } else if (mode === "forgot-password") {
        await api.post("/api/v1/auth/forgot-password", form);
        setNotice(
          "If an account exists for that email, a password reset link is on its way.",
        );
      } else if (mode === "reset-password") {
        await api.post("/api/v1/auth/reset-password", {
          ...form,
          token: query.get("token"),
          email: query.get("email"),
        });
        setNotice("Password updated. You can now sign in.");
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function action(kind: "verify" | "resend" | "accept" | "logout") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await csrf();
      if (kind === "verify") {
        const value = query.get("verification_url");
        if (!value)
          throw new Error("Open the verification link in your email first.");
        const url = new URL(value, window.location.origin);
        if (
          !/^\/api\/v1\/auth\/email\/verify\/\d+\/[a-f0-9]{40}$/.test(
            url.pathname,
          )
        )
          throw new Error("This verification link is invalid.");
        await api.get(url.pathname + url.search);
        const destination = safeNext(
          query.get("next") || sessionStorage.getItem("mekong.auth.next"),
        );
        sessionStorage.removeItem("mekong.auth.next");
        router.replace(destination);
      } else if (kind === "resend") {
        await api.post("/api/v1/auth/email/verification-notification");
        setNotice("A fresh verification link has been sent.");
      } else if (kind === "logout") {
        await api.post("/api/v1/auth/logout");
        const destination =
          mode === "invitation"
            ? "/invitations/accept?token=" +
              encodeURIComponent(query.get("token") || "")
            : "/verify-email?" + query.toString();
        router.push("/login?next=" + encodeURIComponent(destination));
      } else {
        const { data } = await api.post("/api/v1/invitations/accept", {
          token: query.get("token"),
        });
        await api.post(`/api/v1/organizations/${data.data.id}/switch`);
        router.push("/dashboard");
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const invitationNext =
    "/invitations/accept?token=" + encodeURIComponent(query.get("token") || "");
  return (
    <div className="auth-layout min-h-screen grid lg:grid-cols-[1fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#0b302a] p-12 text-white lg:flex">
        <Brand />
        <div className="auth-orbit" aria-hidden="true" />
        <div className="relative max-w-lg">
          <span className="eyebrow text-emerald-300">
            BUILT FOR THE WAY YOU MOVE
          </span>
          <h1 className="mt-6 text-5xl font-semibold leading-[1.15] tracking-tight">
            One workspace.
            <br />
            Every company.
            <br />
            <span className="text-emerald-300">Moving together.</span>
          </h1>
          <p className="mt-6 max-w-sm leading-7 text-emerald-100/65">
            Connect your people and build the foundation for your logistics
            business across Southeast Asia.
          </p>
          <div className="mt-10 flex flex-wrap gap-5 text-xs text-emerald-100/80">
            <span className="flex gap-2">
              <ShieldCheck size={16} /> Secure by design
            </span>
            <span className="flex gap-2">
              <Globe2 size={16} /> Made for the region
            </span>
          </div>
        </div>
        <p className="relative text-xs text-emerald-100/45">
          Mekong Logistics Platform · Foundation v0.1
        </p>
      </aside>
      <main className="flex flex-col px-6 py-10 sm:px-12">
        <div className="lg:invisible">
          <Brand />
        </div>
        <div className="m-auto w-full max-w-[390px] py-12">
          <div className="mb-7 flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-primary">
            {mode === "invitation" ? <Users /> : <ShieldCheck />}
          </div>
          <h2 className="text-3xl font-semibold tracking-tight">
            {titles[mode]}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {mode === "login"
              ? "Sign in to your logistics workspace."
              : mode === "register"
                ? "Create your account. Bring your team together."
                : mode === "forgot-password"
                  ? "Enter your email and we’ll send a reset link."
                  : mode === "reset-password"
                    ? "Use at least 12 characters, including letters and numbers."
                    : mode === "invitation"
                      ? "Accept your invitation with the email address it was sent to."
                      : "Verify your email address to access your workspace."}
          </p>
          {error && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}
          {notice && (
            <div
              role="status"
              className="mt-6 flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
            >
              <CheckCircle2 size={18} className="shrink-0" />
              {notice}
            </div>
          )}
          {["login", "register", "forgot-password", "reset-password"].includes(
            mode,
          ) && (
            <form method="post" onSubmit={submit} className="mt-8 space-y-5">
              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    name="name"
                    autoComplete="name"
                    placeholder="Your full name"
                    maxLength={160}
                    required
                  />
                </div>
              )}
              {mode !== "reset-password" && (
                <div className="space-y-2">
                  <Label htmlFor="email">Work email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    required
                  />
                </div>
              )}
              {["login", "register", "reset-password"].includes(mode) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === "login" && (
                      <Link
                        href="/forgot-password"
                        className="text-xs font-medium text-primary"
                      >
                        Forgot password?
                      </Link>
                    )}
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    minLength={mode === "login" ? undefined : 12}
                    required
                  />
                  {mode === "register" && (
                    <p className="text-xs text-muted-foreground">
                      At least 12 characters, with letters and numbers.
                    </p>
                  )}
                </div>
              )}
              {["register", "reset-password"].includes(mode) && (
                <div className="space-y-2">
                  <Label htmlFor="password_confirmation">
                    Confirm password
                  </Label>
                  <Input
                    id="password_confirmation"
                    name="password_confirmation"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    required
                  />
                </div>
              )}
              <Button
                type="submit"
                disabled={busy || !hydrated}
                className="w-full"
              >
                {busy ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : mode === "login" ? (
                  "Sign in"
                ) : mode === "register" ? (
                  "Create account"
                ) : mode === "forgot-password" ? (
                  "Send reset link"
                ) : (
                  "Update password"
                )}
                <ArrowRight size={16} />
              </Button>
            </form>
          )}
          {mode === "verify-email" && (
            <div className="mt-7 space-y-3">
              {signedIn ? (
                <>
                  {query.get("verification_url") && (
                    <Button
                      disabled={busy || !hydrated}
                      onClick={() => action("verify")}
                      className="w-full"
                    >
                      Verify email & continue
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    disabled={busy || !hydrated}
                    onClick={() => action("resend")}
                    className="w-full"
                  >
                    Resend verification email
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busy || !hydrated}
                    onClick={() => action("logout")}
                    className="w-full"
                  >
                    Sign out
                  </Button>
                </>
              ) : (
                <Button asChild className="w-full">
                  <Link
                    href={`/login?next=${encodeURIComponent("/verify-email?" + query.toString())}`}
                  >
                    Sign in to verify your email
                  </Link>
                </Button>
              )}
            </div>
          )}
          {mode === "invitation" && (
            <div className="mt-7 space-y-3">
              {signedIn ? (
                <>
                  <Button
                    disabled={busy || !hydrated || !query.get("token")}
                    onClick={() => action("accept")}
                    className="w-full"
                  >
                    Accept invitation
                    <ArrowRight size={16} />
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Your account must have a verified email address.
                  </p>
                  <p className="break-all text-xs text-muted-foreground">
                    Signed in as {accountEmail}
                  </p>
                  <Button
                    variant="ghost"
                    className="w-full"
                    disabled={busy || !hydrated}
                    onClick={() => action("logout")}
                  >
                    Use another account
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild className="w-full">
                    <Link
                      href={`/login?next=${encodeURIComponent(invitationNext)}`}
                    >
                      Sign in to join
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link
                      href={`/register?next=${encodeURIComponent(invitationNext)}`}
                    >
                      Create an account
                    </Link>
                  </Button>
                </>
              )}
            </div>
          )}
          <p className="mt-7 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                New to Mekong?{" "}
                <Link
                  className="font-medium text-primary"
                  href={`/register?next=${encodeURIComponent(next)}`}
                >
                  Create an account
                </Link>
              </>
            ) : mode === "register" ? (
              <>
                Already have an account?{" "}
                <Link
                  className="font-medium text-primary"
                  href={`/login?next=${encodeURIComponent(next)}`}
                >
                  Sign in
                </Link>
              </>
            ) : ["reset-password", "forgot-password"].includes(mode) ? (
              <Link href="/login" className="font-medium text-primary">
                Back to sign in
              </Link>
            ) : null}
          </p>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          A connected foundation for your business.
        </p>
      </main>
    </div>
  );
}

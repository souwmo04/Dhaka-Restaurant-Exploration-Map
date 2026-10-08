"use client";

import { Loader2, MailCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useSyncExternalStore, type FormEvent } from "react";
import { StateMessage } from "@/components/feedback/States";
import { useSession } from "@/components/providers/SessionProvider";
import { features } from "@/config/site";
import { safeNextPath } from "@/lib/auth/redirect";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Mode = "sign-in" | "sign-up";

const noopSubscribe = () => () => {};

/** Turns Supabase auth errors into messages a person can act on. */
function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match. Try again or create an account.";
  if (m.includes("already registered") || m.includes("already been registered")) return "An account with this email already exists. Sign in instead.";
  if (m.includes("password") && m.includes("6")) return "Use a password with at least 6 characters.";
  if (m.includes("email not confirmed")) return "Please confirm your email first — check your inbox for the link.";
  if (m.includes("rate limit")) return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("fetch")) return "Couldn't reach the server. Check your connection.";
  return "Something went wrong. Please try again.";
}

export function AuthForm() {
  const router = useRouter();
  const { status } = useSession();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const ids = { name: useId(), email: useId(), password: useId(), error: useId() };

  const nextPath = () => safeNextPath(new URLSearchParams(window.location.search).get("next"));

  const callbackFailed = useSyncExternalStore(
    noopSubscribe,
    () => new URLSearchParams(window.location.search).has("error"),
    () => false,
  );
  const shownError = error ?? (callbackFailed ? "That sign-in link didn't work or has expired. Please try again." : null);

  // Already signed in (e.g. after OAuth) → go where they were heading.
  useEffect(() => {
    if (status === "signed-in") router.replace(nextPath());
  }, [status, router]);

  if (status === "unavailable") {
    return (
      <StateMessage title="Accounts aren't set up here">
        This copy of the app runs without a database, so progress is saved in your browser only. Configure Supabase to
        enable accounts.
      </StateMessage>
    );
  }

  if (checkEmail) {
    return (
      <StateMessage icon={<MailCheck className="size-6" />} title="Check your email">
        We sent a confirmation link to <strong className="text-ink">{email}</strong>. Open it on this device to finish
        creating your account.
      </StateMessage>
    );
  }

  const db = getBrowserSupabase();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!db) return;
    setPending(true);
    setError(null);
    try {
      if (mode === "sign-in") {
        const { error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(nextPath());
        router.refresh();
      } else {
        const { data, error } = await db.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name.trim() || undefined },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath())}`,
          },
        });
        if (error) throw error;
        if (data.session) {
          router.replace(nextPath());
          router.refresh();
        } else {
          setCheckEmail(true);
        }
      }
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : String(err)));
    } finally {
      setPending(false);
    }
  }

  async function signInWithGoogle() {
    if (!db) return;
    setError(null);
    const { error } = await db.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath())}` },
    });
    if (error) setError(friendlyError(error.message));
  }

  const input =
    "mt-1.5 h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink placeholder:text-ink-muted hover:border-line-strong focus:border-ink";

  return (
    <div>
      <div role="tablist" aria-label="Account" className="grid grid-cols-2 rounded-full bg-paper-deep p-1">
        {(["sign-in", "sign-up"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={cn(
              "h-10 rounded-full text-sm font-semibold transition-colors",
              mode === m ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink",
            )}
          >
            {m === "sign-in" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" aria-describedby={shownError ? ids.error : undefined} noValidate={false}>
        {mode === "sign-up" && (
          <div>
            <label htmlFor={ids.name} className="text-sm font-medium">
              Name <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input id={ids.name} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} className={input} />
          </div>
        )}
        <div>
          <label htmlFor={ids.email} className="text-sm font-medium">
            Email
          </label>
          <input
            id={ids.email}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            className={input}
          />
        </div>
        <div>
          <label htmlFor={ids.password} className="text-sm font-medium">
            Password
          </label>
          <input
            id={ids.password}
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            className={input}
          />
          {mode === "sign-up" && <p className="mt-1.5 text-xs text-ink-muted">At least 6 characters.</p>}
        </div>

        {shownError && (
          <p id={ids.error} role="alert" className="rounded-xl bg-tomato-soft px-3.5 py-2.5 text-sm text-tomato-deep">
            {shownError}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink text-[15px] font-semibold text-surface transition-colors hover:bg-ink-soft disabled:opacity-70"
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
      </form>

      {features.googleAuth && (
        <>
          <div className="my-5 flex items-center gap-3 text-xs text-ink-muted">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-surface text-[15px] font-medium hover:border-line-strong hover:bg-paper"
          >
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
              <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84Z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.6 10.6 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
            </svg>
            Continue with Google
          </button>
        </>
      )}
    </div>
  );
}

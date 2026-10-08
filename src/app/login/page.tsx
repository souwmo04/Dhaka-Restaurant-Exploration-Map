import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { BrandMark } from "@/components/brand/BrandMark";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-ink p-12 text-surface lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(var(--paper)_1px,transparent_1px),linear-gradient(90deg,var(--paper)_1px,transparent_1px)] [background-size:56px_56px]"
        />
        <div aria-hidden className="absolute -right-24 top-1/3 size-[420px] rounded-full bg-tomato/30 blur-3xl" />
        <Link href="/" className="relative flex items-center gap-2.5">
          <BrandMark className="size-9" />
          <span className="font-display text-2xl font-semibold">{siteConfig.name}</span>
        </Link>
        <div className="relative max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-tomato">{siteConfig.tagline}</p>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.05]">{siteConfig.heroQuestion}</h1>
          <p className="mt-5 text-lg text-surface/75">
            Sign in to keep your food map in sync on every device. Everything you mark stays private to your account.
          </p>
        </div>
        <p className="relative text-sm text-surface/55">Restaurant data © OpenStreetMap contributors.</p>
      </section>

      <section className="flex flex-col justify-center px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-10 flex items-center gap-2 lg:hidden">
            <BrandMark />
            <span className="font-display text-xl font-semibold">{siteConfig.name}</span>
          </Link>
          <h2 className="font-display text-3xl font-semibold tracking-tight">Welcome, explorer</h2>
          <p className="mb-7 mt-2 text-ink-soft">Your restaurant map, saved to your account.</p>
          <AuthForm />
          <p className="mt-8 text-center text-sm text-ink-soft">
            <Link href="/" className="font-medium text-ink underline-offset-2 hover:underline">
              Keep exploring without an account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

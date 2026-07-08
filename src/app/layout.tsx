import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { auth } from "@/auth";
import { TopNav } from "@/components/top-nav";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "opencode.guru";

// Inter — clean, high-legibility sans designed for screens. Loaded via
// next/font for self-hosting, automatic font-display: swap, and zero CLS.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://www.opencode.guru",
  ),
  title: {
    default: `${APP_NAME} — opencode tutorials, ranked`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "A curated library of opencode video tutorials from YouTube, Vimeo, Twitch and beyond. Beginner to advanced, hand-picked by the community.",
  openGraph: {
    type: "website",
    siteName: APP_NAME,
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="min-h-screen bg-bg text-zinc-100 font-sans antialiased">
        <TopNav
          user={
            session?.user
              ? {
                  id: session.user.id,
                  username: session.user.username,
                  displayName: session.user.name ?? session.user.username,
                  avatarUrl: session.user.image ?? null,
                  role: session.user.role,
                }
              : null
          }
        />
        <main className="pt-16">{children}</main>
        <footer className="mt-24 border-t border-zinc-800 py-10 text-sm text-zinc-500">
          <div className="mx-auto max-w-7xl px-6 flex flex-wrap items-center justify-between gap-4">
            <p>
              {APP_NAME} — community-curated opencode tutorials.
            </p>
            <nav className="flex flex-wrap items-center gap-4">
              <a href="/about" className="hover:text-white">
                About
              </a>
              <a href="/code-of-conduct" className="hover:text-white">
                Code of Conduct
              </a>
              <a href="/rss.xml" className="hover:text-white">
                RSS
              </a>
              <a
                href="https://buymeacoffee.com/matedev"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-medium"
              >
                <span aria-hidden>☕</span>
                Buy me a coffee
              </a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
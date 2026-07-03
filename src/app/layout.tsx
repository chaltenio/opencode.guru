import type { Metadata } from "next";
import "./globals.css";
import { auth } from "@/auth";
import { TopNav } from "@/components/top-nav";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "opencode.guru";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
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
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg text-zinc-100">
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
            <nav className="flex gap-4">
              <a href="/about" className="hover:text-white">
                About
              </a>
              <a href="/guidelines" className="hover:text-white">
                Guidelines
              </a>
              <a href="/rss.xml" className="hover:text-white">
                RSS
              </a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
import Image from "next/image";
import Link from "next/link";
import { CreditsPanel } from "@/components/credits-panel";
import { GlobalCommandPalette } from "@/components/command-palette";
import { LogoutButton } from "@/components/logout-button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GlobalCommandPalette />
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link
              href="/projects"
              className="flex shrink-0 items-center no-underline hover:no-underline"
            >
              <Image
                src="/logo.png"
                alt="BetterTracker"
                width={24}
                height={24}
                className="h-6 w-6"
                priority
              />
            </Link>
            <CreditsPanel />
            <span className="hidden text-[10px] text-muted sm:inline">
              ⌘K
            </span>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
    </>
  );
}

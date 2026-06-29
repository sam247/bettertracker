import Link from "next/link";
import { CreditsPanel } from "@/components/credits-panel";
import { LogoutButton } from "@/components/logout-button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/projects" className="text-sm font-medium no-underline hover:no-underline">
              BetterTracker
            </Link>
            <CreditsPanel />
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
    </>
  );
}

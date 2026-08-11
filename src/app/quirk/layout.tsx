import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/quirk", label: "Inbox" },
  { href: "/quirk/gallery", label: "Gallery" },
  { href: "/quirk/experiments", label: "Experiments" },
  { href: "/quirk/pipelines", label: "Pipelines" },
  { href: "/quirk/offers", label: "Offers" },
  { href: "/quirk/voice-preview", label: "Voice" },
];

export default function QuirkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-6">
          <Link href="/quirk" className="text-lg font-bold tracking-tight">
            Quirk OS
          </Link>
          <nav className="flex gap-4 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <ThemeToggle />
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

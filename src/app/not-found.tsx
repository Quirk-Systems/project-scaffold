import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h2 className="text-4xl font-bold">404</h2>
      <p className="text-muted-foreground">Page not found</p>
      <Link
        href="/"
        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2"
      >
        Go home
      </Link>
    </div>
  );
}

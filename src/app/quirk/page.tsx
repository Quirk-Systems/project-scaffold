import { AssetInbox } from "@/components/quirk/AssetInbox";

export default function QuirkInboxPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Asset Inbox</h1>
        <p className="text-muted-foreground text-sm">
          Every messy input becomes a versioned Quirk Asset. Capture → annotate
          → mutate → compare → automate → promote.
        </p>
      </div>
      <AssetInbox />
    </div>
  );
}

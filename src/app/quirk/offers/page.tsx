import { OffersBoard } from "@/components/quirk/OffersBoard";

// Keep live search parameters available to OffersBoard during server rendering.
export const dynamic = "force-dynamic";

export default function OffersPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Offers</h1>
      <OffersBoard />
    </div>
  );
}

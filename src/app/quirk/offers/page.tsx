import { Suspense } from "react";
import { OffersBoard } from "@/components/quirk/OffersBoard";

export const dynamic = "force-dynamic";

export default function OffersPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Offers</h1>
      {/* OffersBoard reads ?status= with useSearchParams, which needs a
          Suspense boundary if this page is ever prerendered. */}
      <Suspense>
        <OffersBoard />
      </Suspense>
    </div>
  );
}

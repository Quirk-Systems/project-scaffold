import { OffersBoard } from "@/components/quirk/OffersBoard";

export const dynamic = "force-dynamic";

export default async function OffersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const { status } = await searchParams;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Offers</h1>
      <OffersBoard
        initialFilter={typeof status === "string" ? status : undefined}
      />
    </div>
  );
}

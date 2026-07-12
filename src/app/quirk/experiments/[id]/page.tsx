import Link from "next/link";
import { ExperimentBoard } from "@/components/quirk/ExperimentBoard";

export default async function ExperimentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/quirk/experiments"
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← Back to experiments
      </Link>
      <ExperimentBoard experimentId={id} />
    </div>
  );
}

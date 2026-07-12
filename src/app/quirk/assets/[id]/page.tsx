import Link from "next/link";
import { AnnotationChamber } from "@/components/quirk/AnnotationChamber";
import { SemanticDiffViewer } from "@/components/quirk/SemanticDiffViewer";

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/quirk"
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← Back to inbox
      </Link>
      <div className="grid gap-8 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h1 className="text-xl font-bold tracking-tight">
            Annotation Chamber
          </h1>
          <AnnotationChamber assetId={id} />
        </section>
        <section className="flex flex-col gap-3">
          <h1 className="text-xl font-bold tracking-tight">Quirk Diff</h1>
          <SemanticDiffViewer assetId={id} />
        </section>
      </div>
    </div>
  );
}

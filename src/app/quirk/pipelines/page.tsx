import { PipelineMap } from "@/components/quirk/PipelineMap";

export default function PipelinesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pipeline Map</h1>
        <p className="text-muted-foreground text-sm">
          The command center: drive an asset through capture → annotate → diff →
          experiment → review → promote → publish.
        </p>
      </div>
      <PipelineMap />
    </div>
  );
}

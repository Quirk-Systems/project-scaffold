import { ExperimentsPanel } from "@/components/quirk/ExperimentsPanel";

export default function ExperimentsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Experiments</h1>
        <p className="text-muted-foreground text-sm">
          Every generation run stores prompt, model, persona, parameters,
          output, scores, and winner status.
        </p>
      </div>
      <ExperimentsPanel />
    </div>
  );
}

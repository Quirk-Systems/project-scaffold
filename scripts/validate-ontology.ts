import { loadRegistry } from "../src/lib/ontology/load";

const registry = await loadRegistry();
console.log(
  `Validated ${registry.entities.length} canonical ontology entities.`,
);

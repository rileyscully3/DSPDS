import { APP_VERSION, SCHEMA_VERSION } from "../config/defaults";
import type { ExportBundle } from "../telemetry/schemas";
import type { Repository } from "./db";
export async function createExport(
  repo: Repository,
  scope: "full" | "summary" = "full",
): Promise<ExportBundle> {
  const entities = await repo.snapshot();
  if (scope === "summary")
    entities.trials = entities.trials.map((trial) => {
      const summary = { ...trial, rawSamples: [] };
      delete summary.displayedTrace;
      return summary;
    });
  return {
    format: "form-blend-dspds-export",
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    scope,
    entities,
    counts: Object.fromEntries(
      Object.entries(entities).map(([k, v]) => [k, v.length]),
    ),
  };
}
export function validateImport(value: unknown): ExportBundle {
  if (!value || typeof value !== "object")
    throw new Error("Import must be a JSON object.");
  const b = value as Partial<ExportBundle>;
  if (b.format !== "form-blend-dspds-export")
    throw new Error("This is not a Form Blend + DSPDS export.");
  if (b.schemaVersion !== SCHEMA_VERSION)
    throw new Error(
      `Schema ${String(b.schemaVersion)} is not supported; no data was changed.`,
    );
  if (
    !b.entities ||
    !Array.isArray(b.entities.profiles) ||
    !Array.isArray(b.entities.equipment) ||
    !Array.isArray(b.entities.sessions) ||
    !Array.isArray(b.entities.trials) ||
    !Array.isArray(b.entities.models)
  )
    throw new Error("Import is missing required entity collections.");
  for (const group of Object.values(b.entities))
    for (const entity of group)
      if (
        !entity ||
        typeof entity !== "object" ||
        !("id" in entity) ||
        !("schemaVersion" in entity)
      )
        throw new Error(
          "Import contains an unversioned or unidentified entity.",
        );
  return structuredClone(b as ExportBundle);
}
export async function previewImport(repo: Repository, bundle: ExportBundle) {
  const current = await repo.snapshot(),
    conflicts: string[] = [];
  for (const [name, values] of Object.entries(bundle.entities) as Array<
    [keyof typeof bundle.entities, Array<{ id: string }>]
  >) {
    const ids = new Set(current[name].map((x) => x.id));
    for (const value of values)
      if (ids.has(value.id)) conflicts.push(`${name}:${value.id}`);
  }
  return {
    additions: Object.fromEntries(
      Object.entries(bundle.entities).map(([k, v]) => [
        k,
        v.length - conflicts.filter((c) => c.startsWith(`${k}:`)).length,
      ]),
    ),
    conflicts,
  };
}
export async function importMissing(repo: Repository, bundle: ExportBundle) {
  const preview = await previewImport(repo, bundle);
  for (const [name, values] of Object.entries(bundle.entities) as Array<
    [keyof typeof bundle.entities, Array<{ id: string }>]
  >)
    for (const value of values)
      if (!preview.conflicts.includes(`${name}:${value.id}`))
        await repo.put(name, value);
  return preview;
}

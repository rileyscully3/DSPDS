import { validateEntities } from "./validation";
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
  return validateEntities(value);
}

export async function previewImport(repo: Repository, bundle: ExportBundle) {
  const current = await repo.snapshot(),
    conflicts: string[] = [],
    identical: string[] = [];
  for (const [name, values] of Object.entries(bundle.entities) as Array<
    [keyof typeof bundle.entities, Array<{ id: string }>]
  >) {
    for (const value of values) {
      const existing = current[name].find((x) => x.id === value.id);
      if (existing)
        (canonical(existing) === canonical(value) ? identical : conflicts).push(
          `${name}:${value.id}`,
        );
    }
  }
  return {
    additions: Object.fromEntries(
      Object.entries(bundle.entities).map(([k, v]) => [
        k,
        v.length -
          identical.filter((x) => x.startsWith(`${k}:`)).length -
          conflicts.filter((x) => x.startsWith(`${k}:`)).length,
      ]),
    ),
    conflicts,
    identical,
  };
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export async function importMissing(repo: Repository, bundle: ExportBundle) {
  const valid = validateImport(bundle),
    preview = await previewImport(repo, valid);
  if (preview.conflicts.length)
    throw new Error(
      "Conflicting IDs have different content. Import rejected as a whole to preserve references.",
    );
  const entries = Object.entries(valid.entities).flatMap(([store, values]) =>
    values
      .filter((value) => !preview.identical.includes(`${store}:${value.id}`))
      .map((value) => ({
        store: store as keyof typeof valid.entities,
        value,
        addOnly: true,
      })),
  );
  if (entries.length) await repo.atomic(entries);
  return preview;
}

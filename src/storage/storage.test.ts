import { describe, expect, it } from "vitest";
import { migrateProfile } from "./migrations";
import { validateImport } from "./exportImport";
describe("versioned persistence", () => {
  it("migrates a legacy profile without mutating it", () => {
    const old = { id: "p", displayName: "Player" };
    const migrated = migrateProfile(old);
    expect(migrated.schemaVersion).toBe(1);
    expect(old).not.toHaveProperty("schemaVersion");
  });
  it("rejects malformed and future imports before writes", () => {
    expect(() => validateImport({})).toThrow(/not a Form Blend/);
    expect(() =>
      validateImport({
        format: "form-blend-dspds-export",
        schemaVersion: 99,
        entities: {},
      }),
    ).toThrow(/not supported/);
  });
  it("accepts a complete empty round-trip envelope", () => {
    const value = {
      format: "form-blend-dspds-export",
      schemaVersion: 1,
      appVersion: "1",
      exportedAt: "2026-09-17T00:00:00.000Z",
      scope: "full",
      entities: {
        profiles: [],
        equipment: [],
        sessions: [],
        trials: [],
        models: [],
      },
      counts: { profiles: 0, equipment: 0, sessions: 0, trials: 0, models: 0 },
    };
    expect(validateImport(value).entities.trials).toEqual([]);
  });

  it("rejects unsupported entity versions and broken references", () => {
    const base = {
      format: "form-blend-dspds-export",
      schemaVersion: 1,
      appVersion: "1",
      exportedAt: "2026-09-17T00:00:00.000Z",
      scope: "full",
      entities: {
        profiles: [],
        equipment: [],
        sessions: [],
        trials: [],
        models: [],
      },
      counts: { profiles: 0, equipment: 0, sessions: 0, trials: 0, models: 0 },
    };
    expect(() =>
      validateImport({
        ...base,
        entities: {
          ...base.entities,
          profiles: [
            {
              id: "p",
              schemaVersion: 99,
              displayName: "Player",
              createdAt: base.exportedAt,
              updatedAt: base.exportedAt,
              activeEquipmentId: "missing",
              preferences: { reducedMotion: false, textScale: 1 },
            },
          ],
        },
        counts: { ...base.counts, profiles: 1 },
      }),
    ).toThrow(/schemaVersion/);
  });
});

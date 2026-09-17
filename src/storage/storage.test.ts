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
      exportedAt: "now",
      scope: "full",
      entities: {
        profiles: [],
        equipment: [],
        sessions: [],
        trials: [],
        models: [],
      },
      counts: {},
    };
    expect(validateImport(value).entities.trials).toEqual([]);
  });
});

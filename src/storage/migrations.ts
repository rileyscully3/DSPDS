export interface LegacyProfileV0 {
  id: string;
  displayName: string;
  createdAt?: string;
}
export function migrateProfile(
  value: LegacyProfileV0 | UserProfileLike,
): UserProfileLike {
  if ("schemaVersion" in value) {
    if (value.schemaVersion !== 1)
      throw new Error(`Unsupported profile schema ${value.schemaVersion}`);
    return structuredClone(value);
  }
  const now = value.createdAt ?? new Date(0).toISOString();
  return {
    schemaVersion: 1,
    id: value.id,
    displayName: value.displayName,
    createdAt: now,
    updatedAt: now,
    activeEquipmentId: "",
    preferences: { reducedMotion: false, textScale: 1 },
  };
}
interface UserProfileLike {
  schemaVersion: 1;
  id: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
  activeEquipmentId: string;
  preferences: { reducedMotion: boolean; textScale: number };
}

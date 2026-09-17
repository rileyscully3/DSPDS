import type { SessionRecord } from "../telemetry/schemas";
import type { Repository } from "./db";
export interface RecoveryCheckpoint {
  schemaVersion: 1;
  id: string;
  session: SessionRecord;
  updatedAt: string;
}
export async function checkpoint(repo: Repository, session: SessionRecord) {
  const value: RecoveryCheckpoint = {
    schemaVersion: 1,
    id: session.id,
    session: structuredClone(session),
    updatedAt: new Date().toISOString(),
  };
  await repo.put("recovery", value);
}
export async function recoveries(repo: Repository) {
  return repo.getAll<RecoveryCheckpoint>("recovery");
}
export async function clearCheckpoint(repo: Repository, id: string) {
  await repo.delete("recovery", id);
}

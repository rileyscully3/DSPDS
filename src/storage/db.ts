import type {
  EquipmentProfile,
  SessionRecord,
  SpatialModelSnapshot,
  TrialRecord,
  UserProfile,
} from "../telemetry/schemas";
export type StoreName =
  "profiles" | "equipment" | "sessions" | "trials" | "models" | "recovery";
const DB_NAME = "form-blend-dspds";
const DB_VERSION = 1;
export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error("IndexedDB is unavailable; changes cannot be saved."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of [
        "profiles",
        "equipment",
        "sessions",
        "trials",
        "models",
        "recovery",
      ] as StoreName[])
        if (!db.objectStoreNames.contains(name))
          db.createObjectStore(name, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Storage could not be opened."));
    request.onblocked = () =>
      reject(new Error("Storage upgrade is blocked by another tab."));
  });
}
export class Repository {
  constructor(private db: IDBDatabase) {}
  static async create() {
    return new Repository(await openDatabase());
  }
  put<T extends { id: string }>(store: StoreName, value: T): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, "readwrite");
      tx.objectStore(store).put(structuredClone(value));
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error ?? new Error(`Failed to save ${store}.`));
      tx.onabort = () =>
        reject(tx.error ?? new Error(`Save to ${store} was aborted.`));
    });
  }
  atomic(
    entries: Array<{
      store: StoreName;
      value: { id: string };
      addOnly?: boolean;
    }>,
    guard?: { sessionId: string; trialCount: number },
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const stores = [
        ...new Set<StoreName>([
          ...entries.map((e) => e.store),
          ...(guard ? ["sessions" as const] : []),
        ]),
      ];
      const tx = this.db.transaction(stores, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () =>
        reject(
          tx.error ?? new Error("Atomic save aborted; no records committed."),
        );
      const write = () => {
        try {
          for (const e of entries) {
            const store = tx.objectStore(e.store);
            if (e.addOnly) store.add(structuredClone(e.value));
            else store.put(structuredClone(e.value));
          }
        } catch {
          tx.abort();
        }
      };
      if (guard) {
        const request = tx.objectStore("sessions").get(guard.sessionId);
        request.onsuccess = () => {
          const prior = request.result as SessionRecord | undefined;
          if (
            (prior?.trialIds.length ?? 0) !== guard.trialCount ||
            prior?.status === "completed"
          )
            tx.abort();
          else write();
        };
      } else write();
    });
  }
  getAll<T>(store: StoreName): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const request = this.db.transaction(store).objectStore(store).getAll();
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }
  delete(store: StoreName, id: string) {
    return new Promise<void>((resolve, reject) => {
      const tx = this.db.transaction(store, "readwrite");
      tx.objectStore(store).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  snapshot(): Promise<{
    profiles: UserProfile[];
    equipment: EquipmentProfile[];
    sessions: SessionRecord[];
    trials: TrialRecord[];
    models: SpatialModelSnapshot[];
  }> {
    return new Promise((resolve, reject) => {
      const names = [
        "profiles",
        "equipment",
        "sessions",
        "trials",
        "models",
      ] as const;
      const tx = this.db.transaction([...names]);
      const requests = names.map((name) => tx.objectStore(name).getAll());
      tx.oncomplete = () =>
        resolve({
          profiles: requests[0]!.result,
          equipment: requests[1]!.result,
          sessions: requests[2]!.result,
          trials: requests[3]!.result,
          models: (requests[4]!.result as SpatialModelSnapshot[]).sort(
            (a, b) =>
              a.createdAt.localeCompare(b.createdAt) ||
              a.id.localeCompare(b.id),
          ),
        });
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  }
  close() {
    this.db.close();
  }
}

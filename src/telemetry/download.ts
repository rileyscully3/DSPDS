import { serializeM1Session, type M1SessionExport } from "./m1Session";

export function downloadM1Session(session: M1SessionExport): string {
  const filename = `dspds-m1-input-${session.captureId}.json`;
  const blob = new Blob([serializeM1Session(session)], {
    type: "application/json",
  });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  queueMicrotask(() => URL.revokeObjectURL(objectUrl));
  return filename;
}

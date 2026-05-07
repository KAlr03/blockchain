import { createHash } from "crypto";

export function sha256FromBuffer(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function sha256FromString(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

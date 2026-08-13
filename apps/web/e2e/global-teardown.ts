import { execFile } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";

export default async function globalTeardown() {
  const apiPidPath = path.join(process.cwd(), "test-results", "e2e-api.pid");
  try {
    const pidFile = await readFile(apiPidPath, "utf8").catch(() => null);
    if (!pidFile) return;
    const pid = Number(pidFile);
    if (Number.isInteger(pid)) {
      if (process.platform === "win32") {
        await promisify(execFile)("taskkill", ["/pid", String(pid), "/T", "/F"]);
      } else {
        process.kill(pid, "SIGTERM");
      }
    }
  } finally {
    await rm(apiPidPath, { force: true });
  }
}

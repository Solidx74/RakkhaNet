import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import type { FullConfig } from "@playwright/test";

const apiPidPath = path.join(process.cwd(), "test-results", "e2e-api.pid");

function windowsSafeEnvironment(): NodeJS.ProcessEnv {
  const seen = new Set<string>();
  return Object.fromEntries(
    Object.entries(process.env).filter(([key]) => {
      const normalized = key.toLowerCase();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
  ) as NodeJS.ProcessEnv;
}

export default async function globalSetup(_config: FullConfig) {
  const repositoryRoot = path.resolve(process.cwd(), "../..");
  const apiDirectory = path.join(repositoryRoot, "apps", "api");
  const apiRequire = createRequire(path.join(apiDirectory, "package.json"));
  const tsxCli = apiRequire.resolve("tsx/cli");
  const apiProcess: ChildProcess = spawn(
    process.execPath,
    [tsxCli, "src/e2e-server.ts"],
    {
      cwd: apiDirectory,
      env: windowsSafeEnvironment(),
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  const output: string[] = [];
  const collect = (chunk: Buffer) => output.push(chunk.toString());
  apiProcess.stdout?.on("data", collect);
  apiProcess.stderr?.on("data", collect);

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`Timed out starting E2E API after 15 minutes while downloading the MongoDB test binary:\n${output.join("")}`)),
      900_000
    );
    apiProcess.on("error", reject);
    apiProcess.on("exit", (code) => {
      if (code !== null) reject(new Error(`E2E API exited with code ${code}:\n${output.join("")}`));
    });
    apiProcess.stdout?.on("data", (chunk: Buffer) => {
      if (chunk.toString().includes("[E2E API] READY")) {
        clearTimeout(timeout);
        resolve();
      }
    });
  });

  await mkdir(path.dirname(apiPidPath), { recursive: true });
  await writeFile(apiPidPath, String(apiProcess.pid));
}

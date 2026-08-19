import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Builder, By, Capabilities, until, type WebDriver } from "selenium-webdriver";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// create the path to the expected application binary
const application = path.resolve(
  __dirname,
  "..",
  "src-tauri",
  "target",
  "debug",
  process.platform === "win32" ? "cash-dial-desktop.exe" : "cash-dial-desktop",
);

// keep track of the webdriver instance we create
export let driver: WebDriver;

process.env.RUST_BACKTRACE = "1";

// keep track of the tauri-driver process we start
let tauriDriver: any;

export async function createDriver() {
  if (!fs.existsSync(application)) {
    throw new Error(`Application not found at ${application}. Did you run pnpm build:test?`);
  }

  try {
    tauriDriver = spawn(path.resolve(os.homedir(), ".cargo", "bin", "tauri-driver"), [], {
      stdio: [null, process.stdout, process.stderr],
      env: { ...process.env, APP_ENV: "test" },
    });

    const capabilities = new Capabilities();
    capabilities.set("tauri:options", { application });
    capabilities.setBrowserName("wry");

    // start the webdriver client
    driver = await new Builder()
      .withCapabilities(capabilities)
      .usingServer("http://localhost:4444/")
      .build();
  } catch (error) {
    console.error(error);
  }

  // start tauri-driver
}

export async function closeTauriDriver() {
  // stop the webdriver session
  await driver.quit();

  // kill the tauri-driver process
  tauriDriver.kill();
}

/** Wait until the home page has finished mounting its interactive islands. */
export async function waitForHomeReady() {
  await driver.wait(until.elementLocated(By.id("speed-dial-toggle")), 15000);
}

function onShutdown(fn: any) {
  const cleanup = () => {
    try {
      fn();
    } finally {
      process.exit();
    }
  };

  process.on("exit", cleanup);
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("SIGHUP", cleanup);
  process.on("SIGBREAK", cleanup);
}

onShutdown(() => {
  closeTauriDriver();
});

export function deleteDatabase() {
  const DB_FILE = String(process.env.DATABASE_URL);

  const dbPath = path.resolve(__dirname, "..", DB_FILE);

  if (fs.existsSync(dbPath)) {
    const parsed = path.parse(dbPath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    const backupPath = path.join(parsed.dir, `${parsed.name}-${timestamp}.backup${parsed.ext}`);

    fs.copyFileSync(dbPath, backupPath);
    console.info(`Test driver created database backup: ${backupPath}`);

    fs.unlinkSync(dbPath);
    console.info(`Test driver deleted database: ${dbPath}`);
  }
}

export async function invokeCommand<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  await driver.wait(
    async () => Boolean(await driver.executeScript("return Boolean(window.testApi?.invoke);")),
    10000,
  );

  const result = await driver.executeAsyncScript(
    (cmd: any, commandArgs: any, done: any) => {
      (window as any).testApi
        .invoke(cmd, commandArgs)
        .then(done)
        .catch((error: any) =>
          done({
            __error: String(error),
          }),
        );
    },
    command,
    args ?? {},
  );

  if (result && typeof result === "object" && "__error" in (result as Record<string, unknown>)) {
    throw new Error(String((result as Record<string, unknown>).__error));
  }

  return result as T;
}

import { type ChildProcess, spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Builder, By, Capabilities, until, type WebDriver, type WebElement } from "selenium-webdriver";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const application = path.resolve(
  workspaceRoot,
  "src-tauri",
  "target",
  "debug",
  process.platform === "win32" ? "cash-dial-desktop.exe" : "cash-dial-desktop",
);

export let driver: WebDriver;
let tauriDriver: ChildProcess | undefined;
let ownedTempDir: string | undefined;

process.env.RUST_BACKTRACE = "1";

type DriverOptions = { freshDatabase?: boolean; seedOverlay?: string };

const getFreePort = () =>
  new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });

const waitForPort = (port: number, processHandle: ChildProcess, timeoutMs = 15_000) =>
  new Promise<void>((resolve, reject) => {
    const startedAt = Date.now();
    const tryConnect = () => {
      if (processHandle.exitCode !== null) {
        reject(new Error(`tauri-driver exited during startup with code ${processHandle.exitCode}`));
        return;
      }
      const socket = net.createConnection({ host: "127.0.0.1", port });
      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`tauri-driver did not listen on port ${port} within ${timeoutMs}ms`));
          return;
        }
        setTimeout(tryConnect, 50);
      });
    };
    tryConnect();
  });

export async function createDriver(options: DriverOptions = {}) {
  if (tauriDriver || driver) throw new Error("A test driver is already running");
  if (!fs.existsSync(application)) {
    throw new Error(`Application not found at ${application}. Did you run pnpm build:test?`);
  }

  const port = await getFreePort();
  const cargoHome = process.env.CARGO_HOME ?? path.join(os.homedir(), ".cargo");
  const driverBinary = path.join(
    cargoHome,
    "bin",
    process.platform === "win32" ? "tauri-driver.exe" : "tauri-driver",
  );
  const env: NodeJS.ProcessEnv = { ...process.env, APP_ENV: "test" };

  if (options.freshDatabase) {
    ownedTempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cash-dial-e2e-"));
    env.DATABASE_URL = path.join(ownedTempDir, "scenario.sqlite");
  }
  if (options.seedOverlay) {
    const overlay = path.resolve(options.seedOverlay);
    if (!fs.existsSync(overlay)) throw new Error(`Seed overlay not found: ${overlay}`);
    env.E2E_SEED_FILE = overlay;
  }

  try {
    tauriDriver = spawn(driverBinary, ["--port", String(port)], {
      stdio: ["ignore", "inherit", "inherit"],
      env,
      windowsHide: true,
    });
    await new Promise<void>((resolve, reject) => {
      tauriDriver?.once("spawn", resolve);
      tauriDriver?.once("error", reject);
    });
    await waitForPort(port, tauriDriver);

    const capabilities = new Capabilities();
    capabilities.set("tauri:options", { application });
    capabilities.setBrowserName("wry");
    driver = await new Builder()
      .withCapabilities(capabilities)
      .usingServer(`http://127.0.0.1:${port}/`)
      .build();
  } catch (error) {
    await closeTauriDriver();
    throw error;
  }
}

export async function closeTauriDriver() {
  const activeDriver = driver;
  driver = undefined as unknown as WebDriver;
  if (activeDriver) await activeDriver.quit().catch(() => undefined);

  const activeProcess = tauriDriver;
  tauriDriver = undefined;
  if (activeProcess && activeProcess.exitCode === null) activeProcess.kill();

  if (ownedTempDir) {
    const target = path.resolve(ownedTempDir);
    const tempRoot = `${path.resolve(os.tmpdir())}${path.sep}`;
    if (!target.startsWith(tempRoot) || !path.basename(target).startsWith("cash-dial-e2e-")) {
      throw new Error(`Refusing to remove unowned test directory: ${target}`);
    }
    fs.rmSync(target, { recursive: true, force: true });
    ownedTempDir = undefined;
  }
}

export async function waitForHomeReady() {
  await driver.wait(until.elementLocated(By.id("speed-dial-toggle")), 15_000);
}

export async function findVisible(locator: By, timeoutMs = 15_000): Promise<WebElement> {
  return driver.wait<WebElement>(async () => {
    const elements = await driver.findElements(locator);
    for (const element of elements) {
      if (await element.isDisplayed()) return element;
    }
    return false;
  }, timeoutMs);
}

export function deleteDatabase() {
  const configured = process.env.DATABASE_URL;
  if (!configured) return;
  const dbPath = path.resolve(workspaceRoot, configured);
  const relative = path.relative(workspaceRoot, dbPath);
  const isOwnedWorkspaceDb =
    !relative.startsWith("..") &&
    ["e2e-test.sqlite", "integration-tests-front.sqlite"].includes(path.basename(dbPath));
  if (!isOwnedWorkspaceDb) throw new Error(`Refusing to delete unowned database: ${dbPath}`);
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
}

export async function invokeCommand<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  await driver.wait(
    async () => Boolean(await driver.executeScript("return Boolean(window.testApi?.invoke);")),
    10_000,
  );
  const result = await driver.executeAsyncScript(
    (cmd: string, commandArgs: Record<string, unknown>, done: (value: unknown) => void) => {
      (window as any).testApi
        .invoke(cmd, commandArgs)
        .then(done)
        .catch((error: unknown) => done({ __error: String(error) }));
    },
    command,
    args ?? {},
  );
  if (result && typeof result === "object" && "__error" in (result as Record<string, unknown>)) {
    throw new Error(String((result as Record<string, unknown>).__error));
  }
  return result as T;
}

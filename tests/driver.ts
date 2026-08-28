import { type ChildProcess, spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Builder, By, Capabilities, type WebDriver, type WebElement } from "selenium-webdriver";

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
let ownedRuntimeDir: string | undefined;

process.env.RUST_BACKTRACE = "1";

type DriverOptions = { freshDatabase?: boolean; seedOverlay?: string };
type DriverStatus = { value?: { ready?: boolean } };
type TestApiWindow = Window & {
  testApi: { invoke: (command: string, args: Record<string, unknown>) => Promise<unknown> };
};

const DRIVER_START_TIMEOUT_MS = 15_000;
const DRIVER_QUIT_TIMEOUT_MS = 10_000;
const DRIVER_STOP_TIMEOUT_MS = 2_000;

const delay = (timeoutMs: number) => new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));

const hasExited = (child: ChildProcess) => child.exitCode !== null || child.signalCode !== null;

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

const getDriverPorts = async () => {
  const port = await getFreePort();
  let nativePort = await getFreePort();

  while (nativePort === port) nativePort = await getFreePort();

  return { port, nativePort };
};

const waitForDriverReady = async (
  port: number,
  nativePort: number,
  child: ChildProcess,
  timeoutMs = DRIVER_START_TIMEOUT_MS,
) => {
  const deadline = Date.now() + timeoutMs;
  let lastError = "the WebDriver endpoint did not respond";

  while (Date.now() < deadline) {
    if (hasExited(child)) {
      throw new Error(
        `tauri-driver exited during startup with code ${child.exitCode ?? child.signalCode} ` +
          `(port=${port}, nativePort=${nativePort})`,
      );
    }

    const controller = new AbortController();
    const requestTimeout = setTimeout(() => controller.abort(), 1_000);

    try {
      const response = await fetch(`http://127.0.0.1:${port}/status`, {
        signal: controller.signal,
      });
      const status = (await response.json().catch(() => undefined)) as DriverStatus | undefined;

      if (response.ok && status?.value?.ready === true) return;

      lastError = `WebDriver status was ${response.status} (ready=${String(status?.value?.ready)})`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    } finally {
      clearTimeout(requestTimeout);
    }

    await delay(100);
  }

  throw new Error(
    `tauri-driver was not ready within ${timeoutMs}ms ` +
      `(port=${port}, nativePort=${nativePort}): ${lastError}`,
  );
};

const waitForExit = (child: ChildProcess, timeoutMs: number) =>
  new Promise<boolean>((resolve) => {
    if (hasExited(child)) {
      resolve(true);
      return;
    }

    let finished = false;
    const finish = (exited: boolean) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      child.off("exit", onExit);
      resolve(exited);
    };
    const onExit = () => finish(true);
    const timeout = setTimeout(() => finish(false), timeoutMs);

    child.once("exit", onExit);
  });

const terminateProcessTree = async (child: ChildProcess) => {
  const pid = child.pid;
  if (!pid) return;

  if (process.platform === "win32") {
    await new Promise<void>((resolve) => {
      const taskkill = spawn("taskkill.exe", ["/PID", String(pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        taskkill.off("error", finish);
        taskkill.off("exit", finish);
        resolve();
      };

      taskkill.once("error", finish);
      taskkill.once("exit", finish);
    });
    if (!(await waitForExit(child, DRIVER_STOP_TIMEOUT_MS)) && !hasExited(child)) {
      child.kill("SIGKILL");
      await waitForExit(child, DRIVER_STOP_TIMEOUT_MS);
    }
    return;
  }

  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    if (!hasExited(child)) child.kill("SIGTERM");
  }

  if (await waitForExit(child, DRIVER_STOP_TIMEOUT_MS)) return;

  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    if (!hasExited(child)) child.kill("SIGKILL");
  }
  await waitForExit(child, DRIVER_STOP_TIMEOUT_MS);
};

const quitWebDriver = async (activeDriver: WebDriver) => {
  await Promise.race([
    activeDriver.quit(),
    delay(DRIVER_QUIT_TIMEOUT_MS).then(() => {
      throw new Error(`WebDriver quit timed out after ${DRIVER_QUIT_TIMEOUT_MS}ms`);
    }),
  ]).catch(() => undefined);
};

const formatError = (error: unknown) => (error instanceof Error ? error.message : String(error));

const startDriver = async (options: DriverOptions) => {
  const { port, nativePort } = await getDriverPorts();
  const cargoHome = process.env.CARGO_HOME ?? path.join(os.homedir(), ".cargo");
  const driverBinary = path.join(
    cargoHome,
    "bin",
    process.platform === "win32" ? "tauri-driver.exe" : "tauri-driver",
  );
  const nativeDriver = process.env.TAURI_NATIVE_DRIVER;
  const env: NodeJS.ProcessEnv = { ...process.env, APP_ENV: "test" };

  ownedRuntimeDir = fs.mkdtempSync(path.join(os.tmpdir(), "cash-dial-e2e-"));

  const logDir = process.env.CI
    ? path.join(workspaceRoot, "src-tauri", "test-logs", path.basename(ownedRuntimeDir))
    : path.join(ownedRuntimeDir, "logs");

  env.LOG_DIR = logDir;

  if (options.freshDatabase) {
    env.DATABASE_URL = path.join(ownedRuntimeDir, "scenario.sqlite");
  }
  if (options.seedOverlay) env.E2E_SEED_FILE = path.resolve(options.seedOverlay);
  if (nativeDriver && !fs.existsSync(nativeDriver)) {
    throw new Error(`Configured native WebDriver was not found: ${nativeDriver}`);
  }

  const driverArgs = ["--port", String(port), "--native-port", String(nativePort)];
  if (nativeDriver) driverArgs.push("--native-driver", nativeDriver);

  const child = spawn(driverBinary, driverArgs, {
    stdio: ["ignore", "inherit", "inherit"],
    env,
    windowsHide: true,
    detached: process.platform !== "win32",
  });
  tauriDriver = child;

  await new Promise<void>((resolve, reject) => {
    const onSpawn = () => {
      child.off("error", onError);
      resolve();
    };
    const onError = (error: Error) => {
      child.off("spawn", onSpawn);
      reject(error);
    };

    child.once("spawn", onSpawn);
    child.once("error", onError);
  });
  await waitForDriverReady(port, nativePort, child);

  const webviewDataDir = path.join(ownedRuntimeDir, "webview2-driver-data");

  fs.mkdirSync(webviewDataDir, {
    recursive: true,
  });

  const capabilities = new Capabilities();
  capabilities.set("tauri:options", {
    application,
    webviewOptions: {
      userDataFolder: webviewDataDir,
    },
  });
  capabilities.setBrowserName("wry");

  driver = await new Builder()
    .withCapabilities(capabilities)
    .usingServer(`http://127.0.0.1:${port}/`)
    .build();
  try {
    await driver.manage().window().setRect({ width: 1280, height: 1024 });
  } catch {
    // Some headless environments do not expose window management.
  }
};

export async function createDriver(options: DriverOptions = {}) {
  if (tauriDriver || driver) throw new Error("A test driver is already running");
  if (!fs.existsSync(application)) {
    throw new Error(`Application not found at ${application}. Did you run pnpm build:test?`);
  }

  if (options.seedOverlay) {
    const seedOverlay = path.resolve(options.seedOverlay);
    if (!fs.existsSync(seedOverlay)) throw new Error(`Seed overlay not found: ${seedOverlay}`);
  }

  try {
    await startDriver(options);
  } catch (error) {
    await closeTauriDriver();
    throw new Error(`Unable to create a Tauri WebDriver session: ${formatError(error)}`);
  }
}

export async function closeTauriDriver() {
  const activeDriver = driver;
  driver = undefined as unknown as WebDriver;
  if (activeDriver) await quitWebDriver(activeDriver);

  const activeProcess = tauriDriver;
  tauriDriver = undefined;
  if (activeProcess) await terminateProcessTree(activeProcess);

  if (ownedRuntimeDir && !process.env.CI) {
    const target = path.resolve(ownedRuntimeDir);
    const tempRoot = `${path.resolve(os.tmpdir())}${path.sep}`;
    if (!target.startsWith(tempRoot) || !path.basename(target).startsWith("cash-dial-e2e-")) {
      throw new Error(`Refusing to remove unowned test directory: ${target}`);
    }
    try {
      fs.rmSync(target, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
    } catch {
      // WebView2 may retain cache-file handles briefly; cleanup must not mask a test result.
    }
  }
  ownedRuntimeDir = undefined;
}

export async function waitForHomeReady() {
  await findVisible(By.id("speed-dial-toggle"), 15_000);
  await driver.wait(
    async () => Boolean(await driver.executeScript("return Boolean(window.testApi?.invoke);")),
    15_000,
  );
  await findVisible(By.css('a[href^="/account?id="]'), 15_000);
}

export async function findVisible(locator: By, timeoutMs = 15_000): Promise<WebElement> {
  return driver.wait<WebElement>(
    async () => {
      try {
        const elements = await driver.findElements(locator);
        for (const element of elements) {
          if (await element.isDisplayed()) return element;
        }
      } catch {
        // WebKit can replace an Astro island between locating it and checking
        // visibility. Retry against the current document instead of surfacing a
        // stale-element error.
      }
      return false;
    },
    timeoutMs,
    `Visible element was not found: ${locator}`,
  );
}

export async function clickWhenReady(locator: By, timeoutMs = 15_000): Promise<void> {
  await driver.wait(
    async () => {
      try {
        const elements = await driver.findElements(locator);
        for (const element of elements) {
          if (!(await element.isDisplayed()) || !(await element.isEnabled())) continue;

          // A native WebDriver click is intermittently rejected by WebKitGTK
          // after an Astro island redraw. Scrolling and dispatching the DOM click
          // in one browser command avoids retaining a stale element reference.
          await driver.executeScript(
            "arguments[0].scrollIntoView({ block: 'center', inline: 'center' }); arguments[0].click();",
            element,
          );
          return true;
        }
      } catch {
        // Re-locate on the next poll if hydration or navigation replaced it.
      }
      return false;
    },
    timeoutMs,
    `Clickable element was not found: ${locator}`,
  );
}

export async function navigateTo(
  path: string,
  marker: By,
  timeoutMs = 15_000,
): Promise<WebElement> {
  await clickWhenReady(By.css(`a[href="${path}"]`), timeoutMs);

  await driver.wait(async () => {
    try {
      return (
        (await driver.executeScript<string>(
          "return window.location.pathname + window.location.search;",
        )) === path
      );
    } catch {
      return false;
    }
  }, timeoutMs);

  return findVisible(marker, timeoutMs);
}

export async function waitForBodyText(expected: string, timeoutMs = 15_000): Promise<string> {
  return driver.wait<string>(async () => {
    try {
      // Read from the active document in one WebDriver command. Astro page
      // transitions can replace <body> between findElement() and getText(),
      // which makes an otherwise valid element reference stale.
      const body = await driver.executeScript<string>(
        "return document.body ? document.body.innerText : '';",
      );
      return body.includes(expected) ? body : false;
    } catch {
      return false;
    }
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
      (window as TestApiWindow).testApi
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

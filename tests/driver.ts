import os from "os";
import { spawn, spawnSync } from "child_process";
import { Builder, Capabilities, type WebDriver  } from "selenium-webdriver";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// create the path to the expected application binary
const application = path.resolve(
  __dirname,
  "..",
  "src-tauri",
  "target",
  "release",
   process.platform === "win32"
    ? "cash-dial-desktop.exe"
    : "cash-dial-desktop",
);

// keep track of the webdriver instance we create 
export let driver: WebDriver;

// keep track of the tauri-driver process we start
let tauriDriver: any;
let exit = false;

const SKIP_BUILD = Boolean(process.env.SKIP_BUILD);

export async function createDriver () {
  const appExists = fs.existsSync(application);
  
  if (!SKIP_BUILD && !appExists) {
    spawnSync("pnpm", ["tauri", "build", "--no-bundle"], {
      cwd: path.resolve(__dirname, ".."),
      stdio: "inherit",
      shell: true,
    });
  }

  // start tauri-driver
  tauriDriver = spawn(
    path.resolve(os.homedir(), ".cargo", "bin", "tauri-driver"),
    [],
    { stdio: [null, process.stdout, process.stderr] }
  );

  const capabilities = new Capabilities();
  capabilities.set("tauri:options", { application });
  capabilities.setBrowserName("wry");

  // start the webdriver client
  driver = await new Builder()
    .withCapabilities(capabilities)
    .usingServer("http://localhost:4444/")
    .build();
};

export async function closeTauriDriver() {
  exit = true;
  // stop the webdriver session
  await driver.quit();

  // kill the tauri-driver process
  tauriDriver.kill();
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
  const DB_FILE = String(process.env.DB_URL);

  const dbPath = path.resolve(
    __dirname,
    "..",
    DB_FILE,
  );

  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log(`Deleted database: ${dbPath}`);
  }
}

export function seedDatabase() {
  const DB_FILE = String(process.env.DB_URL);

  const dbPath = path.resolve(
    __dirname,
    "..",
    DB_FILE,
  );

  const seedPath = path.resolve(
    __dirname,
    "..",
    "src-tauri",
    "seeds",
    "test.sql",
  );

  spawnSync(
    "sqlite3",
    [dbPath],
    {
      input: `.read "${seedPath.replace(/\\/g, "/")}"\n`,
      shell: true,
      encoding: "utf8",
      stdio: "pipe",
    }
  );
}

export async function invokeCommand<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
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

  if (
    result &&
    typeof result === "object" &&
    "__error" in (result as Record<string, unknown>)
  ) {
    throw new Error(
      String(
        (result as Record<string, unknown>).__error,
      ),
    );
  }

  return result as T;
}
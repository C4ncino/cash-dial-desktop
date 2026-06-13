import { invoke } from "@tauri-apps/api/core";

declare global {
  interface Window {
    testApi: {
      invoke: typeof invoke;
    };
  }
}

window.testApi = {
  invoke,
};

import { invoke } from "@tauri-apps/api/core";

import { logger, setupGlobalErrorHandlers } from "@/lib/logger";
import { accountsStore } from "@/stores/accountsStore";
import { currencyStore } from "@/stores/currencyStore";

setupGlobalErrorHandlers();

export async function initStores() {
  const initialized = (await invoke("get_initialize_state")) as boolean;

  logger.debug("Initialize state:", initialized);

  // if (initialized) return;

  await invoke("initialize");

  logger.info("Initializing stores...");

  await currencyStore.getState().populate();

  await accountsStore.getState().populate();
}

import { invoke } from "@tauri-apps/api/core";

import { logger, setupGlobalErrorHandlers } from "@/lib/logger";
import { accountsStore } from "@/stores/accountsStore";
import { categoryStore } from "@/stores/categoryStore";
import { currencyStore } from "@/stores/currencyStore";
import { movementsStore } from "@/stores/movementsStore";

setupGlobalErrorHandlers();

export async function initStores() {
  const initialized = (await invoke("get_initialize_state")) as boolean;

  logger.debug("Initialize state:", initialized);

  // if (initialized) return;

  await invoke("initialize");

  logger.info("Initializing stores...");

  await Promise.all([
    currencyStore.getState().populate(),
    accountsStore.getState().populate(),
    categoryStore.getState().populate(),
    movementsStore.getState().populate(),
  ]);

  logger.info("Stores ready...");
}

import { invoke } from "@tauri-apps/api/core";

import { accountsStore } from "@/stores/accountsStore";
import { currencyStore } from "@/stores/currencyStore";

export async function initStores() {
  const initialized = (await invoke("get_initialize_state")) as boolean;

  console.info("Initialize state: ", initialized);

  // if (initialized)  return;

  await invoke("initialize");

  console.log("Initializing stores...");

  await currencyStore.getState().populate();

  await accountsStore.getState().populate();
}

import { logger, setupGlobalErrorHandlers } from "@/lib/logger";
import { systemCommands } from "@/services/tauri/system";
import { accountsStore } from "@/stores/accountsStore";
import { budgetStore } from "@/stores/budgetStore";
import { categoryStore } from "@/stores/categoryStore";
import { currencyStore } from "@/stores/currencyStore";
import { movementsStore } from "@/stores/movementsStore";
import { planningsStore } from "@/stores/planningsStore";

let initialization: Promise<void> | null = null;

async function initializeStores() {
  setupGlobalErrorHandlers();
  const initialized = await systemCommands.getInitializeState();

  logger.debug("Initialize state:", initialized);

  if (!initialized) await systemCommands.initialize();

  logger.info("Initializing stores...");

  await Promise.all([
    currencyStore.getState().populate(),
    accountsStore.getState().populate(),
    categoryStore.getState().populate(),
    movementsStore.getState().populate(),
    budgetStore.getState().populate(),
    planningsStore.getState().populate(),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const ratesAreStale = currencyStore
    .getState()
    .currencies.some((currency) => currency.conversionRateDate !== today);

  if (ratesAreStale) {
    try {
      await currencyStore.getState().refreshRates();
    } catch (error) {
      logger.warn("Currency rate refresh failed; using cached rates", error);
    }
  }

  logger.info("Stores ready...");
}

export function initStores(): Promise<void> {
  if (!initialization) {
    initialization = initializeStores().catch((error) => {
      initialization = null;
      throw error;
    });
  }
  return initialization;
}

export function resetInitializationForTests() {
  initialization = null;
}

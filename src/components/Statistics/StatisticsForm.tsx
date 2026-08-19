import { Icon } from "@iconify/react";
import { useStore } from "zustand";

import SelectCurrency from "@/components/Forms/SelectCurrency";
import useDate from "@/hooks/useDate";
import { isCurrentPeriod, periodRange, type StatisticsPeriod } from "@/lib/statisticsQuery";
import { currencyStore } from "@/stores/currencyStore";
import { statisticsStore } from "@/stores/statisticsStore";

const StatisticsForm = () => {
  const currencies = useStore(currencyStore, (state) => state.currencies);
  const {
    selectedCurrencyId,
    period,
    periodStartMs,
    loading,
    error,
    setPeriod,
    previousPeriod,
    nextPeriod,
  } = useStore(statisticsStore);

  const { endMs } = periodRange(periodStartMs, period);

  const { dateObject: startObject, dateShort: startShort } = useDate(periodStartMs);
  const { dateObject: endObject, dateShort: endShort } = useDate(endMs - 1);

  return (
    <section
      aria-label="Controles de estadísticas"
      className="grid gap-4 rounded-md bg-white p-4 dark:bg-zinc-900 dark:text-white"
    >
      <section
        aria-label="Periodo de estadísticas"
        className="flex items-center justify-between gap-3"
      >
        <button
          type="button"
          aria-label="Previous period"
          className="rounded border px-3 py-2 hover:bg-zinc-200 dark:hover:bg-zinc-800"
          onClick={previousPeriod}
        >
          <Icon icon="iconoir:nav-arrow-left" width={20} height={20} />
        </button>

        <h2 className="font-semibold flex items-center">
          <Icon icon="iconoir:calendar" width={20} height={20} className="mx-2 inline" />

          <time dateTime={startObject.toISOString()}>{startShort}</time>

          <Icon icon="iconoir:minus" width={20} height={20} className="mx-2 inline" />

          <time dateTime={endObject.toISOString()}>{endShort}</time>
        </h2>

        <button
          type="button"
          aria-label="Next period"
          disabled={isCurrentPeriod(periodStartMs, period)}
          className="rounded border px-3 py-2 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-zinc-800"
          onClick={nextPeriod}
        >
          <Icon icon="iconoir:nav-arrow-right" width={20} height={20} />
        </button>
      </section>

      <fieldset
        aria-label="Opciones de estadísticas"
        className="flex flex-wrap items-end gap-3 border-t border-zinc-300 pt-4 dark:border-zinc-700"
      >
        <legend className="sr-only">Opciones de estadísticas</legend>
        <label className="flex flex-col gap-1" htmlFor="statisticsPeriod">
          Periodo
          <select
            id="statisticsPeriod"
            value={period}
            onChange={(event) => setPeriod(event.target.value as StatisticsPeriod)}
          >
            <option className="bg-zinc-950" value="week">
              Semana
            </option>
            <option className="bg-zinc-950" value="month">
              Mes
            </option>
            <option className="bg-zinc-950" value="year">
              Año
            </option>
          </select>
        </label>

        <label className="flex flex-col gap-1" htmlFor="currencyId">
          Moneda
          <SelectCurrency
            id="currencyId"
            value={selectedCurrencyId ?? ""}
            className=""
            onChange={(event) =>
              statisticsStore.getState().setSelectedCurrencyId(Number(event.target.value))
            }
          />
        </label>
      </fieldset>

      {loading && <p>Cargando estadísticas…</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!currencies.length && <p>Agrega una moneda para ver las estadísticas.</p>}
    </section>
  );
};

export default StatisticsForm;

import { Icon } from "@iconify/react";

import SelectCurrency from "@/components/Forms/SelectCurrency";
import useDate from "@/hooks/useDate";
import { useCurrencies, useStatistics } from "@/hooks/useStores";
import { isCurrentPeriod, periodRange, type StatisticsPeriod } from "@/lib/statisticsQuery";
import { statisticsStore } from "@/stores/statisticsStore";

const StatisticsForm = () => {
  const currencies = useCurrencies((state) => state.currencies);
  const selectedCurrencyId = useStatistics((state) => state.selectedCurrencyId);
  const period = useStatistics((state) => state.period);
  const periodStartMs = useStatistics((state) => state.periodStartMs);
  const loading = useStatistics((state) => state.loading);
  const error = useStatistics((state) => state.error);
  const setPeriod = useStatistics((state) => state.setPeriod);
  const previousPeriod = useStatistics((state) => state.previousPeriod);
  const nextPeriod = useStatistics((state) => state.nextPeriod);

  const { endMs } = periodRange(periodStartMs, period);

  const { dateObject: startObject, dateShort: startShort } = useDate(periodStartMs);
  const { dateObject: endObject, dateShort: endShort } = useDate(endMs - 1);

  return (
    <section
      aria-label="Controles de estadísticas"
      className="glass-surface grid gap-4 rounded-xl p-4 text-zinc-950 sm:p-5 dark:text-zinc-100"
    >
      <section
        aria-label="Periodo de estadísticas"
        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3"
      >
        <button
          type="button"
          aria-label="Previous period"
          className="rounded border px-3 py-2 hover:bg-zinc-200 dark:hover:bg-zinc-800"
          onClick={previousPeriod}
        >
          <Icon icon="iconoir:nav-arrow-left" width={20} height={20} />
        </button>

        <h2 className="flex min-w-0 flex-wrap items-center justify-center text-center font-semibold">
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
        className="grid grid-cols-1 gap-3 border-t border-zinc-300 pt-4 dark:border-zinc-700 sm:grid-cols-2"
      >
        <legend className="sr-only">Opciones de estadísticas</legend>
        <label className="flex min-w-0 flex-col gap-1" htmlFor="statisticsPeriod">
          Periodo
          <select
            id="statisticsPeriod"
            value={period}
            onChange={(event) => setPeriod(event.target.value as StatisticsPeriod)}
            className="w-full rounded-lg px-3 py-2"
          >
            <option className="bg-zinc-100 dark:bg-zinc-800" value="week">
              Semana
            </option>
            <option className="bg-zinc-100 dark:bg-zinc-800" value="month">
              Mes
            </option>
            <option className="bg-zinc-100 dark:bg-zinc-800" value="year">
              Año
            </option>
          </select>
        </label>

        <label className="flex min-w-0 flex-col gap-1" htmlFor="currencyId">
          Moneda
          <SelectCurrency
            id="currencyId"
            value={selectedCurrencyId ?? ""}
            className="w-full! rounded-lg px-3 py-2"
            onChange={(event) =>
              statisticsStore.getState().setSelectedCurrencyId(Number(event.target.value))
            }
          />
        </label>
      </fieldset>

      {loading && <p>Cargando estadísticas…</p>}
      {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
      {!currencies.length && <p>Agrega una moneda para ver las estadísticas.</p>}
    </section>
  );
};

export default StatisticsForm;

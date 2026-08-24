import { invokeCommand } from "./invoke";

export type StatisticsCommandRequest = {
  startMs: number;
  endMs: number;
  currencyId: number;
  granularity: StatisticsGranularity;
  options: StatisticsOptions | null;
};

export const statisticsCommands = {
  get: (request: StatisticsCommandRequest) =>
    invokeCommand<StatisticsResponse>("get_statistics", request),
};

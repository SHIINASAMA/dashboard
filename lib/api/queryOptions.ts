import { queryKeys } from "./queryKeys";
import { api } from "../api";

export const createPulseQuery = (days: number) => ({
  queryKey: queryKeys.pulse(days),
  queryFn: () => api.getPulse(days),
});

export const createOverviewQuery = () => ({
  queryKey: queryKeys.overview(),
  queryFn: () => api.getOverview(),
});

export const createGithubOverviewQuery = (accountId: number) => ({
  queryKey: queryKeys.githubOverview(accountId),
  queryFn: () => api.getGithubOverview(accountId),
});

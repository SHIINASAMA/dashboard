import type { FetchLevel } from "./fetchPolicy";

export class PgBossScheduler {
  // Thin wrapper around pg-boss; skeleton for now
  constructor(private boss: unknown) {}

  async enqueue(accountId: number, level: FetchLevel): Promise<string | null> {
    if (!this.boss) return null;
    const id = await (this.boss as { send: (a:string,b:unknown,c:unknown)=>Promise<string> }).send(`fetch:${level}`, { accountId }, { retryLimit: 2 });
    return id;
  }

  async scheduleCron(level: FetchLevel, cron: string): Promise<void> {
    if (!this.boss) return;
    await (this.boss as { schedule: (a:string,b:string,c:unknown,d:unknown)=>Promise<void> }).schedule(`fetch:${level}`, cron, {}, { tz: "UTC" } as unknown);
  }
}

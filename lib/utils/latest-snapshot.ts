export type SnapshotRow = {
  snapshot_date: string;
};

export function latestSnapshotRows<T extends SnapshotRow>(rows: T[]): T[] {
  let latestDate = "";
  for (const row of rows) {
    if (row.snapshot_date > latestDate) latestDate = row.snapshot_date;
  }
  return rows.filter((row) => row.snapshot_date === latestDate);
}

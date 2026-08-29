export class Stars {
  constructor(public readonly value: number) {
    if (!Number.isInteger(value) || value < 0) throw new Error("Stars must be integer >=0");
  }
  delta(prev: Stars): number {
    return this.value - prev.value;
  }
  equals(other: Stars): boolean {
    return this.value === other.value;
  }
}

export class Forks {
  constructor(public readonly value: number) {
    if (!Number.isInteger(value) || value < 0) throw new Error("Forks must be integer >=0");
  }
  delta(prev: Forks): number {
    return this.value - prev.value;
  }
}

export interface Repo {
  accountId: number;
  repoId: number;
  name: string;
  fullName: string;
  stars: Stars;
  forks: Forks;
  isFork: number; // 0 or 1
  language: string | null;
  description: string | null;
  homepage: string | null;
  topics: string;
}

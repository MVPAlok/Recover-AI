/**
 * Deterministic Pseudo-Random Number Generator (PRNG) using Mulberry32.
 * Allows reproducible seeded generation of datasets.
 */

export class SeededRandom {
  private state: number;

  constructor(seed: number = 42) {
    this.state = seed >>> 0;
  }

  /**
   * Returns a pseudo-random float between 0 (inclusive) and 1 (exclusive).
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a pseudo-random integer between min (inclusive) and max (inclusive).
   */
  nextInt(min: number, max: number): number {
    const minCeil = Math.ceil(min);
    const maxFloor = Math.floor(max);
    return Math.floor(this.next() * (maxFloor - minCeil + 1)) + minCeil;
  }

  /**
   * Returns a pseudo-random float between min (inclusive) and max (exclusive).
   */
  nextFloat(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Picks a random element from an array.
   */
  choice<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    const index = Math.floor(this.next() * array.length);
    return array[index];
  }

  /**
   * Picks an item based on relative weights.
   */
  weightedChoice<T>(items: T[], weights: number[]): T {
    if (items.length !== weights.length || items.length === 0) {
      throw new Error('Items and weights must have identical non-zero lengths');
    }

    const totalWeight = weights.reduce((acc, w) => acc + w, 0);
    let randomThreshold = this.next() * totalWeight;

    for (let i = 0; i < items.length; i++) {
      if (randomThreshold < weights[i]) {
        return items[i];
      }
      randomThreshold -= weights[i];
    }

    return items[items.length - 1];
  }

  /**
   * Samples k distinct elements from an array without replacement (or all if k >= length).
   */
  sample<T>(array: T[], k: number): T[] {
    const copy = [...array];
    const n = copy.length;
    const resultSize = Math.min(k, n);

    for (let i = 0; i < resultSize; i++) {
      const j = this.nextInt(i, n - 1);
      const temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }

    return copy.slice(0, resultSize);
  }

  /**
   * Returns a pseudo-random Date between startDate and endDate.
   */
  randomDate(start: Date, end: Date): Date {
    const startTime = start.getTime();
    const endTime = end.getTime();
    const randomTime = startTime + this.next() * (endTime - startTime);
    return new Date(randomTime);
  }

  /**
   * Shuffles an array in place deterministically using Fisher-Yates.
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  }
}

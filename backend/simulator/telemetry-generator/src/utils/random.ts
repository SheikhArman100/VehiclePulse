/**
 * Mulberry32: Fast, high-quality 32-bit PRNG with deterministic seeding.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /**
   * Generates a pseudo-random floating-point number in [0, 1).
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates a pseudo-random number in range [min, max].
   */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Generates a pseudo-random integer in range [min, max].
   */
  intRange(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /**
   * Randomly picks one element from an array.
   */
  pick<T>(items: T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }

  /**
   * Returns true with given probability (0 to 1).
   */
  chance(probability: number): boolean {
    return this.next() < probability;
  }
}

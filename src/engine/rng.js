/**
 * DETERMINISTIC RANDOM NUMBER GENERATOR
 *
 * Ogni partita avrà un seed.
 *
 * Questo permette di:
 * - avere casualità realistica;
 * - riprodurre una partita;
 * - fare debug;
 * - confrontare modifiche all'IA;
 * - eseguire test ripetibili.
 */

export class RNG {
  constructor(seed = Date.now()) {
    this.initialSeed = seed;
    this.state = this.normalizeSeed(seed);
  }

  normalizeSeed(seed) {
    if (typeof seed === "number" && Number.isFinite(seed)) {
      return seed >>> 0;
    }

    if (typeof seed === "string") {
      let hash = 2166136261;

      for (let i = 0; i < seed.length; i++) {
        hash ^= seed.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }

      return hash >>> 0;
    }

    return Date.now() >>> 0;
  }

  /**
   * Genera un numero pseudo-casuale tra 0 e 1.
   */
  next() {
    let x = this.state;

    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;

    this.state = x >>> 0;

    return this.state / 4294967296;
  }

  /**
   * Numero casuale tra min e max.
   */
  float(min = 0, max = 1) {
    return min + this.next() * (max - min);
  }

  /** Compatibilità con il Match Engine. */
  nextFloat(min = 0, max = 1) {
    return this.float(min, max);
  }

  /**
   * Intero casuale incluso tra min e max.
   */
  integer(min, max) {
    return Math.floor(this.float(min, max + 1));
  }

  /**
   * Probabilità.
   *
   * Esempio:
   * rng.chance(0.25)
   *
   * restituisce true circa il 25% delle volte.
   */
  chance(probability) {
    if (probability <= 0) return false;
    if (probability >= 1) return true;

    return this.next() < probability;
  }

  /**
   * Sceglie casualmente un elemento da un array.
   */
  pick(array) {
    if (!array || array.length === 0) {
      return undefined;
    }

    const index = this.integer(0, array.length - 1);

    return array[index];
  }

  /**
   * Mescola un array usando il nostro RNG.
   *
   * Non modifica l'array originale.
   */
  shuffle(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
      const j = this.integer(0, i);

      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  /**
   * Restituisce lo stato corrente del generatore.
   * Utile per salvataggi e debug.
   */
  getState() {
    return {
      initialSeed: this.initialSeed,
      state: this.state,
    };
  }

  /**
   * Ripristina uno stato precedente.
   */
  setState(state) {
    if (!state || typeof state.state !== "number") {
      throw new Error("Invalid RNG state");
    }

    this.initialSeed = state.initialSeed;
    this.state = state.state >>> 0;
  }

  /**
   * Crea una copia indipendente del generatore.
   */
  clone() {
    const copy = new RNG(this.initialSeed);
    copy.state = this.state;

    return copy;
  }
}

/**
 * Crea un seed numerico per una nuova partita.
 */
export function createMatchSeed() {
  const time = Date.now() >>> 0;

  const randomPart =
    Math.floor(Math.random() * 0xffffffff) >>> 0;

  return (time ^ randomPart) >>> 0;
}

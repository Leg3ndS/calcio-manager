/**
 * MATCH CLOCK
 *
 * Gestisce il tempo della partita.
 *
 * Il motore gira a TICK fissi.
 */

export const MATCH_MINUTES = 90;
export const HALF_MINUTES = 45;

export const ENGINE_TICK_MS = 100; // 10 tick al secondo

// 90 minuti in 5 minuti reali.
const REAL_MATCH_DURATION_SECONDS = 300;

const SIMULATION_SECONDS = MATCH_MINUTES * 60;

// Quanti secondi simulati passano ogni secondo reale.
const BASE_TIME_SCALE =
  SIMULATION_SECONDS / REAL_MATCH_DURATION_SECONDS;

export class MatchClock {
  constructor() {
    this.reset();
  }

  reset() {
    this.minute = 0;
    this.second = 0;

    this.totalSimulatedSeconds = 0;

    this.half = 1;

    this.speed = 1;

    this.paused = false;

    this.finished = false;

    this.tickAccumulator = 0;
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  togglePause() {
    this.paused = !this.paused;
  }

  setSpeed(speed) {
    const allowed = [1, 2, 4, 8];

    if (allowed.includes(speed)) {
      this.speed = speed;
    }
  }

  /**
   * Aggiornamento del cronometro.
   *
   * deltaMs = tempo reale trascorso.
   */
  update(deltaMs) {
    if (this.paused || this.finished) {
      return [];
    }

    this.tickAccumulator += deltaMs;

    const executedTicks = [];

    while (this.tickAccumulator >= ENGINE_TICK_MS) {
      this.tickAccumulator -= ENGINE_TICK_MS;

      const simulatedSeconds =
        (ENGINE_TICK_MS / 1000) *
        BASE_TIME_SCALE *
        this.speed;

      this.totalSimulatedSeconds += simulatedSeconds;

      this.minute = Math.floor(
        this.totalSimulatedSeconds / 60
      );

      this.second = Math.floor(
        this.totalSimulatedSeconds % 60
      );

      if (
        this.minute >= HALF_MINUTES &&
        this.half === 1
      ) {
        this.half = 2;

        executedTicks.push({
          type: "HALF_TIME",
        });
      }

      if (this.minute >= MATCH_MINUTES) {
        this.finished = true;

        executedTicks.push({
          type: "FULL_TIME",
        });

        break;
      }

      executedTicks.push({
        type: "ENGINE_TICK",
      });
    }

    return executedTicks;
  }

  getDisplayTime() {
    return `${String(this.minute).padStart(2, "0")}:${String(
      this.second
    ).padStart(2, "0")}`;
  }

  getState() {
    return {
      minute: this.minute,
      second: this.second,
      half: this.half,
      speed: this.speed,
      paused: this.paused,
      finished: this.finished,
    };
  }
}

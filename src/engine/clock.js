/**
 * MATCH CLOCK
 *
 * Gestisce esclusivamente il tempo della simulazione.
 *
 * IMPORTANTE:
 * - Il clock NON gestisce la logica calcistica.
 * - Il Match Engine decide cosa fare ad ogni tick.
 * - Il rendering grafico è completamente separato.
 */

export const MATCH_MINUTES = 90;
export const HALF_MINUTES = 45;

// Il motore aggiorna la simulazione 10 volte al secondo.
export const ENGINE_TICK_MS = 100;

// 90 minuti simulati = 5 minuti reali a velocità 1x.
export const REAL_MATCH_DURATION_SECONDS = 300;

const SIMULATION_SECONDS = MATCH_MINUTES * 60;

/**
 * Secondi di partita simulati per ogni secondo reale a 1x.
 *
 * 5400 / 300 = 18
 *
 * Quindi:
 * 1 secondo reale = 18 secondi di partita.
 */
export const BASE_SIMULATION_SECONDS_PER_REAL_SECOND =
  SIMULATION_SECONDS / REAL_MATCH_DURATION_SECONDS;

export const MATCH_SPEEDS = [1, 2, 4, 8];

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

    // Tempo reale accumulato dall'ultimo tick.
    this.tickAccumulator = 0;
  }

  /**
   * Mette in pausa il cronometro.
   */
  pause() {
    this.paused = true;
  }

  /**
   * Riprende il cronometro.
   */
  resume() {
    if (!this.finished) {
      this.paused = false;
    }
  }

  /**
   * Inverte lo stato pausa/riproduzione.
   */
  togglePause() {
    if (this.finished) {
      return;
    }

    this.paused = !this.paused;
  }

  /**
   * Cambia la velocità della simulazione.
   *
   * Valori consentiti:
   * 1x
   * 2x
   * 4x
   * 8x
   */
  setSpeed(speed) {
    if (!MATCH_SPEEDS.includes(speed)) {
      throw new Error(
        `Velocità non valida: ${speed}. Valori consentiti: ${MATCH_SPEEDS.join(", ")}`
      );
    }

    this.speed = speed;
  }

  /**
   * Restituisce i secondi simulati per ogni tick.
   */
  getSimulationSecondsPerTick() {
    return (
      (ENGINE_TICK_MS / 1000) *
      BASE_SIMULATION_SECONDS_PER_REAL_SECOND *
      this.speed
    );
  }

  /**
   * Aggiorna il tempo.
   *
   * deltaMs:
   * millisecondi reali trascorsi dall'ultimo aggiornamento.
   *
   * Restituisce gli eventi temporali prodotti.
   */
  update(deltaMs) {
    if (this.paused || this.finished) {
      return [];
    }

    if (!Number.isFinite(deltaMs) || deltaMs < 0) {
      return [];
    }

    this.tickAccumulator += deltaMs;

    const events = [];

    while (this.tickAccumulator >= ENGINE_TICK_MS) {
      this.tickAccumulator -= ENGINE_TICK_MS;

      const simulatedSeconds =
        this.getSimulationSecondsPerTick();

      this.totalSimulatedSeconds += simulatedSeconds;

      /*
       * Fino a 90 minuti regolamentari.
       *
       * Il recupero verrà gestito successivamente
       * dal Match Rules Engine.
       */
      if (this.totalSimulatedSeconds >= MATCH_MINUTES * 60) {
        this.totalSimulatedSeconds = MATCH_MINUTES * 60;
      }

      this.updateDisplayTime();

      events.push({
        type: "ENGINE_TICK",
        minute: this.minute,
        second: this.second,
        half: this.half,
        simulatedSeconds,
      });

      if (
        this.half === 1 &&
        this.totalSimulatedSeconds >= HALF_MINUTES * 60
      ) {
        this.half = 2;

        events.push({
          type: "HALF_TIME",
          minute: 45,
          second: 0,
        });
      }

      if (
        this.totalSimulatedSeconds >= MATCH_MINUTES * 60
      ) {
        this.finished = true;

        events.push({
          type: "FULL_TIME",
          minute: 90,
          second: 0,
        });

        break;
      }
    }

    return events;
  }

  /**
   * Aggiorna minuto e secondo visualizzati.
   */
  updateDisplayTime() {
    this.minute = Math.floor(
      this.totalSimulatedSeconds / 60
    );

    this.second = Math.floor(
      this.totalSimulatedSeconds % 60
    );
  }

  /**
   * Tempo formattato.
   *
   * Esempio:
   * 07:32
   */
  getDisplayTime() {
    return `${String(this.minute).padStart(2, "0")}:${String(
      this.second
    ).padStart(2, "0")}`;
  }

  /**
   * Stato completo del clock.
   */
  getState() {
    return {
      minute: this.minute,
      second: this.second,
      totalSimulatedSeconds: this.totalSimulatedSeconds,
      half: this.half,
      speed: this.speed,
      paused: this.paused,
      finished: this.finished,
    };
  }
}

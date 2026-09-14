/**
 * MATCH ENGINE
 *
 * Cuore della simulazione della partita.
 *
 * RESPONSABILITÀ:
 * - possiede lo stato della partita;
 * - gestisce il clock;
 * - gestisce il RNG;
 * - esegue i tick;
 * - produce eventi;
 * - gestisce pausa/ripresa;
 * - gestisce la velocità;
 *
 * NON gestisce:
 * - grafica Phaser;
 * - interfaccia React;
 * - animazioni;
 *
 * Quelle parti leggeranno lo stato prodotto dal motore.
 */

import {
  createMatchState,
  MATCH_PHASES,
  POSSESSION,
} from "./worldState.js";

import {
  MatchClock,
} from "./clock.js";

import {
  RNG,
  createMatchSeed,
} from "./rng.js";

export class MatchEngine {
  constructor({
    homeTeam,
    awayTeam,
    seed = null,
  }) {
    const matchSeed =
      seed ?? createMatchSeed();

    this.rng = new RNG(matchSeed);

    this.clock = new MatchClock();

    this.state = createMatchState({
      homeTeam,
      awayTeam,
      seed: matchSeed,
    });

    this.state.phase = MATCH_PHASES.PRE_MATCH;

    this.state.possession = POSSESSION.NONE;

    this.running = false;

    this.listeners = new Set();

    this.lastUpdateTimestamp = null;
  }

  /**
   * Avvia la partita.
   */
  start() {
    if (this.state.matchStatus.finished) {
      return;
    }

    if (this.running) {
      return;
    }

    this.running = true;

    this.state.matchStatus.started = true;
    this.state.phase = MATCH_PHASES.KICKOFF;

    this.emitEvent({
      type: "MATCH_STARTED",
      minute: this.clock.minute,
      second: this.clock.second,
    });

    /*
     * Il kickoff vero verrà implementato
     * dal Match Rules Engine.
     */
  }

  /**
   * Ferma completamente il loop.
   *
   * Non equivale alla pausa tattica:
   * è un controllo tecnico del motore.
   */
  stop() {
    this.running = false;
    this.lastUpdateTimestamp = null;
  }

  /**
   * Pausa della partita.
   */
  pause() {
    this.clock.pause();

    this.state.clock.paused = true;

    this.state.phase = MATCH_PHASES.PAUSED;

    this.emitEvent({
      type: "MATCH_PAUSED",
      minute: this.clock.minute,
      second: this.clock.second,
    });
  }

  /**
   * Ripresa della partita.
   */
  resume() {
    if (this.state.matchStatus.finished) {
      return;
    }

    this.clock.resume();

    this.state.clock.paused = false;

    /*
     * La fase reale verrà determinata
     * successivamente dal game state.
     */
    if (this.state.phase === MATCH_PHASES.PAUSED) {
      this.state.phase = MATCH_PHASES.OPEN_PLAY;
    }

    this.emitEvent({
      type: "MATCH_RESUMED",
      minute: this.clock.minute,
      second: this.clock.second,
    });
  }

  /**
   * Imposta la velocità della partita.
   */
  setSpeed(speed) {
    this.clock.setSpeed(speed);

    this.state.clock.speed = speed;

    this.emitEvent({
      type: "SPEED_CHANGED",
      speed,
    });
  }

  /**
   * Esegue un aggiornamento del motore.
   *
   * deltaMs:
   * millisecondi reali trascorsi.
   */
  update(deltaMs) {
    if (!this.running) {
      return;
    }

    if (this.state.matchStatus.finished) {
      return;
    }

    const clockEvents =
      this.clock.update(deltaMs);

    /*
     * Sincronizziamo lo stato pubblico
     * con il clock interno.
     */
    this.syncClockState();

    /*
     * Ogni ENGINE_TICK diventerà successivamente
     * il punto in cui verranno eseguiti:
     *
     * - percezione;
     * - decisioni;
     * - movimento;
     * - possesso;
     * - pallone;
     * - passaggi;
     * - contrasti;
     * - tiri;
     * - ecc.
     */
    for (const event of clockEvents) {
      if (event.type === "ENGINE_TICK") {
        this.processTick(event);
      }

      this.emitEvent(event);
    }

    if (this.clock.finished) {
      this.finishMatch();
    }
  }

  /**
   * Tick principale del Match Engine.
   *
   * ATTENZIONE:
   * Qui costruiremo progressivamente
   * tutta la simulazione calcistica.
   */
  processTick(tick) {
    /*
     * Per ora non prendiamo decisioni calcistiche.
     *
     * Questo è intenzionale.
     *
     * Prima costruiamo l'architettura,
     * poi inseriamo i sistemi uno alla volta.
     */

    this.state.clock.minute = tick.minute;
    this.state.clock.second = tick.second;

    this.state.clock.totalSimulatedSeconds =
      this.clock.totalSimulatedSeconds;

    this.state.clock.half = tick.half;

    /*
     * La prima versione del motore assegna
     * il possesso iniziale casualmente.
     *
     * Verrà sostituito dal vero sistema
     * di kickoff e possesso.
     */
    if (
      this.state.possession === POSSESSION.NONE &&
      tick.minute === 0 &&
      tick.second === 0
    ) {
      this.state.possession =
        this.rng.chance(0.5)
          ? POSSESSION.HOME
          : POSSESSION.AWAY;
    }
  }

  /**
   * Fine della partita.
   */
  finishMatch() {
    if (this.state.matchStatus.finished) {
      return;
    }

    this.state.matchStatus.finished = true;
    this.state.matchStatus.started = false;

    this.state.phase = MATCH_PHASES.FULL_TIME;

    this.running = false;

    this.emitEvent({
      type: "MATCH_FINISHED",
      minute: this.clock.minute,
      second: this.clock.second,
      score: {
        ...this.state.score,
      },
    });
  }

  /**
   * Sincronizza il clock pubblico
   * contenuto nel World State.
   */
  syncClockState() {
    this.state.clock = {
      ...this.state.clock,
      ...this.clock.getState(),
    };
  }

  /**
   * Registra un listener agli eventi del motore.
   */
  subscribe(listener) {
    if (typeof listener !== "function") {
      throw new Error(
        "MatchEngine.subscribe richiede una funzione."
      );
    }

    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Emette un evento.
   */
  emitEvent(event) {
    const enrichedEvent = {
      ...event,
      timestamp: Date.now(),
      matchMinute: this.clock.minute,
      matchSecond: this.clock.second,
    };

    this.state.lastEvent = enrichedEvent;

    this.state.events.push(enrichedEvent);

    /*
     * Manteniamo una cronologia ragionevole.
     *
     * Più avanti potremo salvare tutti gli eventi
     * in un sistema dedicato di replay.
     */
    for (const listener of this.listeners) {
      listener(enrichedEvent, this.state);
    }
  }

  /**
   * Restituisce lo stato corrente.
   *
   * Viene restituito direttamente perché Phaser
   * e i sistemi futuri devono poter leggere
   * lo stato live.
   */
  getState() {
    return this.state;
  }

  /**
   * Restituisce il seed della partita.
   */
  getSeed() {
    return this.state.seed;
  }

  /**
   * Restituisce lo stato del RNG.
   *
   * Utile per debug e salvataggi futuri.
   */
  getRNGState() {
    return this.rng.getState();
  }

  /**
   * Restituisce lo stato del clock.
   */
  getClockState() {
    return this.clock.getState();
  }
}

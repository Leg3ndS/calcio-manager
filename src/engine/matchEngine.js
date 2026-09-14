/**
 * MATCH ENGINE
 *
 * Cuore della simulazione della partita.
 *
 * IMPORTANTE:
 *
 * - NON contiene rendering.
 * - NON dipende da Phaser.
 * - NON dipende da React.
 * - Utilizza un fixed timestep tramite MatchClock.
 * - Mantiene lo stato centrale nel World State.
 * - Le decisioni calcistiche verranno aggiunte progressivamente.
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

import {
  createTacticalInstructions,
} from "./data/tacticalModel.js";

import {
  createSpatialGrid,
  updateSpatialGrid,
} from "./spatial/grid.js";

import {
  createMatchEvent,
  appendEvent,
  createEventLog,
  EVENT_TYPES,
} from "./events/eventModel.js";


export class MatchEngine {
  constructor({
    homeTeam,
    awayTeam,
    seed = null,
  } = {}) {
    if (!homeTeam) {
      throw new Error(
        "MatchEngine: homeTeam è obbligatoria."
      );
    }

    if (!awayTeam) {
      throw new Error(
        "MatchEngine: awayTeam è obbligatoria."
      );
    }

    /**
     * Seed deterministico.
     */
    this.seed =
      seed ??
      createMatchSeed();

    /**
     * RNG della partita.
     */
    this.rng =
      new RNG(this.seed);

    /**
     * Clock.
     */
    this.clock =
      new MatchClock();

    /**
     * World State.
     */
    this.state =
      createMatchState({
        homeTeam,
        awayTeam,
        seed: this.seed,
      });

    /**
     * Event log.
     */
    this.eventLog =
      createEventLog();

    /**
     * Spatial representation.
     */
    this.spatialGrid =
      createSpatialGrid();

    /**
     * Istruzioni tattiche runtime.
     *
     * Sono separate dall'identità della squadra.
     * Questo permetterà di modificarle durante la partita
     * senza dover ricostruire la squadra.
     */
    this.tacticalInstructions = {
      home:
        createTacticalInstructions({
          team:
            homeTeam.tactics ?? {},
        }),

      away:
        createTacticalInstructions({
          team:
            awayTeam.tactics ?? {},
        }),
    };

    /**
     * Stato runtime.
     */
    this.running = false;

    this.listeners =
      new Set();

    /**
     * Tick corrente.
     */
    this.tick = 0;

    /**
     * Aggiorniamo subito il World State
     * con le nuove strutture.
     */
    this.syncRuntimeState();
  }


  /**
   * Avvia la partita.
   */
  start() {
    if (this.running) {
      return;
    }

    if (
      this.state.matchStatus.finished
    ) {
      return;
    }

    this.running = true;

    this.clock.resume();

    this.state.phase =
      MATCH_PHASES.KICKOFF;

    this.state.matchStatus.started =
      true;

    this.emitEvent(
      this.createEvent(
        EVENT_TYPES.MATCH_STARTED,
        {
          payload: {
            seed: this.seed,
          },
        }
      )
    );
  }


  /**
   * Ferma completamente il motore.
   */
  stop() {
    this.running = false;

    this.clock.pause();

    if (
      !this.state.matchStatus.finished
    ) {
      this.state.phase =
        MATCH_PHASES.PAUSED;
    }
  }


  /**
   * Pausa la partita.
   */
  pause() {
    if (
      this.state.matchStatus.finished
    ) {
      return;
    }

    this.clock.pause();

    this.state.phase =
      MATCH_PHASES.PAUSED;

    this.state.tacticalPause = true;
  }


  /**
   * Riprende la partita.
   */
  resume() {
    if (
      this.state.matchStatus.finished
    ) {
      return;
    }

    this.clock.resume();

    /**
     * Se la partita era in pausa,
     * torna al gioco aperto.
     */
    if (
      this.state.phase ===
      MATCH_PHASES.PAUSED
    ) {
      this.state.phase =
        MATCH_PHASES.OPEN_PLAY;
    }

    this.state.tacticalPause = false;

    this.running = true;
  }


  /**
   * Cambia velocità.
   */
  setSpeed(speed) {
    this.clock.setSpeed(speed);

    this.syncRuntimeState();
  }


  /**
   * Aggiornamento principale.
   *
   * deltaMs arriva dal renderer/UI.
   *
   * Il clock converte il tempo reale
   * in tempo di simulazione.
   */
  update(deltaMs) {
    if (!this.running) {
      return;
    }

    if (
      this.state.matchStatus.finished
    ) {
      return;
    }

    const clockEvents =
      this.clock.update(deltaMs);

    for (
      const clockEvent
      of clockEvents
    ) {
      if (
        clockEvent.type ===
        "ENGINE_TICK"
      ) {
        this.tick += 1;

        this.processTick(
          clockEvent
        );
      }

      else if (
        clockEvent.type ===
        "HALF_TIME"
      ) {
        this.processHalfTime(
          clockEvent
        );
      }

      else if (
        clockEvent.type ===
        "FULL_TIME"
      ) {
        this.processFullTime(
          clockEvent
        );
      }
    }

    this.syncRuntimeState();
  }


  /**
   * Processa un singolo tick
   * del Match Engine.
   */
  processTick(
    clockEvent
  ) {
    /**
     * Aggiorniamo il clock
     * nel World State.
     */
    this.syncClockState();


    /**
     * KICKOFF → OPEN_PLAY
     *
     * Il kickoff è una fase iniziale.
     * Dopo il primo tick iniziamo il gioco aperto.
     */
    if (
      this.state.phase ===
      MATCH_PHASES.KICKOFF
    ) {
      this.state.phase =
        MATCH_PHASES.OPEN_PLAY;
    }


    /**
     * Aggiorna la rappresentazione
     * spaziale del campo.
     */
    this.updateSpatialState();


    /**
     * Possesso iniziale.
     *
     * Per ora utilizziamo il seed.
     *
     * Questo verrà sostituito dal vero
     * sistema di possesso quando
     * implementeremo l'AI.
     */
    if (
      this.state.possession ===
        POSSESSION.NONE &&
      this.tick === 1
    ) {
      const homeStarts =
        this.rng.chance(0.5);

      this.state.possession =
        homeStarts
          ? POSSESSION.HOME
          : POSSESSION.AWAY;
    }


    /**
     * Evento ENGINE_TICK.
     *
     * Per ora rappresenta il battito
     * del motore.
     *
     * Successivamente nello stesso tick
     * potranno essere prodotti eventi
     * calcistici reali.
     */
    this.emitEvent(
      this.createEvent(
        EVENT_TYPES.ENGINE_TICK,
        {
          payload: {
            simulatedSeconds:
              clockEvent.simulatedSeconds,

            speed:
              this.clock.speed,
          },
        }
      )
    );
  }


  /**
   * Aggiorna la spatial grid.
   */
  updateSpatialState() {
    const homePlayers =
      this.getActivePlayers(
        this.state.teams.home
      );

    const awayPlayers =
      this.getActivePlayers(
        this.state.teams.away
      );

    updateSpatialGrid(
      this.spatialGrid,
      homePlayers,
      awayPlayers
    );

    /**
     * La griglia viene resa disponibile
     * anche nel World State.
     *
     * Phaser e Debug Mode potranno
     * leggerla in futuro.
     */
    this.state.spatialGrid =
      this.spatialGrid;
  }


  /**
   * Recupera i giocatori attivi
   * in campo.
   */
  getActivePlayers(team) {
    if (!team) {
      return [];
    }

    /**
     * startingXI contiene gli ID
     * dei giocatori oppure oggetti,
     * a seconda del modello utilizzato.
     */
    const startingXI =
      team.startingXI ?? [];

    return startingXI
      .map((playerReference) => {
        if (
          typeof playerReference ===
          "string"
        ) {
          return team.players.find(
            (player) =>
              player.id ===
              playerReference
          );
        }

        if (
          playerReference &&
          typeof playerReference ===
            "object"
        ) {
          /**
           * Se è già un giocatore,
           * restituiamo direttamente l'oggetto.
           */
          if (
            playerReference.id
          ) {
            return playerReference;
          }
        }

        return null;
      })
      .filter(Boolean);
  }


  /**
   * Intervallo.
   */
  processHalfTime(
    clockEvent
  ) {
    this.state.phase =
      MATCH_PHASES.HALF_TIME;

    this.emitEvent(
      this.createEvent(
        EVENT_TYPES.HALF_TIME,
        {
          payload: {
            minute:
              clockEvent.minute,
          },
        }
      )
    );
  }


  /**
   * Fine partita.
   */
  processFullTime(
    clockEvent
  ) {
    this.state.phase =
      MATCH_PHASES.FULL_TIME;

    this.finishMatch(
      clockEvent
    );
  }


  /**
   * Termina la partita.
   */
  finishMatch(
    clockEvent = null
  ) {
    if (
      this.state.matchStatus.finished
    ) {
      return;
    }

    this.running = false;

    this.clock.pause();

    this.state.matchStatus.finished =
      true;

    this.state.phase =
      MATCH_PHASES.FULL_TIME;

    this.emitEvent(
      this.createEvent(
        EVENT_TYPES.FULL_TIME,
        {
          payload: {
            minute:
              clockEvent?.minute ??
              this.clock.minute,

            score: {
              home:
                this.state.score.home,

              away:
                this.state.score.away,
            },
          },
        }
      )
    );
  }


  /**
   * Sincronizza il clock nel World State.
   */
  syncClockState() {
    this.state.clock = {
      ...this.clock.getState(),
    };
  }


  /**
   * Sincronizza tutte le strutture runtime.
   */
  syncRuntimeState() {
    this.syncClockState();

    this.state.tacticalInstructions =
      this.tacticalInstructions;

    this.state.spatialGrid =
      this.spatialGrid;
  }


  /**
   * Crea un evento con informazioni
   * compatibili anche con la UI attuale.
   */
  createEvent(
    type,
    {
      actors = [],
      causedBy = null,
      payload = {},
    } = {}
  ) {
    const event =
      createMatchEvent({
        tick: this.tick,

        matchTime: {
          minute:
            this.clock.minute,

          second:
            this.clock.second,

          half:
            this.clock.half,
        },

        type,

        actors,

        causedBy,

        payload,
      });

    /**
     * Compatibilità con la UI attuale.
     *
     * La UI sta ancora leggendo:
     *
     * event.matchMinute
     * event.matchSecond
     *
     * Non vogliamo rompere nulla
     * in questa fase.
     */
    event.matchMinute =
      this.clock.minute;

    event.matchSecond =
      this.clock.second;

    event.timestamp =
      Date.now();

    return event;
  }


  /**
   * Inserisce e distribuisce un evento.
   */
  emitEvent(event) {
    appendEvent(
      this.eventLog,
      event
    );

    /**
     * Manteniamo anche
     * state.events per compatibilità
     * con il World State attuale.
     */
    if (
      Array.isArray(
        this.state.events
      )
    ) {
      this.state.events.push(
        event
      );
    }

    this.state.lastEvent =
      event;

    for (
      const listener
      of this.listeners
    ) {
      try {
        listener(event);
      } catch (error) {
        console.error(
          "MatchEngine listener error:",
          error
        );
      }
    }
  }


  /**
   * Iscrizione agli eventi.
   */
  subscribe(listener) {
    if (
      typeof listener !==
      "function"
    ) {
      throw new Error(
        "MatchEngine.subscribe: listener deve essere una funzione."
      );
    }

    this.listeners.add(
      listener
    );

    return () => {
      this.listeners.delete(
        listener
      );
    };
  }


  /**
   * Stato corrente.
   */
  getState() {
    return this.state;
  }


  /**
   * Seed della partita.
   */
  getSeed() {
    return this.seed;
  }


  /**
   * Stato RNG.
   */
  getRNGState() {
    return this.rng.getState();
  }


  /**
   * Stato clock.
   */
  getClockState() {
    return this.clock.getState();
  }


  /**
   * Stato griglia.
   */
  getSpatialGrid() {
    return this.spatialGrid;
  }


  /**
   * Istruzioni tattiche correnti.
   */
  getTacticalInstructions() {
    return this.tacticalInstructions;
  }


  /**
   * Cambia un'istruzione tattica
   * di squadra durante la partita.
   *
   * La funzione vera di aggiornamento
   * verrà centralizzata nel Tactical Model
   * quando costruiremo l'editor.
   */
  setTeamInstruction(
    side,
    key,
    value
  ) {
    if (
      side !== "home" &&
      side !== "away"
    ) {
      throw new Error(
        `Side non valida: ${side}`
      );
    }

    this.tacticalInstructions[
      side
    ].team[key] = value;

    this.syncRuntimeState();
  }
}

/**
 * MATCH ENGINE
 *
 * Coordina:
 *
 * - clock
 * - world state
 * - tactical state
 * - spatial grid
 * - utility AI
 * - possession
 * - event log
 *
 * NON gestisce rendering.
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

import {
  evaluateTeam,
} from "./ai/utilityAI.js";

import {
  processPossession,
  setPossession,
  getPlayerSide,
} from "./possession/possessionSystem.js";


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
     * Spatial grid.
     */
    this.spatialGrid =
      createSpatialGrid();

    /**
     * Istruzioni tattiche runtime.
     *
     * Sono separate dall'identità
     * della squadra e potranno essere
     * modificate durante la partita.
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
     * Runtime.
     */
    this.running = false;

    this.listeners =
      new Set();

    /**
     * Tick della simulazione.
     */
    this.tick = 0;

    /**
     * Prepariamo i giocatori
     * prima che qualsiasi sistema
     * li utilizzi.
     */
    this.prepareRuntimePlayers(
      homeTeam
    );

    this.prepareRuntimePlayers(
      awayTeam
    );

    /**
     * Sincronizzazione iniziale.
     */
    this.syncRuntimeState();
  }


  /**
   * Prepara lo stato runtime
   * dei giocatori.
   *
   * Il Player Model può conservare
   * la posizione in currentState.position.
   *
   * Il Match Engine espone invece
   * una posizione runtime uniforme:
   *
   * player.position.x
   * player.position.y
   */
  prepareRuntimePlayers(team) {
    if (!team?.players) {
      return;
    }

    for (
      const player
      of team.players
    ) {
      if (!player) {
        continue;
      }

      /**
       * Caso 1:
       * la posizione runtime esiste già.
       */
      if (
        player.position &&
        Number.isFinite(
          player.position.x
        ) &&
        Number.isFinite(
          player.position.y
        )
      ) {
        if (
          !player.targetPosition
        ) {
          player.targetPosition = {
            x:
              player.position.x,

            y:
              player.position.y,
          };
        }

        continue;
      }

      /**
       * Caso 2:
       * posizione dentro currentState.
       */
      const runtimePosition =
        player.currentState?.position;

      if (
        runtimePosition &&
        Number.isFinite(
          runtimePosition.x
        ) &&
        Number.isFinite(
          runtimePosition.y
        )
      ) {
        player.position = {
          x:
            runtimePosition.x,

          y:
            runtimePosition.y,
        };

        player.targetPosition = {
          x:
            runtimePosition.x,

          y:
            runtimePosition.y,
        };

        continue;
      }

      /**
       * Caso 3:
       * il Player Model non ha ancora
       * una posizione.
       *
       * Usiamo un fallback sicuro.
       */
      player.position = {
        x: 0.5,
        y: 0.5,
      };

      player.targetPosition = {
        x: 0.5,
        y: 0.5,
      };
    }
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
            seed:
              this.seed,
          },
        }
      )
    );
  }


  /**
   * Ferma il motore.
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

    this.state.tacticalPause =
      true;
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

    if (
      this.state.phase ===
      MATCH_PHASES.PAUSED
    ) {
      this.state.phase =
        MATCH_PHASES.OPEN_PLAY;
    }

    this.state.tacticalPause =
      false;

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
      this.clock.update(
        deltaMs
      );

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
   * Processa un singolo tick.
   */
  processTick(
    clockEvent
  ) {
    this.syncClockState();

    /**
     * KICKOFF → OPEN_PLAY.
     */
    if (
      this.state.phase ===
      MATCH_PHASES.KICKOFF
    ) {
      this.state.phase =
        MATCH_PHASES.OPEN_PLAY;
    }

    /**
     * Aggiorna lo spazio.
     */
    this.updateSpatialState();

    /**
     * Primo possesso.
     */
    if (
      this.state.possession ===
        POSSESSION.NONE &&
      this.tick === 1
    ) {
      this.initializePossession();
    }

    /**
     * Risoluzione della palla contesa.
     */
    if (
      this.state.possession ===
      POSSESSION.CONTESTED
    ) {
      this.resolveContestedBall();
    }

    /**
     * Calcolo Utility AI.
     */
    this.calculateDecisions();

    /**
     * Micro-ciclo del possesso.
     */
    if (
      this.state.possession ===
        POSSESSION.HOME ||
      this.state.possession ===
        POSSESSION.AWAY
    ) {
      processPossession({
        state:
          this.state,

        rng:
          this.rng,

        emitEvent:
          (eventData) =>
            this.emitEvent(
              this.createEvent(
                eventData.type,
                eventData
              )
            ),
      });
    }

    /**
     * Aggiorniamo nuovamente
     * la griglia dopo eventuali
     * cambi di possesso.
     */
    this.updateSpatialState();

    /**
     * Evento tick.
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
   * Inizializza il primo possesso.
   */
  initializePossession() {
    const homePlayers =
      this.getActivePlayers(
        this.state.teams.home
      );

    const awayPlayers =
      this.getActivePlayers(
        this.state.teams.away
      );

    const homeStarts =
      this.rng.chance(
        0.5
      );

    const team =
      homeStarts
        ? homePlayers
        : awayPlayers;

    if (!team.length) {
      return;
    }

    const player =
      team[0];

    const side =
      homeStarts
        ? POSSESSION.HOME
        : POSSESSION.AWAY;

    setPossession({
      state:
        this.state,

      side,

      playerId:
        player.id,
    });

    this.state.ball.x =
      player.position.x;

    this.state.ball.y =
      player.position.y;

    this.emitEvent(
      this.createEvent(
        EVENT_TYPES.POSSESSION_WON,
        {
          actors: [
            player.id,
          ],

          payload: {
            side,

            reason:
              "kickoff",
          },
        }
      )
    );
  }


  /**
   * Risolve una palla contesa.
   */
  resolveContestedBall() {
    const allPlayers = [
      ...this.getActivePlayers(
        this.state.teams.home
      ),

      ...this.getActivePlayers(
        this.state.teams.away
      ),
    ];

    if (!allPlayers.length) {
      return;
    }

    const ballPosition = {
      x:
        this.state.ball.x,

      y:
        this.state.ball.y,
    };

    const nearest =
      allPlayers
        .map(
          (player) => ({
            player,

            distance:
              Math.sqrt(
                (
                  player.position.x -
                  ballPosition.x
                ) ** 2 +
                (
                  player.position.y -
                  ballPosition.y
                ) ** 2
              ),
          })
        )
        .sort(
          (a, b) =>
            a.distance -
            b.distance
        )[0];

    if (!nearest) {
      return;
    }

    /**
     * Distanza massima per
     * intervenire sulla palla.
     */
    if (
      nearest.distance >
      0.12
    ) {
      return;
    }

    const side =
      getPlayerSide(
        this.state,
        nearest.player.id
      );

    setPossession({
      state:
        this.state,

      side,

      playerId:
        nearest.player.id,
    });

    this.emitEvent(
      this.createEvent(
        EVENT_TYPES.POSSESSION_WON,
        {
          actors: [
            nearest.player.id,
          ],

          payload: {
            side,

            reason:
              "contested_ball",
          },
        }
      )
    );
  }


  /**
   * Calcola le decisioni AI.
   */
  calculateDecisions() {
    const homePlayers =
      this.getActivePlayers(
        this.state.teams.home
      );

    const awayPlayers =
      this.getActivePlayers(
        this.state.teams.away
      );

    const homeDecisions =
      evaluateTeam({
        players:
          homePlayers,

        opponents:
          awayPlayers,

        ball:
          this.state.ball,

        spatialGrid:
          this.spatialGrid,

        teamInstructions:
          this.tacticalInstructions
            .home.team,
      });

    const awayDecisions =
      evaluateTeam({
        players:
          awayPlayers,

        opponents:
          homePlayers,

        ball:
          this.state.ball,

        spatialGrid:
          this.spatialGrid,

        teamInstructions:
          this.tacticalInstructions
            .away.team,
      });

    /**
     * Debug AI.
     */
    this.state.debug =
      this.state.debug ?? {};

    this.state.debug.ai = {
      home:
        homeDecisions,

      away:
        awayDecisions,

      tick:
        this.tick,
    };
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

    this.state.spatialGrid =
      this.spatialGrid;
  }


  /**
   * Recupera i titolari attivi.
   */
  getActivePlayers(team) {
    if (!team) {
      return [];
    }

    const startingXI =
      team.startingXI ?? [];

    const players =
      startingXI
        .map(
          (reference) => {
            if (
              typeof reference ===
              "string"
            ) {
              return team.players.find(
                (player) =>
                  player.id ===
                  reference
              );
            }

            if (
              reference &&
              typeof reference ===
                "object"
            ) {
              return reference;
            }

            return null;
          }
        )
        .filter(Boolean);

    /**
     * Seconda protezione:
     * qualsiasi giocatore restituito
     * dal metodo deve avere una
     * posizione utilizzabile.
     */
    for (
      const player
      of players
    ) {
      if (
        !player.position ||
        !Number.isFinite(
          player.position.x
        ) ||
        !Number.isFinite(
          player.position.y
        )
      ) {
        const runtimePosition =
          player.currentState?.position;

        if (
          runtimePosition &&
          Number.isFinite(
            runtimePosition.x
          ) &&
          Number.isFinite(
            runtimePosition.y
          )
        ) {
          player.position = {
            x:
              runtimePosition.x,

            y:
              runtimePosition.y,
          };
        } else {
          player.position = {
            x: 0.5,
            y: 0.5,
          };
        }
      }

      if (
        !player.targetPosition
      ) {
        player.targetPosition = {
          x:
            player.position.x,

          y:
            player.position.y,
        };
      }
    }

    return players;
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
   * Sincronizza il clock.
   */
  syncClockState() {
    this.state.clock = {
      ...this.clock.getState(),
    };
  }


  /**
   * Sincronizza lo stato runtime.
   */
  syncRuntimeState() {
    this.syncClockState();

    this.state.tacticalInstructions =
      this.tacticalInstructions;

    this.state.spatialGrid =
      this.spatialGrid;
  }


  /**
   * Crea un evento deterministico.
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
        matchId:
          this.state.id ??
          "match",

        tick:
          this.tick,

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

        sequence:
          this.eventLog.sequence,
      });

    /**
     * Compatibilità con la UI attuale.
     */
    event.matchMinute =
      this.clock.minute;

    event.matchSecond =
      this.clock.second;

    /**
     * Tempo della simulazione,
     * non Date.now().
     */
    event.timestamp =
      this.clock.totalSimulatedSeconds;

    return event;
  }


  /**
   * Registra e distribuisce un evento.
   */
  emitEvent(event) {
    appendEvent(
      this.eventLog,
      event
    );

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
   * Subscribe.
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
   * Stato completo.
   */
  getState() {
    return this.state;
  }


  /**
   * Seed.
   */
  getSeed() {
    return this.seed;
  }


  /**
   * RNG state.
   */
  getRNGState() {
    return this.rng.getState();
  }


  /**
   * Clock state.
   */
  getClockState() {
    return this.clock.getState();
  }


  /**
   * Spatial grid.
   */
  getSpatialGrid() {
    return this.spatialGrid;
  }


  /**
   * Tactical instructions.
   */
  getTacticalInstructions() {
    return this.tacticalInstructions;
  }


  /**
   * Modifica un'istruzione tattica
   * durante la partita.
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
    ].team[key] =
      value;

    this.syncRuntimeState();
  }
}

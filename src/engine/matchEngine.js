/**
 * MATCH ENGINE
 *
 * Coordina:
 *
 * Clock
 * World State
 * Tactical State
 * Spatial Grid
 * Utility AI
 * Possession
 * Movement
 * Event Log
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
} from "./events/eventModel.js";

import {
  evaluateTeam,
} from "./ai/utilityAI.js";

import {
  processPossession,
  setPossession,
  getPlayerSide,
} from "./possession/possessionSystem.js";

import {
  updateAllPlayerMovement,
} from "./movement/playerMovement.js";


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

    this.seed =
      seed ??
      createMatchSeed();

    this.rng =
      new RNG(this.seed);

    this.clock =
      new MatchClock();

    this.state =
      createMatchState({
        homeTeam,
        awayTeam,
        seed: this.seed,
      });

    this.eventLog =
      createEventLog();

    this.spatialGrid =
      createSpatialGrid();

    this.tacticalInstructions = {
      home:
        createTacticalInstructions({
          team:
            homeTeam.tactics ??
            {},
        }),

      away:
        createTacticalInstructions({
          team:
            awayTeam.tactics ??
            {},
        }),
    };

    this.running = false;

    this.listeners =
      new Set();

    this.tick = 0;

    /**
     * Preparazione runtime
     * dei giocatori.
     */
    this.prepareRuntimePlayers(
      homeTeam
    );

    this.prepareRuntimePlayers(
      awayTeam
    );

    this.syncRuntimeState();
  }


  /**
   * Prepara posizione e target
   * di ogni giocatore.
   */
  prepareRuntimePlayers(team) {
    if (!team?.players) {
      return;
    }

    const shape =
      team.inPossessionShape ??
      team.outOfPossessionShape ??
      null;

    const startingXI =
      team.startingXI ?? [];

    for (
      let index = 0;
      index <
        team.players.length;
      index += 1
    ) {
      const player =
        team.players[index];

      if (!player) {
        continue;
      }

      const tacticalPosition =
        shape?.positions?.[
          `slot_${index}`
        ] ??
        shape?.positions?.[
          player.id
        ] ??
        null;

      let initialPosition =
        tacticalPosition
          ? {
              x:
                tacticalPosition.x,

              y:
                tacticalPosition.y,
            }
          : null;

      if (
        !initialPosition
      ) {
        const runtimePosition =
          player.currentState
            ?.position;

        if (
          runtimePosition &&
          Number.isFinite(
            runtimePosition.x
          ) &&
          Number.isFinite(
            runtimePosition.y
          )
        ) {
          initialPosition = {
            x:
              runtimePosition.x,

            y:
              runtimePosition.y,
          };
        }
      }

      /**
       * Fallback.
       */
      if (
        !initialPosition
      ) {
        initialPosition = {
          x:
            0.15 +
            (
              index %
              5
            ) *
              0.16,

          y:
            0.20 +
            (
              Math.floor(
                index / 5
              )
            ) *
              0.20,
        };
      }

      initialPosition.x =
        Math.max(
          0.03,
          Math.min(
            0.97,
            initialPosition.x
          )
        );

      initialPosition.y =
        Math.max(
          0.03,
          Math.min(
            0.97,
            initialPosition.y
          )
        );

      player.position = {
        x:
          initialPosition.x,

        y:
          initialPosition.y,
      };

      player.targetPosition = {
        x:
          initialPosition.x,

        y:
          initialPosition.y,
      };

      player.velocity = {
        x: 0,
        y: 0,
      };
    }

    /**
     * Garantiamo che i titolari
     * abbiano un target.
     */
    for (
      let index = 0;
      index <
        startingXI.length;
      index += 1
    ) {
      const reference =
        startingXI[index];

      const player =
        typeof reference ===
        "string"
          ? team.players.find(
              (item) =>
                item.id ===
                reference
            )
          : reference;

      if (!player) {
        continue;
      }

      if (
        player.targetPosition
      ) {
        continue;
      }

      player.targetPosition = {
        x:
          player.position.x,

        y:
          player.position.y,
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
      this.state.matchStatus
        .finished
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
        "MATCH_STARTED",
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
   * Ferma temporaneamente
   * il motore.
   */
  stop() {
    this.running = false;

    this.clock.pause();

    if (
      !this.state.matchStatus
        .finished
    ) {
      this.state.phase =
        MATCH_PHASES.PAUSED;
    }
  }


  /**
   * Pausa partita.
   */
  pause() {
    if (
      this.state.matchStatus
        .finished
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
   * Riprende partita.
   */
  resume() {
    if (
      this.state.matchStatus
        .finished
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
    this.clock.setSpeed(
      speed
    );

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
      this.state.matchStatus
        .finished
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
   * =========================================================
   * PROCESS TICK
   * =========================================================
   *
   * Ordine:
   *
   * 1. cambio fase
   * 2. giocatori attivi
   * 3. primo possesso
   * 4. movimento
   * 5. spatial grid
   * 6. palla contesa
   * 7. Utility AI
   * 8. possesso/passaggio
   * 9. nuova spatial grid
   * 10. evento tick
   */
  processTick(clockEvent) {
    this.syncClockState();

    /**
     * KICKOFF -> OPEN PLAY
     */
    if (
      this.state.phase ===
      MATCH_PHASES.KICKOFF
    ) {
      this.state.phase =
        MATCH_PHASES.OPEN_PLAY;
    }


    /**
     * GIOCATORI ATTIVI
     */
    const homePlayers =
      this.getActivePlayers(
        this.state.teams.home
      );

    const awayPlayers =
      this.getActivePlayers(
        this.state.teams.away
      );


    /**
     * PRIMO POSSESSO
     */
    if (
      this.state.possession ===
        POSSESSION.NONE &&
      this.tick === 1
    ) {
      this.initializePossession();
    }


    /**
     * MOVIMENTO PROGRESSIVO
     *
     * I giocatori non vengono
     * teletrasportati.
     *
     * Il movimento avviene
     * progressivamente verso
     * il target.
     */
    updateAllPlayerMovement({
      homePlayers,

      awayPlayers,

      ball:
        this.state.ball,

      deltaSimulationSeconds:
        clockEvent
          .simulatedSeconds,
    });


    /**
     * SPATIAL GRID
     *
     * Aggiorniamo spazio,
     * pressione e influenza
     * dopo il movimento.
     */
    this.updateSpatialState();


    /**
     * PALLA CONTESA
     */
    if (
      this.state.possession ===
      POSSESSION.CONTESTED
    ) {
      this.resolveContestedBall();
    }


    /**
     * UTILITY AI
     */
    this.calculateDecisions();


    /**
     * POSSESSO
     *
     * La possession system
     * può produrre:
     *
     * PASS_ATTEMPT
     * PASS_COMPLETE
     * RECEIVE
     * PASS_INTERCEPTED
     * POSSESSION_WON
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
     * RICALCOLO SPAZIO
     *
     * Dopo l'azione della palla
     * la situazione spaziale può
     * essere cambiata.
     */
    this.updateSpatialState();


    /**
     * EVENTO TICK
     */
    this.emitEvent(
      this.createEvent(
        "ENGINE_TICK",
        {
          payload: {
            simulatedSeconds:
              clockEvent
                .simulatedSeconds,

            speed:
              this.clock.speed,

            tick:
              this.tick,
          },
        }
      )
    );
  }


  /**
   * =========================================================
   * POSSESSO INIZIALE
   * =========================================================
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
        "POSSESSION_WON",
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
   * =========================================================
   * PALLA CONTESA
   * =========================================================
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
        "POSSESSION_WON",
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
   * =========================================================
   * UTILITY AI
   * =========================================================
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
     * Applichiamo le decisioni.
     */
    this.applyAIDecisions(
      homeDecisions,
      homePlayers
    );

    this.applyAIDecisions(
      awayDecisions,
      awayPlayers
    );


    /**
     * DEBUG AI
     */
    this.state.debug =
      this.state.debug ??
      {};

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
   * =========================================================
   * APPLICA DECISIONI AI
   * =========================================================
   */
  applyAIDecisions(
    decisions,
    players
  ) {
    if (
      !Array.isArray(
        decisions
      )
    ) {
      return;
    }

    for (
      const decision
      of decisions
    ) {
      const player =
        players.find(
          (item) =>
            item.id ===
            decision.playerId
        );

      if (!player) {
        continue;
      }


      /**
       * Target deciso dalla AI.
       */
      if (
        decision.targetPosition &&
        Number.isFinite(
          decision.targetPosition.x
        ) &&
        Number.isFinite(
          decision.targetPosition.y
        )
      ) {
        player.targetPosition = {
          x:
            Math.max(
              0.02,
              Math.min(
                0.98,
                decision
                  .targetPosition
                  .x
              )
            ),

          y:
            Math.max(
              0.02,
              Math.min(
                0.98,
                decision
                  .targetPosition
                  .y
              )
            ),
        };
      }


      /**
       * Debug runtime.
       */
      player.intent =
        decision.action ??
        decision.intent ??
        player.intent;

      player.currentAction =
        decision.action ??
        player.currentAction;
    }
  }


  /**
   * =========================================================
   * SPATIAL STATE
   * =========================================================
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

      awayPlayers,

      this.state.ball
    );

    this.state.spatialGrid =
      this.spatialGrid;
  }


  /**
   * =========================================================
   * GIOCATORI ATTIVI
   * =========================================================
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
     * Garantiamo runtime state.
     */
    for (
      const player
      of players
    ) {
      if (
        !player.position
      ) {
        player.position = {
          x: 0.5,
          y: 0.5,
        };
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

      if (
        !player.velocity
      ) {
        player.velocity = {
          x: 0,
          y: 0,
        };
      }
    }

    return players;
  }


  /**
   * =========================================================
   * INTERVALLO
   * =========================================================
   */
  processHalfTime(
    clockEvent
  ) {
    this.state.phase =
      MATCH_PHASES.HALF_TIME;

    this.emitEvent(
      this.createEvent(
        "HALF_TIME",
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
   * =========================================================
   * FINE PARTITA
   * =========================================================
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


  finishMatch(
    clockEvent = null
  ) {
    if (
      this.state.matchStatus
        .finished
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
        "FULL_TIME",
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
   * =========================================================
   * CLOCK STATE
   * =========================================================
   */
  syncClockState() {
    this.state.clock = {
      ...this.clock.getState(),
    };
  }


  /**
   * =========================================================
   * RUNTIME STATE
   * =========================================================
   */
  syncRuntimeState() {
    this.syncClockState();

    this.state.tacticalInstructions =
      this.tacticalInstructions;

    this.state.spatialGrid =
      this.spatialGrid;
  }


  /**
   * =========================================================
   * EVENT CREATION
   * =========================================================
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
     * Campi compatibili
     * con il log UI.
     */
    event.matchMinute =
      this.clock.minute;

    event.matchSecond =
      this.clock.second;

    /**
     * Tempo simulato,
     * NON Date.now().
     *
     * Questo è fondamentale
     * per replay e debug
     * deterministico.
     */
    event.timestamp =
      this.clock
        .totalSimulatedSeconds;

    return event;
  }


  /**
   * =========================================================
   * EMIT EVENT
   * =========================================================
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


    /**
     * Notifica UI / renderer /
     * sistemi esterni.
     */
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
   * =========================================================
   * SUBSCRIBE
   * =========================================================
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
   * =========================================================
   * GETTERS
   * =========================================================
   */
  getState() {
    return this.state;
  }


  getSeed() {
    return this.seed;
  }


  getRNGState() {
    return this.rng.getState();
  }


  getClockState() {
    return this.clock.getState();
  }


  getSpatialGrid() {
    return this.spatialGrid;
  }


  getTacticalInstructions() {
    return this.tacticalInstructions;
  }


  /**
   * =========================================================
   * TEAM INSTRUCTION
   * =========================================================
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

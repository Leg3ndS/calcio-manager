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
            homeTeam.tactics ?? {},
        }),

      away:
        createTacticalInstructions({
          team:
            awayTeam.tactics ?? {},
        }),
    };

    this.running = false;

    this.listeners =
      new Set();

    this.tick = 0;

    this.syncRuntimeState();
  }


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


  setSpeed(speed) {
    this.clock.setSpeed(speed);

    this.syncRuntimeState();
  }


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


  processTick(
    clockEvent
  ) {
    this.syncClockState();

    if (
      this.state.phase ===
      MATCH_PHASES.KICKOFF
    ) {
      this.state.phase =
        MATCH_PHASES.OPEN_PLAY;
    }

    /**
     * Aggiorniamo lo spazio.
     */
    this.updateSpatialState();

    /**
     * Primo possesso della partita.
     */
    if (
      this.state.possession ===
        POSSESSION.NONE &&
      this.tick === 1
    ) {
      this.initializePossession();
    }

    /**
     * Se il possesso è conteso,
     * per ora cerchiamo il giocatore
     * più vicino alla palla.
     *
     * Il vero sistema di recupero
     * arriverà dopo.
     */
    if (
      this.state.possession ===
      POSSESSION.CONTESTED
    ) {
      this.resolveContestedBall();
    }

    /**
     * Utility AI.
     *
     * Per ora calcoliamo le decisioni
     * ma NON le applichiamo tutte.
     *
     * Il possessore verrà utilizzato
     * dal Possession System.
     */
    this.calculateDecisions();

    /**
     * Micro-ciclo di possesso.
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
     * Nuova spatial update dopo
     * eventuali cambi di possesso.
     */
    this.updateSpatialState();

    /**
     * Tick dell'engine.
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
   * Assegna il primo possesso.
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
   * Risolve provvisoriamente una palla contesa.
   *
   * È intenzionalmente semplice.
   *
   * Nel prossimo sistema inseriremo:
   *
   * - anticipazione
   * - contrasti
   * - reattività
   * - distanza
   * - velocità
   * - pressione.
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
     * Deve essere sufficientemente
     * vicino per recuperare la palla.
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
     * Conserviamo le decisioni
     * nel World State per il Debug Mode.
     */
    this.state.debug =
      this.state.debug ?? {};

    this.state.debug.ai =
      {
        home:
          homeDecisions,

        away:
          awayDecisions,

        tick:
          this.tick,
      };
  }


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


  getActivePlayers(team) {
    if (!team) {
      return [];
    }

    const startingXI =
      team.startingXI ?? [];

    return startingXI
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
  }


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


  syncClockState() {
    this.state.clock = {
      ...this.clock.getState(),
    };
  }


  syncRuntimeState() {
    this.syncClockState();

    this.state.tacticalInstructions =
      this.tacticalInstructions;

    this.state.spatialGrid =
      this.spatialGrid;
  }


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
     * Compatibilità con UI attuale.
     */
    event.matchMinute =
      this.clock.minute;

    event.matchSecond =
      this.clock.second;

    /**
     * NON usiamo più Date.now()
     * per la logica della simulazione.
     */
    event.timestamp =
      this.clock.totalSimulatedSeconds;

    return event;
  }


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

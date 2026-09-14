/**
 * MATCH ENGINE
 *
 * Cuore della simulazione della partita.
 *
 * Responsabilità:
 * - clock
 * - world state
 * - inizializzazione partita
 * - possesso
 * - Utility AI
 * - movimento
 * - spatial grid
 * - eventi
 * - stato runtime dei giocatori
 *
 * ARCHITETTURA:
 *
 * React/UI
 *    ↓
 * MatchEngine
 *    ↓
 * ┌─────────────────────────────┐
 * │ Utility AI                  │
 * │ Movement                    │
 * │ Possession                  │
 * │ Spatial Grid                │
 * │ Event System                │
 * └─────────────────────────────┘
 *    ↓
 * World State
 *    ↓
 * Phaser Renderer
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


/* =========================================================
   COSTANTI
   ========================================================= */

const FIELD_MIN = 0.025;
const FIELD_MAX = 0.975;

const CENTER_X = 0.5;
const CENTER_Y = 0.5;


/* =========================================================
   UTILITY
   ========================================================= */

function clamp(
  value,
  min = FIELD_MIN,
  max = FIELD_MAX
) {
  if (!Number.isFinite(value)) {
    return (min + max) / 2;
  }

  return Math.max(
    min,
    Math.min(max, value)
  );
}


/**
 * Converte coordinate provenienti
 * da vecchi sistemi 0-100
 * al nuovo sistema runtime 0-1.
 *
 * Esempi:
 *
 * 50 -> 0.5
 * 25 -> 0.25
 * 0.8 -> 0.8
 */
function normalizeCoordinate(
  value
) {
  if (!Number.isFinite(value)) {
    return 0.5;
  }

  if (value > 1) {
    return value / 100;
  }

  return value;
}


function normalizePosition(
  position,
  fallback = {
    x: 0.5,
    y: 0.5,
  }
) {
  if (!position) {
    return {
      x: fallback.x,
      y: fallback.y,
    };
  }

  return {
    x: clamp(
      normalizeCoordinate(
        position.x
      )
    ),

    y: clamp(
      normalizeCoordinate(
        position.y
      )
    ),
  };
}


function distance(
  a,
  b
) {
  const dx =
    (a?.x ?? 0) -
    (b?.x ?? 0);

  const dy =
    (a?.y ?? 0) -
    (b?.y ?? 0);

  return Math.sqrt(
    dx * dx +
    dy * dy
  );
}


function isValidSide(
  side
) {
  return (
    side === "home" ||
    side === "away"
  );
}


/* =========================================================
   MATCH ENGINE
   ========================================================= */

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


    /* -----------------------------------------------------
       SEED
       ----------------------------------------------------- */

    this.seed =
      seed ??
      createMatchSeed();


    this.rng =
      new RNG(
        this.seed
      );


    /* -----------------------------------------------------
       CLOCK
       ----------------------------------------------------- */

    this.clock =
      new MatchClock();


    /* -----------------------------------------------------
       WORLD STATE
       ----------------------------------------------------- */

    this.state =
      createMatchState({
        homeTeam,
        awayTeam,
        seed:
          this.seed,
      });


    /* -----------------------------------------------------
       EVENT LOG
       ----------------------------------------------------- */

    this.eventLog =
      createEventLog();


    /* -----------------------------------------------------
       SPATIAL GRID
       ----------------------------------------------------- */

    this.spatialGrid =
      createSpatialGrid();


    /* -----------------------------------------------------
       TACTICAL INSTRUCTIONS
       ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       RUNTIME
       ----------------------------------------------------- */

    this.running = false;

    this.tick = 0;

    this.listeners =
      new Set();


    /**
     * Decisioni AI del tick corrente.
     *
     * playerId -> decision
     */
    this.aiDecisions = {};


    /**
     * ID del possessore corrente.
     *
     * Non sostituisce state.possession:
     * è solo una cache runtime.
     */
    this.currentBallOwnerId =
      null;


    /**
     * Inizializzazione giocatori.
     */
    this.prepareRuntimePlayers(
      homeTeam,
      "home"
    );

    this.prepareRuntimePlayers(
      awayTeam,
      "away"
    );


    /**
     * Stato iniziale.
     */
    this.initializeRuntimeState();

    this.syncRuntimeState();
  }


  /* =======================================================
     PLAYER RUNTIME
     ======================================================= */

  prepareRuntimePlayers(
    team,
    side
  ) {
    if (
      !team ||
      !Array.isArray(
        team.players
      )
    ) {
      return;
    }


    const startingXI =
      Array.isArray(
        team.startingXI
      )
        ? team.startingXI
        : [];


    const startingIds =
      new Set(
        startingXI
          .map(
            (reference) =>
              typeof reference ===
              "string"
                ? reference
                : reference?.id
          )
          .filter(Boolean)
      );


    const shape =
      team.inPossessionShape ??
      team.outOfPossessionShape ??
      null;


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


      /**
       * Il ruolo runtime viene sempre
       * ricavato da primaryRole.
       */
      player.role =
        player.role ??
        player.assignedRole ??
        player.primaryRole ??
        null;


      player.primaryRole =
        player.primaryRole ??
        player.role ??
        null;


      player.assignedRole =
        player.assignedRole ??
        player.primaryRole ??
        null;


      /**
       * Cerchiamo posizione tattica.
       */
      const tacticalPosition =
        shape?.positions?.[
          `slot_${index}`
        ] ??
        shape?.positions?.[
          player.id
        ] ??
        null;


      let initialPosition =
        normalizePosition(
          tacticalPosition,
          {
            x:
              0.15 +
              (
                index % 5
              ) * 0.17,

            y:
              0.20 +
              Math.floor(
                index / 5
              ) * 0.20,
          }
        );


      /**
       * Se non esiste una posizione
       * tattica, usiamo quella salvata
       * dal player model.
       */
      if (!tacticalPosition) {

        const savedPosition =
          player.position ??
          player.currentState?.position ??
          player.matchState?.actualPosition ??
          null;


        if (savedPosition) {
          initialPosition =
            normalizePosition(
              savedPosition,
              initialPosition
            );
        }
      }


      /**
       * Posizione runtime.
       */
      player.position = {
        x:
          clamp(
            initialPosition.x
          ),

        y:
          clamp(
            initialPosition.y
          ),
      };


      player.targetPosition = {
        x:
          player.position.x,

        y:
          player.position.y,
      };


      player.velocity = {
        x: 0,
        y: 0,
      };


      /**
       * Runtime match state.
       */
      player.hasBall = false;

      player.intent =
        "hold_position";

      player.currentAction =
        "idle";


      /**
       * Stato compatibile con
       * playerModel.
       */
      player.matchState =
        player.matchState ??
        {};


      player.matchState.onPitch =
        startingIds.has(
          player.id
        );

      player.matchState.substituted =
        false;

      player.matchState.injured =
        false;

      player.matchState.hasBall =
        false;

      player.matchState.currentAction =
        "idle";

      player.matchState.intent =
        "hold_position";

      player.matchState.actualPosition = {
        x:
          player.position.x,

        y:
          player.position.y,
      };

      player.matchState.targetPosition = {
        x:
          player.targetPosition.x,

        y:
          player.targetPosition.y,
      };

      player.matchState.velocity = {
        x: 0,
        y: 0,
      };


      /**
       * Informazioni lato squadra.
       */
      player.side =
        side;


      /**
       * Le riserve non partecipano
       * alla simulazione.
       */
      player.onPitch =
        startingIds.has(
          player.id
        );
    }
  }


  /* =======================================================
     INITIAL RUNTIME STATE
     ======================================================= */

  initializeRuntimeState() {

    /**
     * Il world state usa inizialmente
     * coordinate 0-100 per la palla.
     *
     * Da questo momento il runtime
     * utilizza esclusivamente 0-1.
     */
    this.state.ball.x =
      CENTER_X;

    this.state.ball.y =
      CENTER_Y;

    this.state.ball.targetX =
      CENTER_X;

    this.state.ball.targetY =
      CENTER_Y;

    this.state.ball.velocityX =
      0;

    this.state.ball.velocityY =
      0;

    this.state.ball.ownerId =
      null;

    this.state.ball.lastTouchPlayerId =
      null;

    this.state.ball.state =
      "free";


    this.state.possession =
      POSSESSION.NONE;


    this.state.timeSeconds =
      0;


    this.currentBallOwnerId =
      null;


    this.syncPlayerRuntimeFlags();
  }


  /* =======================================================
     START
     ======================================================= */

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


    /**
     * Possesso iniziale.
     *
     * IMPORTANTE:
     * viene assegnato PRIMA del primo
     * normale tick di gioco.
     */
    this.initializePossession();


    this.syncRuntimeState();


    this.emitEvent(
      this.createEvent(
        "MATCH_STARTED",
        {
          payload: {
            seed:
              this.seed,

            possession:
              this.state.possession,

            ballOwnerId:
              this.state.ball.ownerId,
          },
        }
      )
    );
  }


  /* =======================================================
     STOP
     ======================================================= */

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


  /* =======================================================
     PAUSE
     ======================================================= */

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


    this.state.tacticalPause = {
      ...(this.state.tacticalPause ?? {}),
      active: true,
    };
  }


  /* =======================================================
     RESUME
     ======================================================= */

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


    this.state.tacticalPause = {
      ...(this.state.tacticalPause ?? {}),
      active: false,
    };


    this.running = true;
  }


  /* =======================================================
     SPEED
     ======================================================= */

  setSpeed(
    speed
  ) {

    this.clock.setSpeed(
      speed
    );

    this.syncRuntimeState();
  }


  /* =======================================================
     MAIN UPDATE
     ======================================================= */

  update(
    deltaMs
  ) {

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


  /* =======================================================
     PROCESS TICK
     ======================================================= */

  processTick(
    clockEvent
  ) {

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
     * Giocatori attivi.
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
     * Se per qualsiasi motivo
     * il possesso è stato perso,
     * proviamo a recuperarlo.
     *
     * Non lasciamo mai la partita
     * bloccata permanentemente su NONE
     * durante open play.
     */
    if (
      (
        this.state.possession ===
        POSSESSION.NONE
      ) &&
      this.tick > 1
    ) {
      this.recoverPossession();
    }


    /**
     * Movimento.
     */
    updateAllPlayerMovement({
      homePlayers,

      awayPlayers,

      ball:
        this.state.ball,

      deltaSimulationSeconds:
        clockEvent.simulatedSeconds,
    });


    /**
     * Spatial grid.
     */
    this.updateSpatialState();


    /**
     * Palla contesa.
     */
    if (
      this.state.possession ===
      POSSESSION.CONTESTED
    ) {

      this.resolveContestedBall();
    }


    /**
     * Utility AI.
     */
    this.calculateDecisions();


    /**
     * Possession System.
     *
     * La callback supporta entrambi
     * i formati:
     *
     * emitEvent(eventObject)
     *
     * oppure
     *
     * emitEvent(type, payload, causedBy)
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

        decisions:
          this.aiDecisions,

        spatialGrid:
          this.spatialGrid,

        tacticalInstructions:
          this.tacticalInstructions,

        emitEvent:
          (...args) =>
            this.handlePossessionEvent(
              ...args
            ),
      });
    }


    /**
     * Sincronizziamo sempre
     * il possessore dopo
     * l'azione.
     */
    this.syncPossessionState();


    /**
     * Spatial grid finale.
     */
    this.updateSpatialState();


    /**
     * Runtime flags.
     */
    this.syncPlayerRuntimeFlags();


    /**
     * Event tick.
     */
    this.emitEvent(
      this.createEvent(
        "ENGINE_TICK",
        {
          payload: {
            simulatedSeconds:
              clockEvent.simulatedSeconds,

            speed:
              this.clock.speed,

            tick:
              this.tick,

            possession:
              this.state.possession,

            ballOwnerId:
              this.state.ball.ownerId,
          },
        }
      )
    );
  }


  /* =======================================================
     POSSESSION INIT
     ======================================================= */

  initializePossession() {

    const homePlayers =
      this.getActivePlayers(
        this.state.teams.home
      );

    const awayPlayers =
      this.getActivePlayers(
        this.state.teams.away
      );


    if (
      !homePlayers.length &&
      !awayPlayers.length
    ) {
      return;
    }


    /**
     * Possesso iniziale deterministico.
     */
    const homeStarts =
      this.rng.chance(
        0.5
      );


    const candidates =
      homeStarts
        ? homePlayers
        : awayPlayers;


    const side =
      homeStarts
        ? POSSESSION.HOME
        : POSSESSION.AWAY;


    if (!candidates.length) {

      const fallbackSide =
        homeStarts
          ? POSSESSION.AWAY
          : POSSESSION.HOME;

      const fallbackPlayers =
        fallbackSide ===
        POSSESSION.HOME
          ? homePlayers
          : awayPlayers;


      if (!fallbackPlayers.length) {
        return;
      }


      this.assignInitialPossession(
        fallbackSide,
        fallbackPlayers[0]
      );

      return;
    }


    /**
     * Preferiamo un centrocampista /
     * giocatore vicino al centro.
     *
     * Non scegliamo semplicemente
     * players[0].
     */
    const player =
      this.selectKickoffPlayer(
        candidates
      );


    this.assignInitialPossession(
      side,
      player
    );
  }


  /* =======================================================
     KICKOFF PLAYER
     ======================================================= */

  selectKickoffPlayer(
    players
  ) {

    if (!players.length) {
      return null;
    }


    const midfieldRoles = new Set([
      "mediano",
      "mediano_dattesa",
      "centrocampista_difensivo",
      "regista_arretrato",
      "centrocampista",
      "centrocampista_incursore",
      "mezzala",
      "regista",
      "rifinitore",
      "trequartista",
    ]);


    const preferred =
      players.filter(
        (player) =>
          midfieldRoles.has(
            player.role ??
            player.primaryRole
          )
      );


    const pool =
      preferred.length
        ? preferred
        : players;


    return (
      pool
        .slice()
        .sort(
          (a, b) =>
            distance(
              a.position,
              {
                x: CENTER_X,
                y: CENTER_Y,
              }
            ) -
            distance(
              b.position,
              {
                x: CENTER_X,
                y: CENTER_Y,
              }
            )
        )[0]
    );
  }


  /* =======================================================
     ASSIGN INITIAL POSSESSION
     ======================================================= */

  assignInitialPossession(
    side,
    player
  ) {

    if (
      !player ||
      !isValidSide(
        side
      )
    ) {
      return;
    }


    /**
     * Usa la nuova API:
     *
     * setPossession(
     *   state,
     *   side,
     *   playerId
     * )
     */
    setPossession(
      this.state,
      side,
      player.id
    );


    /**
     * Stato palla.
     */
    this.state.ball.x =
      player.position.x;

    this.state.ball.y =
      player.position.y;

    this.state.ball.targetX =
      player.position.x;

    this.state.ball.targetY =
      player.position.y;

    this.state.ball.ownerId =
      player.id;

    this.state.ball.lastTouchPlayerId =
      player.id;

    this.state.ball.state =
      "owned";


    this.currentBallOwnerId =
      player.id;


    this.syncPlayerRuntimeFlags();


    this.emitEvent(
      this.createEvent(
        "POSSESSION_WON",
        {
          actors: [
            player.id,
          ],

          payload: {
            side,

            playerId:
              player.id,

            reason:
              "kickoff",
          },
        }
      )
    );
  }


  /* =======================================================
     RECOVER POSSESSION
     ======================================================= */

  recoverPossession() {

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


    /**
     * Prima cerchiamo chi è
     * vicino alla palla.
     */
    const ballPosition = {
      x:
        this.state.ball.x,

      y:
        this.state.ball.y,
    };


    const candidates =
      allPlayers
        .map(
          (player) => ({
            player,

            distance:
              distance(
                player.position,
                ballPosition
              ),
          })
        )
        .sort(
          (a, b) =>
            a.distance -
            b.distance
        );


    const nearest =
      candidates[0];


    if (!nearest) {
      return;
    }


    /**
     * Solo se ragionevolmente
     * vicino alla palla.
     */
    if (
      nearest.distance >
      0.18
    ) {
      return;
    }


    const side =
      getPlayerSide(
        this.state,
        nearest.player.id
      );


    if (
      !isValidSide(
        side
      )
    ) {
      return;
    }


    setPossession(
      this.state,
      side,
      nearest.player.id
    );


    this.state.ball.ownerId =
      nearest.player.id;

    this.state.ball.lastTouchPlayerId =
      nearest.player.id;

    this.state.ball.state =
      "owned";


    this.currentBallOwnerId =
      nearest.player.id;


    this.syncPlayerRuntimeFlags();


    this.emitEvent(
      this.createEvent(
        "POSSESSION_WON",
        {
          actors: [
            nearest.player.id,
          ],

          payload: {
            side,

            playerId:
              nearest.player.id,

            reason:
              "possession_recovery",
          },
        }
      )
    );
  }


  /* =======================================================
     CONTESTED BALL
     ======================================================= */

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


    const ranked =
      allPlayers
        .map(
          (player) => ({
            player,

            distance:
              distance(
                player.position,
                ballPosition
              ),
          })
        )
        .sort(
          (a, b) =>
            a.distance -
            b.distance
        );


    const nearest =
      ranked[0];


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


    if (
      !isValidSide(
        side
      )
    ) {
      return;
    }


    setPossession(
      this.state,
      side,
      nearest.player.id
    );


    this.state.ball.ownerId =
      nearest.player.id;

    this.state.ball.lastTouchPlayerId =
      nearest.player.id;

    this.state.ball.state =
      "owned";


    this.currentBallOwnerId =
      nearest.player.id;


    this.syncPlayerRuntimeFlags();


    this.emitEvent(
      this.createEvent(
        "POSSESSION_WON",
        {
          actors: [
            nearest.player.id,
          ],

          payload: {
            side,

            playerId:
              nearest.player.id,

            reason:
              "contested_ball",
          },
        }
      )
    );
  }


  /* =======================================================
     AI
     ======================================================= */

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

        possession:
          this.state.possession,
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

        possession:
          this.state.possession,
      });


    this.aiDecisions = {};


    for (
      const decision
      of homeDecisions
    ) {

      if (
        decision?.playerId
      ) {
        this.aiDecisions[
          decision.playerId
        ] =
          decision;
      }
    }


    for (
      const decision
      of awayDecisions
    ) {

      if (
        decision?.playerId
      ) {
        this.aiDecisions[
          decision.playerId
        ] =
          decision;
      }
    }


    this.applyAIDecisions(
      homeDecisions,
      homePlayers
    );


    this.applyAIDecisions(
      awayDecisions,
      awayPlayers
    );


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

      possession:
        this.state.possession,

      ballOwnerId:
        this.state.ball.ownerId,
    };
  }


  /* =======================================================
     APPLY AI
     ======================================================= */

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


      player.aiDecision =
        decision;


      /**
       * Il possessore deve usare
       * esclusivamente la decisione
       * generata per lui.
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
            clamp(
              normalizeCoordinate(
                decision
                  .targetPosition
                  .x
              )
            ),

          y:
            clamp(
              normalizeCoordinate(
                decision
                  .targetPosition
                  .y
              )
            ),
        };
      }


      player.intent =
        decision.action ??
        decision.intent ??
        player.intent;


      player.currentAction =
        decision.action ??
        player.currentAction;


      /**
       * Mirror nello stato match.
       */
      player.matchState =
        player.matchState ??
        {};


      player.matchState.intent =
        player.intent;

      player.matchState.currentAction =
        player.currentAction;

      player.matchState.targetPosition = {
        x:
          player.targetPosition.x,

        y:
          player.targetPosition.y,
      };
    }
  }


  /* =======================================================
     SPATIAL STATE
     ======================================================= */

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


  /* =======================================================
     ACTIVE PLAYERS
     ======================================================= */

  getActivePlayers(
    team
  ) {

    if (!team) {
      return [];
    }


    const startingXI =
      Array.isArray(
        team.startingXI
      )
        ? team.startingXI
        : [];


    const players =
      startingXI
        .map(
          (reference) => {

            if (
              typeof reference ===
              "string"
            ) {

              return (
                team.players?.find(
                  (player) =>
                    player.id ===
                    reference
                ) ??
                null
              );
            }


            if (
              reference &&
              typeof reference ===
              "object"
            ) {

              if (
                reference.id &&
                team.players
              ) {

                return (
                  team.players.find(
                    (player) =>
                      player.id ===
                      reference.id
                  ) ??
                  reference
                );
              }


              return reference;
            }


            return null;
          }
        )
        .filter(Boolean);


    /**
     * Se la squadra non possiede
     * startingXI ma ha esattamente
     * 11 giocatori, usiamoli.
     *
     * Evita partite vuote nei test.
     */
    if (
      players.length === 0 &&
      Array.isArray(
        team.players
      ) &&
      team.players.length > 0
    ) {

      const fallback =
        team.players
          .filter(
            (player) =>
              player &&
              player.onPitch !== false
          )
          .slice(
            0,
            11
          );


      for (
        const player
        of fallback
      ) {

        player.onPitch =
          true;

        player.matchState =
          player.matchState ??
          {};

        player.matchState.onPitch =
          true;
      }


      return fallback;
    }


    /**
     * Garantiamo runtime state.
     */
    for (
      const player
      of players
    ) {

      if (!player.position) {

        player.position = {
          x: 0.5,
          y: 0.5,
        };
      }


      player.position =
        normalizePosition(
          player.position
        );


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


      player.targetPosition =
        normalizePosition(
          player.targetPosition,
          player.position
        );


      if (!player.velocity) {

        player.velocity = {
          x: 0,
          y: 0,
        };
      }


      player.role =
        player.role ??
        player.assignedRole ??
        player.primaryRole ??
        null;


      player.matchState =
        player.matchState ??
        {};


      player.matchState.onPitch =
        true;
    }


    return players;
  }


  /* =======================================================
     POSSESSION SYNC
     ======================================================= */

  syncPossessionState() {

    const ownerId =
      this.state.ball?.ownerId ??
      this.currentBallOwnerId ??
      null;


    if (
      ownerId
    ) {

      const side =
        getPlayerSide(
          this.state,
          ownerId
        );


      if (
        side ===
        "home"
      ) {

        this.state.possession =
          POSSESSION.HOME;

      }

      else if (
        side ===
        "away"
      ) {

        this.state.possession =
          POSSESSION.AWAY;
      }


      this.currentBallOwnerId =
        ownerId;

    }


    /**
     * Se il sistema possesso
     * ha cambiato possession ma non
     * ha aggiornato ownerId, cerchiamo
     * il giocatore con hasBall.
     */
    if (
      !this.state.ball.ownerId
    ) {

      const allPlayers = [
        ...this.getActivePlayers(
          this.state.teams.home
        ),

        ...this.getActivePlayers(
          this.state.teams.away
        ),
      ];


      const owner =
        allPlayers.find(
          (player) =>
            player.hasBall === true ||
            player.matchState?.hasBall ===
            true
        );


      if (owner) {

        this.state.ball.ownerId =
          owner.id;

        this.state.ball.lastTouchPlayerId =
          owner.id;

        this.currentBallOwnerId =
          owner.id;

        this.state.ball.state =
          "owned";
      }
    }


    this.syncPlayerRuntimeFlags();
  }


  /* =======================================================
     PLAYER FLAGS
     ======================================================= */

  syncPlayerRuntimeFlags() {

    const allPlayers = [
      ...this.getActivePlayers(
        this.state.teams.home
      ),

      ...this.getActivePlayers(
        this.state.teams.away
      ),
    ];


    const ownerId =
      this.state.ball?.ownerId ??
      null;


    for (
      const player
      of allPlayers
    ) {

      const hasBall =
        player.id ===
        ownerId;


      player.hasBall =
        hasBall;


      player.matchState =
        player.matchState ??
        {};


      player.matchState.hasBall =
        hasBall;


      player.matchState.actualPosition = {
        x:
          player.position.x,

        y:
          player.position.y,
      };


      player.matchState.targetPosition = {
        x:
          player.targetPosition.x,

        y:
          player.targetPosition.y,
      };


      player.matchState.velocity = {
        x:
          player.velocity.x,

        y:
          player.velocity.y,
      };
    }
  }


  /* =======================================================
     POSSESSION EVENT BRIDGE
     ======================================================= */

  handlePossessionEvent(
    ...args
  ) {

    /**
     * Formato:
     *
     * emitEvent(eventObject)
     */
    if (
      args.length === 1 &&
      args[0] &&
      typeof args[0] ===
      "object"
    ) {

      const eventData =
        args[0];


      this.emitEvent(
        this.createEvent(
          eventData.type,
          {
            actors:
              eventData.actors ??
              [],

            causedBy:
              eventData.causedBy ??
              null,

            payload:
              eventData.payload ??
              {},
          }
        )
      );


      return;
    }


    /**
     * Formato:
     *
     * emitEvent(
     *   type,
     *   payload,
     *   causedBy
     * )
     */
    const type =
      args[0];


    if (
      typeof type !==
      "string"
    ) {
      return;
    }


    const payload =
      args[1] ??
      {};


    const causedBy =
      args[2] ??
      null;


    this.emitEvent(
      this.createEvent(
        type,
        {
          actors:
            payload.actors ??
            [],

          causedBy,

          payload,
        }
      )
    );
  }


  /* =======================================================
     HALF TIME
     ======================================================= */

  processHalfTime(
    clockEvent
  ) {

    this.state.phase =
      MATCH_PHASES.HALF_TIME;


    this.clock.pause();


    this.emitEvent(
      this.createEvent(
        "HALF_TIME",
        {
          payload: {
            minute:
              clockEvent.minute,

            second:
              clockEvent.second,
          },
        }
      )
    );
  }


  /* =======================================================
     FULL TIME
     ======================================================= */

  processFullTime(
    clockEvent
  ) {

    this.finishMatch(
      clockEvent
    );
  }


  /* =======================================================
     FINISH
     ======================================================= */

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


    this.syncPossessionState();


    this.emitEvent(
      this.createEvent(
        "FULL_TIME",
        {
          payload: {

            minute:
              clockEvent?.minute ??
              this.clock.minute,

            second:
              clockEvent?.second ??
              this.clock.second,

            score: {
              home:
                this.state.score.home,

              away:
                this.state.score.away,
            },

            possession:
              this.state.possession,

            ballOwnerId:
              this.state.ball.ownerId,
          },
        }
      )
    );
  }


  /* =======================================================
     CLOCK
     ======================================================= */

  syncClockState() {

    const clockState =
      this.clock.getState();


    this.state.clock = {
      ...clockState,
    };


    /**
     * Compatibilità con sistemi
     * che usano direttamente
     * timeSeconds.
     */
    this.state.timeSeconds =
      clockState
        .totalSimulatedSeconds;
  }


  /* =======================================================
     RUNTIME STATE
     ======================================================= */

  syncRuntimeState() {

    this.syncClockState();


    this.state.tacticalInstructions =
      this.tacticalInstructions;


    this.state.spatialGrid =
      this.spatialGrid;


    this.syncPossessionState();
  }


  /* =======================================================
     EVENT CREATION
     ======================================================= */

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
     * con il log/debug UI.
     */
    event.matchMinute =
      this.clock.minute;

    event.matchSecond =
      this.clock.second;


    /**
     * Tempo simulato.
     */
    event.timestamp =
      this.clock
        .totalSimulatedSeconds;


    return event;
  }


  /* =======================================================
     EMIT EVENT
     ======================================================= */

  emitEvent(
    event
  ) {

    if (!event) {
      return;
    }


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

        listener(
          event
        );

      } catch (error) {

        console.error(
          "MatchEngine listener error:",
          error
        );
      }
    }
  }


  /* =======================================================
     SUBSCRIBE
     ======================================================= */

  subscribe(
    listener
  ) {

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


  /* =======================================================
     GETTERS
     ======================================================= */

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


  getCurrentBallOwner() {

    return (
      this.state.ball?.ownerId ??
      null
    );
  }


  getCurrentPossession() {

    return (
      this.state.possession ??
      POSSESSION.NONE
    );
  }


  /* =======================================================
     TEAM INSTRUCTION
     ======================================================= */

  setTeamInstruction(
    side,
    key,
    value
  ) {

    if (
      !isValidSide(
        side
      )
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


export default MatchEngine;

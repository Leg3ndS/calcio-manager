import { createMatchState, MATCH_PHASES, POSSESSION } from "./worldState.js";
import { MatchClock } from "./clock.js";
import { RNG, createMatchSeed } from "./rng.js";
import { createTacticalInstructions } from "./data/tacticalModel.js";
import { createSpatialGrid, updateSpatialGrid } from "./spatial/grid.js";
import { createMatchEvent, appendEvent, createEventLog } from "./events/eventModel.js";
import { evaluateTeam } from "./ai/utilityAI.js";
import { processPossession, setPossession, getPlayerSide } from "./possession/possessionSystem.js";
import { updateAllPlayerMovement } from "./movement/playerMovement.js";

const FIELD_MIN = 0.025;
const FIELD_MAX = 0.975;
const CENTER_X = 0.5;
const CENTER_Y = 0.5;

function clamp(value, min = FIELD_MIN, max = FIELD_MAX) {
  return Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : (min + max) / 2;
}

function normalizeCoordinate(value) {
  if (!Number.isFinite(value)) return 0.5;
  return value > 1 ? value / 100 : value;
}

function normalizePosition(
  position,
  fallback = { x: 0.5, y: 0.5 }
) {
  if (!position) {
    return {
      x: fallback.x,
      y: fallback.y,
    };
  }

  return {
    x: clamp(normalizeCoordinate(position.x)),
    y: clamp(normalizeCoordinate(position.y)),
  };
}

function distance(a, b) {
  const dx = (a?.x ?? 0) - (b?.x ?? 0);
  const dy = (a?.y ?? 0) - (b?.y ?? 0);

  return Math.sqrt(
    dx * dx +
    dy * dy
  );
}

function isValidSide(side) {
  return (
    side === "home" ||
    side === "away"
  );
}

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
      new RNG(
        this.seed
      );

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

    this.tick = 0;

    this.listeners =
      new Set();

    this.aiDecisions = {};

    this.currentBallOwnerId =
      null;

    this.prepareRuntimePlayers(
      homeTeam,
      "home"
    );

    this.prepareRuntimePlayers(
      awayTeam,
      "away"
    );

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

      player.hasBall = false;

      player.intent =
        "hold_position";

      player.currentAction =
        "idle";

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

      player.side =
        side;

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

    if (
      this.state.phase ===
      MATCH_PHASES.KICKOFF
    ) {

      this.state.phase =
        MATCH_PHASES.OPEN_PLAY;
    }

    const homePlayers =
      this.getActivePlayers(
        this.state.teams.home
      );

    const awayPlayers =
      this.getActivePlayers(
        this.state.teams.away
      );

    /*
     * INVARIANTE FONDAMENTALE:
     *
     * Non possiamo avere:
     *
     * possession = HOME/AWAY
     * ownerId = null
     *
     * perché in quel caso il sistema
     * di recovery non viene eseguito
     * e la partita può bloccarsi.
     */
    this.enforcePossessionInvariant(
      "pre_possession"
    );

    if (
      this.state.possession ===
      POSSESSION.NONE
    ) {

      this.recoverPossession();
    }

    updateAllPlayerMovement({
      homePlayers,

      awayPlayers,

      ball:
        this.state.ball,

      deltaSimulationSeconds:
        clockEvent.simulatedSeconds,
    });

    this.updateSpatialState();

    if (
      this.state.possession ===
      POSSESSION.CONTESTED
    ) {

      this.resolveContestedBall();
    }

    this.calculateDecisions();

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

    /*
     * Prima sincronizzazione dopo
     * il Possession System.
     */
    this.syncPossessionState();

    /*
     * Secondo controllo:
     * qualsiasi sistema precedente
     * può aver cancellato ownerId.
     */
    this.enforcePossessionInvariant(
      "post_possession"
    );

    /*
     * Se abbiamo appena cancellato
     * un possesso stale, tentiamo subito
     * il recupero nello stesso tick.
     */
    if (
      this.state.possession ===
      POSSESSION.NONE
    ) {

      this.recoverPossession();
    }

    this.updateSpatialState();

    this.syncPlayerRuntimeFlags();

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
     POSSESSION INVARIANT
     ======================================================= */

  enforcePossessionInvariant(
    source = "unknown"
  ) {

    /*
     * Non tocchiamo gli stati di
     * pausa/intervallo/fine partita.
     */
    if (
      this.state.phase !==
        MATCH_PHASES.OPEN_PLAY &&
      this.state.phase !==
        MATCH_PHASES.KICKOFF
    ) {
      return;
    }

    const players = [
      ...this.getActivePlayers(
        this.state.teams.home
      ),

      ...this.getActivePlayers(
        this.state.teams.away
      ),
    ];

    const previousPossession =
      this.state.possession;

    const previousOwnerId =
      this.state.ball?.ownerId ??
      null;

    /*
     * IMPORTANTE:
     *
     * NON utilizziamo più
     * currentBallOwnerId come fallback.
     *
     * Se ball.ownerId è null,
     * il vecchio cache ID potrebbe essere
     * ormai obsoleto e creare il deadlock.
     */
    const validOwner =
      previousOwnerId
        ? players.find(
            (player) =>
              player.id ===
              previousOwnerId
          )
        : null;

    /*
     * Caso normale:
     * owner valido.
     */
    if (validOwner) {

      const side =
        getPlayerSide(
          this.state,
          validOwner.id
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
        validOwner.id;

      this.state.ball.state =
        "owned";

      return;
    }

    /*
     * Seconda possibilità:
     * qualche sistema ha aggiornato
     * hasBall ma non ownerId.
     */
    const flaggedOwner =
      players.find(
        (player) =>
          player.hasBall === true ||
          player.matchState?.hasBall ===
            true
      );

    if (flaggedOwner) {

      const side =
        getPlayerSide(
          this.state,
          flaggedOwner.id
        );

      if (
        isValidSide(
          side
        )
      ) {

        this.state.ball.ownerId =
          flaggedOwner.id;

        this.state.ball.lastTouchPlayerId =
          flaggedOwner.id;

        this.state.ball.state =
          "owned";

        this.currentBallOwnerId =
          flaggedOwner.id;

        this.state.possession =
          side === "home"
            ? POSSESSION.HOME
            : POSSESSION.AWAY;

        return;
      }
    }

    /*
     * CASO CHE CI INTERESSA:
     *
     * Possesso HOME/AWAY
     * ma nessun possessore valido.
     *
     * Puliamo completamente lo stato.
     */
    if (
      previousPossession ===
        POSSESSION.HOME ||
      previousPossession ===
        POSSESSION.AWAY
    ) {

      this.currentBallOwnerId =
        null;

      this.state.ball.ownerId =
        null;

      if (
        this.state.ball.state !==
        "goal_kick"
      ) {

        this.state.ball.state =
          "free";
      }

      this.state.possession =
        POSSESSION.NONE;

      this.emitEvent(
        this.createEvent(
          "POSSESSION_INVARIANT_RECOVERED",
          {
            payload: {

              source,

              previousPossession,

              previousOwnerId,

              action:
                "cleared_stale_possession",
            },
          }
        )
      );
    }

    else {

      this.currentBallOwnerId =
        null;
    }

    this.syncPlayerRuntimeFlags();
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

    if (
      !candidates.length
    ) {

      const fallbackSide =
        homeStarts
          ? POSSESSION.AWAY
          : POSSESSION.HOME;

      const fallbackPlayers =
        fallbackSide ===
        POSSESSION.HOME
          ? homePlayers
          : awayPlayers;

      if (
        !fallbackPlayers.length
      ) {
        return;
      }

      this.assignInitialPossession(
        fallbackSide,
        fallbackPlayers[0]
      );

      return;
    }

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

    const midfieldRoles =
      new Set([
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

    setPossession(
      this.state,
      side,
      player.id
    );

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

    /*
     * FIX CRITICO:
     *
     * ownerId deve provenire
     * dalla palla reale.
     *
     * Non usiamo più
     * currentBallOwnerId come fallback.
     */
    const rawOwnerId =
      this.state.ball?.ownerId ??
      null;

    const allPlayers = [
      ...this.getActivePlayers(
        this.state.teams.home
      ),

      ...this.getActivePlayers(
        this.state.teams.away
      ),
    ];

    const owner =
      rawOwnerId
        ? allPlayers.find(
            (player) =>
              player.id ===
              rawOwnerId
          )
        : null;

    /*
     * Possessore valido.
     */
    if (owner) {

      const side =
        getPlayerSide(
          this.state,
          owner.id
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
        owner.id;
    }

    /*
     * Nessun owner valido.
     */
    else {

      /*
       * IMPORTANTISSIMO:
       * cancelliamo la cache stale.
       */
      this.currentBallOwnerId =
        null;

      /*
       * Possibile sincronizzazione
       * tramite hasBall.
       */
      const flaggedOwner =
        allPlayers.find(
          (player) =>
            player.hasBall === true ||
            player.matchState?.hasBall ===
            true
        );

      if (flaggedOwner) {

        const side =
          getPlayerSide(
            this.state,
            flaggedOwner.id
          );

        if (
          isValidSide(
            side
          )
        ) {

          this.state.ball.ownerId =
            flaggedOwner.id;

          this.state.ball.lastTouchPlayerId =
            flaggedOwner.id;

          this.currentBallOwnerId =
            flaggedOwner.id;

          this.state.ball.state =
            "owned";

          this.state.possession =
            side === "home"
              ? POSSESSION.HOME
              : POSSESSION.AWAY;
        }
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

    /*
     * Anche quando il sync viene
     * chiamato dall'esterno, manteniamo
     * l'invariante.
     */
    this.enforcePossessionInvariant(
      "runtime_sync"
    );
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

    event.matchMinute =
      this.clock.minute;

    event.matchSecond =
      this.clock.second;

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

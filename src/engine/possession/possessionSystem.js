/**
 * POSSESSION SYSTEM
 *
 * Gestisce:
 *
 * - proprietario della palla
 * - passaggi
 * - ricezioni
 * - perdita del possesso
 * - palla contesa
 *
 * NON gestisce ancora:
 *
 * - tiri
 * - dribbling
 * - contrasti completi
 * - falli
 * - fuorigioco.
 */

import {
  POSSESSION,
} from "../worldState.js";

import {
  EVENT_TYPES,
} from "../events/eventModel.js";

import {
  distance,
} from "../spatial/grid.js";


function clamp(
  value,
  min = 0,
  max = 1
) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}


/**
 * Restituisce tutti i giocatori attivi.
 */
function getActivePlayers(
  team
) {
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

        return reference;
      }
    )
    .filter(Boolean);
}


/**
 * Restituisce il giocatore che
 * possiede la palla.
 */
export function getBallOwner(
  state
) {
  const ownerId =
    state.ball.ownerId;

  if (!ownerId) {
    return null;
  }

  const home =
    state.teams.home.players
      .find(
        (player) =>
          player.id ===
          ownerId
      );

  if (home) {
    return home;
  }

  const away =
    state.teams.away.players
      .find(
        (player) =>
          player.id ===
          ownerId
      );

  return away ?? null;
}


/**
 * Imposta il possesso.
 */
export function setPossession({
  state,
  side,
  playerId,
}) {
  const previousOwner =
    state.ball.ownerId;

  state.possession =
    side;

  state.ball.ownerId =
    playerId;

  state.ball.lastTouchPlayerId =
    playerId;

  state.ball.state =
    "controlled";

  for (
    const team of [
      state.teams.home,
      state.teams.away,
    ]
  ) {
    for (
      const player of team.players
    ) {
      player.hasBall =
        player.id ===
        playerId;
    }
  }

  return {
    previousOwner,
    newOwner:
      playerId,
  };
}


/**
 * Determina quale squadra appartiene
 * a un determinato giocatore.
 */
export function getPlayerSide(
  state,
  playerId
) {
  const home =
    state.teams.home.players
      .some(
        (player) =>
          player.id ===
          playerId
      );

  if (home) {
    return POSSESSION.HOME;
  }

  const away =
    state.teams.away.players
      .some(
        (player) =>
          player.id ===
          playerId
      );

  if (away) {
    return POSSESSION.AWAY;
  }

  return POSSESSION.NONE;
}


/**
 * Cerca il miglior compagno
 * per una ricezione.
 */
export function findBestPassTarget({
  player,
  teammates,
  spatialGrid,
}) {
  const candidates =
    teammates
      .filter(
        (teammate) =>
          teammate &&
          teammate.id !==
            player.id
      )
      .map(
        (teammate) => {
          const distanceToPlayer =
            distance(
              player.position,
              teammate.position
            );

          let space = 0.5;

          if (
            spatialGrid
          ) {
            const x =
              Math.max(
                0,
                Math.min(
                  0.999999,
                  teammate.position.x
                )
              );

            const y =
              Math.max(
                0,
                Math.min(
                  0.999999,
                  teammate.position.y
                )
              );

            const column =
              Math.floor(
                x *
                  spatialGrid.columns
              );

            const row =
              Math.floor(
                y *
                  spatialGrid.rows
              );

            const index =
              row *
                spatialGrid.columns +
              column;

            space =
              spatialGrid
                .cells[index]
                ?.freeSpace ??
              0.5;
          }

          /**
           * Per ora premiamo:
           *
           * - spazio
           * - distanza ragionevole
           */
          const distanceScore =
            clamp(
              1 -
                Math.max(
                  0,
                  distanceToPlayer -
                    0.08
                ) /
                  0.70
            );

          const score =
            space * 0.60 +
            distanceScore * 0.40;

          return {
            teammate,
            score,
          };
        }
      )
      .sort(
        (a, b) =>
          b.score -
          a.score
      );

  return (
    candidates[0]?.teammate ??
    null
  );
}


/**
 * Esegue un passaggio semplice.
 *
 * Questa è una prima implementazione.
 * La traiettoria fisica completa arriverà
 * successivamente.
 */
export function executePass({
  state,
  player,
  target,
  rng,
}) {
  if (
    !player ||
    !target
  ) {
    return {
      success: false,
      reason:
        "missing_player_or_target",
    };
  }

  const passing =
    (
      player.attributes
        ?.technical
        ?.passaggi ??
      50
    ) / 99;

  const technique =
    (
      player.attributes
        ?.technical
        ?.tecnica ??
      50
    ) / 99;

  const decision =
    (
      player.attributes
        ?.mental
        ?.decisioni ??
      50
    ) / 99;

  const distanceToTarget =
    distance(
      player.position,
      target.position
    );

  const distanceDifficulty =
    clamp(
      distanceToTarget * 0.8
    );

  const successChance =
    clamp(
      0.35 +
        passing * 0.30 +
        technique * 0.15 +
        decision * 0.15 -
        distanceDifficulty * 0.20,
      0.15,
      0.96
    );

  const success =
    rng.chance(
      successChance
    );

  if (!success) {
    return {
      success: false,

      successChance,

      reason:
        "pass_failed",
    };
  }

  setPossession({
    state,

    side:
      getPlayerSide(
        state,
        target.id
      ),

    playerId:
      target.id,
  });

  state.ball.x =
    target.position.x;

  state.ball.y =
    target.position.y;

  state.ball.target =
    null;

  state.ball.pass = {
    passerId:
      player.id,

    receiverId:
      target.id,

    success: true,
  };

  return {
    success: true,

    successChance,

    receiverId:
      target.id,
  };
}


/**
 * Gestisce il primo micro-ciclo
 * del possesso.
 */
export function processPossession({
  state,
  rng,
  emitEvent,
}) {
  const owner =
    getBallOwner(state);

  if (!owner) {
    return;
  }

  const side =
    getPlayerSide(
      state,
      owner.id
    );

  const team =
    side === POSSESSION.HOME
      ? state.teams.home
      : state.teams.away;

  const opponents =
    side === POSSESSION.HOME
      ? getActivePlayers(
          state.teams.away
        )
      : getActivePlayers(
          state.teams.home
        );

  const teammates =
    getActivePlayers(
      team
    );

  /**
   * Troviamo il compagno
   * migliore per una prima circolazione.
   */
  const target =
    findBestPassTarget({
      player:
        owner,

      teammates,

      spatialGrid:
        state.spatialGrid,
    });

  if (!target) {
    return;
  }

  /**
   * Valutiamo la pressione
   * degli avversari vicini.
   */
  const nearestOpponent =
    opponents
      .map(
        (opponent) => ({
          opponent,

          distance:
            distance(
              owner.position,
              opponent.position
            ),
        })
      )
      .sort(
        (a, b) =>
          a.distance -
          b.distance
      )[0];

  const pressure =
    nearestOpponent
      ? clamp(
          1 -
            nearestOpponent.distance *
              3
        )
      : 0;

  /**
   * Se non c'è pressione,
   * il giocatore può circolare.
   *
   * Se la pressione è alta,
   * il passaggio diventa più probabile.
   */
  const passProbability =
    clamp(
      0.35 +
        pressure * 0.40
    );

  if (
    rng.chance(
      passProbability
    )
  ) {
    emitEvent({
      type:
        EVENT_TYPES.PASS_ATTEMPT,

      actors: [
        owner.id,
        target.id,
      ],

      payload: {
        pressure,
      },
    });

    const result =
      executePass({
        state,
        player:
          owner,
        target,
        rng,
      });

    if (
      result.success
    ) {
      emitEvent({
        type:
          EVENT_TYPES.PASS_COMPLETE,

        actors: [
          owner.id,
          target.id,
        ],

        payload: {
          successChance:
            result.successChance,
        },
      });

      emitEvent({
        type:
          EVENT_TYPES.RECEIVE,

        actors: [
          target.id,
        ],

        causedBy:
          state.lastEvent?.id ??
          null,

        payload: {
          fromPlayerId:
            owner.id,
        },
      });
    } else {
      emitEvent({
        type:
          EVENT_TYPES.PASS_FAILED,

        actors: [
          owner.id,
          target.id,
        ],

        payload: {
          successChance:
            result.successChance,
        },
      });

      /**
       * Per ora un passaggio fallito
       * rende la palla contesa.
       *
       * Il vero sistema di intercetto
       * arriverà nel prossimo blocco.
       */
      state.possession =
        POSSESSION.CONTESTED;

      state.ball.ownerId =
        null;

      for (
        const teamState of [
          state.teams.home,
          state.teams.away,
        ]
      ) {
        for (
          const player
          of teamState.players
        ) {
          player.hasBall =
            false;
        }
      }

      emitEvent({
        type:
          EVENT_TYPES.POSSESSION_CONTESTED,

        actors: [
          owner.id,
          target.id,
        ],

        payload: {
          reason:
            "failed_pass",
        },
      });
    }
  }
}

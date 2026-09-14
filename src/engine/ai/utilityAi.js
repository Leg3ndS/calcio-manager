/**
 * UTILITY AI
 *
 * Primo livello del decision making.
 *
 * NON è ancora l'AI completa.
 *
 * Per ora valuta:
 *
 * - mantenere possesso
 * - passare
 * - muoversi
 * - pressare
 * - supportare
 *
 * Ogni decisione è deterministica:
 * la casualità eventuale viene fornita
 * dal RNG del Match Engine.
 */

import {
  getRoleWeights,
} from "../data/roleWeights.js";

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


function normalizeAttribute(
  value
) {
  return clamp(
    (value ?? 50) / 99
  );
}


/**
 * Recupera un attributo dal giocatore.
 *
 * Cerchiamo nei vari gruppi del modello.
 */
function getAttribute(
  player,
  attribute
) {
  const groups = [
    player?.attributes?.technical,
    player?.attributes?.mental,
    player?.attributes?.physical,
    player?.attributes?.goalkeeper,
    player?.attributes,
  ];

  for (const group of groups) {
    if (
      group &&
      Number.isFinite(
        group[attribute]
      )
    ) {
      return group[attribute];
    }
  }

  return 50;
}


/**
 * Qualità generale del giocatore
 * rispetto al ruolo.
 */
function getRoleQuality(
  player
) {
  const weights =
    getRoleWeights(
      player.role
    );

  const entries =
    Object.entries(weights);

  if (!entries.length) {
    return 0.5;
  }

  let weightedTotal = 0;
  let totalWeight = 0;

  for (
    const [attribute, weight]
    of entries
  ) {
    weightedTotal +=
      normalizeAttribute(
        getAttribute(
          player,
          attribute
        )
      ) * weight;

    totalWeight += weight;
  }

  if (!totalWeight) {
    return 0.5;
  }

  return clamp(
    weightedTotal /
      totalWeight
  );
}


/**
 * Valuta un possibile passaggio.
 */
function scorePass({
  player,
  target,
  gridCell,
}) {
  if (!target) {
    return 0;
  }

  const passing =
    normalizeAttribute(
      getAttribute(
        player,
        "passaggi"
      )
    );

  const technique =
    normalizeAttribute(
      getAttribute(
        player,
        "tecnica"
      )
    );

  const decision =
    normalizeAttribute(
      getAttribute(
        player,
        "decisioni"
      )
    );

  const targetPosition =
    target.position ?? {
      x: 0.5,
      y: 0.5,
    };

  const distanceToTarget =
    distance(
      player.position,
      targetPosition
    );

  /**
   * Preferiamo inizialmente
   * passaggi relativamente sicuri.
   */
  const distanceQuality =
    clamp(
      1 -
        Math.max(
          0,
          distanceToTarget - 0.08
        ) /
          0.65
    );

  const spaceQuality =
    gridCell?.freeSpace ?? 0.5;

  return clamp(
    passing * 0.35 +
      technique * 0.15 +
      decision * 0.20 +
      distanceQuality * 0.15 +
      spaceQuality * 0.15
  );
}


/**
 * Valuta mantenimento palla.
 */
function scoreHold({
  player,
  pressure,
}) {
  const technique =
    normalizeAttribute(
      getAttribute(
        player,
        "tecnica"
      )
    );

  const control =
    normalizeAttribute(
      getAttribute(
        player,
        "primoControllo"
      )
    );

  const composure =
    normalizeAttribute(
      getAttribute(
        player,
        "freddezza"
      )
    );

  const pressureSafety =
    1 - clamp(pressure);

  return clamp(
    technique * 0.25 +
      control * 0.30 +
      composure * 0.20 +
      pressureSafety * 0.25
  );
}


/**
 * Valuta movimento.
 */
function scoreMove({
  player,
  tacticalPosition,
  gridCell,
}) {
  const movement =
    normalizeAttribute(
      getAttribute(
        player,
        "movimentoSenzaPalla"
      )
    );

  const acceleration =
    normalizeAttribute(
      getAttribute(
        player,
        "accelerazione"
      )
    );

  const space =
    gridCell?.freeSpace ?? 0.5;

  const tacticalDistance =
    tacticalPosition
      ? distance(
          player.position,
          tacticalPosition
        )
      : 0;

  const needToMove =
    clamp(
      tacticalDistance * 2
    );

  return clamp(
    movement * 0.40 +
      acceleration * 0.20 +
      space * 0.20 +
      needToMove * 0.20
  );
}


/**
 * Valuta pressing.
 */
function scorePress({
  player,
  ball,
  opponent,
  pressingLevel = "medio",
}) {
  if (
    !opponent ||
    !ball
  ) {
    return 0;
  }

  const distanceToOpponent =
    distance(
      player.position,
      opponent.position
    );

  const distanceToBall =
    distance(
      player.position,
      ball
    );

  const aggression =
    normalizeAttribute(
      getAttribute(
        player,
        "aggressivita"
      )
    );

  const anticipation =
    normalizeAttribute(
      getAttribute(
        player,
        "anticipazione"
      )
    );

  const proximity =
    clamp(
      1 -
        distanceToOpponent * 4
    );

  const ballProximity =
    clamp(
      1 -
        distanceToBall * 3
    );

  const tacticalModifier = {
    molto_basso: 0.40,
    basso: 0.60,
    medio: 0.80,
    alto: 1.00,
    molto_alto: 1.15,
  }[pressingLevel] ?? 0.80;

  return clamp(
    (
      aggression * 0.35 +
      anticipation * 0.25 +
      proximity * 0.25 +
      ballProximity * 0.15
    ) *
      tacticalModifier
  );
}


/**
 * Valuta un giocatore.
 */
export function evaluatePlayer({
  player,
  teammates = [],
  opponents = [],
  ball,
  gridCell = null,
  tacticalPosition = null,
  teamInstructions = {},
}) {
  if (!player) {
    return {
      action: "idle",
      score: 0,
      candidates: [],
    };
  }

  const pressure =
    gridCell
      ? (
          gridCell.pressureHome ??
          gridCell.pressureAway ??
          0
        )
      : 0;

  const candidates = [];

  /**
   * GIOCATORE CON PALLA
   */
  if (player.hasBall) {
    const passTargets =
      teammates
        .filter(
          (teammate) =>
            teammate &&
            teammate.id !==
              player.id
        )
        .map(
          (teammate) => ({
            teammate,
            score:
              scorePass({
                player,
                target:
                  teammate,
                gridCell,
              }),
          })
        )
        .sort(
          (a, b) =>
            b.score -
            a.score
        );

    const bestPass =
      passTargets[0] ?? null;

    if (bestPass) {
      candidates.push({
        action: "pass",
        score:
          bestPass.score,
        targetId:
          bestPass.teammate.id,
      });
    }

    candidates.push({
      action: "hold",
      score:
        scoreHold({
          player,
          pressure,
        }),
    });
  }

  /**
   * GIOCATORE SENZA PALLA
   */
  if (!player.hasBall) {
    candidates.push({
      action: "move",
      score:
        scoreMove({
          player,
          tacticalPosition,
          gridCell,
        }),
    });

    const nearestOpponent =
      opponents
        .map(
          (opponent) => ({
            opponent,

            distance:
              distance(
                player.position,
                opponent.position
              ),
          })
        )
        .sort(
          (a, b) =>
            a.distance -
            b.distance
        )[0]?.opponent ?? null;

    candidates.push({
      action: "press",
      score:
        scorePress({
          player,
          ball,
          opponent:
            nearestOpponent,
          pressingLevel:
            teamInstructions
              .pressing,
        }),
    });
  }

  candidates.sort(
    (a, b) =>
      b.score -
      a.score
  );

  const best =
    candidates[0] ?? {
      action: "idle",
      score: 0,
    };

  return {
    action:
      best.action,

    score:
      best.score,

    targetId:
      best.targetId ?? null,

    candidates,
  };
}


/**
 * Decide per tutti i giocatori.
 *
 * Questa funzione NON modifica il World State.
 *
 * Produce solamente decisioni.
 */
export function evaluateTeam({
  players = [],
  opponents = [],
  ball,
  spatialGrid,
  teamInstructions = {},
}) {
  const decisions = [];

  for (const player of players) {
    if (!player) {
      continue;
    }

    const gridCell =
      spatialGrid
        ? spatialGrid.cells[
            getPlayerCellIndex(
              player,
              spatialGrid
            )
          ]
        : null;

    const decision =
      evaluatePlayer({
        player,

        teammates:
          players,

        opponents,

        ball: ball
          ? {
              x: ball.x,
              y: ball.y,
            }
          : null,

        gridCell,

        tacticalPosition:
          player.targetPosition ??
          player.position,

        teamInstructions,
      });

    decisions.push({
      playerId:
        player.id,

      ...decision,
    });
  }

  return decisions;
}


/**
 * Calcola la cella del giocatore
 * senza introdurre dipendenze circolari.
 */
function getPlayerCellIndex(
  player,
  grid
) {
  const columns =
    grid.columns;

  const rows =
    grid.rows;

  const x =
    Math.max(
      0,
      Math.min(
        0.999999,
        player.position.x
      )
    );

  const y =
    Math.max(
      0,
      Math.min(
        0.999999,
        player.position.y
      )
    );

  const column =
    Math.floor(
      x * columns
    );

  const row =
    Math.floor(
      y * rows
    );

  return (
    row * columns +
    column
  );
}

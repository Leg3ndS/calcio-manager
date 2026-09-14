/**
 * PLAYER MOVEMENT SYSTEM v2
 *
 * Separates tactical targets from physical motion.
 * Roles influence movement tendencies; AI remains responsible for decisions.
 */

import { simulatePlayerMotion, ensurePlayerPhysicsState } from "../physics/playerPhysics.js";
import { updateBallPhysics } from "../physics/ballPhysics.js";

const FIELD_MIN = 0.025;
const FIELD_MAX = 0.975;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function distance(a, b) {
  return Math.hypot((b?.x ?? 0) - (a?.x ?? 0), (b?.y ?? 0) - (a?.y ?? 0));
}

function physicalAttribute(player, name, fallback = 50) {
  const value = player?.attributes?.physical?.[name] ?? player?.[name];
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getRole(player) {
  return String(
    player?.assignedRole ??
    player?.role ??
    player?.positionRole ??
    player?.currentRole ??
    player?.primaryRole ??
    "centrocampista"
  ).toLowerCase();
}

function isRole(role, terms) {
  return terms.some((term) => role.includes(term));
}

function getBallInfluence(player, ball, side) {
  if (!ball || !player?.position) return { x: 0, y: 0 };
  const d = distance(player.position, ball);
  if (d < 0.001) return { x: 0, y: 0 };

  const influence = clamp(1 - d / 0.45, 0, 1);
  const dx = (ball.x - player.position.x) / d;
  const dy = (ball.y - player.position.y) / d;
  const role = getRole(player);

  let factor = influence * 0.018;
  if (isRole(role, ["difens", "terzino", "mediano"])) factor *= 0.45;
  if (isRole(role, ["attacc", "ala", "trequart", "punta"])) factor *= 1.15;
  void side;
  return { x: dx * factor, y: dy * factor };
}

function getSeparationForce(player, teammates) {
  let x = 0;
  let y = 0;
  for (const teammate of teammates) {
    if (!teammate || teammate.id === player.id || teammate.onPitch === false) continue;
    const d = distance(player.position, teammate.position);
    if (d > 0.001 && d < 0.07) {
      x += ((player.position.x - teammate.position.x) / d) * 0.010;
      y += ((player.position.y - teammate.position.y) / d) * 0.010;
    }
  }
  return { x, y };
}

/**
 * Generates a role-based movement bias. It does NOT choose an action.
 * AI can override/augment the returned target through tacticalTarget.
 */
function getRoleMovementBias(player, ball, side, teammates, opponents) {
  const role = getRole(player);
  const p = player.position ?? { x: 0.5, y: 0.5 };
  const direction = side === "home" ? 1 : -1;
  const ballX = ball?.x ?? 0.5;
  const ballY = ball?.y ?? 0.5;
  let x = 0;
  let y = 0;

  // Central midfielders: offer passing lanes and occupy the centre/half-space.
  if (isRole(role, ["mezzala"])) {
    x += direction * 0.010;
    y += p.y < 0.5 ? -0.010 : 0.010;
    if (ballX * direction > 0.45) x += direction * 0.012;
  } else if (isRole(role, ["regista arretrato", "regista"])) {
    x += direction * 0.004;
    y += (ballY - p.y) * 0.08;
  } else if (isRole(role, ["mediano", "centrocampista difensivo"])) {
    x += (ballX - p.x) * 0.025;
    y += (0.5 - p.y) * 0.025;
  } else if (isRole(role, ["trequartista", "rifinitore"])) {
    x += direction * 0.014;
    y += (ballY - p.y) * 0.06;
  }

  // Wide roles maintain width and react to the ball side.
  if (isRole(role, ["ala", "esterno", "terzino"])) {
    const preferredY = p.y < 0.5 ? 0.14 : 0.86;
    y += (preferredY - p.y) * 0.035;
    if (isRole(role, ["terzino di spinta", "terzino offensivo", "esterno a tutta fascia"])) {
      x += direction * 0.014;
    }
    if (isRole(role, ["terzino invertito", "esterno invertito"])) {
      y += (0.5 - p.y) * 0.020;
    }
  }

  // Attackers threaten depth, but only when space exists.
  if (isRole(role, ["attaccante avanzato", "attaccante di pressione", "seconda punta", "trequartista avanzato"])) {
    x += direction * 0.018;
    const nearestOpponent = opponents.reduce((best, opponent) => {
      if (!opponent?.position) return best;
      const d = distance(p, opponent.position);
      return d < best ? d : best;
    }, Infinity);
    if (nearestOpponent > 0.10) x += direction * 0.012;
  }

  if (isRole(role, ["attaccante boa"])) {
    x += direction * 0.008;
    y += (0.5 - p.y) * 0.020;
  }

  // Keep a little structure around the ball rather than making everyone chase it.
  if (teammates.length > 0) {
    const separation = getSeparationForce(player, teammates);
    x += separation.x * 0.25;
    y += separation.y * 0.25;
  }

  return { x, y };
}

export function updatePlayerTarget({
  player,
  ball,
  teammates = [],
  opponents = [],
  side = "home",
  tacticalTarget = null,
}) {
  if (!player) return;
  player.position = player.position ?? { x: 0.5, y: 0.5 };

  const base = tacticalTarget ?? player.targetPosition ?? player.position;
  const roleBias = getRoleMovementBias(player, ball, side, teammates, opponents);
  const ballInfluence = getBallInfluence(player, ball, side);
  const separation = getSeparationForce(player, teammates);

  const closestOpponent = opponents.reduce((best, opponent) => {
    if (!opponent?.position) return best;
    return Math.min(best, distance(player.position, opponent.position));
  }, Infinity);

  // Pressure causes attackers to seek an escape lane; defenders preserve shape.
  const role = getRole(player);
  let pressureX = 0;
  let pressureY = 0;
  if (closestOpponent < 0.055 && isRole(role, ["attacc", "ala", "trequart"])) {
    pressureY = player.position.y < 0.5 ? -0.012 : 0.012;
  }

  player.targetPosition = {
    x: clamp(base.x + roleBias.x + ballInfluence.x + separation.x * 0.5 + pressureX, FIELD_MIN, FIELD_MAX),
    y: clamp(base.y + roleBias.y + ballInfluence.y + separation.y * 0.5 + pressureY, FIELD_MIN, FIELD_MAX),
  };

  player.matchState = player.matchState ?? {};
  player.matchState.targetPosition = { ...player.targetPosition };
}

export function updatePlayerMovement(player, deltaSimulationSeconds = 0.1) {
  if (!player || player.onPitch === false || player.matchState?.onPitch === false) return;
  player.position = player.position ?? { x: 0.5, y: 0.5 };
  player.targetPosition = player.targetPosition ?? { ...player.position };
  ensurePlayerPhysicsState(player);

  // Very large clock steps are subdivided to prevent tunnelling/teleport-like motion.
  let remaining = Math.max(0, Number(deltaSimulationSeconds) || 0);
  const maxStep = 0.1;
  while (remaining > 0) {
    const dt = Math.min(maxStep, remaining);
    simulatePlayerMotion({
      player,
      target: player.targetPosition,
      deltaSeconds: dt,
      desiredSpeedMultiplier: player.currentAction === "sprint" ? 1.08 : 1,
    });
    remaining -= dt;
  }

  player.targetPosition = {
    x: clamp(player.targetPosition.x, FIELD_MIN, FIELD_MAX),
    y: clamp(player.targetPosition.y, FIELD_MIN, FIELD_MAX),
  };

  player.matchState = player.matchState ?? {};
  player.matchState.actualPosition = { ...player.position };
  player.matchState.targetPosition = { ...player.targetPosition };
  player.matchState.velocity = { ...player.velocity };
}

export function updateTeamMovement({
  players = [],
  opponents = [],
  ball = null,
  side = "home",
  tacticalTargets = {},
  deltaSimulationSeconds = 0.1,
}) {
  for (const player of players) {
    if (!player || player.onPitch === false || player.matchState?.onPitch === false) continue;
    updatePlayerTarget({
      player,
      ball,
      teammates: players,
      opponents,
      side,
      tacticalTarget: tacticalTargets[player.id] ?? null,
    });
  }

  for (const player of players) {
    updatePlayerMovement(player, deltaSimulationSeconds);
  }
}

export function updateAllPlayerMovement({
  homePlayers = [],
  awayPlayers = [],
  ball = null,
  homeTacticalTargets = {},
  awayTacticalTargets = {},
  deltaSimulationSeconds = 0.1,
}) {
  updateTeamMovement({
    players: homePlayers,
    opponents: awayPlayers,
    ball,
    side: "home",
    tacticalTargets: homeTacticalTargets,
    deltaSimulationSeconds,
  });

  updateTeamMovement({
    players: awayPlayers,
    opponents: homePlayers,
    ball,
    side: "away",
    tacticalTargets: awayTacticalTargets,
    deltaSimulationSeconds,
  });

  // The ball is advanced only when it is not controlled by a player.
  if (ball && !ball.ownerId) {
    updateBallPhysics(ball, Math.min(0.25, Math.max(0, Number(deltaSimulationSeconds) || 0)));
  }
}

export { getRole, physicalAttribute };

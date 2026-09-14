// src/engine/possession/possessionSystem.js
// Possession/action execution layer. Runtime coordinates are 0..1.
// Referee-aware V3: restarts and loose-ball rulings are delegated to referee.js.

import { Referee } from "../referee/referee.js";

const refereeInstances = new WeakMap();

function getReferee(state, rng) {
  if (!state || typeof state !== "object") return new Referee({}, rng);
  let referee = refereeInstances.get(state);
  if (!referee) {
    referee = new Referee(state.referee ?? {}, rng);
    refereeInstances.set(state, referee);
  } else {
    referee.setRng(rng);
  }
  return referee;
}


const POSSESSION = {
  HOME: "home",
  AWAY: "away",
  NONE: "none",
  CONTESTED: "contested",
};

const ACTIONS = {
  PASS: "pass",
  CARRY: "carry",
  DRIBBLE: "dribble",
  SHOOT: "shoot",
  CROSS: "cross",
  CLEAR: "clear",
  HOLD: "hold",
  PRESS: "press",
  TACKLE: "tackle",
  MOVE: "move",
  SUPPORT: "support",
  NONE: "none",
};

const PASS_COOLDOWN_SECONDS = 0.35;
const ACTION_COOLDOWN_SECONDS = 0.15;
const CONTESTED_MAX_SECONDS = 0.80;

function clamp(value, min = 0, max = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function rng01(rng) {
  if (typeof rng === "function") return clamp(rng());
  if (rng && typeof rng.next === "function") return clamp(rng.next());
  if (rng && typeof rng.random === "function") return clamp(rng.random());
  return Math.random();
}

function normalizePosition(position) {
  const x = num(position?.x, 0.5);
  const y = num(position?.y, 0.5);
  return {
    x: clamp(Math.abs(x) > 1 ? x / 100 : x),
    y: clamp(Math.abs(y) > 1 ? y / 100 : y),
  };
}

function distance(a, b) {
  const pa = normalizePosition(a);
  const pb = normalizePosition(b);
  return Math.hypot(pa.x - pb.x, pa.y - pb.y);
}

function getTeamPlayers(state, side) {
  const team = state?.teams?.[side];
  if (Array.isArray(team?.players)) return team.players;
  if (Array.isArray(team)) return team;
  if (Array.isArray(state?.players)) {
    return state.players.filter((p) => getPlayerSide(state, p) === side);
  }
  return [];
}

function getAllPlayers(state) {
  return [
    ...getTeamPlayers(state, POSSESSION.HOME),
    ...getTeamPlayers(state, POSSESSION.AWAY),
  ];
}

function getPlayerById(state, playerId) {
  if (playerId == null) return null;
  return getAllPlayers(state).find((p) => String(p.id) === String(playerId)) || null;
}

function getPlayerSide(state, playerOrId) {
  const player = typeof playerOrId === "object"
    ? playerOrId
    : getPlayerById(state, playerOrId);
  if (!player) return null;
  if (player.side === "home" || player.team === "home") return "home";
  if (player.side === "away" || player.team === "away") return "away";
  for (const side of ["home", "away"]) {
    if (getTeamPlayers(state, side).some((p) => String(p.id) === String(player.id))) return side;
  }
  return null;
}

function active(player) {
  return !!player && player.onPitch !== false && player.matchState?.onPitch !== false && player.redCard !== true && player.sentOff !== true && player.matchState?.redCard !== true;
}

function playerPosition(player) {
  return normalizePosition(player?.actualPosition || player?.position || player?.matchState?.actualPosition || player?.targetPosition);
}

function ballPosition(state) {
  if (!state.ball) state.ball = {};
  const p = normalizePosition(state.ball.position || { x: state.ball.x, y: state.ball.y });
  state.ball.position = p;
  state.ball.x = p.x;
  state.ball.y = p.y;
  return p;
}

function setBallPosition(state, position) {
  if (!state.ball) state.ball = {};
  const p = normalizePosition(position);
  state.ball.position = p;
  state.ball.x = p.x;
  state.ball.y = p.y;
  state.ball.targetX = p.x;
  state.ball.targetY = p.y;
}

function now(state) {
  return num(state?.clock?.totalSeconds, num(state?.timeSeconds, 0));
}

function emit(emitEvent, type, payload = {}, causedBy = null) {
  if (typeof emitEvent !== "function") return;
  emitEvent({ type, payload, causedBy });
}

function getAttr(player, key, fallback = 50) {
  if (!player) return fallback;
  const aliases = {
    passaggi: ["passaggi", "passing", "pass"],
    visione: ["visione", "vision"],
    tecnica: ["tecnica", "technique"],
    primoControllo: ["primoControllo", "firstTouch", "controllo", "ballControl"],
    decisioni: ["decisioni", "decisions"],
    giocoDiSquadra: ["giocoDiSquadra", "teamwork"],
    dribbling: ["dribbling"],
    agilita: ["agilita", "agility"],
    accelerazione: ["accelerazione", "acceleration"],
    velocita: ["velocita", "speed", "pace"],
    tiro: ["tiro", "shooting"],
    finalizzazione: ["finalizzazione", "finishing"],
    tiriDaLontano: ["tiriDaLontano", "longShots"],
    riflessi: ["riflessi", "reflexes", "reactions"],
    posizionamento: ["posizionamento", "positioning"],
    unoControUno: ["unoControUno", "oneOnOne"],
    reattivita: ["reattivita", "reactions"],
    anticipazione: ["anticipazione", "anticipation"],
  };
  const keys = aliases[key] || [key];
  const groups = [player.attributes, player.stats, player.technical, player.mental, player.physical, player.goalkeeper, player];
  for (const group of groups) {
    if (!group || typeof group !== "object") continue;
    for (const k of keys) {
      if (Number.isFinite(Number(group[k]))) return Number(group[k]);
    }
  }
  return fallback;
}

function pressure(state, player) {
  const side = getPlayerSide(state, player);
  const opponents = getTeamPlayers(state, side === "home" ? "away" : "home").filter(active);
  if (!opponents.length) return 0;
  let nearest = Infinity;
  for (const opponent of opponents) nearest = Math.min(nearest, distance(playerPosition(player), playerPosition(opponent)));
  return clamp(1 - nearest / 0.22);
}

function teammates(state, side) {
  return getTeamPlayers(state, side).filter(active);
}

function opponents(state, side) {
  return getTeamPlayers(state, side === "home" ? "away" : "home").filter(active);
}

function decisionAction(decision) {
  return String(decision?.action || decision?.intent || decision?.type || decision?.choice || "hold").toLowerCase();
}

function decisionTarget(decision) {
  return decision?.targetPlayerId || decision?.receiverId || decision?.targetId || decision?.target?.playerId || null;
}

function decisionProbability(decision) {
  for (const v of [decision?.probability, decision?.successProbability, decision?.successChance, decision?.executionProbability]) {
    if (Number.isFinite(Number(v))) return clamp(v);
  }
  return null;
}

function setPossession(state, side, playerId, options = {}) {
  const player = playerId != null ? getPlayerById(state, playerId) : null;
  const resolvedSide = side === "home" || side === "away" ? side : getPlayerSide(state, player);
  if (!player || !active(player) || !resolvedSide) return false;

  for (const p of getAllPlayers(state)) {
    p.hasBall = false;
    p.matchState = p.matchState || {};
    p.matchState.hasBall = false;
  }

  player.hasBall = true;
  player.matchState = player.matchState || {};
  player.matchState.hasBall = true;
  player.matchState.possessionSide = resolvedSide;

  state.ball = state.ball || {};
  state.ball.ownerId = player.id;
  state.ball.ownerSide = resolvedSide;
  state.ball.state = "controlled";
  state.ball.lastTouchPlayerId = player.id;
  state.ball.lastTouchSide = resolvedSide;
  setBallPosition(state, playerPosition(player));

  state.possession = resolvedSide;
  state.possessionSide = resolvedSide;
  state.possessionPlayerId = player.id;
  state._lastPossessionChangeTime = now(state);
  state._lastPossessionSide = resolvedSide;
  state._lastPossessionPlayerId = player.id;

  if (!options.silent) {
    emit( options.emitEvent, "POSSESSION_WON", { side: resolvedSide, playerId: player.id, reason: options.reason || "recovery" }, options.causedBy || null );
  }
  return true;
}

function clearPossession(state, options = {}) {
  for (const p of getAllPlayers(state)) {
    p.hasBall = false;
    p.matchState = p.matchState || {};
    p.matchState.hasBall = false;
  }
  state.ball = state.ball || {};
  state.ball.ownerId = null;
  state.ball.ownerSide = POSSESSION.NONE;
  state.ball.state = options.contested ? "contested" : "loose";
  state.possession = options.contested ? POSSESSION.CONTESTED : POSSESSION.NONE;
  state.possessionSide = POSSESSION.NONE;
  state.possessionPlayerId = null;
  state._contestedSince = options.contested ? now(state) : null;
}

function syncOwnerFromState(state, emitEvent = null) {
  if (!state?.ball?.ownerId) return false;
  const owner = getPlayerById(state, state.ball.ownerId);
  if (!owner || !active(owner)) {
    clearPossession(state, { contested: true });
    return false;
  }
  const side = getPlayerSide(state, owner);
  if (!side) {
    clearPossession(state, { contested: true });
    return false;
  }
  if (state.possession !== side || state.possessionPlayerId !== owner.id || owner.hasBall !== true) {
    setPossession(state, side, owner.id, { silent: true, emitEvent, reason: "owner_sync" });
  }
  setBallPosition(state, playerPosition(owner));
  return true;
}

function choosePassTarget(state, passer, decision, rng) {
  const side = getPlayerSide(state, passer);
  const list = teammates(state, side).filter((p) => String(p.id) !== String(passer.id));
  if (!list.length) return null;
  const explicit = decisionTarget(decision);
  if (explicit) {
    const target = list.find((p) => String(p.id) === String(explicit));
    if (target) return target;
  }
  const opp = opponents(state, side);
  const weighted = list.map((receiver) => {
    const d = distance(playerPosition(passer), playerPosition(receiver));
    let nearest = 1;
    for (const o of opp) nearest = Math.min(nearest, distance(playerPosition(receiver), playerPosition(o)));
    const space = clamp(nearest / 0.28);
    const weight = Math.max(0.01, clamp(1 - Math.max(0, d - 0.18) / 0.60) * (0.35 + space * 0.65));
    return { receiver, weight };
  });
  const total = weighted.reduce((s, x) => s + x.weight, 0);
  let cursor = rng01(rng) * total;
  for (const item of weighted) {
    cursor -= item.weight;
    if (cursor <= 0) return item.receiver;
  }
  return weighted[weighted.length - 1].receiver;
}

function passProbability(state, passer, receiver) {
  const d = distance(playerPosition(passer), playerPosition(receiver));
  let nearest = 1;
  for (const o of opponents(state, getPlayerSide(state, passer))) nearest = Math.min(nearest, distance(playerPosition(receiver), playerPosition(o)));
  const receiverSpace = clamp(nearest / 0.28);
  const base =
    (getAttr(passer, "passaggi") / 99) * 0.30 +
    (getAttr(passer, "visione") / 99) * 0.20 +
    (getAttr(passer, "tecnica") / 99) * 0.10 +
    (getAttr(receiver, "primoControllo") / 99) * 0.15 +
    (getAttr(receiver, "decisioni") / 99) * 0.10 +
    receiverSpace * 0.10 +
    clamp(1 - Math.max(0, d - 0.10) / 0.70) * 0.05;
  return clamp((0.42 + base * 0.53) * (1 - pressure(state, passer) * 0.25));
}

function executePass(state, player, decision, rng, emitEvent) {
  const receiver = choosePassTarget(state, player, decision, rng);
  if (!receiver) return { executed: false, result: "no_target" };
  const probability = passProbability(state, player, receiver);
  const ai = decisionProbability(decision);
  const finalProbability = clamp(probability * (ai == null ? 1 : 0.75 + ai * 0.25));
  const roll = rng01(rng);
  const from = playerPosition(player);
  const to = playerPosition(receiver);

  emit(emitEvent, "PASS", { playerId: player.id, passerId: player.id, receiverId: receiver.id, from, to, probability: finalProbability, roll, completed: roll <= finalProbability }, player.id);

  if (roll <= finalProbability) {
    setPossession(state, getPlayerSide(state, receiver), receiver.id, { silent: true });
    state.ball.lastPasserId = player.id;
    state.ball.lastReceiverId = receiver.id;
    emit(emitEvent, "PASS_COMPLETED", { passerId: player.id, receiverId: receiver.id, playerId: receiver.id, probability: finalProbability, distance: distance(from, to) }, player.id);
    emit(emitEvent, "POSSESSION_WON", { side: getPlayerSide(state, receiver), playerId: receiver.id, reason: "pass_received" }, player.id);
    return { executed: true, result: "completed", receiver, probability: finalProbability };
  }

  let interceptor = null;
  let best = Infinity;
  for (const o of opponents(state, getPlayerSide(state, player))) {
    const d = distance(to, playerPosition(o));
    if (d < best) { best = d; interceptor = o; }
  }
  if (interceptor && best <= 0.075) {
    setPossession(state, getPlayerSide(state, interceptor), interceptor.id, { silent: true });
    emit(emitEvent, "PASS_INTERCEPTED", { passerId: player.id, receiverId: receiver.id, interceptorId: interceptor.id, probability: finalProbability, roll }, interceptor.id);
    emit(emitEvent, "POSSESSION_WON", { side: getPlayerSide(state, interceptor), playerId: interceptor.id, reason: "interception" }, interceptor.id);
    return { executed: true, result: "intercepted", interceptor, probability: finalProbability };
  }

  const loose = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  clearPossession(state, { contested: false });
  setBallPosition(state, loose);
  state.ball.state = "loose";
  emit(emitEvent, "PASS_FAILED", { passerId: player.id, receiverId: receiver.id, probability: finalProbability, roll, x: loose.x, y: loose.y }, player.id);

  // The referee resolves the loose-ball situation instead of leaving a
  // stale team possession behind. This is deterministic for the same seed.
  const referee = getReferee(state, rng);
  const ruling = referee.decideLooseBall(state, { reason: "pass_failed" });
  emit(emitEvent, "REFEREE_DECISION", { decision: ruling.type, reason: ruling.reason, playerId: ruling.playerId ?? null, side: ruling.side ?? null, confidence: ruling.confidence ?? null }, ruling.playerId ?? player.id);
  if (ruling.type === "POSSESSION") {
    setPossession(state, ruling.side, ruling.playerId, { silent: true });
    emit(emitEvent, "POSSESSION_WON", { side: ruling.side, playerId: ruling.playerId, reason: "referee_loose_ball" }, ruling.playerId);
    return { executed: true, result: "failed_recovered", probability: finalProbability, ruling };
  }
  return { executed: true, result: "failed", probability: finalProbability, ruling };
}

function dribbleProbability(state, player) {
  const base =
    (getAttr(player, "dribbling") / 99) * 0.35 +
    (getAttr(player, "primoControllo") / 99) * 0.15 +
    (getAttr(player, "tecnica") / 99) * 0.20 +
    (getAttr(player, "agilita") / 99) * 0.20 +
    (1 - pressure(state, player)) * 0.10;
  return clamp(0.35 + base * 0.55);
}

function executeDribble(state, player, decision, rng, emitEvent) {
  const ai = decisionProbability(decision);
  const probability = clamp(dribbleProbability(state, player) * (ai == null ? 1 : 0.80 + ai * 0.20));
  const roll = rng01(rng);
  const start = playerPosition(player);
  const opponent = opponents(state, getPlayerSide(state, player)).sort((a, b) => distance(start, playerPosition(a)) - distance(start, playerPosition(b)))[0] || null;
  if (roll <= probability) {
    const direction = getPlayerSide(state, player) === "home" ? 1 : -1;
    const quality = (getAttr(player, "accelerazione") + getAttr(player, "velocita") + getAttr(player, "dribbling")) / (99 * 3);
    const target = { x: clamp(start.x + direction * (0.015 + quality * 0.045) * (1 - pressure(state, player) * 0.55)), y: clamp(start.y + (rng01(rng) - 0.5) * 0.03) };
    player.targetPosition = target;
    setBallPosition(state, target);
    emit(emitEvent, "DRIBBLE", { playerId: player.id, from: start, to: target, probability, roll, successful: true }, player.id);
    return { executed: true, result: "completed" };
  }
  if (opponent) {
    // The referee still evaluates the contact outcome in the future tackle
    // layer; for a pure failed dribble the nearest opponent wins the ball.
    setPossession(state, getPlayerSide(state, opponent), opponent.id, { silent: true });
    emit(emitEvent, "DRIBBLE_FAILED", { playerId: player.id, opponentId: opponent.id, probability, roll }, opponent.id);
    emit(emitEvent, "POSSESSION_WON", { side: getPlayerSide(state, opponent), playerId: opponent.id, reason: "dribble_failed" }, opponent.id);
    return { executed: true, result: "lost" };
  }
  clearPossession(state, { contested: false });
  emit(emitEvent, "DRIBBLE_FAILED", { playerId: player.id, probability, roll, looseBall: true }, player.id);
  const referee = getReferee(state, rng);
  const ruling = referee.decideLooseBall(state, { reason: "dribble_failed" });
  emit(emitEvent, "REFEREE_DECISION", { decision: ruling.type, reason: ruling.reason, playerId: ruling.playerId ?? null, side: ruling.side ?? null }, player.id);
  if (ruling.type === "POSSESSION") {
    setPossession(state, ruling.side, ruling.playerId, { silent: true });
    emit(emitEvent, "POSSESSION_WON", { side: ruling.side, playerId: ruling.playerId, reason: "referee_loose_ball" }, ruling.playerId);
    return { executed: true, result: "lost_recovered", ruling };
  }
  return { executed: true, result: "loose", ruling };
}

function executeCarry(state, player, rng, emitEvent) {
  const start = playerPosition(player);
  const direction = getPlayerSide(state, player) === "home" ? 1 : -1;
  const quality = (getAttr(player, "accelerazione") + getAttr(player, "velocita") + getAttr(player, "dribbling")) / (99 * 3);
  const d = (0.015 + quality * 0.045) * (1 - pressure(state, player) * 0.55);
  const target = { x: clamp(start.x + direction * d), y: clamp(start.y + (rng01(rng) - 0.5) * 0.02) };
  player.targetPosition = target;
  setBallPosition(state, target);
  emit(emitEvent, "CARRY", { playerId: player.id, from: start, to: target, distance: d }, player.id);
  return { executed: true, result: "completed" };
}

function isKeeper(player) {
  const text = String(player?.positionGroup || player?.position || player?.role || "").toLowerCase();
  return player?.isGoalkeeper === true || player?.goalkeeper === true || text.includes("port");
}

function executeShoot(state, player, decision, rng, emitEvent) {
  const side = getPlayerSide(state, player);
  const opponentsList = opponents(state, side);
  const keeper = opponentsList.find(isKeeper) || null;
  const pos = playerPosition(player);
  const goalX = side === "home" ? 1 : 0;
  const distanceToGoal = Math.hypot(goalX - pos.x, 0.5 - pos.y);
  const shooting = getAttr(player, "tiro") / 99;
  const finishing = getAttr(player, "finalizzazione") / 99;
  const longShots = getAttr(player, "tiriDaLontano") / 99;
  const technique = getAttr(player, "tecnica") / 99;
  const probability = clamp(0.10 + shooting * 0.20 + finishing * 0.25 + longShots * 0.15 + technique * 0.10 + (1 - clamp(distanceToGoal / 0.85)) * 0.20);
  const roll = rng01(rng);

  emit(emitEvent, "SHOT", { playerId: player.id, x: pos.x, y: pos.y, distanceToGoal, probability, roll, direction: side === "home" ? 1 : -1 }, player.id);

  if (roll > probability) {
    emit(emitEvent, "SHOT_MISSED", { playerId: player.id, probability, roll }, player.id);

    // A missed shot that goes out is not an indefinite loose ball:
    // the referee awards a goal kick to the defending team.
    clearPossession(state, { contested: false });
    setBallPosition(state, pos);
    state.ball.state = "goal_kick";

    const referee = getReferee(state, rng);
    const ruling = referee.decideMissedShot(state, { attackingSide: side });
    emit(emitEvent, "REFEREE_DECISION", { decision: ruling.type, restart: ruling.restart ?? null, side: ruling.side ?? null, playerId: ruling.playerId ?? null, reason: ruling.reason }, player.id);

    if (ruling.type === "RESTART" && ruling.playerId) {
      setPossession(state, ruling.side, ruling.playerId, { silent: true });
      setBallPosition(state, playerPosition(getPlayerById(state, ruling.playerId)));
      state.ball.state = "goal_kick";
      emit(emitEvent, "GOAL_KICK", { side: ruling.side, playerId: ruling.playerId, reason: ruling.reason }, ruling.playerId);
    }
    return { executed: true, result: "miss", ruling };
  }

  const goalkeeperQuality = keeper ? (getAttr(keeper, "riflessi") + getAttr(keeper, "posizionamento") + getAttr(keeper, "unoControUno")) / (99 * 3) : 0.50;
  const goalChance = clamp(0.12 + probability * 0.45 - goalkeeperQuality * 0.20);
  const goalRoll = rng01(rng);

  if (goalRoll <= goalChance) {
    applyGoal(state, side, player, rng, emitEvent, goalChance, goalRoll);
    return { executed: true, result: "goal" };
  }

  emit(emitEvent, "SHOT_SAVED", { playerId: player.id, goalkeeperId: keeper?.id || null, probability: goalChance, roll: goalRoll }, keeper?.id || player.id);
  if (keeper && active(keeper)) {
    setPossession(state, getPlayerSide(state, keeper), keeper.id, { silent: true });
    setBallPosition(state, playerPosition(keeper));
  } else {
    clearPossession(state, { contested: true });
  }
  return { executed: true, result: "saved" };
}

function chooseKickoffPlayer(state, side) {
  const candidates = getTeamPlayers(state, side).filter(active);
  if (!candidates.length) return null;
  return candidates.slice().sort((a, b) => distance(playerPosition(a), { x: 0.5, y: 0.5 }) - distance(playerPosition(b), { x: 0.5, y: 0.5 }))[0];
}

function resetAfterGoal(state, scoringSide, rng, emitEvent, scorer) {
  const restartSide = scoringSide === "home" ? "away" : "home";
  const kickoffPlayer = chooseKickoffPlayer(state, restartSide);
  const center = { x: 0.5, y: 0.5 };

  if (state.score) state.score[scoringSide] = num(state.score[scoringSide], 0) + 1;
  const scoringTeam = state.teams?.[scoringSide];
  if (scoringTeam?.matchStats) scoringTeam.matchStats.goals = num(scoringTeam.matchStats.goals, 0) + 1;
  if (scorer?.matchStats) scorer.matchStats.goals = num(scorer.matchStats.goals, 0) + 1;
  if (scorer) {
    scorer.goals = num(scorer.goals, 0) + 1;
    scorer.matchState = scorer.matchState || {};
    scorer.matchState.lastGoalMinute = state.clock?.minute ?? null;
  }

  if (kickoffPlayer) {
    kickoffPlayer.position = center;
    kickoffPlayer.actualPosition = center;
    kickoffPlayer.targetPosition = center;
    kickoffPlayer.matchState = kickoffPlayer.matchState || {};
    kickoffPlayer.matchState.actualPosition = center;
    kickoffPlayer.matchState.targetPosition = center;
  }

  if (state.ball) {
    state.ball.x = center.x;
    state.ball.y = center.y;
    state.ball.position = center;
    state.ball.targetX = center.x;
    state.ball.targetY = center.y;
    state.ball.velocityX = 0;
    state.ball.velocityY = 0;
    state.ball.height = 0;
    state.ball.state = "kickoff";
    state.ball.lastTouchPlayerId = scorer?.id || null;
  }

  state._possessionCooldowns = {};
  state._contestedSince = null;
  state._lastPossessionChangeTime = now(state);

  if (kickoffPlayer) {
    setPossession(state, restartSide, kickoffPlayer.id, { silent: true });
    // setPossession attaches the ball to the player; put it back on the center spot.
    setBallPosition(state, center);
    state.ball.state = "kickoff";
    state.ball.ownerId = kickoffPlayer.id;
    state.ball.ownerSide = restartSide;
  } else {
    clearPossession(state, { contested: false });
    setBallPosition(state, center);
    state.possession = restartSide;
    state.possessionSide = restartSide;
    state.possessionPlayerId = null;
    state.ball.state = "kickoff";
  }

  state.phase = "kickoff";
  state.matchStatus = state.matchStatus || {};
  state.matchStatus.lastGoalSide = scoringSide;
  state.matchStatus.lastGoalPlayerId = scorer?.id || null;
  state.matchStatus.kickoffSide = restartSide;

  emit(emitEvent, "KICKOFF", {
    side: restartSide,
    playerId: kickoffPlayer?.id || null,
    score: { home: num(state.score?.home), away: num(state.score?.away) },
    reason: "after_goal",
  }, kickoffPlayer?.id || null);
}

function applyGoal(state, side, scorer, rng, emitEvent, probability, roll) {
  // Score is part of the simulation state, not only the UI.
  // Update it BEFORE emitting GOAL so every listener sees the new result.
  if (state.score) state.score[side] = num(state.score[side], 0) + 1;
  const team = state.teams?.[side];
  if (team?.matchStats) team.matchStats.goals = num(team.matchStats.goals, 0) + 1;
  if (scorer?.matchStats) scorer.matchStats.goals = num(scorer.matchStats.goals, 0) + 1;
  scorer.goals = num(scorer.goals, 0) + 1;

  emit(emitEvent, "GOAL", {
    playerId: scorer.id,
    scorerId: scorer.id,
    side,
    probability,
    roll,
    score: { home: num(state.score?.home), away: num(state.score?.away) },
  }, scorer.id);

  // resetAfterGoal must not increment the score a second time.
  const restartSide = side === "home" ? "away" : "home";
  const kickoffPlayer = chooseKickoffPlayer(state, restartSide);
  const center = { x: 0.5, y: 0.5 };

  if (kickoffPlayer) {
    kickoffPlayer.position = { ...center };
    kickoffPlayer.actualPosition = { ...center };
    kickoffPlayer.targetPosition = { ...center };
    kickoffPlayer.matchState = kickoffPlayer.matchState || {};
    kickoffPlayer.matchState.actualPosition = { ...center };
    kickoffPlayer.matchState.targetPosition = { ...center };
  }

  state._possessionCooldowns = {};
  state._contestedSince = null;
  state.phase = "kickoff";
  state.matchStatus = state.matchStatus || {};
  state.matchStatus.lastGoalSide = side;
  state.matchStatus.lastGoalPlayerId = scorer.id;
  state.matchStatus.kickoffSide = restartSide;

  if (kickoffPlayer) {
    setPossession(state, restartSide, kickoffPlayer.id, { silent: true });
    setBallPosition(state, center);
    state.ball.state = "kickoff";
  } else {
    clearPossession(state, { contested: false });
    state.possession = restartSide;
    state.possessionSide = restartSide;
    setBallPosition(state, center);
    state.ball.state = "kickoff";
  }

  emit(emitEvent, "KICKOFF", {
    side: restartSide,
    playerId: kickoffPlayer?.id || null,
    score: { home: num(state.score?.home), away: num(state.score?.away) },
    reason: "after_goal",
  }, kickoffPlayer?.id || null);
}

function recoverLooseBall(state, rng, emitEvent) {
  const referee = getReferee(state, rng);
  const ruling = referee.decideLooseBall(state, { reason: "loose_ball_recovery" });
  emit(emitEvent, "REFEREE_DECISION", { decision: ruling.type, reason: ruling.reason, playerId: ruling.playerId ?? null, side: ruling.side ?? null, confidence: ruling.confidence ?? null }, ruling.playerId ?? null);
  if (ruling.type !== "POSSESSION") return null;

  setPossession(state, ruling.side, ruling.playerId, { silent: true });
  emit(emitEvent, "POSSESSION_WON", { side: ruling.side, playerId: ruling.playerId, reason: "referee_loose_ball_recovery" }, ruling.playerId);
  return getPlayerById(state, ruling.playerId);
}

function normalizeRuntimeState(state) {
  if (!state.ball) state.ball = {};
  ballPosition(state);
  for (const player of getAllPlayers(state)) {
    const pos = playerPosition(player);
    player.position = pos;
    player.actualPosition = pos;
    player.targetPosition = normalizePosition(player.targetPosition || pos);
    player.matchState = player.matchState || {};
    player.matchState.actualPosition = player.actualPosition;
    player.matchState.targetPosition = player.targetPosition;
    player.matchState.onPitch = player.onPitch !== false;
  }
}

function cooldownUntil(state, playerId) {
  return num(state?._possessionCooldowns?.[String(playerId)], 0);
}

function onCooldown(state, playerId) {
  return cooldownUntil(state, playerId) > now(state);
}

function setCooldown(state, playerId, seconds) {
  state._possessionCooldowns = state._possessionCooldowns || {};
  state._possessionCooldowns[String(playerId)] = now(state) + seconds;
}

function executeAction(state, player, decision, rng, emitEvent) {
  switch (decisionAction(decision)) {
    case ACTIONS.PASS: return executePass(state, player, decision, rng, emitEvent);
    case ACTIONS.DRIBBLE: return executeDribble(state, player, decision, rng, emitEvent);
    case ACTIONS.CARRY: return executeCarry(state, player, rng, emitEvent);
    case ACTIONS.SHOOT: return executeShoot(state, player, decision, rng, emitEvent);
    case ACTIONS.HOLD:
    case ACTIONS.MOVE:
    case ACTIONS.SUPPORT:
    case ACTIONS.NONE:
    default:
      setBallPosition(state, playerPosition(player));
      emit(emitEvent, "HOLD_BALL", { playerId: player.id, pressure: pressure(state, player) }, player.id);
      return { executed: true, result: "held" };
  }
}

function processPossession({ state, rng, emitEvent, decisions = {}, spatialGrid = null, tacticalInstructions = null }) {
  if (!state) return null;
  normalizeRuntimeState(state);

  if (state.ball?.ownerId) {
    const owner = getPlayerById(state, state.ball.ownerId);
    if (owner && active(owner)) syncOwnerFromState(state, emitEvent);
    else clearPossession(state, { contested: true });
  }

  if (!state.ball?.ownerId && (state.possession === POSSESSION.NONE || state.possession === POSSESSION.CONTESTED)) {
    recoverLooseBall(state, rng, emitEvent);
  }

  const owner = state.ball?.ownerId ? getPlayerById(state, state.ball.ownerId) : null;
  if (!owner || !active(owner)) return null;
  const side = getPlayerSide(state, owner);
  if (!side) return null;

  const decision = decisions[owner.id] || decisions[String(owner.id)] || owner.aiDecision || owner.matchState?.decision || owner.currentDecision || null;
  if (!decision) {
    setBallPosition(state, playerPosition(owner));
    return { playerId: owner.id, side, action: ACTIONS.HOLD, executed: false, reason: "no_decision" };
  }

  let effective = decision;
  const allowed = tacticalInstructions?.allowedActions || tacticalInstructions?.actions;
  if (Array.isArray(allowed) && allowed.length && !allowed.includes(decisionAction(decision))) effective = { ...decision, action: ACTIONS.HOLD };

  const action = decisionAction(effective);
  if (onCooldown(state, owner.id) || [ACTIONS.NONE, ACTIONS.MOVE, ACTIONS.SUPPORT, ACTIONS.PRESS].includes(action)) {
    setBallPosition(state, playerPosition(owner));
    return { playerId: owner.id, side, action, executed: false, reason: "cooldown_or_non_execution" };
  }

  const result = executeAction(state, owner, effective, rng, emitEvent);
  setCooldown(state, owner.id, action === ACTIONS.PASS ? PASS_COOLDOWN_SECONDS : ACTION_COOLDOWN_SECONDS);

  if (state.ball?.ownerId) syncOwnerFromState(state, emitEvent);
  return { playerId: owner.id, side, action, pressure: pressure(state, owner), result };
}

export {
  POSSESSION,
  ACTIONS,
  setPossession,
  clearPossession,
  processPossession,
  syncOwnerFromState,
  getPlayerSide,
};

export default {
  POSSESSION,
  ACTIONS,
  setPossession,
  clearPossession,
  processPossession,
  syncOwnerFromState,
  getPlayerSide,
};

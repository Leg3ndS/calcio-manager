// src/engine/possession/possessionSystem.js
//
// Possession / action execution layer.
// The Match Engine owns the simulation clock.
// The Utility AI decides WHAT the player wants to do.
// This system executes that decision and keeps:
//   - ball owner
//   - player.hasBall
//   - state.possession
//   - pass/interception events
// coherent.
//
// IMPORTANT:
// Coordinates are normalized to 0..1 at runtime.

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

const TEAM_KEYS = {
  home: "home",
  away: "away",
};

const PASS_COOLDOWN_SECONDS = 0.35;
const ACTION_COOLDOWN_SECONDS = 0.15;
const CONTESTED_MAX_SECONDS = 0.80;

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function safeNumber(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function normalizeCoordinate(value) {
  const n = safeNumber(value, 0);

  // Defensive compatibility with old 0..100 coordinates.
  if (Math.abs(n) > 1) {
    return clamp(n / 100);
  }

  return clamp(n);
}

function normalizePosition(position) {
  if (!position) {
    return { x: 0.5, y: 0.5 };
  }

  return {
    x: normalizeCoordinate(position.x),
    y: normalizeCoordinate(position.y),
  };
}

function distance(a, b) {
  if (!a || !b) return 1;

  const dx = safeNumber(a.x) - safeNumber(b.x);
  const dy = safeNumber(a.y) - safeNumber(b.y);

  return Math.sqrt(dx * dx + dy * dy);
}

function getTeamPlayers(state, side) {
  if (!state || !side) return [];

  const team = state.teams?.[side];

  if (team?.players && Array.isArray(team.players)) {
    return team.players;
  }

  if (Array.isArray(team)) {
    return team;
  }

  if (Array.isArray(state.players)) {
    return state.players.filter((player) => getPlayerSide(state, player) === side);
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
  if (!playerId) return null;

  const players = getAllPlayers(state);

  return (
    players.find((player) => String(player.id) === String(playerId)) ||
    null
  );
}

function getPlayerSide(state, player) {
  if (!player) return null;

  if (
    player.side === POSSESSION.HOME ||
    player.team === POSSESSION.HOME
  ) {
    return POSSESSION.HOME;
  }

  if (
    player.side === POSSESSION.AWAY ||
    player.team === POSSESSION.AWAY
  ) {
    return POSSESSION.AWAY;
  }

  const homePlayers = getTeamPlayers(state, POSSESSION.HOME);

  if (
    homePlayers.some(
      (p) => String(p.id) === String(player.id)
    )
  ) {
    return POSSESSION.HOME;
  }

  const awayPlayers = getTeamPlayers(state, POSSESSION.AWAY);

  if (
    awayPlayers.some(
      (p) => String(p.id) === String(player.id)
    )
  ) {
    return POSSESSION.AWAY;
  }

  return null;
}

function isPlayerActive(player) {
  if (!player) return false;

  if (player.onPitch === false) return false;
  if (player.matchState?.onPitch === false) return false;
  if (player.sentOff === true) return false;
  if (player.redCard === true) return false;
  if (player.matchState?.redCard === true) return false;
  if (player.injured === true && player.matchState?.onPitch === false) {
    return false;
  }

  return true;
}

function getPlayerPosition(player) {
  return normalizePosition(
    player?.actualPosition ||
      player?.position ||
      player?.matchState?.actualPosition ||
      player?.matchState?.position ||
      player?.targetPosition
  );
}

function getBallPosition(state) {
  if (!state.ball) {
    state.ball = {};
  }

  const position = normalizePosition(
    state.ball.position || {
      x: state.ball.x,
      y: state.ball.y,
    }
  );

  state.ball.position = position;
  state.ball.x = position.x;
  state.ball.y = position.y;

  return position;
}

function setBallPosition(state, position) {
  if (!state.ball) {
    state.ball = {};
  }

  const normalized = normalizePosition(position);

  state.ball.position = normalized;
  state.ball.x = normalized.x;
  state.ball.y = normalized.y;
}

function getCurrentTime(state) {
  if (Number.isFinite(state?.clock?.totalSeconds)) {
    return state.clock.totalSeconds;
  }

  return safeNumber(state?.timeSeconds, 0);
}

function getAttribute(player, attribute, fallback = 50) {
  if (!player) return fallback;

  const groups = [
    player.attributes,
    player.stats,
    player.technical,
    player.mental,
    player.physical,
    player.goalkeeper,
  ];

  for (const group of groups) {
    if (!group || typeof group !== "object") continue;

    if (Number.isFinite(Number(group[attribute]))) {
      return clamp(Number(group[attribute]) / 99) * 99;
    }

    // Compatibility aliases.
    const aliases = {
      controllo: "primoControllo",
      firstTouch: "primoControllo",
      dribbling: "dribbling",
      passing: "passaggi",
      pass: "passaggi",
      technique: "tecnica",
      finishing: "finalizzazione",
      shooting: "tiro",
      longShots: "tiriDaLontano",
      vision: "visione",
      decisions: "decisioni",
      anticipation: "anticipazione",
      composure: "freddezza",
      positioning: "posizionamento",
      offBall: "movimentoSenzaPalla",
      teamwork: "giocoDiSquadra",
      acceleration: "accelerazione",
      pace: "velocita",
      speed: "velocita",
      agility: "agilita",
      strength: "forza",
      stamina: "resistenza",
      reactions: "reattivita",
      tackling: "contrasti",
      marking: "marcatura",
      heading: "colpiDiTesta",
      crossing: "cross",
      ballControl: "primoControllo",
    };

    const mapped = aliases[attribute];

    if (mapped && Number.isFinite(Number(group[mapped]))) {
      return Number(group[mapped]);
    }
  }

  // Some player models may store attributes in a completely flat object.
  if (Number.isFinite(Number(player[attribute]))) {
    return Number(player[attribute]);
  }

  return fallback;
}

function random01(rng) {
  if (typeof rng === "function") {
    const value = Number(rng());
    if (Number.isFinite(value)) {
      return clamp(value);
    }
  }

  if (rng && typeof rng.next === "function") {
    const value = Number(rng.next());
    if (Number.isFinite(value)) {
      return clamp(value);
    }
  }

  return Math.random();
}

function randomRange(rng, min, max) {
  return min + (max - min) * random01(rng);
}

function weightedRandom(items, rng) {
  if (!items.length) return null;

  const total = items.reduce(
    (sum, item) => sum + Math.max(0, safeNumber(item.weight)),
    0
  );

  if (total <= 0) {
    return items[Math.floor(random01(rng) * items.length)];
  }

  let cursor = random01(rng) * total;

  for (const item of items) {
    cursor -= Math.max(0, safeNumber(item.weight));

    if (cursor <= 0) {
      return item;
    }
  }

  return items[items.length - 1];
}

function getOpponents(state, side) {
  const opponentSide =
    side === POSSESSION.HOME
      ? POSSESSION.AWAY
      : POSSESSION.HOME;

  return getTeamPlayers(state, opponentSide).filter(isPlayerActive);
}

function getTeammates(state, side) {
  return getTeamPlayers(state, side).filter(isPlayerActive);
}

function getNearestOpponent(state, player) {
  const side = getPlayerSide(state, player);
  const opponents = getOpponents(state, side);

  if (!opponents.length) return null;

  const playerPos = getPlayerPosition(player);

  let nearest = null;
  let nearestDistance = Infinity;

  for (const opponent of opponents) {
    const d = distance(
      playerPos,
      getPlayerPosition(opponent)
    );

    if (d < nearestDistance) {
      nearestDistance = d;
      nearest = opponent;
    }
  }

  return nearest;
}

function calculatePressure(state, player) {
  const opponents = getOpponents(
    state,
    getPlayerSide(state, player)
  );

  if (!opponents.length) return 0;

  const playerPos = getPlayerPosition(player);

  let nearestDistance = Infinity;

  for (const opponent of opponents) {
    const d = distance(
      playerPos,
      getPlayerPosition(opponent)
    );

    nearestDistance = Math.min(nearestDistance, d);
  }

  // Roughly:
  // < 0.05 = extreme pressure
  // 0.20+ = relatively free
  return clamp(1 - nearestDistance / 0.22);
}

function calculateSpace(state, player) {
  const opponents = getOpponents(
    state,
    getPlayerSide(state, player)
  );

  if (!opponents.length) return 1;

  const playerPos = getPlayerPosition(player);

  let nearestDistance = Infinity;

  for (const opponent of opponents) {
    nearestDistance = Math.min(
      nearestDistance,
      distance(
        playerPos,
        getPlayerPosition(opponent)
      )
    );
  }

  return clamp(nearestDistance / 0.30);
}

function getDecisionAction(decision) {
  if (!decision) return ACTIONS.HOLD;

  const action =
    decision.action ||
    decision.intent ||
    decision.type ||
    decision.choice;

  if (!action) return ACTIONS.HOLD;

  return String(action).toLowerCase();
}

function getDecisionTargetId(decision) {
  if (!decision) return null;

  return (
    decision.targetPlayerId ||
    decision.receiverId ||
    decision.targetId ||
    decision.target?.playerId ||
    null
  );
}

function getDecisionScore(decision) {
  if (!decision) return 0.5;

  if (Number.isFinite(Number(decision.score))) {
    return clamp(Number(decision.score));
  }

  if (Number.isFinite(Number(decision.utility))) {
    return clamp(Number(decision.utility));
  }

  if (Number.isFinite(Number(decision.value))) {
    return clamp(Number(decision.value));
  }

  return 0.5;
}

function getDecisionProbability(decision) {
  if (!decision) return null;

  const candidates = [
    decision.probability,
    decision.successProbability,
    decision.successChance,
    decision.executionProbability,
  ];

  for (const value of candidates) {
    if (Number.isFinite(Number(value))) {
      return clamp(Number(value));
    }
  }

  return null;
}

function selectPassTarget(
  state,
  player,
  decision,
  spatialGrid,
  rng
) {
  const side = getPlayerSide(state, player);

  if (!side) return null;

  const teammates = getTeammates(state, side).filter(
    (teammate) =>
      String(teammate.id) !== String(player.id)
  );

  if (!teammates.length) return null;

  const explicitTargetId = getDecisionTargetId(decision);

  if (explicitTargetId) {
    const explicitTarget = teammates.find(
      (teammate) =>
        String(teammate.id) === String(explicitTargetId)
    );

    if (explicitTarget) {
      return explicitTarget;
    }
  }

  const opponents = getOpponents(state, side);
  const playerPos = getPlayerPosition(player);

  const candidates = [];

  for (const teammate of teammates) {
    const teammatePos = getPlayerPosition(teammate);

    const passDistance = distance(
      playerPos,
      teammatePos
    );

    // Ignore absurdly distant targets.
    if (passDistance > 0.80) continue;

    let nearestOpponentDistance = 1;

    for (const opponent of opponents) {
      nearestOpponentDistance = Math.min(
        nearestOpponentDistance,
        distance(
          teammatePos,
          getPlayerPosition(opponent)
        )
      );
    }

    const receiverSpace = clamp(
      nearestOpponentDistance / 0.28
    );

    const passing = getAttribute(
      player,
      "passaggi",
      50
    );

    const vision = getAttribute(
      player,
      "visione",
      50
    );

    const technique = getAttribute(
      player,
      "tecnica",
      50
    );

    const receiverDecision = getAttribute(
      teammate,
      "decisioni",
      50
    );

    const teamwork = getAttribute(
      teammate,
      "giocoDiSquadra",
      50
    );

    const distancePenalty = clamp(
      1 - Math.max(0, passDistance - 0.18) / 0.60
    );

    const spaceValue =
      receiverSpace * 0.55 +
      (receiverDecision / 99) * 0.20 +
      (teamwork / 99) * 0.25;

    const technicalQuality =
      (passing / 99) * 0.45 +
      (vision / 99) * 0.35 +
      (technique / 99) * 0.20;

    const weight =
      Math.max(
        0.01,
        distancePenalty *
          (0.35 + spaceValue * 0.65) *
          (0.45 + technicalQuality * 0.55)
      );

    candidates.push({
      player: teammate,
      weight,
    });
  }

  const selected = weightedRandom(
    candidates,
    rng
  );

  return selected?.player || null;
}

function calculatePassProbability(
  state,
  passer,
  receiver
) {
  if (!passer || !receiver) return 0;

  const side = getPlayerSide(state, passer);
  const opponents = getOpponents(state, side);

  const passerPos = getPlayerPosition(passer);
  const receiverPos = getPlayerPosition(receiver);

  const passDistance = distance(
    passerPos,
    receiverPos
  );

  let nearestOpponentToReceiver = 1;

  for (const opponent of opponents) {
    nearestOpponentToReceiver = Math.min(
      nearestOpponentToReceiver,
      distance(
        receiverPos,
        getPlayerPosition(opponent)
      )
    );
  }

  const receiverSpace = clamp(
    nearestOpponentToReceiver / 0.28
  );

  const passing =
    getAttribute(passer, "passaggi", 50) / 99;

  const vision =
    getAttribute(passer, "visione", 50) / 99;

  const technique =
    getAttribute(passer, "tecnica", 50) / 99;

  const firstTouch =
    getAttribute(receiver, "primoControllo", 50) / 99;

  const decisions =
    getAttribute(receiver, "decisioni", 50) / 99;

  const pressure = calculatePressure(
    state,
    passer
  );

  const distanceQuality = clamp(
    1 - Math.max(0, passDistance - 0.10) / 0.70
  );

  const base =
    passing * 0.30 +
    vision * 0.20 +
    technique * 0.10 +
    firstTouch * 0.15 +
    decisions * 0.10 +
    receiverSpace * 0.10 +
    distanceQuality * 0.05;

  // Pressure doesn't kill every pass, but reduces execution quality.
  const pressureModifier =
    1 - pressure * 0.25;

  return clamp(
    0.42 + base * 0.53
      ? (0.42 + base * 0.53) * pressureModifier
      : 0.60
  );
}

function calculateDribbleProbability(
  state,
  player
) {
  const dribbling =
    getAttribute(player, "dribbling", 50) / 99;

  const firstTouch =
    getAttribute(player, "primoControllo", 50) / 99;

  const technique =
    getAttribute(player, "tecnica", 50) / 99;

  const agility =
    getAttribute(player, "agilita", 50) / 99;

  const pressure = calculatePressure(
    state,
    player
  );

  const base =
    dribbling * 0.35 +
    firstTouch * 0.15 +
    technique * 0.20 +
    agility * 0.20 +
    (1 - pressure) * 0.10;

  return clamp(0.35 + base * 0.55);
}

function calculateCarryDistance(
  state,
  player,
  rng
) {
  const acceleration =
    getAttribute(player, "accelerazione", 50) / 99;

  const speed =
    getAttribute(player, "velocita", 50) / 99;

  const dribbling =
    getAttribute(player, "dribbling", 50) / 99;

  const pressure = calculatePressure(
    state,
    player
  );

  const quality =
    acceleration * 0.30 +
    speed * 0.30 +
    dribbling * 0.40;

  const baseDistance =
    0.015 +
    quality * 0.045;

  const pressureModifier =
    1 - pressure * 0.55;

  return clamp(
    baseDistance *
      pressureModifier *
      randomRange(rng, 0.75, 1.25),
    0.005,
    0.08
  );
}

function moveBallTowards(
  state,
  targetPosition,
  amount
) {
  const current = getBallPosition(state);
  const target = normalizePosition(targetPosition);

  const t = clamp(amount);

  setBallPosition(state, {
    x: current.x + (target.x - current.x) * t,
    y: current.y + (target.y - current.y) * t,
  });
}

function emit(
  emitEvent,
  type,
  payload = {},
  causedBy = null
) {
  if (typeof emitEvent !== "function") {
    return;
  }

  // The current Match Engine accepts this object format.
  emitEvent({
    type,
    payload,
    causedBy,
  });
}

function getCooldown(state, playerId) {
  const map = state._possessionCooldowns;

  if (!map || !playerId) return 0;

  return safeNumber(
    map[String(playerId)],
    0
  );
}

function setCooldown(
  state,
  playerId,
  seconds
) {
  if (!state._possessionCooldowns) {
    state._possessionCooldowns = {};
  }

  state._possessionCooldowns[String(playerId)] =
    getCurrentTime(state) + seconds;
}

function isOnCooldown(
  state,
  playerId
) {
  return getCooldown(state, playerId) >
    getCurrentTime(state);
}

function getLastPossessionChange(state) {
  return safeNumber(
    state._lastPossessionChangeTime,
    -Infinity
  );
}

function markPossessionChange(
  state,
  side,
  playerId
) {
  state._lastPossessionChangeTime =
    getCurrentTime(state);

  state._lastPossessionSide = side;
  state._lastPossessionPlayerId =
    playerId || null;
}

function setPossession(
  state,
  side,
  playerId,
  options = {}
) {
  if (!state) return false;

  const player =
    playerId
      ? getPlayerById(state, playerId)
      : null;

  if (
    player &&
    !isPlayerActive(player)
  ) {
    return false;
  }

  const resolvedSide =
    side === POSSESSION.HOME ||
    side === POSSESSION.AWAY
      ? side
      : player
        ? getPlayerSide(state, player)
        : POSSESSION.NONE;

  if (
    resolvedSide !== POSSESSION.HOME &&
    resolvedSide !== POSSESSION.AWAY
  ) {
    return false;
  }

  for (const p of getAllPlayers(state)) {
    p.hasBall = false;

    if (p.matchState) {
      p.matchState.hasBall = false;
    }
  }

  if (player) {
    player.hasBall = true;

    if (!player.matchState) {
      player.matchState = {};
    }

    player.matchState.hasBall = true;
    player.matchState.possessionSide =
      resolvedSide;
  }

  if (!state.ball) {
    state.ball = {};
  }

  state.ball.ownerId =
    player?.id ?? null;

  state.ball.ownerSide =
    resolvedSide;

  state.ball.state = "controlled";

  if (player) {
    setBallPosition(
      state,
      getPlayerPosition(player)
    );

    state.ball.lastTouchPlayerId =
      player.id;

    state.ball.lastTouchSide =
      resolvedSide;
  }

  state.possession =
    resolvedSide;

  state.possessionSide =
    resolvedSide;

  state.possessionPlayerId =
    player?.id ?? null;

  if (player) {
    markPossessionChange(
      state,
      resolvedSide,
      player.id
    );
  }

  if (!options.silent) {
    emit(
      options.emitEvent,
      "POSSESSION_WON",
      {
        side: resolvedSide,
        playerId: player?.id ?? null,
        reason: options.reason || "recovery",
      },
      options.causedBy || null
    );
  }

  return true;
}

function clearPossession(
  state,
  options = {}
) {
  if (!state) return;

  for (const player of getAllPlayers(state)) {
    player.hasBall = false;

    if (player.matchState) {
      player.matchState.hasBall = false;
    }
  }

  if (!state.ball) {
    state.ball = {};
  }

  state.ball.ownerId = null;
  state.ball.ownerSide =
    POSSESSION.NONE;
  state.ball.state =
    options.contested
      ? "contested"
      : "loose";

  state.possession =
    options.contested
      ? POSSESSION.CONTESTED
      : POSSESSION.NONE;

  state.possessionSide =
    POSSESSION.NONE;

  state.possessionPlayerId = null;

  if (options.contested) {
    state._contestedSince =
      getCurrentTime(state);
  } else {
    state._contestedSince = null;
  }
}

function syncOwnerFromState(
  state,
  emitEvent = null
) {
  if (!state?.ball?.ownerId) {
    return false;
  }

  const owner =
    getPlayerById(
      state,
      state.ball.ownerId
    );

  if (
    !owner ||
    !isPlayerActive(owner)
  ) {
    clearPossession(state, {
      contested: true,
    });

    return false;
  }

  const side =
    getPlayerSide(state, owner);

  if (
    side !== POSSESSION.HOME &&
    side !== POSSESSION.AWAY
  ) {
    clearPossession(state, {
      contested: true,
    });

    return false;
  }

  // CRITICAL BUG FIX:
  // A valid ball owner ALWAYS wins over a stale
  // "contested" state.
  const currentOwner =
    state.possessionPlayerId;

  const needsSync =
    state.possession !== side ||
    state.possessionSide !== side ||
    String(currentOwner) !== String(owner.id) ||
    owner.hasBall !== true;

  if (needsSync) {
    setPossession(
      state,
      side,
      owner.id,
      {
        silent: true,
        emitEvent,
        reason: "owner_sync",
      }
    );
  }

  setBallPosition(
    state,
    getPlayerPosition(owner)
  );

  return true;
}

function findInterceptor(
  state,
  passer,
  receiver,
  spatialGrid
) {
  if (!passer || !receiver) {
    return null;
  }

  const side =
    getPlayerSide(state, passer);

  const opponents =
    getOpponents(state, side);

  const receiverPos =
    getPlayerPosition(receiver);

  let best = null;
  let bestDistance = Infinity;

  let candidates = opponents;

  // Use spatial grid when available, but always
  // fall back to the full opponent list.
  if (
    spatialGrid &&
    typeof spatialGrid.getNearbyPlayers === "function"
  ) {
    try {
      const nearby =
        spatialGrid.getNearbyPlayers(
          receiverPos,
          0.20
        );

      if (Array.isArray(nearby) && nearby.length) {
        const nearbyIds =
          new Set(
            nearby.map((p) => String(p.id))
          );

        candidates =
          opponents.filter((p) =>
            nearbyIds.has(String(p.id))
          );

        if (!candidates.length) {
          candidates = opponents;
        }
      }
    } catch {
      candidates = opponents;
    }
  }

  for (const opponent of candidates) {
    const d = distance(
      receiverPos,
      getPlayerPosition(opponent)
    );

    if (d < bestDistance) {
      bestDistance = d;
      best = opponent;
    }
  }

  if (
    best &&
    bestDistance <= 0.075
  ) {
    return best;
  }

  return null;
}

function executePass(
  state,
  player,
  decision,
  rng,
  emitEvent,
  spatialGrid
) {
  const receiver =
    selectPassTarget(
      state,
      player,
      decision,
      spatialGrid,
      rng
    );

  if (!receiver) {
    return {
      executed: false,
      result: "no_target",
    };
  }

  const probability =
    calculatePassProbability(
      state,
      player,
      receiver
    );

  const decisionProbability =
    getDecisionProbability(decision);

  // AI probability is allowed to influence the execution,
  // but the actual pass probability remains attribute-driven.
  const aiFactor =
    decisionProbability === null
      ? 1
      : 0.75 + decisionProbability * 0.25;

  const finalProbability =
    clamp(
      probability * aiFactor
    );

  const roll =
    random01(rng);

  const passerId =
    player.id;

  const receiverId =
    receiver.id;

  const from =
    getPlayerPosition(player);

  const to =
    getPlayerPosition(receiver);

  emit(
    emitEvent,
    "PASS",
    {
      playerId: passerId,
      passerId,
      receiverId,
      from,
      to,
      probability: finalProbability,
      roll,
      completed: roll <= finalProbability,
    },
    passerId
  );

  if (roll <= finalProbability) {
    setBallPosition(
      state,
      to
    );

    setPossession(
      state,
      getPlayerSide(state, receiver),
      receiver.id,
      {
        silent: true,
      }
    );

    state.ball.lastPasserId =
      passerId;

    state.ball.lastReceiverId =
      receiverId;

    emit(
      emitEvent,
      "PASS_COMPLETED",
      {
        passerId,
        receiverId,
        playerId: receiverId,
        probability: finalProbability,
        distance: distance(from, to),
      },
      passerId
    );

    emit(
      emitEvent,
      "POSSESSION_WON",
      {
        side: getPlayerSide(
          state,
          receiver
        ),
        playerId: receiverId,
        reason: "pass_received",
      },
      passerId
    );

    return {
      executed: true,
      result: "completed",
      receiver,
      probability: finalProbability,
    };
  }

  const interceptor =
    findInterceptor(
      state,
      player,
      receiver,
      spatialGrid
    );

  if (interceptor) {
    setBallPosition(
      state,
      getPlayerPosition(interceptor)
    );

    setPossession(
      state,
      getPlayerSide(state, interceptor),
      interceptor.id,
      {
        silent: true,
      }
    );

    emit(
      emitEvent,
      "PASS_INTERCEPTED",
      {
        passerId,
        receiverId,
        interceptorId: interceptor.id,
        probability: finalProbability,
        roll,
      },
      interceptor.id
    );

    emit(
      emitEvent,
      "POSSESSION_WON",
      {
        side: getPlayerSide(
          state,
          interceptor
        ),
        playerId: interceptor.id,
        reason: "interception",
      },
      interceptor.id
    );

    return {
      executed: true,
      result: "intercepted",
      interceptor,
      probability: finalProbability,
    };
  }

  // Failed pass with no immediate interception:
  // ball becomes genuinely loose.
  const looseX =
    from.x + (to.x - from.x) * 0.5;

  const looseY =
    from.y + (to.y - from.y) * 0.5;

  clearPossession(state, {
    contested: true,
  });

  setBallPosition(state, {
    x: looseX,
    y: looseY,
  });

  emit(
    emitEvent,
    "PASS_FAILED",
    {
      passerId,
      receiverId,
      probability: finalProbability,
      roll,
      x: looseX,
      y: looseY,
    },
    passerId
  );

  return {
    executed: true,
    result: "failed",
    probability: finalProbability,
  };
}

function executeDribble(
  state,
  player,
  decision,
  rng,
  emitEvent
) {
  const probability =
    calculateDribbleProbability(
      state,
      player
    );

  const decisionProbability =
    getDecisionProbability(decision);

  const aiFactor =
    decisionProbability === null
      ? 1
      : 0.80 + decisionProbability * 0.20;

  const finalProbability =
    clamp(
      probability * aiFactor
    );

  const roll =
    random01(rng);

  const opponent =
    getNearestOpponent(
      state,
      player
    );

  const start =
    getPlayerPosition(player);

  if (roll <= finalProbability) {
    const distanceToCarry =
      calculateCarryDistance(
        state,
        player,
        rng
      );

    let target = {
      x: start.x,
      y: start.y,
    };

    const side =
      getPlayerSide(state, player);

    // Home attacks toward increasing X,
    // away toward decreasing X.
    const direction =
      side === POSSESSION.HOME
        ? 1
        : -1;

    target.x =
      clamp(
        target.x +
          direction *
            distanceToCarry
      );

    // Slight vertical variation.
    target.y =
      clamp(
        target.y +
          randomRange(
            rng,
            -0.015,
            0.015
          )
      );

    player.targetPosition = target;

    moveBallTowards(
      state,
      target,
      0.75
    );

    emit(
      emitEvent,
      "DRIBBLE",
      {
        playerId: player.id,
        from: start,
        to: target,
        probability: finalProbability,
        roll,
        successful: true,
      },
      player.id
    );

    return {
      executed: true,
      result: "completed",
    };
  }

  // Failed dribble.
  if (opponent) {
    setPossession(
      state,
      getPlayerSide(
        state,
        opponent
      ),
      opponent.id,
      {
        silent: true,
      }
    );

    setBallPosition(
      state,
      getPlayerPosition(opponent)
    );

    emit(
      emitEvent,
      "DRIBBLE_FAILED",
      {
        playerId: player.id,
        opponentId: opponent.id,
        probability: finalProbability,
        roll,
      },
      opponent.id
    );

    emit(
      emitEvent,
      "POSSESSION_WON",
      {
        side: getPlayerSide(
          state,
          opponent
        ),
        playerId: opponent.id,
        reason: "dribble_failed",
      },
      opponent.id
    );

    return {
      executed: true,
      result: "lost",
    };
  }

  clearPossession(state, {
    contested: true,
  });

  emit(
    emitEvent,
    "DRIBBLE_FAILED",
    {
      playerId: player.id,
      probability: finalProbability,
      roll,
      looseBall: true,
    },
    player.id
  );

  return {
    executed: true,
    result: "loose",
  };
}

function executeCarry(
  state,
  player,
  rng,
  emitEvent
) {
  const start =
    getPlayerPosition(player);

  const carryDistance =
    calculateCarryDistance(
      state,
      player,
      rng
    );

  const side =
    getPlayerSide(state, player);

  const direction =
    side === POSSESSION.HOME
      ? 1
      : -1;

  const target = {
    x: clamp(
      start.x +
        direction *
          carryDistance
    ),
    y: clamp(
      start.y +
        randomRange(
          rng,
          -0.01,
          0.01
        )
    ),
  };

  player.targetPosition = target;

  moveBallTowards(
    state,
    target,
    0.65
  );

  emit(
    emitEvent,
    "CARRY",
    {
      playerId: player.id,
      from: start,
      to: target,
      distance: carryDistance,
    },
    player.id
  );

  return {
    executed: true,
    result: "completed",
  };
}

function executeHold(
  state,
  player,
  rng,
  emitEvent
) {
  const ballPosition =
    getPlayerPosition(player);

  setBallPosition(
    state,
    ballPosition
  );

  const pressure =
    calculatePressure(
      state,
      player
    );

  emit(
    emitEvent,
    "HOLD_BALL",
    {
      playerId: player.id,
      pressure,
    },
    player.id
  );

  return {
    executed: true,
    result: "held",
  };
}

function executeShoot(
  state,
  player,
  decision,
  rng,
  emitEvent
) {
  const side =
    getPlayerSide(state, player);

  const opponents =
    getOpponents(state, side);

  const keeper =
    opponents.find(
      (opponent) =>
        String(
          opponent.positionGroup ||
            opponent.position ||
            opponent.role ||
            ""
        ).toLowerCase().includes("port")
    ) ||
    opponents.find(
      (opponent) =>
        opponent.isGoalkeeper === true ||
        opponent.goalkeeper === true
    );

  const position =
    getPlayerPosition(player);

  const attackingDirection =
    side === POSSESSION.HOME
      ? 1
      : -1;

  const distanceToGoal =
    side === POSSESSION.HOME
      ? Math.sqrt(
          Math.pow(1 - position.x, 2) +
          Math.pow(0.5 - position.y, 2)
        )
      : Math.sqrt(
          Math.pow(position.x, 2) +
          Math.pow(0.5 - position.y, 2)
        );

  const shooting =
    getAttribute(player, "tiro", 50) / 99;

  const finishing =
    getAttribute(player, "finalizzazione", 50) / 99;

  const longShots =
    getAttribute(
      player,
      "tiriDaLontano",
      50
    ) / 99;

  const technique =
    getAttribute(player, "tecnica", 50) / 99;

  const probability =
    clamp(
      0.10 +
      shooting * 0.20 +
      finishing * 0.25 +
      longShots * 0.15 +
      technique * 0.10 +
      (1 - clamp(distanceToGoal / 0.85)) * 0.20
    );

  const roll =
    random01(rng);

  emit(
    emitEvent,
    "SHOT",
    {
      playerId: player.id,
      x: position.x,
      y: position.y,
      distanceToGoal,
      probability,
      roll,
      direction: attackingDirection,
    },
    player.id
  );

  if (roll > probability) {
    emit(
      emitEvent,
      "SHOT_MISSED",
      {
        playerId: player.id,
        probability,
        roll,
      },
      player.id
    );

    clearPossession(state, {
      contested: true,
    });

    return {
      executed: true,
      result: "miss",
    };
  }

  // Goal probability is intentionally lower than shot-on-target.
  const goalkeeperQuality =
    keeper
      ? (
          getAttribute(
            keeper,
            "riflessi",
            50
          ) +
          getAttribute(
            keeper,
            "posizionamento",
            50
          ) +
          getAttribute(
            keeper,
            "unoControUno",
            50
          )
        ) /
        (99 * 3)
      : 0.50;

  const goalChance =
    clamp(
      0.12 +
      probability * 0.45 -
      goalkeeperQuality * 0.20
    );

  const goalRoll =
    random01(rng);

  if (goalRoll <= goalChance) {
    emit(
      emitEvent,
      "GOAL",
      {
        playerId: player.id,
        scorerId: player.id,
        side,
        probability: goalChance,
        roll: goalRoll,
      },
      player.id
    );

    // The actual score reducer belongs to the Match Engine.
    clearPossession(state, {
      contested: false,
    });

    return {
      executed: true,
      result: "goal",
    };
  }

  emit(
    emitEvent,
    "SHOT_SAVED",
    {
      playerId: player.id,
      goalkeeperId: keeper?.id || null,
      probability: goalChance,
      roll: goalRoll,
    },
    keeper?.id || player.id
  );

  if (keeper && isPlayerActive(keeper)) {
    setPossession(
      state,
      getPlayerSide(state, keeper),
      keeper.id,
      {
        silent: true,
      }
    );

    setBallPosition(
      state,
      getPlayerPosition(keeper)
    );
  } else {
    clearPossession(state, {
      contested: true,
    });
  }

  return {
    executed: true,
    result: "saved",
  };
}

function executeAction({
  state,
  player,
  decision,
  rng,
  emitEvent,
  spatialGrid,
}) {
  const action =
    getDecisionAction(decision);

  switch (action) {
    case ACTIONS.PASS:
      return executePass(
        state,
        player,
        decision,
        rng,
        emitEvent,
        spatialGrid
      );

    case ACTIONS.DRIBBLE:
      return executeDribble(
        state,
        player,
        decision,
        rng,
        emitEvent
      );

    case ACTIONS.CARRY:
      return executeCarry(
        state,
        player,
        rng,
        emitEvent
      );

    case ACTIONS.SHOOT:
      return executeShoot(
        state,
        player,
        decision,
        rng,
        emitEvent
      );

    case ACTIONS.HOLD:
    case ACTIONS.MOVE:
    case ACTIONS.SUPPORT:
    case ACTIONS.NONE:
    default:
      return executeHold(
        state,
        player,
        rng,
        emitEvent
      );
  }
}

function recoverLooseBall(
  state,
  rng,
  emitEvent
) {
  const ballPosition =
    getBallPosition(state);

  const players =
    getAllPlayers(state).filter(
      isPlayerActive
    );

  if (!players.length) {
    return null;
  }

  const candidates = [];

  for (const player of players) {
    const playerPos =
      getPlayerPosition(player);

    const d =
      distance(
        playerPos,
        ballPosition
      );

    if (d <= 0.13) {
      const reactions =
        getAttribute(
          player,
          "reattivita",
          50
        ) / 99;

      const anticipation =
        getAttribute(
          player,
          "anticipazione",
          50
        ) / 99;

      const positioning =
        getAttribute(
          player,
          "posizionamento",
          50
        ) / 99;

      const weight =
        (1 - clamp(d / 0.13)) *
        (
          reactions * 0.40 +
          anticipation * 0.35 +
          positioning * 0.25
        );

      candidates.push({
        player,
        weight,
      });
    }
  }

  const selected =
    weightedRandom(
      candidates,
      rng
    );

  if (!selected?.player) {
    return null;
  }

  const player =
    selected.player;

  const side =
    getPlayerSide(
      state,
      player
    );

  setPossession(
    state,
    side,
    player.id,
    {
      silent: true,
    }
  );

  setBallPosition(
    state,
    getPlayerPosition(player)
  );

  emit(
    emitEvent,
    "POSSESSION_WON",
    {
      side,
      playerId: player.id,
      reason: "loose_ball_recovery",
    },
    player.id
  );

  return player;
}

function cleanupCooldowns(state) {
  if (!state?._possessionCooldowns) {
    return;
  }

  const now =
    getCurrentTime(state);

  for (const [playerId, expiry] of Object.entries(
    state._possessionCooldowns
  )) {
    if (safeNumber(expiry, 0) < now - 2) {
      delete state._possessionCooldowns[playerId];
    }
  }
}

function normalizeRuntimeState(state) {
  if (!state.ball) {
    state.ball = {};
  }

  getBallPosition(state);

  for (const player of getAllPlayers(state)) {
    if (!player.actualPosition) {
      player.actualPosition =
        getPlayerPosition(player);
    } else {
      player.actualPosition =
        normalizePosition(
          player.actualPosition
        );
    }

    if (!player.targetPosition) {
      player.targetPosition = {
        ...player.actualPosition,
      };
    } else {
      player.targetPosition =
        normalizePosition(
          player.targetPosition
        );
    }

    if (!player.matchState) {
      player.matchState = {};
    }

    player.matchState.actualPosition =
      player.actualPosition;

    player.matchState.onPitch =
      player.onPitch !== false;

    player.matchState.hasBall =
      player.hasBall === true;
  }
}

function ensurePossessionConsistency(
  state,
  emitEvent
) {
  // NEVER allow:
  // possession = contested
  // AND
  // ball.ownerId = valid player
  //
  // This was the principal bug observed in the log.
  if (state?.ball?.ownerId) {
    const owner =
      getPlayerById(
        state,
        state.ball.ownerId
      );

    if (
      owner &&
      isPlayerActive(owner)
    ) {
      syncOwnerFromState(
        state,
        emitEvent
      );

      return;
    }
  }

  // If nobody owns the ball, contested/none
  // are legitimate.
  if (
    state.possession !==
      POSSESSION.CONTESTED
  ) {
    state.possession =
      POSSESSION.NONE;

    state.possessionSide =
      POSSESSION.NONE;

    state.possessionPlayerId =
      null;
  }
}

function shouldExecuteAction(
  state,
  player,
  decision
) {
  if (!player || !decision) {
    return false;
  }

  if (
    isOnCooldown(
      state,
      player.id
    )
  ) {
    return false;
  }

  const action =
    getDecisionAction(decision);

  if (
    action === ACTIONS.NONE ||
    action === ACTIONS.MOVE ||
    action === ACTIONS.SUPPORT ||
    action === ACTIONS.PRESS
  ) {
    return false;
  }

  return true;
}

function processPossession({
  state,
  rng,
  emitEvent,
  decisions = {},
  spatialGrid = null,
  tacticalInstructions = null,
}) {
  if (!state) {
    return null;
  }

  normalizeRuntimeState(state);

  cleanupCooldowns(state);

  // First priority: if a valid player already owns the ball,
  // restore coherent possession immediately.
  if (state.ball?.ownerId) {
    const owner =
      getPlayerById(
        state,
        state.ball.ownerId
      );

    if (
      owner &&
      isPlayerActive(owner)
    ) {
      syncOwnerFromState(
        state,
        emitEvent
      );
    } else {
      clearPossession(state, {
        contested: true,
      });
    }
  }

  // Loose-ball recovery.
  if (
    !state.ball?.ownerId &&
    (
      state.possession ===
        POSSESSION.CONTESTED ||
      state.possession ===
        POSSESSION.NONE
    )
  ) {
    const contestedSince =
      safeNumber(
        state._contestedSince,
        getCurrentTime(state)
      );

    const contestedDuration =
      getCurrentTime(state) -
      contestedSince;

    // Try to recover immediately around the ball.
    recoverLooseBall(
      state,
      rng,
      emitEvent
    );

    // If nobody was close enough, keep it loose briefly.
    // Do not create permanent CONTESTED state.
    if (
      !state.ball.ownerId &&
      contestedDuration >
        CONTESTED_MAX_SECONDS
    ) {
      state.possession =
        POSSESSION.NONE;

      state.possessionSide =
        POSSESSION.NONE;

      state.possessionPlayerId =
        null;
    }
  }

  // At this point, without a valid owner, there is
  // nothing to execute.
  if (!state.ball?.ownerId) {
    ensurePossessionConsistency(
      state,
      emitEvent
    );

    return null;
  }

  const owner =
    getPlayerById(
      state,
      state.ball.ownerId
    );

  if (
    !owner ||
    !isPlayerActive(owner)
  ) {
    clearPossession(state, {
      contested: true,
    });

    return null;
  }

  const side =
    getPlayerSide(
      state,
      owner
    );

  if (
    side !== POSSESSION.HOME &&
    side !== POSSESSION.AWAY
  ) {
    clearPossession(state, {
      contested: true,
    });

    return null;
  }

  // Make absolutely sure the owner is represented
  // consistently before AI execution.
  if (
    state.possession !== side ||
    state.possessionPlayerId !== owner.id
  ) {
    setPossession(
      state,
      side,
      owner.id,
      {
        silent: true,
      }
    );
  }

  const decision =
    decisions[owner.id] ||
    decisions[String(owner.id)] ||
    owner.matchState?.decision ||
    owner.currentDecision ||
    null;

  if (!decision) {
    // No AI decision this tick: keep possession.
    setBallPosition(
      state,
      getPlayerPosition(owner)
    );

    ensurePossessionConsistency(
      state,
      emitEvent
    );

    return {
      playerId: owner.id,
      side,
      action: ACTIONS.HOLD,
      executed: false,
      reason: "no_decision",
    };
  }

  // Optional tactical layer can veto certain actions.
  // It does NOT replace the AI decision.
  let effectiveDecision = decision;

  if (
    tacticalInstructions &&
    typeof tacticalInstructions === "object"
  ) {
    const allowedActions =
      tacticalInstructions.allowedActions ||
      tacticalInstructions.actions;

    if (
      Array.isArray(allowedActions) &&
      allowedActions.length > 0
    ) {
      const action =
        getDecisionAction(decision);

      if (!allowedActions.includes(action)) {
        effectiveDecision = {
          ...decision,
          action: ACTIONS.HOLD,
        };
      }
    }
  }

  if (
    !shouldExecuteAction(
      state,
      owner,
      effectiveDecision
    )
  ) {
    // Ball remains with the owner.
    setBallPosition(
      state,
      getPlayerPosition(owner)
    );

    ensurePossessionConsistency(
      state,
      emitEvent
    );

    return {
      playerId: owner.id,
      side,
      action: getDecisionAction(
        effectiveDecision
      ),
      executed: false,
      reason: "cooldown_or_non_execution",
    };
  }

  const action =
    getDecisionAction(
      effectiveDecision
    );

  const pressure =
    calculatePressure(
      state,
      owner
    );

  const space =
    calculateSpace(
      state,
      owner
    );

  const result =
    executeAction({
      state,
      player: owner,
      decision: effectiveDecision,
      rng,
      emitEvent,
      spatialGrid,
    });

  setCooldown(
    state,
    owner.id,
    action === ACTIONS.PASS
      ? PASS_COOLDOWN_SECONDS
      : ACTION_COOLDOWN_SECONDS
  );

  // If the action resulted in another player owning the ball,
  // do not overwrite that possession with the old owner.
  if (state.ball?.ownerId) {
    const currentOwner =
      getPlayerById(
        state,
        state.ball.ownerId
      );

    if (
      currentOwner &&
      isPlayerActive(currentOwner)
    ) {
      syncOwnerFromState(
        state,
        emitEvent
      );
    }
  }

  // If the ball still belongs to the original player,
  // keep it attached to him.
  if (
    String(state.ball?.ownerId) ===
    String(owner.id)
  ) {
    setBallPosition(
      state,
      getPlayerPosition(owner)
    );

    state.possession =
      side;

    state.possessionSide =
      side;

    state.possessionPlayerId =
      owner.id;
  }

  // Never allow stale contested state with an owner.
  ensurePossessionConsistency(
    state,
    emitEvent
  );

  return {
    playerId: owner.id,
    side,
    action,
    pressure,
    space,
    decisionScore:
      getDecisionScore(
        effectiveDecision
      ),
    result,
  };
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

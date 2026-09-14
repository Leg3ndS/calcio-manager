/**
 * UTILITY AI
 *
 * Decide l'azione più utile per ogni giocatore
 * nel contesto corrente della partita.
 *
 * IMPORTANTE:
 * Questo modulo DECIDE.
 * Non esegue direttamente le azioni.
 *
 * Pipeline:
 *
 * WORLD STATE
 *      ↓
 * SPATIAL GRID
 *      ↓
 * UTILITY AI
 *      ↓
 * DECISION
 *      ↓
 * POSSESSION / MOVEMENT / PRESSING
 */

const ACTIONS = {
  HOLD: "hold",
  MOVE: "move",
  PASS: "pass",
  DRIBBLE: "dribble",
  CARRY: "carry",
  SHOOT: "shoot",
  SUPPORT: "support",
  PRESS: "press",
  NONE: "none",
};

const DEFAULT_SCORE = 0;


/* =========================================================
 * UTILITY
 * ========================================================= */

function clamp(value, min = 0, max = 1) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.max(
    min,
    Math.min(max, value)
  );
}


function clamp01(value) {
  return clamp(value, 0, 1);
}


function distance(a, b) {
  if (!a || !b) {
    return Infinity;
  }

  const dx =
    (a.x ?? 0) -
    (b.x ?? 0);

  const dy =
    (a.y ?? 0) -
    (b.y ?? 0);

  return Math.sqrt(
    dx * dx +
    dy * dy
  );
}


function getAttribute(
  player,
  name,
  fallback = 50
) {
  const value =
    player?.attributes?.[name] ??
    player?.[name];

  if (Number.isFinite(value)) {
    return clamp(
      value / 99,
      0.01,
      1
    );
  }

  return fallback / 99;
}


function averageAttributes(
  player,
  attributes
) {
  if (!attributes?.length) {
    return 50 / 99;
  }

  let total = 0;

  for (const attribute of attributes) {
    total += getAttribute(
      player,
      attribute
    );
  }

  return total / attributes.length;
}


/* =========================================================
 * RUOLO
 * ========================================================= */

function getRole(player) {
  return (
    player?.assignedRole ??
    player?.primaryRole ??
    player?.role ??
    "Centrocampista"
  );
}


function getRoleProfile(role) {
  const profiles = {

    Portiere: {
      attack: 0.02,
      support: 0.15,
      pass: 0.55,
      dribble: 0.02,
      carry: 0.02,
      shoot: 0.01,
      press: 0.02,
      hold: 0.65,
    },

    "Portiere libero": {
      attack: 0.08,
      support: 0.30,
      pass: 0.75,
      dribble: 0.08,
      carry: 0.08,
      shoot: 0.01,
      press: 0.05,
      hold: 0.40,
    },

    "Difensore centrale": {
      attack: 0.08,
      support: 0.25,
      pass: 0.55,
      dribble: 0.08,
      carry: 0.08,
      shoot: 0.01,
      press: 0.25,
      hold: 0.45,
    },

    "Difensore centrale con impostazione": {
      attack: 0.12,
      support: 0.35,
      pass: 0.78,
      dribble: 0.12,
      carry: 0.12,
      shoot: 0.02,
      press: 0.20,
      hold: 0.35,
    },

    "Difensore centrale largo": {
      attack: 0.15,
      support: 0.45,
      pass: 0.60,
      dribble: 0.18,
      carry: 0.15,
      shoot: 0.02,
      press: 0.30,
      hold: 0.30,
    },

    "Difensore arcigno": {
      attack: 0.03,
      support: 0.12,
      pass: 0.30,
      dribble: 0.02,
      carry: 0.02,
      shoot: 0.005,
      press: 0.65,
      hold: 0.60,
    },

    Terzino: {
      attack: 0.25,
      support: 0.55,
      pass: 0.55,
      dribble: 0.25,
      carry: 0.22,
      shoot: 0.04,
      press: 0.50,
      hold: 0.25,
    },

    "Terzino di spinta": {
      attack: 0.48,
      support: 0.72,
      pass: 0.58,
      dribble: 0.42,
      carry: 0.40,
      shoot: 0.08,
      press: 0.52,
      hold: 0.15,
    },

    "Terzino offensivo": {
      attack: 0.68,
      support: 0.80,
      pass: 0.58,
      dribble: 0.52,
      carry: 0.48,
      shoot: 0.12,
      press: 0.45,
      hold: 0.08,
    },

    "Esterno basso": {
      attack: 0.22,
      support: 0.58,
      pass: 0.62,
      dribble: 0.20,
      carry: 0.18,
      shoot: 0.03,
      press: 0.58,
      hold: 0.28,
    },

    "Esterno a tutta fascia": {
      attack: 0.62,
      support: 0.82,
      pass: 0.55,
      dribble: 0.52,
      carry: 0.48,
      shoot: 0.10,
      press: 0.68,
      hold: 0.08,
    },

    "Terzino invertito": {
      attack: 0.35,
      support: 0.65,
      pass: 0.75,
      dribble: 0.22,
      carry: 0.20,
      shoot: 0.04,
      press: 0.42,
      hold: 0.25,
    },

    "Esterno invertito": {
      attack: 0.52,
      support: 0.72,
      pass: 0.70,
      dribble: 0.38,
      carry: 0.35,
      shoot: 0.08,
      press: 0.48,
      hold: 0.12,
    },

    Mediano: {
      attack: 0.16,
      support: 0.68,
      pass: 0.78,
      dribble: 0.12,
      carry: 0.14,
      shoot: 0.025,
      press: 0.62,
      hold: 0.35,
    },

    "Mediano d'attesa": {
      attack: 0.08,
      support: 0.62,
      pass: 0.78,
      dribble: 0.05,
      carry: 0.06,
      shoot: 0.01,
      press: 0.35,
      hold: 0.58,
    },

    "Centrocampista difensivo": {
      attack: 0.14,
      support: 0.60,
      pass: 0.68,
      dribble: 0.10,
      carry: 0.12,
      shoot: 0.025,
      press: 0.62,
      hold: 0.40,
    },

    "Regista arretrato": {
      attack: 0.18,
      support: 0.78,
      pass: 0.92,
      dribble: 0.14,
      carry: 0.12,
      shoot: 0.02,
      press: 0.25,
      hold: 0.38,
    },

    Centrocampista: {
      attack: 0.32,
      support: 0.68,
      pass: 0.68,
      dribble: 0.28,
      carry: 0.28,
      shoot: 0.08,
      press: 0.52,
      hold: 0.24,
    },

    "Centrocampista incursore": {
      attack: 0.68,
      support: 0.62,
      pass: 0.58,
      dribble: 0.42,
      carry: 0.42,
      shoot: 0.18,
      press: 0.62,
      hold: 0.08,
    },

    Mezzala: {
      attack: 0.58,
      support: 0.78,
      pass: 0.66,
      dribble: 0.42,
      carry: 0.42,
      shoot: 0.16,
      press: 0.58,
      hold: 0.12,
    },

    Regista: {
      attack: 0.30,
      support: 0.82,
      pass: 0.94,
      dribble: 0.20,
      carry: 0.18,
      shoot: 0.06,
      press: 0.30,
      hold: 0.30,
    },

    Rifinitore: {
      attack: 0.70,
      support: 0.78,
      pass: 0.86,
      dribble: 0.58,
      carry: 0.48,
      shoot: 0.28,
      press: 0.28,
      hold: 0.06,
    },

    Trequartista: {
      attack: 0.82,
      support: 0.72,
      pass: 0.82,
      dribble: 0.66,
      carry: 0.58,
      shoot: 0.38,
      press: 0.28,
      hold: 0.04,
    },

    Ala: {
      attack: 0.76,
      support: 0.58,
      pass: 0.58,
      dribble: 0.78,
      carry: 0.68,
      shoot: 0.28,
      press: 0.52,
      hold: 0.06,
    },

    "Ala invertita": {
      attack: 0.84,
      support: 0.62,
      pass: 0.64,
      dribble: 0.78,
      carry: 0.70,
      shoot: 0.42,
      press: 0.46,
      hold: 0.04,
    },

    "Attaccante esterno": {
      attack: 0.84,
      support: 0.52,
      pass: 0.54,
      dribble: 0.74,
      carry: 0.66,
      shoot: 0.40,
      press: 0.58,
      hold: 0.03,
    },

    "Ala interna": {
      attack: 0.88,
      support: 0.62,
      pass: 0.64,
      dribble: 0.72,
      carry: 0.64,
      shoot: 0.50,
      press: 0.52,
      hold: 0.03,
    },

    "Seconda punta": {
      attack: 0.92,
      support: 0.48,
      pass: 0.58,
      dribble: 0.68,
      carry: 0.60,
      shoot: 0.58,
      press: 0.62,
      hold: 0.02,
    },

    "Trequartista avanzato": {
      attack: 0.94,
      support: 0.65,
      pass: 0.82,
      dribble: 0.68,
      carry: 0.62,
      shoot: 0.58,
      press: 0.42,
      hold: 0.02,
    },

    "Attaccante avanzato": {
      attack: 0.98,
      support: 0.25,
      pass: 0.34,
      dribble: 0.58,
      carry: 0.52,
      shoot: 0.78,
      press: 0.58,
      hold: 0.01,
    },

    "Attaccante di pressione": {
      attack: 0.82,
      support: 0.25,
      pass: 0.34,
      dribble: 0.48,
      carry: 0.42,
      shoot: 0.55,
      press: 0.96,
      hold: 0.01,
    },

    "Attaccante boa": {
      attack: 0.78,
      support: 0.48,
      pass: 0.68,
      dribble: 0.32,
      carry: 0.28,
      shoot: 0.66,
      press: 0.38,
      hold: 0.24,
    },

    "Attaccante completo": {
      attack: 0.98,
      support: 0.68,
      pass: 0.72,
      dribble: 0.68,
      carry: 0.62,
      shoot: 0.76,
      press: 0.68,
      hold: 0.02,
    },
  };

  return (
    profiles[role] ??
    profiles.Centrocampista
  );
}


/* =========================================================
 * SPATIAL GRID
 * ========================================================= */

function getGridCell(
  spatialGrid,
  position
) {
  if (!spatialGrid || !position) {
    return null;
  }

  if (
    typeof spatialGrid.getCellAtPosition ===
    "function"
  ) {
    return spatialGrid.getCellAtPosition(
      position.x,
      position.y
    );
  }

  if (
    typeof spatialGrid.getCell ===
    "function"
  ) {
    return spatialGrid.getCell(
      position.x,
      position.y
    );
  }

  if (
    typeof spatialGrid.getCellForPosition ===
    "function"
  ) {
    return spatialGrid.getCellForPosition(
      position.x,
      position.y
    );
  }

  return null;
}


function calculatePressure(
  player,
  opponents,
  spatialGrid
) {
  if (!player?.position) {
    return 0;
  }

  const cell =
    getGridCell(
      spatialGrid,
      player.position
    );

  if (
    Number.isFinite(
      cell?.pressure
    )
  ) {
    return clamp01(
      cell.pressure
    );
  }

  let pressure = 0;

  for (const opponent of opponents ?? []) {
    if (!opponent?.position) {
      continue;
    }

    const d =
      distance(
        player.position,
        opponent.position
      );

    if (d < 0.055) {
      pressure += 0.50;
    } else if (d < 0.09) {
      pressure += 0.28;
    } else if (d < 0.15) {
      pressure += 0.12;
    }
  }

  return clamp01(pressure);
}


function calculateFreeSpace(
  player,
  teammates,
  opponents,
  spatialGrid
) {
  if (!player?.position) {
    return 0.5;
  }

  const cell =
    getGridCell(
      spatialGrid,
      player.position
    );

  if (
    Number.isFinite(
      cell?.pressure
    )
  ) {
    return clamp01(
      1 - cell.pressure
    );
  }

  return clamp01(
    1 -
    calculatePressure(
      player,
      opponents,
      spatialGrid
    )
  );
}


/* =========================================================
 * POSSESSION
 * ========================================================= */

function isPlayerInPossession(
  player,
  ball
) {
  return (
    player &&
    (
      ball?.ownerId === player.id ||
      player.hasBall === true
    )
  );
}


/* =========================================================
 * DIREZIONE / PROGRESSIONE
 * ========================================================= */

function getForwardValue(
  player,
  side
) {
  if (!player?.position) {
    return 0.5;
  }

  if (
    side === "HOME" ||
    side === "home"
  ) {
    return clamp01(
      player.position.x
    );
  }

  if (
    side === "AWAY" ||
    side === "away"
  ) {
    return clamp01(
      1 -
      player.position.x
    );
  }

  return 0.5;
}


function getProgression(
  passer,
  receiver,
  side
) {
  if (
    !passer?.position ||
    !receiver?.position
  ) {
    return 0;
  }

  if (
    side === "HOME" ||
    side === "home"
  ) {
    return (
      receiver.position.x -
      passer.position.x
    );
  }

  return (
    passer.position.x -
    receiver.position.x
  );
}


/* =========================================================
 * PASS TARGET
 * ========================================================= */

function scorePassTarget({
  player,
  teammate,
  opponents,
  spatialGrid,
  side,
}) {
  if (
    !player?.position ||
    !teammate?.position
  ) {
    return -Infinity;
  }

  if (teammate.id === player.id) {
    return -Infinity;
  }

  const passDistance =
    distance(
      player.position,
      teammate.position
    );

  if (passDistance < 0.025) {
    return -Infinity;
  }

  if (passDistance > 0.80) {
    return -Infinity;
  }

  const pressure =
    calculatePressure(
      teammate,
      opponents,
      spatialGrid
    );

  const space =
    1 - pressure;

  const progression =
    getProgression(
      player,
      teammate,
      side
    );

  const progressionScore =
    clamp01(
      progression * 3 + 0.5
    );

  const receiverVision =
    getAttribute(
      teammate,
      "visione"
    );

  const receiverControl =
    getAttribute(
      teammate,
      "primoControllo"
    );

  const passing =
    getAttribute(
      player,
      "passaggi"
    );

  const decisions =
    getAttribute(
      player,
      "decisioni"
    );

  const distanceScore =
    1 -
    clamp01(
      passDistance /
      0.80
    );

  return clamp(
    distanceScore * 0.12 +
    space * 0.25 +
    progressionScore * 0.27 +
    receiverVision * 0.10 +
    receiverControl * 0.06 +
    passing * 0.10 +
    decisions * 0.10
  );
}


function findBestPassTarget({
  player,
  teammates,
  opponents,
  spatialGrid,
  side,
}) {
  let best = null;
  let bestScore = -Infinity;

  for (
    const teammate
    of teammates ?? []
  ) {
    const score =
      scorePassTarget({
        player,
        teammate,
        opponents,
        spatialGrid,
        side,
      });

    if (score > bestScore) {
      bestScore = score;
      best = teammate;
    }
  }

  return best;
}


/* =========================================================
 * TATTICHE
 * ========================================================= */

function getInstruction(
  instructions,
  key,
  fallback = null
) {
  return (
    instructions?.[key] ??
    fallback
  );
}


function getMentalityModifier(
  instructions
) {
  const mentality =
    getInstruction(
      instructions,
      "mentalita",
      "equilibrata"
    );

  const values = {
    moltoDifensiva: -0.25,
    difensiva: -0.15,
    prudente: -0.08,
    equilibrata: 0,
    positiva: 0.08,
    offensiva: 0.16,
    moltoOffensiva: 0.24,
  };

  return values[mentality] ?? 0;
}


function getTempoModifier(
  instructions
) {
  const tempo =
    getInstruction(
      instructions,
      "tempo",
      "medio"
    );

  const values = {
    moltoLento: -0.10,
    lento: -0.05,
    medio: 0,
    veloce: 0.05,
    moltoVeloce: 0.10,
  };

  return values[tempo] ?? 0;
}


function getPressingModifier(
  instructions
) {
  const pressing =
    getInstruction(
      instructions,
      "pressing",
      "medio"
    );

  const values = {
    basso: -0.20,
    medioBasso: -0.10,
    medio: 0,
    medioAlto: 0.10,
    alto: 0.20,
    moltoAlto: 0.30,
  };

  return values[pressing] ?? 0;
}


/* =========================================================
 * ACTION SCORES
 * ========================================================= */

function scoreHold({
  player,
  roleProfile,
  pressure,
  mentalityModifier,
}) {
  const composure =
    getAttribute(
      player,
      "freddezza"
    );

  const decisions =
    getAttribute(
      player,
      "decisioni"
    );

  return clamp(
    0.08 +
    roleProfile.hold * 0.32 +
    composure * 0.20 +
    decisions * 0.18 -
    pressure * 0.14 -
    Math.max(
      0,
      mentalityModifier
    ) * 0.15
  );
}


function scoreMove({
  player,
  roleProfile,
  freeSpace,
  mentalityModifier,
}) {
  const movement =
    getAttribute(
      player,
      "movimentoSenzaPalla"
    );

  const acceleration =
    getAttribute(
      player,
      "accelerazione"
    );

  const agility =
    getAttribute(
      player,
      "agilita"
    );

  return clamp(
    0.10 +
    roleProfile.support * 0.22 +
    freeSpace * 0.20 +
    movement * 0.28 +
    acceleration * 0.10 +
    agility * 0.08 +
    mentalityModifier * 0.12
  );
}


function scoreSupport({
  player,
  roleProfile,
  freeSpace,
  forwardValue,
}) {
  const teamwork =
    getAttribute(
      player,
      "giocodellaSquadra"
    ) ||
    getAttribute(
      player,
      "giocoDiSquadra"
    );

  const positioning =
    getAttribute(
      player,
      "posizionamento"
    );

  return clamp(
    0.08 +
    roleProfile.support * 0.28 +
    freeSpace * 0.18 +
    teamwork * 0.22 +
    positioning * 0.18 +
    forwardValue * 0.06
  );
}


function scoreDribble({
  player,
  roleProfile,
  pressure,
  freeSpace,
  mentalityModifier,
}) {
  const dribbling =
    getAttribute(
      player,
      "dribbling"
    );

  const technique =
    getAttribute(
      player,
      "tecnica"
    );

  const acceleration =
    getAttribute(
      player,
      "accelerazione"
    );

  const agility =
    getAttribute(
      player,
      "agilita"
    );

  const decisions =
    getAttribute(
      player,
      "decisioni"
    );

  return clamp(
    0.02 +
    roleProfile.dribble * 0.20 +
    dribbling * 0.30 +
    technique * 0.16 +
    acceleration * 0.08 +
    agility * 0.10 +
    decisions * 0.08 +
    freeSpace * 0.20 -
    pressure * 0.42 +
    mentalityModifier * 0.10
  );
}


function scoreCarry({
  player,
  roleProfile,
  pressure,
  freeSpace,
  forwardValue,
  mentalityModifier,
}) {
  const dribbling =
    getAttribute(
      player,
      "dribbling"
    );

  const acceleration =
    getAttribute(
      player,
      "accelerazione"
    );

  const speed =
    getAttribute(
      player,
      "velocita"
    );

  const technique =
    getAttribute(
      player,
      "tecnica"
    );

  const decisions =
    getAttribute(
      player,
      "decisioni"
    );

  return clamp(
    0.015 +
    roleProfile.carry * 0.20 +
    dribbling * 0.24 +
    acceleration * 0.16 +
    speed * 0.12 +
    technique * 0.10 +
    decisions * 0.08 +
    freeSpace * 0.18 +
    forwardValue * 0.12 -
    pressure * 0.35 +
    mentalityModifier * 0.12
  );
}


function scorePass({
  player,
  target,
  opponents,
  spatialGrid,
  side,
  mentalityModifier,
  tempoModifier,
  roleProfile,
}) {
  if (!target) {
    return 0;
  }

  const passaggi =
    getAttribute(
      player,
      "passaggi"
    );

  const vision =
    getAttribute(
      player,
      "visione"
    );

  const decisions =
    getAttribute(
      player,
      "decisioni"
    );

  const tecnica =
    getAttribute(
      player,
      "tecnica"
    );

  const pressure =
    calculatePressure(
      player,
      opponents,
      spatialGrid
    );

  const targetPressure =
    calculatePressure(
      target,
      opponents,
      spatialGrid
    );

  const space =
    1 - targetPressure;

  const progression =
    getProgression(
      player,
      target,
      side
    );

  const progressionScore =
    clamp01(
      progression * 3 +
      0.5
    );

  const distanceValue =
    distance(
      player.position,
      target.position
    );

  const distanceScore =
    1 -
    clamp01(
      distanceValue /
      0.80
    );

  return clamp(
    0.06 +
    roleProfile.pass * 0.12 +
    passaggi * 0.25 +
    vision * 0.18 +
    decisions * 0.14 +
    tecnica * 0.08 +
    space * 0.12 +
    progressionScore * 0.14 +
    distanceScore * 0.05 -
    pressure * 0.12 +
    tempoModifier * 0.08 +
    mentalityModifier * 0.08
  );
}


function scoreShot({
  player,
  opponents,
  roleProfile,
  forwardValue,
  pressure,
  mentalityModifier,
}) {
  const finishing =
    getAttribute(
      player,
      "finalizzazione"
    );

  const shooting =
    getAttribute(
      player,
      "tiro"
    );

  const longShots =
    getAttribute(
      player,
      "tiriDaLontano"
    );

  const technique =
    getAttribute(
      player,
      "tecnica"
    );

  const decisions =
    getAttribute(
      player,
      "decisioni"
    );

  const composure =
    getAttribute(
      player,
      "freddezza"
    );

  const position =
    player?.position ?? {
      x: 0.5,
      y: 0.5,
    };

  /*
   * HOME attacca verso x=1
   * AWAY attacca verso x=0
   */
  const goalDistance =
    (
      player?.side === "away" ||
      player?.side === "AWAY"
    )
      ? position.x
      : 1 - position.x;

  /*
   * Zona di tiro:
   *
   * < 0.30 = lontano
   * 0.30-0.55 = final third
   * > 0.55 = buona zona
   */
  const shootingZone =
    clamp01(
      (0.68 - goalDistance) /
      0.50
    );

  const closeRange =
    clamp01(
      (0.48 - goalDistance) /
      0.35
    );

  const pressurePenalty =
    pressure * 0.28;

  /*
   * I tiri da lontano hanno bisogno
   * maggiormente di tiri da lontano.
   */
  const distanceQuality =
    goalDistance > 0.40
      ? longShots
      : finishing;

  const base =
    0.005 +
    roleProfile.shoot * 0.16 +
    finishing * 0.25 +
    shooting * 0.18 +
    technique * 0.08 +
    decisions * 0.10 +
    composure * 0.08 +
    distanceQuality * 0.10 +
    shootingZone * 0.25 +
    closeRange * 0.28 -
    pressurePenalty;

  /*
   * Un attaccante offensivo deve
   * cercare maggiormente la conclusione.
   */
  const attackingBonus =
    roleProfile.attack *
    shootingZone *
    0.20;

  return clamp(
    base +
    attackingBonus +
    Math.max(
      0,
      mentalityModifier
    ) * 0.20
  );
}


function scorePress({
  player,
  roleProfile,
  pressure,
  pressingModifier,
}) {
  const aggression =
    getAttribute(
      player,
      "aggressivita"
    );

  const anticipation =
    getAttribute(
      player,
      "anticipazione"
    );

  const workRate =
    getAttribute(
      player,
      "impegno"
    );

  return clamp(
    0.05 +
    roleProfile.press * 0.35 +
    aggression * 0.18 +
    anticipation * 0.15 +
    workRate * 0.20 +
    pressingModifier * 0.25 -
    pressure * 0.05
  );
}


/* =========================================================
 * WITH BALL
 * ========================================================= */

function evaluateWithBall({
  player,
  teammates,
  opponents,
  ball,
  spatialGrid,
  side,
  teamInstructions,
}) {
  const role =
    getRole(player);

  const roleProfile =
    getRoleProfile(role);

  const pressure =
    calculatePressure(
      player,
      opponents,
      spatialGrid
    );

  const freeSpace =
    calculateFreeSpace(
      player,
      teammates,
      opponents,
      spatialGrid
    );

  const mentalityModifier =
    getMentalityModifier(
      teamInstructions
    );

  const tempoModifier =
    getTempoModifier(
      teamInstructions
    );

  const bestTarget =
    findBestPassTarget({
      player,
      teammates,
      opponents,
      spatialGrid,
      side,
    });

  const forwardValue =
    getForwardValue(
      player,
      side
    );

  const passScore =
    scorePass({
      player,
      target:
        bestTarget,
      opponents,
      spatialGrid,
      side,
      mentalityModifier,
      tempoModifier,
      roleProfile,
    });

  const dribbleScore =
    scoreDribble({
      player,
      roleProfile,
      pressure,
      freeSpace,
      mentalityModifier,
    });

  const carryScore =
    scoreCarry({
      player,
      roleProfile,
      pressure,
      freeSpace,
      forwardValue,
      mentalityModifier,
    });

  const shotScore =
    scoreShot({
      player,
      opponents,
      roleProfile,
      forwardValue,
      pressure,
      mentalityModifier,
    });

  const holdScore =
    scoreHold({
      player,
      roleProfile,
      pressure,
      mentalityModifier,
    });

  /*
   * Piccolo correttivo fondamentale:
   *
   * se il giocatore è realmente in zona tiro,
   * il tiro deve competere seriamente con il passaggio.
   */
  const position =
    player?.position ?? {
      x: 0.5,
      y: 0.5,
    };

  const goalDistance =
    (
      side === "AWAY" ||
      side === "away"
    )
      ? position.x
      : 1 - position.x;

  const inShootingZone =
    goalDistance < 0.62;

  const finalThird =
    goalDistance < 0.38;

  let adjustedShot =
    shotScore;

  if (inShootingZone) {
    adjustedShot +=
      0.10 +
      roleProfile.attack * 0.10;
  }

  if (finalThird) {
    adjustedShot +=
      0.12 +
      roleProfile.attack * 0.12;
  }

  /*
   * In area / zona molto avanzata:
   * il passaggio non deve vincere
   * automaticamente ogni volta.
   */
  let adjustedPass =
    passScore;

  if (finalThird) {
    adjustedPass -=
      roleProfile.attack *
      0.10;
  }

  const scores = {
    [ACTIONS.PASS]:
      clamp(adjustedPass),

    [ACTIONS.DRIBBLE]:
      clamp(dribbleScore),

    [ACTIONS.CARRY]:
      clamp(carryScore),

    [ACTIONS.SHOOT]:
      clamp(adjustedShot),

    [ACTIONS.HOLD]:
      clamp(holdScore),
  };

  let action =
    ACTIONS.HOLD;

  let bestScore =
    DEFAULT_SCORE;

  for (
    const [candidate, score]
    of Object.entries(scores)
  ) {
    if (score > bestScore) {
      bestScore = score;
      action = candidate;
    }
  }

  return {
    playerId:
      player.id,

    side,

    role,

    roleProfile,

    action,

    score:
      bestScore,

    scores,

    targetPlayerId:
      action === ACTIONS.PASS
        ? bestTarget?.id ?? null
        : null,

    targetPosition:
      bestTarget?.position
        ? {
            x:
              bestTarget.position.x,
            y:
              bestTarget.position.y,
          }
        : null,

    pressure,

    freeSpace,

    forwardValue,

    goalDistance,

    inShootingZone,

    finalThird,

    possession:
      true,

    intent:
      action,

    reason:
      action === ACTIONS.SHOOT
        ? "shooting_opportunity"
        : action === ACTIONS.PASS
          ? "best_pass_option"
          : action === ACTIONS.CARRY
            ? "space_to_progress"
            : action === ACTIONS.DRIBBLE
              ? "dribble_opportunity"
              : "retain_possession",
  };
}


/* =========================================================
 * WITHOUT BALL
 * ========================================================= */

function evaluateWithoutBall({
  player,
  teammates,
  opponents,
  ball,
  spatialGrid,
  side,
  teamInstructions,
}) {
  const role =
    getRole(player);

  const roleProfile =
    getRoleProfile(role);

  const pressure =
    calculatePressure(
      player,
      opponents,
      spatialGrid
    );

  const freeSpace =
    calculateFreeSpace(
      player,
      teammates,
      opponents,
      spatialGrid
    );

  const mentalityModifier =
    getMentalityModifier(
      teamInstructions
    );

  const pressingModifier =
    getPressingModifier(
      teamInstructions
    );

  const forwardValue =
    getForwardValue(
      player,
      side
    );

  const moveScore =
    scoreMove({
      player,
      roleProfile,
      freeSpace,
      mentalityModifier,
    });

  const supportScore =
    scoreSupport({
      player,
      roleProfile,
      freeSpace,
      forwardValue,
    });

  const pressScore =
    scorePress({
      player,
      roleProfile,
      pressure,
      pressingModifier,
    });

  /*
   * Se la squadra non ha palla,
   * il pressing aumenta quando:
   *
   * - pressing tattico è alto
   * - ruolo è adatto
   * - giocatore è vicino all'avversario
   */
  const nearestOpponentDistance =
    Math.min(
      ...(opponents ?? []).map(
        (opponent) =>
          distance(
            player.position,
            opponent.position
          )
      ),
      Infinity
    );

  let adjustedPress =
    pressScore;

  if (
    nearestOpponentDistance <
    0.18
  ) {
    adjustedPress +=
      0.10;
  }

  if (
    nearestOpponentDistance <
    0.10
  ) {
    adjustedPress +=
      0.12;
  }

  const scores = {
    [ACTIONS.MOVE]:
      clamp(moveScore),

    [ACTIONS.SUPPORT]:
      clamp(supportScore),

    [ACTIONS.PRESS]:
      clamp(adjustedPress),
  };

  let action =
    ACTIONS.MOVE;

  let bestScore =
    DEFAULT_SCORE;

  for (
    const [candidate, score]
    of Object.entries(scores)
  ) {
    if (score > bestScore) {
      bestScore = score;
      action = candidate;
    }
  }

  return {
    playerId:
      player.id,

    side,

    role,

    roleProfile,

    action,

    score:
      bestScore,

    scores,

    targetPlayerId:
      null,

    targetPosition:
      player.targetPosition
        ? {
            x:
              player.targetPosition.x,
            y:
              player.targetPosition.y,
          }
        : null,

    pressure,

    freeSpace,

    forwardValue,

    possession:
      false,

    intent:
      action,

    reason:
      action === ACTIONS.PRESS
        ? "press_opponent"
        : action === ACTIONS.SUPPORT
          ? "support_possession"
          : "move_into_space",
  };
}


/* =========================================================
 * TEAM EVALUATION
 * ========================================================= */

function evaluateTeam({
  players,
  opponents,
  ball,
  spatialGrid,
  teamInstructions = {},
  possession,
}) {
  const decisions = [];

  const side =
    players?.[0]?.side ??
    (
      possession === "home"
        ? "home"
        : possession === "away"
          ? "away"
          : "home"
    );

  const normalizedSide =
    String(side).toUpperCase();

  for (
    const player
    of players ?? []
  ) {
    if (!player) {
      continue;
    }

    /*
     * Le riserve non partecipano
     * alla simulazione.
     */
    if (
      player.onPitch === false ||
      player.matchState?.onPitch === false
    ) {
      continue;
    }

    const isPossessing =
      isPlayerInPossession(
        player,
        ball
      );

    const decision =
      isPossessing
        ? evaluateWithBall({
            player,
            teammates:
              players,
            opponents,
            ball,
            spatialGrid,
            side:
              normalizedSide,
            teamInstructions,
          })
        : evaluateWithoutBall({
            player,
            teammates:
              players,
            opponents,
            ball,
            spatialGrid,
            side:
              normalizedSide,
            teamInstructions,
          });

    decisions.push(
      decision
    );
  }

  return decisions;
}


/* =========================================================
 * DEBUG
 * ========================================================= */

function evaluateTeamDebug({
  players,
  opponents,
  ball,
  spatialGrid,
  teamInstructions = {},
  possession,
}) {
  return evaluateTeam({
    players,
    opponents,
    ball,
    spatialGrid,
    teamInstructions,
    possession,
  }).map(
    (decision) => ({
      ...decision,

      debug: {
        playerId:
          decision.playerId,

        role:
          decision.role,

        action:
          decision.action,

        score:
          decision.score,

        scores:
          decision.scores,

        pressure:
          decision.pressure,

        freeSpace:
          decision.freeSpace,

        forwardValue:
          decision.forwardValue,

        goalDistance:
          decision.goalDistance ??
          null,

        inShootingZone:
          decision.inShootingZone ??
          false,

        finalThird:
          decision.finalThird ??
          false,

        reason:
          decision.reason,
      },
    })
  );
}


/* =========================================================
 * EXPORT
 * ========================================================= */

export {
  ACTIONS,
  evaluateTeam,
  evaluateTeamDebug,
  getRole,
  getRoleProfile,
  calculatePressure,
  calculateFreeSpace,
  findBestPassTarget,
};

export default {
  ACTIONS,
  evaluateTeam,
  evaluateTeamDebug,
  getRole,
  getRoleProfile,
  calculatePressure,
  calculateFreeSpace,
  findBestPassTarget,
};

// ============================================================
// UTILITY AI - CALCIO MANAGER
// ============================================================

const ACTIONS = Object.freeze({
  HOLD: "HOLD",
  MOVE: "MOVE",
  PASS: "PASS",
  DRIBBLE: "DRIBBLE",
  CARRY: "CARRY",
  SHOOT: "SHOOT",
  SUPPORT: "SUPPORT",
  PRESS: "PRESS",
  NONE: "NONE",
});

// ============================================================
// GENERIC HELPERS
// ============================================================

function clamp(value, min = 0, max = 1) {
  const n = Number(value);

  if (!Number.isFinite(n)) return min;

  return Math.max(min, Math.min(max, n));
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeAttribute(value, fallback = 50) {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return clamp(fallback / 99);
  }

  return clamp(n / 99);
}

// ============================================================
// SAFE ARRAY CONVERSION
// ============================================================

function toPlayerArray(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  // Struttura { players: [...] }
  if (Array.isArray(value.players)) {
    return value.players.filter(Boolean);
  }

  // Struttura { homePlayers: [...] }
  if (Array.isArray(value.homePlayers)) {
    return value.homePlayers.filter(Boolean);
  }

  // Struttura { awayPlayers: [...] }
  if (Array.isArray(value.awayPlayers)) {
    return value.awayPlayers.filter(Boolean);
  }

  // Mappa { playerId: playerObject }
  const values = Object.values(value);

  if (
    values.length > 0 &&
    values.every(
      (item) =>
        item &&
        typeof item === "object" &&
        !Array.isArray(item)
    )
  ) {
    return values.filter(Boolean);
  }

  return [];
}

// ============================================================
// ROLE NORMALIZATION
// ============================================================

const ROLE_ALIASES = {
  portiere: "Portiere",
  gk: "Portiere",
  goalkeeper: "Portiere",

  "portiere libero": "Portiere libero",
  portiere_libero: "Portiere libero",

  terzino: "Terzino",

  "terzino di spinta": "Terzino di spinta",
  terzino_di_spinta: "Terzino di spinta",

  "terzino offensivo": "Terzino offensivo",
  terzino_offensivo: "Terzino offensivo",

  "esterno basso": "Esterno basso",
  esterno_basso: "Esterno basso",

  "esterno a tutta fascia": "Esterno a tutta fascia",
  esterno_a_tutta_fascia: "Esterno a tutta fascia",

  "terzino invertito": "Terzino invertito",
  terzino_invertito: "Terzino invertito",

  "esterno invertito": "Esterno invertito",
  esterno_invertito: "Esterno invertito",

  "difensore centrale": "Difensore centrale",
  difensore_centrale: "Difensore centrale",

  "difensore centrale con impostazione":
    "Difensore centrale con impostazione",
  difensore_centrale_con_impostazione:
    "Difensore centrale con impostazione",

  "difensore centrale largo":
    "Difensore centrale largo",
  difensore_centrale_largo:
    "Difensore centrale largo",

  "difensore arcigno":
    "Difensore arcigno",
  difensore_arcigno:
    "Difensore arcigno",

  mediano: "Mediano",

  "mediano d attesa":
    "Mediano d'attesa",
  "mediano d'attesa":
    "Mediano d'attesa",
  mediano_d_attesa:
    "Mediano d'attesa",

  "centrocampista difensivo":
    "Centrocampista difensivo",
  centrocampista_difensivo:
    "Centrocampista difensivo",

  "regista arretrato":
    "Regista arretrato",
  regista_arretrato:
    "Regista arretrato",

  centrocampista:
    "Centrocampista",

  "centrocampista incursore":
    "Centrocampista incursore",
  centrocampista_incursore:
    "Centrocampista incursore",

  mezzala:
    "Mezzala",

  regista:
    "Regista",

  rifinitore:
    "Rifinitore",

  trequartista:
    "Trequartista",

  ala:
    "Ala",

  "ala invertita":
    "Ala invertita",
  ala_invertita:
    "Ala invertita",

  "attaccante esterno":
    "Attaccante esterno",
  attaccante_esterno:
    "Attaccante esterno",

  "ala interna":
    "Ala interna",
  ala_interna:
    "Ala interna",

  "seconda punta":
    "Seconda punta",
  seconda_punta:
    "Seconda punta",

  "trequartista avanzato":
    "Trequartista avanzato",
  trequartista_avanzato:
    "Trequartista avanzato",

  "attaccante avanzato":
    "Attaccante avanzato",
  attaccante_avanzato:
    "Attaccante avanzato",

  "attaccante di pressione":
    "Attaccante di pressione",
  attaccante_di_pressione:
    "Attaccante di pressione",

  "attaccante boa":
    "Attaccante boa",
  attaccante_boa:
    "Attaccante boa",

  "attaccante completo":
    "Attaccante completo",
  attaccante_completo:
    "Attaccante completo",
};

function normalizeRole(role) {
  const key = normalizeText(role);

  return (
    ROLE_ALIASES[key] ||
    ROLE_ALIASES[key.replace(/ /g, "_")] ||
    "Centrocampista"
  );
}

function getRole(player) {
  return normalizeRole(
    player?.role ??
      player?.assignedRole ??
      player?.primaryRole ??
      "Centrocampista"
  );
}

// ============================================================
// ATTRIBUTE SYSTEM
// ============================================================

const ATTRIBUTE_ALIASES = {
  primoControllo: [
    "primoControllo",
    "firstTouch",
    "controllo",
  ],

  dribbling: [
    "dribbling",
  ],

  passaggi: [
    "passaggi",
    "passing",
  ],

  tecnica: [
    "tecnica",
    "technique",
  ],

  cross: [
    "cross",
  ],

  tiro: [
    "tiro",
    "shooting",
  ],

  finalizzazione: [
    "finalizzazione",
    "finishing",
  ],

  tiriDaLontano: [
    "tiriDaLontano",
    "longShots",
  ],

  punizioni: [
    "punizioni",
    "freeKicks",
  ],

  rigori: [
    "rigori",
    "penalties",
  ],

  calciDangolo: [
    "calciDangolo",
    "calciDAngolo",
    "corners",
  ],

  contrasti: [
    "contrasti",
    "tackling",
  ],

  marcatura: [
    "marcatura",
    "marking",
  ],

  colpiDiTesta: [
    "colpiDiTesta",
    "heading",
  ],

  rimesseLaterali: [
    "rimesseLaterali",
    "throwIns",
  ],

  piedeDebole: [
    "piedeDebole",
    "weakFoot",
  ],

  decisioni: [
    "decisioni",
    "decisions",
  ],

  visione: [
    "visione",
    "vision",
  ],

  anticipazione: [
    "anticipazione",
    "anticipation",
  ],

  concentrazione: [
    "concentrazione",
    "concentration",
  ],

  freddezza: [
    "freddezza",
    "composure",
  ],

  determinazione: [
    "determinazione",
    "determination",
  ],

  aggressivita: [
    "aggressivita",
    "aggressivitÃ ",
    "aggression",
  ],

  coraggio: [
    "coraggio",
    "bravery",
  ],

  posizionamento: [
    "posizionamento",
    "positioning",
  ],

  movimentoSenzaPalla: [
    "movimentoSenzaPalla",
    "movimento_senza_palla",
    "offTheBall",
  ],

  collaborazione: [
    "collaborazione",
    "teamwork",
  ],

  leadership: [
    "leadership",
  ],

  impegno: [
    "impegno",
    "workRate",
  ],

  costanza: [
    "costanza",
    "consistency",
  ],

  sensoDellaPosizione: [
    "sensoDellaPosizione",
    "senso_della_posizione",
    "positionalSense",
  ],

  adattabilita: [
    "adattabilita",
    "adattabilitÃ ",
    "adaptability",
  ],

  giocoDiSquadra: [
    "giocoDiSquadra",
    "giocoDellaSquadra",
    "gioco_della_squadra",
    "teamPlay",
  ],

  accelerazione: [
    "accelerazione",
    "acceleration",
  ],

  velocita: [
    "velocita",
    "velocitÃ ",
    "pace",
    "speed",
  ],

  agilita: [
    "agilita",
    "agilitÃ ",
    "agility",
  ],

  equilibrio: [
    "equilibrio",
    "balance",
  ],

  forza: [
    "forza",
    "strength",
  ],

  resistenza: [
    "resistenza",
    "stamina",
  ],

  elevazione: [
    "elevazione",
    "jumping",
  ],

  reattivita: [
    "reattivita",
    "reattivitÃ ",
    "reaction",
  ],

  coordinazione: [
    "coordinazione",
    "coordination",
  ],

  recuperoFisico: [
    "recuperoFisico",
    "recupero_fisico",
    "recovery",
  ],
};

const TECHNICAL = new Set([
  "primoControllo",
  "dribbling",
  "passaggi",
  "tecnica",
  "cross",
  "tiro",
  "finalizzazione",
  "tiriDaLontano",
  "punizioni",
  "rigori",
  "calciDangolo",
  "contrasti",
  "marcatura",
  "colpiDiTesta",
  "rimesseLaterali",
  "piedeDebole",
]);

const MENTAL = new Set([
  "decisioni",
  "visione",
  "anticipazione",
  "concentrazione",
  "freddezza",
  "determinazione",
  "aggressivita",
  "coraggio",
  "posizionamento",
  "movimentoSenzaPalla",
  "collaborazione",
  "leadership",
  "impegno",
  "costanza",
  "sensoDellaPosizione",
  "adattabilita",
  "giocoDiSquadra",
]);

const PHYSICAL = new Set([
  "accelerazione",
  "velocita",
  "agilita",
  "equilibrio",
  "forza",
  "resistenza",
  "elevazione",
  "reattivita",
  "coordinazione",
  "recuperoFisico",
]);

function readObjectValue(object, aliases) {
  if (!object || typeof object !== "object") {
    return null;
  }

  for (const key of aliases) {
    if (
      object[key] !== undefined &&
      object[key] !== null &&
      Number.isFinite(Number(object[key]))
    ) {
      return Number(object[key]);
    }
  }

  return null;
}

function getAttribute(player, name, fallback = 50) {
  const aliases =
    ATTRIBUTE_ALIASES[name] || [name];

  let value = null;

  // ATTRIBUTI TECNICI
  if (TECHNICAL.has(name)) {
    value = readObjectValue(
      player?.attributes?.technical,
      aliases
    );
  }

  // ATTRIBUTI MENTALI
  if (value === null && MENTAL.has(name)) {
    value = readObjectValue(
      player?.attributes?.mental,
      aliases
    );
  }

  // ATTRIBUTI FISICI
  if (value === null && PHYSICAL.has(name)) {
    value = readObjectValue(
      player?.attributes?.physical,
      aliases
    );
  }

  // Fallback eventuale a struttura piatta.
  if (value === null) {
    value = readObjectValue(
      player,
      aliases
    );
  }

  return normalizeAttribute(
    value,
    fallback
  );
}

function getGKAttribute(
  player,
  name,
  fallback = 50
) {
  const aliases =
    ATTRIBUTE_ALIASES[name] || [name];

  const value =
    readObjectValue(
      player?.attributes?.goalkeeper,
      aliases
    );

  if (value !== null) {
    return normalizeAttribute(value);
  }

  return getAttribute(
    player,
    name,
    fallback
  );
}

// ============================================================
// ROLE PROFILES
// ============================================================

const ROLE_PROFILES = {
  Portiere: {
    attack: 0.02,
    support: 0.15,
    pass: 0.78,
    dribble: 0.02,
    carry: 0.03,
    shoot: 0.001,
    press: 0.08,
    hold: 0.55,
  },

  "Portiere libero": {
    attack: 0.04,
    support: 0.25,
    pass: 0.86,
    dribble: 0.04,
    carry: 0.08,
    shoot: 0.001,
    press: 0.12,
    hold: 0.45,
  },

  Terzino: {
    attack: 0.30,
    support: 0.55,
    pass: 0.68,
    dribble: 0.35,
    carry: 0.35,
    shoot: 0.06,
    press: 0.50,
    hold: 0.20,
  },

  "Terzino di spinta": {
    attack: 0.55,
    support: 0.70,
    pass: 0.70,
    dribble: 0.55,
    carry: 0.55,
    shoot: 0.12,
    press: 0.62,
    hold: 0.15,
  },

  "Terzino offensivo": {
    attack: 0.72,
    support: 0.72,
    pass: 0.72,
    dribble: 0.62,
    carry: 0.62,
    shoot: 0.22,
    press: 0.65,
    hold: 0.12,
  },

  "Esterno basso": {
    attack: 0.35,
    support: 0.62,
    pass: 0.72,
    dribble: 0.30,
    carry: 0.32,
    shoot: 0.05,
    press: 0.52,
    hold: 0.18,
  },

  "Esterno a tutta fascia": {
    attack: 0.65,
    support: 0.75,
    pass: 0.70,
    dribble: 0.58,
    carry: 0.60,
    shoot: 0.16,
    press: 0.68,
    hold: 0.12,
  },

  "Terzino invertito": {
    attack: 0.42,
    support: 0.75,
    pass: 0.82,
    dribble: 0.30,
    carry: 0.36,
    shoot: 0.08,
    press: 0.48,
    hold: 0.18,
  },

  "Esterno invertito": {
    attack: 0.58,
    support: 0.75,
    pass: 0.78,
    dribble: 0.55,
    carry: 0.58,
    shoot: 0.18,
    press: 0.58,
    hold: 0.12,
  },

  "Difensore centrale": {
    attack: 0.08,
    support: 0.32,
    pass: 0.60,
    dribble: 0.08,
    carry: 0.12,
    shoot: 0.01,
    press: 0.42,
    hold: 0.30,
  },

  "Difensore centrale con impostazione": {
    attack: 0.15,
    support: 0.45,
    pass: 0.82,
    dribble: 0.15,
    carry: 0.22,
    shoot: 0.02,
    press: 0.38,
    hold: 0.28,
  },

  "Difensore centrale largo": {
    attack: 0.18,
    support: 0.48,
    pass: 0.68,
    dribble: 0.20,
    carry: 0.25,
    shoot: 0.025,
    press: 0.48,
    hold: 0.25,
  },

  "Difensore arcigno": {
    attack: 0.04,
    support: 0.20,
    pass: 0.42,
    dribble: 0.04,
    carry: 0.05,
    shoot: 0.005,
    press: 0.65,
    hold: 0.40,
  },

  Mediano: {
    attack: 0.18,
    support: 0.65,
    pass: 0.80,
    dribble: 0.18,
    carry: 0.25,
    shoot: 0.04,
    press: 0.62,
    hold: 0.32,
  },

  "Mediano d'attesa": {
    attack: 0.10,
    support: 0.58,
    pass: 0.78,
    dribble: 0.12,
    carry: 0.18,
    shoot: 0.025,
    press: 0.45,
    hold: 0.42,
  },

  "Centrocampista difensivo": {
    attack: 0.18,
    support: 0.62,
    pass: 0.72,
    dribble: 0.20,
    carry: 0.25,
    shoot: 0.04,
    press: 0.62,
    hold: 0.30,
  },

  "Regista arretrato": {
    attack: 0.22,
    support: 0.78,
    pass: 0.92,
    dribble: 0.18,
    carry: 0.28,
    shoot: 0.04,
    press: 0.40,
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
    attack: 0.55,
    support: 0.72,
    pass: 0.65,
    dribble: 0.40,
    carry: 0.45,
    shoot: 0.25,
    press: 0.62,
    hold: 0.15,
  },

  Mezzala: {
    attack: 0.62,
    support: 0.76,
    pass: 0.68,
    dribble: 0.48,
    carry: 0.52,
    shoot: 0.20,
    press: 0.65,
    hold: 0.14,
  },

  Regista: {
    attack: 0.35,
    support: 0.88,
    pass: 0.94,
    dribble: 0.30,
    carry: 0.36,
    shoot: 0.08,
    press: 0.38,
    hold: 0.36,
  },

  Rifinitore: {
    attack: 0.65,
    support: 0.82,
    pass: 0.84,
    dribble: 0.58,
    carry: 0.50,
    shoot: 0.28,
    press: 0.38,
    hold: 0.12,
  },

  Trequartista: {
    attack: 0.72,
    support: 0.78,
    pass: 0.82,
    dribble: 0.68,
    carry: 0.60,
    shoot: 0.32,
    press: 0.35,
    hold: 0.10,
  },

  Ala: {
    attack: 0.72,
    support: 0.62,
    pass: 0.62,
    dribble: 0.72,
    carry: 0.68,
    shoot: 0.28,
    press: 0.62,
    hold: 0.08,
  },

  "Ala invertita": {
    attack: 0.78,
    support: 0.60,
    pass: 0.66,
    dribble: 0.78,
    carry: 0.70,
    shoot: 0.38,
    press: 0.60,
    hold: 0.06,
  },

  "Attaccante esterno": {
    attack: 0.82,
    support: 0.58,
    pass: 0.60,
    dribble: 0.75,
    carry: 0.70,
    shoot: 0.42,
    press: 0.62,
    hold: 0.05,
  },

  "Ala interna": {
    attack: 0.84,
    support: 0.60,
    pass: 0.64,
    dribble: 0.72,
    carry: 0.68,
    shoot: 0.48,
    press: 0.62,
    hold: 0.04,
  },

  "Seconda punta": {
    attack: 0.86,
    support: 0.64,
    pass: 0.62,
    dribble: 0.68,
    carry: 0.64,
    shoot: 0.58,
    press: 0.62,
    hold: 0.04,
  },

  "Trequartista avanzato": {
    attack: 0.88,
    support: 0.70,
    pass: 0.78,
    dribble: 0.70,
    carry: 0.62,
    shoot: 0.55,
    press: 0.50,
    hold: 0.03,
  },

  "Attaccante avanzato": {
    attack: 0.96,
    support: 0.35,
    pass: 0.45,
    dribble: 0.58,
    carry: 0.55,
    shoot: 0.88,
    press: 0.60,
    hold: 0.02,
  },

  "Attaccante di pressione": {
    attack: 0.88,
    support: 0.38,
    pass: 0.48,
    dribble: 0.52,
    carry: 0.45,
    shoot: 0.72,
    press: 0.92,
    hold: 0.02,
  },

  "Attaccante boa": {
    attack: 0.82,
    support: 0.60,
    pass: 0.62,
    dribble: 0.30,
    carry: 0.25,
    shoot: 0.82,
    press: 0.35,
    hold: 0.18,
  },

  "Attaccante completo": {
    attack: 0.94,
    support: 0.72,
    pass: 0.68,
    dribble: 0.62,
    carry: 0.58,
    shoot: 0.82,
    press: 0.68,
    hold: 0.04,
  },
};

function getRoleProfile(role) {
  const normalizedRole =
    normalizeRole(role);

  return (
    ROLE_PROFILES[normalizedRole] ||
    ROLE_PROFILES.Centrocampista
  );
}

// ============================================================
// POSITIONS
// ============================================================

function getPosition(player) {
  const rawX =
    player?.actualPosition?.x ??
    player?.position?.x ??
    player?.x ??
    0.5;

  const rawY =
    player?.actualPosition?.y ??
    player?.position?.y ??
    player?.y ??
    0.5;

  const x =
    Number(rawX) > 1
      ? Number(rawX) / 100
      : Number(rawX);

  const y =
    Number(rawY) > 1
      ? Number(rawY) / 100
      : Number(rawY);

  return {
    x: clamp(x, 0, 1),
    y: clamp(y, 0, 1),
  };
}

function getBallPosition(ball) {
  if (!ball) {
    return {
      x: 0.5,
      y: 0.5,
    };
  }

  const rawX =
    Number(ball.x ?? 0.5);

  const rawY =
    Number(ball.y ?? 0.5);

  return {
    x: clamp(
      rawX > 1 ? rawX / 100 : rawX
    ),

    y: clamp(
      rawY > 1 ? rawY / 100 : rawY
    ),
  };
}

function distance(a, b) {
  if (!a || !b) {
    return 1;
  }

  const dx =
    Number(a.x) - Number(b.x);

  const dy =
    Number(a.y) - Number(b.y);

  return Math.sqrt(
    dx * dx +
    dy * dy
  );
}

function getGoalPosition(side) {
  return side === "home"
    ? {
        x: 1,
        y: 0.5,
      }
    : {
        x: 0,
        y: 0.5,
      };
}

function getAttackDirection(side) {
  return side === "home"
    ? 1
    : -1;
}

function getProgressToGoal(
  player,
  side
) {
  const pos =
    getPosition(player);

  return side === "home"
    ? clamp(pos.x)
    : clamp(1 - pos.x);
}

// ============================================================
// PRESSURE / SPACE
// ============================================================

function calculatePressure(
  player,
  opponents = []
) {
  const playerPos =
    getPosition(player);

  const opponentList =
    toPlayerArray(opponents);

  let nearest =
    Infinity;

  for (const opponent of opponentList) {
    const opponentPos =
      getPosition(opponent);

    const d =
      distance(
        playerPos,
        opponentPos
      );

    if (d < nearest) {
      nearest = d;
    }
  }

  if (!Number.isFinite(nearest)) {
    return 0;
  }

  return clamp(
    1 - nearest / 0.25
  );
}

function calculateFreeSpace(
  player,
  opponents = []
) {
  const playerPos =
    getPosition(player);

  const opponentList =
    toPlayerArray(opponents);

  let nearest =
    Infinity;

  for (const opponent of opponentList) {
    const opponentPos =
      getPosition(opponent);

    const d =
      distance(
        playerPos,
        opponentPos
      );

    if (d < nearest) {
      nearest = d;
    }
  }

  if (!Number.isFinite(nearest)) {
    return 1;
  }

  return clamp(
    nearest / 0.35
  );
}

// ============================================================
// PASS TARGET
// ============================================================

function scorePassTarget(
  passer,
  receiver,
  side,
  opponents = [],
  teamInstructions = {}
) {
  if (
    !receiver ||
    receiver.id === passer?.id
  ) {
    return -Infinity;
  }

  const passerPos =
    getPosition(passer);

  const receiverPos =
    getPosition(receiver);

  const passDistance =
    distance(
      passerPos,
      receiverPos
    );

  if (passDistance > 0.65) {
    return -Infinity;
  }

  const direction =
    getAttackDirection(side);

  const progression =
    direction *
    (
      receiverPos.x -
      passerPos.x
    );

  const receiverSpace =
    calculateFreeSpace(
      receiver,
      opponents
    );

  const receiverQuality =
    getAttribute(
      receiver,
      "primoControllo"
    ) * 0.35 +

    getAttribute(
      receiver,
      "passaggi"
    ) * 0.20 +

    getAttribute(
      receiver,
      "decisioni"
    ) * 0.20 +

    getAttribute(
      receiver,
      "visione"
    ) * 0.15 +

    getAttribute(
      receiver,
      "giocoDiSquadra"
    ) * 0.10;

  const progressionScore =
    clamp(
      0.5 +
      progression * 2
    );

  const distanceScore =
    1 -
    clamp(
      passDistance / 0.65
    );

  const passRisk =
    normalizeText(
      teamInstructions?.passRisk ??
      teamInstructions?.rischioPassaggio ??
      ""
    );

  let tacticalRisk = 0;

  if (
    passRisk === "high" ||
    passRisk === "alto"
  ) {
    tacticalRisk = 0.10;
  }

  if (
    passRisk === "low" ||
    passRisk === "basso"
  ) {
    tacticalRisk = -0.10;
  }

  return (
    progressionScore * 0.32 +
    receiverSpace * 0.25 +
    receiverQuality * 0.18 +
    distanceScore * 0.15 +
    0.10 +
    tacticalRisk
  );
}

function findBestPassTarget(
  passer,
  teammates = [],
  opponents = [],
  side = "home",
  teamInstructions = {}
) {
  const teammateList =
    toPlayerArray(teammates);

  let bestTarget = null;
  let bestScore = -Infinity;

  for (const teammate of teammateList) {
    const score =
      scorePassTarget(
        passer,
        teammate,
        side,
        opponents,
        teamInstructions
      );

    if (score > bestScore) {
      bestScore = score;
      bestTarget = teammate;
    }
  }

  return {
    target: bestTarget,
    score: bestScore,
  };
}

// ============================================================
// ROLE GROUPS
// ============================================================

function isGoalkeeperRole(role) {
  const r =
    normalizeRole(role);

  return (
    r === "Portiere" ||
    r === "Portiere libero"
  );
}

function isDefenderRole(role) {
  const r =
    normalizeRole(role);

  return [
    "Terzino",
    "Terzino di spinta",
    "Terzino offensivo",
    "Esterno basso",
    "Esterno a tutta fascia",
    "Terzino invertito",
    "Esterno invertito",
    "Difensore centrale",
    "Difensore centrale con impostazione",
    "Difensore centrale largo",
    "Difensore arcigno",
  ].includes(r);
}

function isMidfieldRole(role) {
  const r =
    normalizeRole(role);

  return [
    "Mediano",
    "Mediano d'attesa",
    "Centrocampista difensivo",
    "Regista arretrato",
    "Centrocampista",
    "Centrocampista incursore",
    "Mezzala",
    "Regista",
    "Rifinitore",
    "Trequartista",
  ].includes(r);
}

function isAttackingRole(role) {
  const r =
    normalizeRole(role);

  return [
    "Ala",
    "Ala invertita",
    "Attaccante esterno",
    "Ala interna",
    "Seconda punta",
    "Trequartista avanzato",
    "Attaccante avanzato",
    "Attaccante di pressione",
    "Attaccante boa",
    "Attaccante completo",
  ].includes(r);
}

// ============================================================
// MENTALITY
// ============================================================

function getMentalityModifier(
  teamInstructions = {}
) {
  const mentality =
    normalizeText(
      teamInstructions?.mentality ??
      teamInstructions?.mentalita ??
      "balanced"
    );

  if (
    mentality === "very attacking" ||
    mentality === "molto offensiva" ||
    mentality === "attacking" ||
    mentality === "offensiva"
  ) {
    return {
      attack: 0.14,
      shoot: 0.12,
      passRisk: 0.08,
    };
  }

  if (
    mentality === "defensive" ||
    mentality === "difensiva"
  ) {
    return {
      attack: -0.10,
      shoot: -0.10,
      passRisk: -0.06,
    };
  }

  return {
    attack: 0,
    shoot: 0,
    passRisk: 0,
  };
}

// ============================================================
// SHOOT
// ============================================================

function scoreShot(
  player,
  side,
  ball,
  opponents = [],
  teamInstructions = {}
) {
  const role =
    getRole(player);

  // MAI tiro normale del portiere.
  if (isGoalkeeperRole(role)) {
    return 0.0001;
  }

  const pos =
    getPosition(player);

  const ballPos =
    getBallPosition(ball);

  const goal =
    getGoalPosition(side);

  const goalDistance =
    distance(
      ballPos,
      goal
    );

  const progress =
    getProgressToGoal(
      player,
      side
    );

  const inFinalThird =
    progress >= 0.67;

  const inShootingZone =
    progress >= 0.72;

  const inPenaltyZone =
    progress >= 0.84 &&
    Math.abs(
      pos.y - 0.5
    ) <= 0.25;

  const pressure =
    calculatePressure(
      player,
      opponents
    );

  const space =
    calculateFreeSpace(
      player,
      opponents
    );

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

  const profile =
    getRoleProfile(role);

  const mentality =
    getMentalityModifier(
      teamInstructions
    );

  let quality =
    finishing * 0.32 +
    shooting * 0.22 +
    technique * 0.10 +
    decisions * 0.12 +
    composure * 0.10 +
    space * 0.08 +
    profile.shoot * 0.06;

  // Lontano dalla porta:
  // entra in gioco molto di piÃ¹ il tiro da lontano.
  if (goalDistance > 0.32) {
    quality *=
      0.45 +
      longShots * 0.55;
  }

  // Fuori dalla zona offensiva:
  // tiro molto raro.
  if (!inFinalThird) {
    quality *= 0.08;
  }

  if (inShootingZone) {
    quality *= 1.45;
  }

  if (inPenaltyZone) {
    quality *= 1.35;
  }

  quality *=
    1 -
    pressure * 0.45;

  quality *=
    1 +
    mentality.shoot;

  if (isAttackingRole(role)) {
    quality *= 1.20;
  }

  if (isDefenderRole(role)) {
    quality *=
      inFinalThird
        ? 0.55
        : 0.08;
  }

  if (
    isMidfieldRole(role) &&
    goalDistance > 0.32
  ) {
    quality *= 1.15;
  }

  return clamp(quality);
}

// ============================================================
// DRIBBLE
// ============================================================

function scoreDribble(
  player,
  side,
  opponents = []
) {
  const role =
    getRole(player);

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

  const pressure =
    calculatePressure(
      player,
      opponents
    );

  const space =
    calculateFreeSpace(
      player,
      opponents
    );

  const progress =
    getProgressToGoal(
      player,
      side
    );

  const profile =
    getRoleProfile(role);

  let score =
    dribbling * 0.34 +
    technique * 0.18 +
    acceleration * 0.16 +
    agility * 0.14 +
    decisions * 0.08 +
    space * 0.06 +
    profile.dribble * 0.04;

  score *=
    0.55 +
    space * 0.45;

  score *=
    1 -
    pressure * 0.30;

  if (isAttackingRole(role)) {
    score *= 1.20;
  }

  if (progress < 0.30) {
    score *= 0.70;
  }

  return clamp(score);
}

// ============================================================
// CARRY
// ============================================================

function scoreCarry(
  player,
  side,
  opponents = []
) {
  const role =
    getRole(player);

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

  const space =
    calculateFreeSpace(
      player,
      opponents
    );

  const pressure =
    calculatePressure(
      player,
      opponents
    );

  const progress =
    getProgressToGoal(
      player,
      side
    );

  const profile =
    getRoleProfile(role);

  let score =
    space * 0.25 +
    dribbling * 0.22 +
    acceleration * 0.16 +
    speed * 0.12 +
    agility * 0.10 +
    decisions * 0.08 +
    profile.carry * 0.07;

  score *=
    0.60 +
    space * 0.40;

  score *=
    1 -
    pressure * 0.25;

  if (isAttackingRole(role)) {
    score *= 1.25;
  }

  if (progress < 0.25) {
    score *= 0.75;
  }

  return clamp(score);
}

// ============================================================
// PASS
// ============================================================

function scorePass(
  player,
  bestPass,
  side,
  opponents = [],
  teamInstructions = {}
) {
  if (!bestPass?.target) {
    return 0.01;
  }

  const role =
    getRole(player);

  const passing =
    getAttribute(
      player,
      "passaggi"
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

  const vision =
    getAttribute(
      player,
      "visione"
    );

  const anticipation =
    getAttribute(
      player,
      "anticipazione"
    );

  const pressure =
    calculatePressure(
      player,
      opponents
    );

  const profile =
    getRoleProfile(role);

  const progress =
    getProgressToGoal(
      player,
      side
    );

  const mentality =
    getMentalityModifier(
      teamInstructions
    );

  let score =
    bestPass.score * 0.35 +
    passing * 0.20 +
    technique * 0.10 +
    decisions * 0.13 +
    vision * 0.12 +
    anticipation * 0.05 +
    profile.pass * 0.05;

  score *=
    1 -
    pressure * 0.20;

  score +=
    mentality.passRisk * 0.08;

  if (progress > 0.68) {
    score *= 0.88;
  }

  if (isAttackingRole(role)) {
    score *= 0.92;
  }

  return clamp(score);
}

// ============================================================
// HOLD
// ============================================================

function scoreHold(
  player,
  opponents = []
) {
  const role =
    getRole(player);

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

  const technique =
    getAttribute(
      player,
      "tecnica"
    );

  const pressure =
    calculatePressure(
      player,
      opponents
    );

  const profile =
    getRoleProfile(role);

  let score =
    profile.hold * 0.45 +
    decisions * 0.20 +
    composure * 0.15 +
    technique * 0.10;

  score *=
    1 -
    pressure * 0.40;

  return clamp(score);
}

// ============================================================
// WITH BALL
// ============================================================

function evaluateWithBall(
  player,
  teammates,
  opponents,
  ball,
  side,
  teamInstructions
) {
  const role =
    getRole(player);

  const profile =
    getRoleProfile(role);

  const bestPass =
    findBestPassTarget(
      player,
      teammates,
      opponents,
      side,
      teamInstructions
    );

  const passScore =
    scorePass(
      player,
      bestPass,
      side,
      opponents,
      teamInstructions
    );

  const dribbleScore =
    scoreDribble(
      player,
      side,
      opponents
    );

  const carryScore =
    scoreCarry(
      player,
      side,
      opponents
    );

  const shotScore =
    scoreShot(
      player,
      side,
      ball,
      opponents,
      teamInstructions
    );

  const holdScore =
    scoreHold(
      player,
      opponents
    );

  const progress =
    getProgressToGoal(
      player,
      side
    );

  const position =
    getPosition(player);

  const ballPosition =
    getBallPosition(ball);

  const goal =
    getGoalPosition(side);

  const goalDistance =
    distance(
      ballPosition,
      goal
    );

  const pressure =
    calculatePressure(
      player,
      opponents
    );

  const freeSpace =
    calculateFreeSpace(
      player,
      opponents
    );

  const inFinalThird =
    progress >= 0.67;

  const inShootingZone =
    progress >= 0.72;

  const inPenaltyZone =
    progress >= 0.84 &&
    Math.abs(
      position.y - 0.5
    ) <= 0.25;

  const candidates = [
    {
      action: ACTIONS.PASS,
      score: passScore,
    },

    {
      action: ACTIONS.DRIBBLE,
      score:
        dribbleScore *
        profile.dribble,
    },

    {
      action: ACTIONS.CARRY,
      score:
        carryScore *
        profile.carry,
    },

    {
      action: ACTIONS.SHOOT,
      score: shotScore,
    },

    {
      action: ACTIONS.HOLD,
      score: holdScore,
    },
  ];

  // ==========================================================
  // GOALKEEPER
  // ==========================================================

  if (isGoalkeeperRole(role)) {
    for (const candidate of candidates) {
      if (
        candidate.action ===
        ACTIONS.SHOOT
      ) {
        candidate.score = 0.0001;
      }

      if (
        candidate.action ===
          ACTIONS.DRIBBLE ||
        candidate.action ===
          ACTIONS.CARRY
      ) {
        candidate.score *= 0.10;
      }
    }

    const passCandidate =
      candidates.find(
        (c) =>
          c.action ===
          ACTIONS.PASS
      );

    if (passCandidate) {
      passCandidate.score *= 1.30;
    }
  }

  // ==========================================================
  // FINAL THIRD
  // ==========================================================

  if (inFinalThird) {
    const shotCandidate =
      candidates.find(
        (c) =>
          c.action ===
          ACTIONS.SHOOT
      );

    if (shotCandidate) {
      shotCandidate.score *= 1.30;
    }

    const passCandidate =
      candidates.find(
        (c) =>
          c.action ===
          ACTIONS.PASS
      );

    if (passCandidate) {
      passCandidate.score *= 0.92;
    }
  }

  // ==========================================================
  // PENALTY AREA
  // ==========================================================

  if (inPenaltyZone) {
    const shotCandidate =
      candidates.find(
        (c) =>
          c.action ===
          ACTIONS.SHOOT
      );

    if (shotCandidate) {
      shotCandidate.score *= 1.65;
    }
  }

  // ==========================================================
  // OUTSIDE FINAL THIRD
  // ==========================================================

  if (!inFinalThird) {
    const shotCandidate =
      candidates.find(
        (c) =>
          c.action ===
          ACTIONS.SHOOT
      );

    if (shotCandidate) {
      shotCandidate.score *= 0.25;
    }
  }

  // ==========================================================
  // HIGH PRESSURE
  // ==========================================================

  if (pressure > 0.75) {
    const holdCandidate =
      candidates.find(
        (c) =>
          c.action ===
          ACTIONS.HOLD
      );

    if (holdCandidate) {
      holdCandidate.score *= 0.50;
    }

    const passCandidate =
      candidates.find(
        (c) =>
          c.action ===
          ACTIONS.PASS
      );

    if (passCandidate) {
      passCandidate.score *= 1.15;
    }
  }

  candidates.sort(
    (a, b) =>
      b.score -
      a.score
  );

  const best =
    candidates[0] || {
      action: ACTIONS.HOLD,
      score: 0,
    };

  return {
    playerId: player.id,

    action:
      best.action,

    score: Number(
      clamp(
        best.score
      ).toFixed(4)
    ),

    role,

    roleProfile:
      profile,

    targetId:
      best.action === ACTIONS.PASS
        ? bestPass?.target?.id ?? null
        : null,

    passTargetId:
      best.action === ACTIONS.PASS
        ? bestPass?.target?.id ?? null
        : null,

    pressure: Number(
      pressure.toFixed(4)
    ),

    freeSpace: Number(
      freeSpace.toFixed(4)
    ),

    progressToGoal: Number(
      progress.toFixed(4)
    ),

    goalDistance: Number(
      goalDistance.toFixed(4)
    ),

    inFinalThird,

    inShootingZone,

    inPenaltyZone,

    scores: {
      pass: Number(
        passScore.toFixed(4)
      ),

      dribble: Number(
        (
          dribbleScore *
          profile.dribble
        ).toFixed(4)
      ),

      carry: Number(
        (
          carryScore *
          profile.carry
        ).toFixed(4)
      ),

      shoot: Number(
        shotScore.toFixed(4)
      ),

      hold: Number(
        holdScore.toFixed(4)
      ),
    },
  };
}

// ============================================================
// WITHOUT BALL
// ============================================================

function evaluateWithoutBall(
  player,
  teammates,
  opponents,
  ball,
  side
) {
  const role =
    getRole(player);

  const profile =
    getRoleProfile(role);

  const playerPosition =
    getPosition(player);

  const ballPosition =
    getBallPosition(ball);

  const distanceToBall =
    distance(
      playerPosition,
      ballPosition
    );

  const pressure =
    calculatePressure(
      player,
      opponents
    );

  const freeSpace =
    calculateFreeSpace(
      player,
      opponents
    );

  const movement =
    getAttribute(
      player,
      "movimentoSenzaPalla"
    );

  const positioning =
    getAttribute(
      player,
      "posizionamento"
    );

  const anticipation =
    getAttribute(
      player,
      "anticipazione"
    );

  const teamwork =
    getAttribute(
      player,
      "giocoDiSquadra"
    );

  const workRate =
    getAttribute(
      player,
      "impegno"
    );

  const progress =
    getProgressToGoal(
      player,
      side
    );

  // PRESS
  let pressScore =
    profile.press * 0.30 +
    anticipation * 0.20 +
    positioning * 0.18 +
    workRate * 0.16 +
    teamwork * 0.08;

  const distancePressure =
    1 -
    clamp(
      distanceToBall /
      0.40
    );

  pressScore *=
    0.35 +
    distancePressure * 0.65;

  // SUPPORT
  let supportScore =
    profile.support * 0.30 +
    movement * 0.20 +
    positioning * 0.18 +
    teamwork * 0.18 +
    freeSpace * 0.14;

  // MOVE
  let moveScore =
    profile.attack * 0.22 +
    movement * 0.25 +
    positioning * 0.20 +
    teamwork * 0.12 +
    freeSpace * 0.21;

  if (isGoalkeeperRole(role)) {
    pressScore *= 0.15;
    moveScore *= 0.20;
    supportScore *= 0.65;
  }

  if (isDefenderRole(role)) {
    moveScore *= 0.70;
  }

  if (isAttackingRole(role)) {
    moveScore *= 1.15;
  }

  const candidates = [
    {
      action: ACTIONS.PRESS,
      score: pressScore,
    },

    {
      action: ACTIONS.SUPPORT,
      score: supportScore,
    },

    {
      action: ACTIONS.MOVE,
      score: moveScore,
    },
  ];

  candidates.sort(
    (a, b) =>
      b.score -
      a.score
  );

  const best =
    candidates[0] || {
      action: ACTIONS.MOVE,
      score: 0,
    };

  return {
    playerId: player.id,

    action:
      best.action,

    score: Number(
      clamp(
        best.score
      ).toFixed(4)
    ),

    role,

    roleProfile:
      profile,

    targetId: null,

    passTargetId: null,

    pressure: Number(
      pressure.toFixed(4)
    ),

    freeSpace: Number(
      freeSpace.toFixed(4)
    ),

    progressToGoal: Number(
      progress.toFixed(4)
    ),

    distanceToBall: Number(
      distanceToBall.toFixed(4)
    ),

    scores: {
      press: Number(
        clamp(
          pressScore
        ).toFixed(4)
      ),

      support: Number(
        clamp(
          supportScore
        ).toFixed(4)
      ),

      move: Number(
        clamp(
          moveScore
        ).toFixed(4)
      ),
    },
  };
}

// ============================================================
// PLAYER
// ============================================================

function evaluatePlayer(
  player,
  teammates = [],
  opponents = [],
  ball = null,
  side = "home",
  teamInstructions = {},
  possession = null
) {
  if (!player) {
    return {
      playerId: null,
      action: ACTIONS.NONE,
      score: 0,
    };
  }

  const ownerId =
    possession?.playerId ??
    possession?.ballOwnerId ??
    possession?.ownerId ??
    possession?.player?.id ??
    null;

  const explicitHasBall =
    player.hasBall === true ||
    player.has_ball === true;

  const hasBall =
    explicitHasBall ||
    (
      ownerId !== null &&
      player.id === ownerId
    );

  if (hasBall) {
    return evaluateWithBall(
      player,
      teammates,
      opponents,
      ball,
      side,
      teamInstructions
    );
  }

  return evaluateWithoutBall(
    player,
    teammates,
    opponents,
    ball,
    side
  );
}

// ============================================================
// TEAM
// ============================================================

function evaluateTeam(config = {}, ...legacyArgs) {
  let players;
  let opponents;
  let ball;
  let side;
  let teamInstructions;
  let possession;

  // Nuovo contratto: evaluateTeam({ ... })
  if (
    config &&
    typeof config === "object" &&
    !Array.isArray(config) &&
    ("players" in config || "opponents" in config)
  ) {
    players = config.players ?? [];
    opponents = config.opponents ?? [];
    ball = config.ball ?? null;
    side = config.side ?? null;
    teamInstructions = config.teamInstructions ?? {};
    possession = config.possession ?? null;
  } else {
    // CompatibilitÃ  con il vecchio contratto posizionale.
    players = config ?? [];
    opponents = legacyArgs[0] ?? [];
    ball = legacyArgs[1] ?? null;
    side = legacyArgs[2] ?? null;
    teamInstructions = legacyArgs[3] ?? {};
    possession = legacyArgs[4] ?? null;
  }

  const playerList = toPlayerArray(players);
  const opponentList = toPlayerArray(opponents);

  if (side !== "home" && side !== "away") {
    const firstPlayer = playerList.find(Boolean);
    side =
      firstPlayer?.side ??
      firstPlayer?.team ??
      "home";
  }

  const decisions = [];

  for (const player of playerList) {
    if (!player) continue;

    if (
      player.onPitch === false ||
      player.matchState?.onPitch === false
    ) {
      continue;
    }

    const teammates =
      playerList.filter(
        (teammate) =>
          teammate &&
          teammate.id !== player.id &&
          teammate.onPitch !== false &&
          teammate.matchState?.onPitch !== false
      );

    const activeOpponents =
      opponentList.filter(
        (opponent) =>
          opponent &&
          opponent.onPitch !== false &&
          opponent.matchState?.onPitch !== false
      );

    const decision =
      evaluatePlayer(
        player,
        teammates,
        activeOpponents,
        ball,
        side,
        teamInstructions,
        possession
      );

    if (decision && typeof decision === "object") {
      decisions.push({
        ...decision,

        playerId:
          decision.playerId ??
          player.id,

        action:
          decision.action ??
          ACTIONS.NONE,

        score: Number.isFinite(
          Number(decision.score)
        )
          ? Number(decision.score)
          : 0,
      });
    } else {
      decisions.push({
        playerId: player.id,
        action: ACTIONS.NONE,
        score: 0,
        role: getRole(player),
      });
    }
  }

  return decisions;
}

// ============================================================
// DEBUG
// ============================================================

function evaluateTeamDebug(config = {}, ...legacyArgs) {
  let players;
  let opponents;
  let ball;
  let side;
  let teamInstructions;
  let possession;

  if (
    config &&
    typeof config === "object" &&
    !Array.isArray(config) &&
    ("players" in config || "opponents" in config)
  ) {
    players = config.players ?? [];
    opponents = config.opponents ?? [];
    ball = config.ball ?? null;
    side = config.side ?? null;
    teamInstructions = config.teamInstructions ?? {};
    possession = config.possession ?? null;
  } else {
    players = config ?? [];
    opponents = legacyArgs[0] ?? [];
    ball = legacyArgs[1] ?? null;
    side = legacyArgs[2] ?? null;
    teamInstructions = legacyArgs[3] ?? {};
    possession = legacyArgs[4] ?? null;
  }

  const playerList = toPlayerArray(players);
  const opponentList = toPlayerArray(opponents);

  if (side !== "home" && side !== "away") {
    const firstPlayer = playerList.find(Boolean);
    side =
      firstPlayer?.side ??
      firstPlayer?.team ??
      "home";
  }

  const decisions = evaluateTeam({
    players: playerList,
    opponents: opponentList,
    ball,
    side,
    teamInstructions,
    possession,
  });

  return {
    side,
    possession,
    ball,
    decisions,

    players:
      playerList.map(
        (player) => ({
          playerId:
            player.id,

          name:
            player.name ??
            player.fullName ??
            player.id,

          rawRole:
            player.role ??
            player.assignedRole ??
            player.primaryRole ??
            null,

          normalizedRole:
            getRole(player),

          attributes: {
            passaggi:
              Math.round(
                getAttribute(
                  player,
                  "passaggi"
                ) * 99
              ),

            tecnica:
              Math.round(
                getAttribute(
                  player,
                  "tecnica"
                ) * 99
              ),

            dribbling:
              Math.round(
                getAttribute(
                  player,
                  "dribbling"
                ) * 99
              ),

            tiro:
              Math.round(
                getAttribute(
                  player,
                  "tiro"
                ) * 99
              ),

            finalizzazione:
              Math.round(
                getAttribute(
                  player,
                  "finalizzazione"
                ) * 99
              ),

            decisioni:
              Math.round(
                getAttribute(
                  player,
                  "decisioni"
                ) * 99
              ),

            visione:
              Math.round(
                getAttribute(
                  player,
                  "visione"
                ) * 99
              ),

            posizionamento:
              Math.round(
                getAttribute(
                  player,
                  "posizionamento"
                ) * 99
              ),
          },

          decision:
            decisions.find(
              (decision) =>
                decision.playerId ===
                player.id
            ) ?? null,
        })
      ),
  };
}

// ============================================================
// EXPORTS
// ============================================================

export {
  ACTIONS,

  normalizeRole,

  getRole,

  getRoleProfile,

  getAttribute,

  getGKAttribute,

  calculatePressure,

  calculateFreeSpace,

  findBestPassTarget,

  evaluatePlayer,

  evaluateTeam,

  evaluateTeamDebug,
};

export default {
  ACTIONS,

  normalizeRole,

  getRole,

  getRoleProfile,

  getAttribute,

  getGKAttribute,

  calculatePressure,

  calculateFreeSpace,

  findBestPassTarget,

  evaluatePlayer,

  evaluateTeam,

  evaluateTeamDebug,
};

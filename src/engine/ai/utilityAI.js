/**
 * UTILITY AI
 *
 * L'Utility AI decide quale comportamento è più utile
 * per ogni giocatore nel contesto corrente.
 *
 * IMPORTANTE:
 *
 * Questo modulo DECIDE.
 * Non esegue l'azione.
 *
 * Il Match Engine passa le decisioni al sistema corretto
 * che poi le esegue.
 *
 * Pipeline:
 *
 * WORLD STATE
 *     ↓
 * SPATIAL GRID
 *     ↓
 * UTILITY AI
 *     ↓
 * DECISION
 *     ↓
 * MOVEMENT / POSSESSION / PRESSING
 */


/* =========================================================
 * COSTANTI
 * ========================================================= */

const ACTIONS = {
  HOLD: "hold",
  MOVE: "move",
  PASS: "pass",
  DRIBBLE: "dribble",
  SUPPORT: "support",
  PRESS: "press",
};


const DEFAULT_SCORE = 0;


/* =========================================================
 * UTILITY
 * ========================================================= */

function clamp(value, min, max) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}


function clamp01(value) {
  return clamp(
    value,
    0,
    1
  );
}


function distance(a, b) {
  if (!a || !b) {
    return Infinity;
  }

  const dx =
    a.x - b.x;

  const dy =
    a.y - b.y;

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

  if (
    Number.isFinite(value)
  ) {
    return clamp(
      value,
      1,
      99
    );
  }

  return fallback;
}


function averageAttributes(
  player,
  attributes
) {
  if (
    !attributes?.length
  ) {
    return 50;
  }

  let total = 0;

  for (
    const attribute
    of attributes
  ) {
    total +=
      getAttribute(
        player,
        attribute
      );
  }

  return (
    total /
    attributes.length
  );
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


/**
 * Restituisce un profilo comportamentale del ruolo.
 *
 * Non calcoliamo l'OVR qui.
 * Il ruolo serve esclusivamente a orientare
 * la scelta dell'azione.
 */
function getRoleProfile(role) {
  const profiles = {
    Portiere: {
      attack: 0.05,
      support: 0.20,
      pass: 0.50,
      dribble: 0.05,
      press: 0.05,
      hold: 0.40,
    },

    "Portiere libero": {
      attack: 0.15,
      support: 0.35,
      pass: 0.60,
      dribble: 0.10,
      press: 0.10,
      hold: 0.30,
    },

    "Difensore centrale": {
      attack: 0.15,
      support: 0.25,
      pass: 0.55,
      dribble: 0.10,
      press: 0.25,
      hold: 0.40,
    },

    "Difensore centrale con impostazione": {
      attack: 0.20,
      support: 0.35,
      pass: 0.75,
      dribble: 0.15,
      press: 0.20,
      hold: 0.35,
    },

    "Difensore centrale largo": {
      attack: 0.20,
      support: 0.45,
      pass: 0.55,
      dribble: 0.20,
      press: 0.30,
      hold: 0.35,
    },

    "Difensore arcigno": {
      attack: 0.05,
      support: 0.10,
      pass: 0.25,
      dribble: 0.03,
      press: 0.55,
      hold: 0.55,
    },

    Terzino: {
      attack: 0.30,
      support: 0.50,
      pass: 0.50,
      dribble: 0.25,
      press: 0.50,
      hold: 0.25,
    },

    "Terzino di spinta": {
      attack: 0.55,
      support: 0.70,
      pass: 0.55,
      dribble: 0.40,
      press: 0.50,
      hold: 0.15,
    },

    "Terzino offensivo": {
      attack: 0.70,
      support: 0.80,
      pass: 0.55,
      dribble: 0.50,
      press: 0.40,
      hold: 0.10,
    },

    "Esterno basso": {
      attack: 0.25,
      support: 0.55,
      pass: 0.55,
      dribble: 0.20,
      press: 0.55,
      hold: 0.25,
    },

    "Esterno a tutta fascia": {
      attack: 0.65,
      support: 0.80,
      pass: 0.50,
      dribble: 0.50,
      press: 0.65,
      hold: 0.10,
    },

    "Terzino invertito": {
      attack: 0.35,
      support: 0.60,
      pass: 0.70,
      dribble: 0.20,
      press: 0.40,
      hold: 0.25,
    },

    "Esterno invertito": {
      attack: 0.50,
      support: 0.70,
      pass: 0.65,
      dribble: 0.35,
      press: 0.45,
      hold: 0.15,
    },

    Mediano: {
      attack: 0.20,
      support: 0.65,
      pass: 0.75,
      dribble: 0.15,
      press: 0.60,
      hold: 0.30,
    },

    "Mediano d'attesa": {
      attack: 0.10,
      support: 0.60,
      pass: 0.75,
      dribble: 0.05,
      press: 0.35,
      hold: 0.55,
    },

    "Centrocampista difensivo": {
      attack: 0.15,
      support: 0.55,
      pass: 0.65,
      dribble: 0.10,
      press: 0.60,
      hold: 0.35,
    },

    "Regista arretrato": {
      attack: 0.25,
      support: 0.75,
      pass: 0.90,
      dribble: 0.15,
      press: 0.25,
      hold: 0.35,
    },

    Centrocampista: {
      attack: 0.35,
      support: 0.65,
      pass: 0.65,
      dribble: 0.30,
      press: 0.50,
      hold: 0.25,
    },

    "Centrocampista incursore": {
      attack: 0.70,
      support: 0.60,
      pass: 0.55,
      dribble: 0.40,
      press: 0.60,
      hold: 0.10,
    },

    Mezzala: {
      attack: 0.60,
      support: 0.75,
      pass: 0.65,
      dribble: 0.40,
      press: 0.55,
      hold: 0.15,
    },

    Regista: {
      attack: 0.35,
      support: 0.80,
      pass: 0.90,
      dribble: 0.20,
      press: 0.30,
      hold: 0.30,
    },

    Rifinitore: {
      attack: 0.70,
      support: 0.80,
      pass: 0.85,
      dribble: 0.55,
      press: 0.25,
      hold: 0.10,
    },

    Trequartista: {
      attack: 0.80,
      support: 0.75,
      pass: 0.80,
      dribble: 0.60,
      press: 0.25,
      hold: 0.05,
    },

    Ala: {
      attack: 0.75,
      support: 0.60,
      pass: 0.60,
      dribble: 0.75,
      press: 0.50,
      hold: 0.10,
    },

    "Ala invertita": {
      attack: 0.80,
      support: 0.65,
      pass: 0.65,
      dribble: 0.75,
      press: 0.45,
      hold: 0.05,
    },

    "Attaccante esterno": {
      attack: 0.80,
      support: 0.55,
      pass: 0.55,
      dribble: 0.70,
      press: 0.55,
      hold: 0.05,
    },

    "Ala interna": {
      attack: 0.85,
      support: 0.65,
      pass: 0.65,
      dribble: 0.70,
      press: 0.50,
      hold: 0.05,
    },

    "Seconda punta": {
      attack: 0.90,
      support: 0.55,
      pass: 0.60,
      dribble: 0.65,
      press: 0.60,
      hold: 0.05,
    },

    "Trequartista avanzato": {
      attack: 0.90,
      support: 0.70,
      pass: 0.80,
      dribble: 0.65,
      press: 0.40,
      hold: 0.05,
    },

    "Attaccante avanzato": {
      attack: 0.95,
      support: 0.30,
      pass: 0.35,
      dribble: 0.55,
      press: 0.55,
      hold: 0.05,
    },

    "Attaccante di pressione": {
      attack: 0.80,
      support: 0.30,
      pass: 0.35,
      dribble: 0.45,
      press: 0.95,
      hold: 0.05,
    },

    "Attaccante boa": {
      attack: 0.75,
      support: 0.50,
      pass: 0.65,
      dribble: 0.30,
      press: 0.35,
      hold: 0.25,
    },

    "Attaccante completo": {
      attack: 0.95,
      support: 0.70,
      pass: 0.70,
      dribble: 0.65,
      press: 0.65,
      hold: 0.05,
    },
  };

  return (
    profiles[role] ??
    profiles.Centrocampista
  );
}


/* =========================================================
 * SPATIAL CONTEXT
 * ========================================================= */

function getGridCell(
  spatialGrid,
  position
) {
  if (
    !spatialGrid ||
    !position
  ) {
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
  if (
    !player?.position
  ) {
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

  for (
    const opponent
    of opponents ?? []
  ) {
    if (
      !opponent?.position
    ) {
      continue;
    }

    const d =
      distance(
        player.position,
        opponent.position
      );

    if (
      d < 0.07
    ) {
      pressure += 0.45;
    }

    else if (
      d < 0.12
    ) {
      pressure += 0.25;
    }

    else if (
      d < 0.20
    ) {
      pressure += 0.10;
    }
  }

  return clamp01(
    pressure
  );
}


function calculateFreeSpace(
  player,
  teammates,
  opponents,
  spatialGrid
) {
  if (
    !player?.position
  ) {
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
      1 -
      cell.pressure
    );
  }

  const pressure =
    calculatePressure(
      player,
      opponents,
      spatialGrid
    );

  return clamp01(
    1 -
    pressure
  );
}


/* =========================================================
 * POSSESSION CONTEXT
 * ========================================================= */

function isPlayerInPossession(
  player,
  ball
) {
  if (
    !player
  ) {
    return false;
  }

  if (
    ball?.ownerId ===
    player.id
  ) {
    return true;
  }

  if (
    player.hasBall ===
    true
  ) {
    return true;
  }

  return false;
}


/* =========================================================
 * FORWARD VALUE
 * ========================================================= */

function getForwardValue(
  player,
  ball,
  side
) {
  if (
    !player?.position
  ) {
    return 0.5;
  }

  /**
   * Campo normalizzato:
   *
   * HOME → attacca verso x = 1
   * AWAY → attacca verso x = 0
   */
  if (
    side === "HOME"
  ) {
    return clamp01(
      player.position.x
    );
  }

  if (
    side === "AWAY"
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

  const delta =
    side === "HOME"
      ? receiver.position.x -
        passer.position.x
      : passer.position.x -
        receiver.position.x;

  return clamp(
    delta,
    -0.5,
    0.5
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
    !teammate?.position
  ) {
    return -Infinity;
  }

  const passDistance =
    distance(
      player.position,
      teammate.position
    );

  if (
    passDistance <
    0.025
  ) {
    return -Infinity;
  }

  if (
    passDistance >
    0.80
  ) {
    return -Infinity;
  }

  const pressure =
    calculatePressure(
      teammate,
      opponents,
      spatialGrid
    );

  const space =
    1 -
    pressure;

  const progression =
    getProgression(
      player,
      teammate,
      side
    );

  const receiverVision =
    getAttribute(
      teammate,
      "visione"
    ) / 99;

  const receiverControl =
    getAttribute(
      teammate,
      "primoControllo"
    ) / 99;

  const passing =
    getAttribute(
      player,
      "passaggi"
    ) / 99;

  const decisionMaking =
    getAttribute(
      player,
      "decisioni"
    ) / 99;

  const distanceScore =
    1 -
    clamp01(
      passDistance /
      0.80
    );

  /**
   * Target score.
   *
   * Un buon passaggio deve:
   *
   * - essere raggiungibile;
   * - trovare spazio;
   * - produrre avanzamento;
   * - essere coerente con la qualità del passatore;
   * - avere un ricevente capace di controllare.
   */
  return (
    distanceScore *
      0.15 +

    space *
      0.25 +

    clamp01(
      progression + 0.5
    ) *
      0.25 +

    receiverVision *
      0.10 +

    receiverControl *
      0.05 +

    passing *
      0.10 +

    decisionMaking *
      0.10
  );
}


function findBestPassTarget({
  player,
  teammates,
  opponents,
  spatialGrid,
  side,
}) {
  let best =
    null;

  let bestScore =
    -Infinity;

  for (
    const teammate
    of teammates ?? []
  ) {
    if (
      teammate.id ===
      player.id
    ) {
      continue;
    }

    const score =
      scorePassTarget({
        player,

        teammate,

        opponents,

        spatialGrid,

        side,
      });

    if (
      score >
      bestScore
    ) {
      bestScore =
        score;

      best =
        teammate;
    }
  }

  return best;
}


/* =========================================================
 * TACTICAL INSTRUCTIONS
 * ========================================================= */

function getInstruction(
  instructions,
  key,
  fallback = null
) {
  if (
    !instructions
  ) {
    return fallback;
  }

  const value =
    instructions[key];

  return (
    value ??
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
    offensiva: 0.15,
    moltoOffensiva: 0.25,
  };

  return (
    values[mentality] ??
    0
  );
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

  return (
    values[tempo] ??
    0
  );
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

  return (
    values[pressing] ??
    0
  );
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
    ) / 99;

  const decisions =
    getAttribute(
      player,
      "decisioni"
    ) / 99;

  return clamp(
    0.15 +
      roleProfile.hold *
        0.25 +
      composure *
        0.20 +
      decisions *
        0.15 -
      pressure *
        0.10 +
      Math.max(
        0,
        -mentalityModifier
      ) *
        0.20,
    0,
    1
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
    ) / 99;

  const acceleration =
    getAttribute(
      player,
      "accelerazione"
    ) / 99;

  const agility =
    getAttribute(
      player,
      "agilita"
    ) / 99;

  return clamp(
    0.15 +
      roleProfile.support *
        0.20 +
      freeSpace *
        0.20 +
      movement *
        0.25 +
      acceleration *
        0.10 +
      agility *
        0.10 +
      mentalityModifier *
        0.15,
    0,
    1
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
      "giocoDiSquadra"
    ) / 99;

  const positioning =
    getAttribute(
      player,
      "posizionamento"
    ) / 99;

  return clamp(
    0.15 +
      roleProfile.support *
        0.25 +
      freeSpace *
        0.20 +
      teamwork *
        0.20 +
      positioning *
        0.15 +
      forwardValue *
        0.05,
    0,
    1
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
    ) / 99;

  const technique =
    getAttribute(
      player,
      "tecnica"
    ) / 99;

  const acceleration =
    getAttribute(
      player,
      "accelerazione"
    ) / 99;

  const agility =
    getAttribute(
      player,
      "agilita"
    ) / 99;

  const decisions =
    getAttribute(
      player,
      "decisioni"
    ) / 99;

  /**
   * Dribbling sotto pressione
   * diventa molto più difficile.
   */
  return clamp(
    0.05 +
      roleProfile.dribble *
        0.25 +
      dribbling *
        0.30 +
      technique *
        0.15 +
      acceleration *
        0.10 +
      agility *
        0.10 +
      decisions *
        0.10 +
      freeSpace *
        0.15 -
      pressure *
        0.35 +
      mentalityModifier *
        0.10,
    0,
    1
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
}) {
  if (
    !target
  ) {
    return 0;
  }

  const passaggi =
    getAttribute(
      player,
      "passaggi"
    ) / 99;

  const vision =
    getAttribute(
      player,
      "visione"
    ) / 99;

  const decisions =
    getAttribute(
      player,
      "decisioni"
    ) / 99;

  const tecnica =
    getAttribute(
      player,
      "tecnica"
    ) / 99;

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
    1 -
    targetPressure;

  const progression =
    getProgression(
      player,
      target,
      side
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

  /**
   * Un giocatore con:
   *
   * passaggi 99
   * visione 99
   * decisioni 99
   *
   * deve avere una forte propensione
   * a trovare e tentare il passaggio.
   */
  return clamp(
    0.20 +
      passaggi *
        0.25 +
      vision *
        0.20 +
      decisions *
        0.15 +
      tecnica *
        0.10 +
      space *
        0.15 +
      clamp01(
        progression + 0.5
      ) *
        0.10 +
      distanceScore *
        0.05 -
      pressure *
        0.20 +
      mentalityModifier *
        0.15 +
      tempoModifier *
        0.10,
    0,
    1
  );
}


function scorePress({
  player,
  opponent,
  roleProfile,
  instructions,
}) {
  if (
    !opponent
  ) {
    return 0;
  }

  const aggressiveness =
    getAttribute(
      player,
      "aggressivita"
    ) / 99;

  const anticipation =
    getAttribute(
      player,
      "anticipazione"
    ) / 99;

  const acceleration =
    getAttribute(
      player,
      "accelerazione"
    ) / 99;

  const stamina =
    getAttribute(
      player,
      "resistenza"
    ) / 99;

  const pressingModifier =
    getPressingModifier(
      instructions
    );

  return clamp(
    0.10 +
      roleProfile.press *
        0.25 +
      aggressiveness *
        0.20 +
      anticipation *
        0.15 +
      acceleration *
        0.10 +
      stamina *
        0.10 +
      pressingModifier *
        0.40,
    0,
    1
  );
}


/* =========================================================
 * DECISION TARGET POSITION
 * ========================================================= */

function getMovementTarget(
  player,
  teammates,
  opponents,
  ball,
  side,
  roleProfile
) {
  const current =
    player.position ??
    {
      x: 0.5,
      y: 0.5,
    };

  /**
   * Cerchiamo spazio nella direzione
   * coerente con il ruolo.
   */
  let best =
    null;

  let bestScore =
    -Infinity;

  for (
    const teammate
    of teammates ?? []
  ) {
    if (
      teammate.id ===
      player.id
    ) {
      continue;
    }

    if (
      !teammate.position
    ) {
      continue;
    }

    const d =
      distance(
        current,
        teammate.position
      );

    if (
      d < 0.05
    ) {
      continue;
    }

    const pressure =
      calculatePressure(
        teammate,
        opponents,
        null
      );

    const progression =
      getProgression(
        player,
        teammate,
        side
      );

    const score =
      (
        1 -
        pressure
      ) *
        0.45 +

      clamp01(
        progression + 0.5
      ) *
        roleProfile.attack *
        0.30 +

      (
        1 -
        clamp01(
          d /
          0.50
        )
      ) *
        0.15;

    if (
      score >
      bestScore
    ) {
      bestScore =
        score;

      best =
        teammate.position;
    }
  }

  if (
    best
  ) {
    return {
      x:
        clamp01(
          best.x
        ),

      y:
        clamp01(
          best.y
        ),
    };
  }

  /**
   * Fallback:
   * movimento progressivo.
   */
  const direction =
    side === "HOME"
      ? 1
      : -1;

  const amount =
    0.04 +
    roleProfile.attack *
      0.05;

  return {
    x:
      clamp01(
        current.x +
        direction *
          amount
      ),

    y:
      clamp01(
        current.y
      ),
  };
}


/* =========================================================
 * DECISIONE SINGOLO GIOCATORE
 * ========================================================= */

function evaluatePlayer({
  player,
  teammates,
  opponents,
  ball,
  spatialGrid,
  side,
  teamInstructions,
}) {
  const role =
    getRole(
      player
    );

  const roleProfile =
    getRoleProfile(
      role
    );

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

  const forwardValue =
    getForwardValue(
      player,
      ball,
      side
    );

  const mentalityModifier =
    getMentalityModifier(
      teamInstructions
    );

  const tempoModifier =
    getTempoModifier(
      teamInstructions
    );

  const hasBall =
    isPlayerInPossession(
      player,
      ball
    );


  /**
   * -------------------------------------------------------
   * SENZA PALLA
   * -------------------------------------------------------
   */

  if (
    !hasBall
  ) {
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

    /**
     * Troviamo l'avversario più vicino.
     */
    let nearestOpponent =
      null;

    let nearestDistance =
      Infinity;

    for (
      const opponent
      of opponents ?? []
    ) {
      if (
        !opponent?.position
      ) {
        continue;
      }

      const d =
        distance(
          player.position,
          opponent.position
        );

      if (
        d <
        nearestDistance
      ) {
        nearestDistance =
          d;

        nearestOpponent =
          opponent;
      }
    }

    const pressScore =
      scorePress({
        player,

        opponent:
          nearestOpponent,

        roleProfile,

        instructions:
          teamInstructions,
      });

    /**
     * Se l'avversario è molto vicino,
     * aumentiamo la pressione.
     */
    const contextualPressScore =
      nearestOpponent &&
      nearestDistance < 0.18
        ? pressScore +
          0.15
        : pressScore;

    const scores = {
      [ACTIONS.MOVE]:
        moveScore,

      [ACTIONS.SUPPORT]:
        supportScore,

      [ACTIONS.PRESS]:
        clamp01(
          contextualPressScore
        ),
    };

    const best =
      selectBestAction(
        scores
      );

    let targetPosition =
      null;

    if (
      best.action ===
        ACTIONS.MOVE ||
      best.action ===
        ACTIONS.SUPPORT
    ) {
      targetPosition =
        getMovementTarget(
          player,

          teammates,

          opponents,

          ball,

          side,

          roleProfile
        );
    }

    if (
      best.action ===
      ACTIONS.PRESS
    ) {
      targetPosition =
        nearestOpponent
          ?.position
          ? {
              x:
                nearestOpponent
                  .position.x,

              y:
                nearestOpponent
                  .position.y,
            }
          : null;
    }

    return {
      playerId:
        player.id,

      action:
        best.action,

      intent:
        best.action,

      score:
        best.score,

      scores,

      targetPosition,

      targetPlayerId:
        nearestOpponent?.id ??
        null,

      role,

      hasBall:
        false,

      pressure,

      freeSpace,

      forwardValue,
    };
  }


  /**
   * -------------------------------------------------------
   * CON PALLA
   * -------------------------------------------------------
   */

  const passTarget =
    findBestPassTarget({
      player,

      teammates,

      opponents,

      spatialGrid,

      side,
    });

  const passScore =
    scorePass({
      player,

      target:
        passTarget,

      opponents,

      spatialGrid,

      side,

      mentalityModifier,

      tempoModifier,
    });

  const dribbleScore =
    scoreDribble({
      player,

      roleProfile,

      pressure,

      freeSpace,

      mentalityModifier,
    });

  const holdScore =
    scoreHold({
      player,

      roleProfile,

      pressure,

      mentalityModifier,
    });


  /**
   * Se il giocatore è molto sotto pressione,
   * il passaggio viene favorito rispetto al dribbling
   * se esiste un compagno libero.
   */
  let adjustedPassScore =
    passScore;

  if (
    passTarget &&
    pressure > 0.50
  ) {
    adjustedPassScore +=
      0.15;
  }

  /**
   * Se c'è moltissimo spazio davanti,
   * il dribbling può diventare più interessante.
   */
  let adjustedDribbleScore =
    dribbleScore;

  if (
    freeSpace > 0.70
  ) {
    adjustedDribbleScore +=
      0.12;
  }

  /**
   * Un giocatore molto scarso nei passaggi
   * non deve essere forzato a passare.
   */
  const passingQuality =
    getAttribute(
      player,
      "passaggi"
    );

  if (
    passingQuality <
    25
  ) {
    adjustedPassScore *=
      0.60;
  }

  /**
   * Un giocatore molto scarso nel dribbling
   * deve avere meno probabilità di scegliere
   * questa soluzione.
   */
  const dribblingQuality =
    getAttribute(
      player,
      "dribbling"
    );

  if (
    dribblingQuality <
    25
  ) {
    adjustedDribbleScore *=
      0.55;
  }


  const scores = {
    [ACTIONS.PASS]:
      clamp01(
        adjustedPassScore
      ),

    [ACTIONS.DRIBBLE]:
      clamp01(
        adjustedDribbleScore
      ),

    [ACTIONS.HOLD]:
      clamp01(
        holdScore
      ),
  };


  /**
   * Mentalità offensiva:
   * aumenta leggermente dribbling/passaggi verticali.
   */
  if (
    mentalityModifier >
    0
  ) {
    scores[ACTIONS.DRIBBLE] =
      clamp01(
        scores[ACTIONS.DRIBBLE] +
        mentalityModifier *
          0.20
      );

    scores[ACTIONS.PASS] =
      clamp01(
        scores[ACTIONS.PASS] +
        mentalityModifier *
          0.15
      );
  }


  /**
   * Mentalità difensiva:
   * privilegia conservazione del possesso.
   */
  if (
    mentalityModifier <
    0
  ) {
    scores[ACTIONS.HOLD] =
      clamp01(
        scores[ACTIONS.HOLD] +
        Math.abs(
          mentalityModifier
        ) *
          0.20
      );
  }


  const best =
    selectBestAction(
      scores
    );


  /**
   * Evitiamo passaggi senza target.
   */
  if (
    best.action ===
      ACTIONS.PASS &&
    !passTarget
  ) {
    scores[ACTIONS.PASS] =
      0;

    const fallback =
      selectBestAction(
        scores
      );

    return {
      playerId:
        player.id,

      action:
        fallback.action,

      intent:
        fallback.action,

      score:
        fallback.score,

      scores,

      targetPosition:
        fallback.action ===
        ACTIONS.DRIBBLE
          ? {
              x:
                clamp01(
                  player.position.x +
                  (
                    side ===
                    "HOME"
                      ? 0.08
                      : -0.08
                  )
                ),

              y:
                player.position.y,
            }
          : null,

      targetPlayerId:
        null,

      role,

      hasBall:
        true,

      pressure,

      freeSpace,

      forwardValue,
    };
  }


  return {
    playerId:
      player.id,

    action:
      best.action,

    intent:
      best.action,

    score:
      best.score,

    scores,

    targetPosition:
      best.action ===
      ACTIONS.PASS
        ? passTarget?.position
          ? {
              x:
                passTarget.position.x,

              y:
                passTarget.position.y,
            }
          : null
        : best.action ===
          ACTIONS.DRIBBLE
          ? {
              x:
                clamp01(
                  player.position.x +
                  (
                    side ===
                    "HOME"
                      ? 0.08
                      : -0.08
                  )
                ),

              y:
                player.position.y,
            }
          : null,

    targetPlayerId:
      best.action ===
      ACTIONS.PASS
        ? passTarget?.id ??
          null
        : null,

    role,

    hasBall:
      true,

    pressure,

    freeSpace,

    forwardValue,
  };
}


/* =========================================================
 * SELEZIONE AZIONE
 * ========================================================= */

function selectBestAction(
  scores
) {
  let bestAction =
    ACTIONS.HOLD;

  let bestScore =
    DEFAULT_SCORE;

  for (
    const [
      action,
      score
    ]
    of Object.entries(
      scores
    )
  ) {
    if (
      score >
      bestScore
    ) {
      bestScore =
        score;

      bestAction =
        action;
    }
  }

  return {
    action:
      bestAction,

    score:
      bestScore,
  };
}


/* =========================================================
 * EVALUATE TEAM
 * ========================================================= */

export function evaluateTeam({
  players = [],
  opponents = [],
  ball = null,
  spatialGrid = null,
  teamInstructions = {},
}) {
  const team =
    players ?? [];

  /**
   * Determiniamo il lato
   * dalla posizione media / proprietà
   * del giocatore.
   *
   * Il Match Engine usa HOME/AWAY.
   */
  const side =
    determineSide(
      team
    );

  const decisions =
    [];

  for (
    const player
    of team
  ) {
    if (
      !player
    ) {
      continue;
    }

    if (
      player.isActive ===
      false
    ) {
      continue;
    }

    if (
      player.redCard ===
      true ||
      player.redCards ===
      true
    ) {
      continue;
    }

    const decision =
      evaluatePlayer({
        player,

        teammates:
          team,

        opponents,

        ball,

        spatialGrid,

        side,

        teamInstructions,
      });

    decisions.push(
      decision
    );
  }

  return decisions;
}


/* =========================================================
 * SIDE
 * ========================================================= */

function determineSide(
  players
) {
  /**
   * Se almeno un giocatore espone
   * esplicitamente teamSide/side,
   * utilizziamolo.
   */
  for (
    const player
    of players ?? []
  ) {
    if (
      player?.teamSide ===
      "HOME" ||
      player?.teamSide ===
      "AWAY"
    ) {
      return player.teamSide;
    }

    if (
      player?.side ===
      "HOME" ||
      player?.side ===
      "AWAY"
    ) {
      return player.side;
    }
  }

  /**
   * Fallback basato sulla posizione media.
   *
   * La squadra che si trova prevalentemente
   * nella metà sinistra viene considerata HOME.
   */
  const positioned =
    (
      players ?? []
    ).filter(
      (player) =>
        Number.isFinite(
          player?.position?.x
        )
    );

  if (
    !positioned.length
  ) {
    return "HOME";
  }

  const average =
    positioned.reduce(
      (
        total,
        player
      ) =>
        total +
        player.position.x,
      0
    ) /
    positioned.length;

  return average <
    0.5
    ? "HOME"
    : "AWAY";
}


/* =========================================================
 * TEAM DEBUG
 * ========================================================= */

export function evaluateTeamDebug(
  options
) {
  const decisions =
    evaluateTeam(
      options
    );

  return {
    decisions,

    summary: {
      players:
        decisions.length,

      pass:
        decisions.filter(
          (decision) =>
            decision.action ===
            ACTIONS.PASS
        ).length,

      move:
        decisions.filter(
          (decision) =>
            decision.action ===
            ACTIONS.MOVE
        ).length,

      dribble:
        decisions.filter(
          (decision) =>
            decision.action ===
            ACTIONS.DRIBBLE
        ).length,

      support:
        decisions.filter(
          (decision) =>
            decision.action ===
            ACTIONS.SUPPORT
        ).length,

      press:
        decisions.filter(
          (decision) =>
            decision.action ===
            ACTIONS.PRESS
        ).length,

      hold:
        decisions.filter(
          (decision) =>
            decision.action ===
            ACTIONS.HOLD
        ).length,
    },
  };
}


/* =========================================================
 * EXPORT
 * ========================================================= */

export {
  ACTIONS,

  getRole,

  getRoleProfile,

  calculatePressure,

  calculateFreeSpace,

  findBestPassTarget,
};

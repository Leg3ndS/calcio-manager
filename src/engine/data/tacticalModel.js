/**
 * TACTICAL MODEL
 *
 * Contiene esclusivamente i dati relativi alle istruzioni tattiche.
 *
 * Il Match Engine leggerà questi dati per decidere il comportamento
 * dei giocatori.
 *
 * IMPORTANTE:
 * questo file NON contiene la logica dell'AI.
 */

export const MENTALITIES = [
  "molto_difensiva",
  "difensiva",
  "prudente",
  "positiva",
  "offensiva",
  "molto_offensiva",
];

export const PRESSING_LEVELS = [
  "molto_basso",
  "basso",
  "medio",
  "alto",
  "molto_alto",
];

export const DEFENSIVE_LINES = [
  "molto_bassa",
  "bassa",
  "media",
  "alta",
  "molto_alta",
];

export const TEAM_WIDTHS = [
  "molto_stretta",
  "stretta",
  "media",
  "larga",
  "molto_larga",
];

export const TEMPOS = [
  "molto_lento",
  "lento",
  "medio",
  "veloce",
  "molto_veloce",
];

export const PASSING_STYLES = [
  "molto_corto",
  "corto",
  "misto",
  "diretto",
  "molto_diretto",
];

export const BUILD_UP_STYLES = [
  "prudente",
  "equilibrata",
  "aggressiva",
];

export const TRANSITION_STYLES = [
  "controllata",
  "equilibrata",
  "rapida",
];

export const ATTACKING_FOCUS = [
  "sinistra",
  "centro",
  "destra",
  "mista",
];

export const CROSSING_STYLES = [
  "pochi_cross",
  "cross_misti",
  "cross_frequenti",
  "cross_precoci",
];

export const DEFAULT_TEAM_INSTRUCTIONS = {
  mentality: "positiva",

  pressing: "medio",

  defensiveLine: "media",

  width: "media",

  tempo: "medio",

  passingStyle: "misto",

  buildUp: "equilibrata",

  transition: "equilibrata",

  attackingFocus: "mista",

  passingRisk: 50,

  crossing: "cross_misti",

  throughBalls: 50,

  longShots: 50,

  counterPress: true,

  counterAttack: true,

  playOutFromBack: true,

  overlapLeft: false,

  overlapRight: false,
};

/**
 * Crea una copia sicura delle istruzioni di squadra.
 */
export function createTeamInstructions(overrides = {}) {
  return {
    ...DEFAULT_TEAM_INSTRUCTIONS,
    ...overrides,
  };
}

/**
 * Istruzioni individuali.
 *
 * Non tutte devono essere utilizzate subito dal motore.
 * La struttura esiste già per evitare di doverla rifare successivamente.
 */
export const DEFAULT_PLAYER_INSTRUCTIONS = {
  mentality: "standard",

  freedom: "normale",

  passingRisk: "standard",

  pressing: "standard",

  tackling: "standard",

  dribbling: "standard",

  shooting: "standard",

  holdPosition: false,

  roamFromPosition: false,

  getFurtherForward: false,

  stayBack: false,

  attackSpace: false,

  markTighter: false,

  markSpecificPlayerId: null,
};

/**
 * Crea istruzioni individuali.
 */
export function createPlayerInstructions(overrides = {}) {
  return {
    ...DEFAULT_PLAYER_INSTRUCTIONS,
    ...overrides,
  };
}

/**
 * Struttura tattica completa.
 *
 * Separiamo volutamente:
 *
 * - istruzioni di squadra
 * - istruzioni individuali
 * - forma in possesso
 * - forma fuori possesso
 */
export function createTacticalInstructions({
  team = {},
  players = {},
} = {}) {
  return {
    team: createTeamInstructions(team),

    players: Object.fromEntries(
      Object.entries(players).map(([playerId, instructions]) => [
        playerId,
        createPlayerInstructions(instructions),
      ])
    ),
  };
}

/**
 * Aggiorna un'istruzione di squadra senza modificare
 * le altre impostazioni.
 */
export function updateTeamInstruction(
  tacticalInstructions,
  key,
  value
) {
  return {
    ...tacticalInstructions,

    team: {
      ...tacticalInstructions.team,

      [key]: value,
    },
  };
}

/**
 * Aggiorna un'istruzione individuale.
 */
export function updatePlayerInstruction(
  tacticalInstructions,
  playerId,
  key,
  value
) {
  const currentPlayerInstructions =
    tacticalInstructions.players[playerId] ??
    createPlayerInstructions();

  return {
    ...tacticalInstructions,

    players: {
      ...tacticalInstructions.players,

      [playerId]: {
        ...currentPlayerInstructions,

        [key]: value,
      },
    },
  };
}

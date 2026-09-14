/**
 * TEAM MODEL
 *
 * Rappresenta una squadra all'interno del gioco.
 *
 * Il Team Model contiene:
 * - rosa
 * - titolari
 * - panchina
 * - modulo
 * - ruoli
 * - tattica
 * - disposizione con/senza possesso
 * - caratteristiche della squadra
 *
 * NON gestisce la simulazione della partita.
 * Quella responsabilità appartiene al Match Engine.
 */

import {
  PLAYER_POSITIONS,
  PLAYER_ROLES,
} from "./playerModel.js";

/**
 * Formazioni predefinite.
 *
 * IMPORTANTE:
 * sono soltanto preset iniziali.
 *
 * Il nostro editor tattico permetterà successivamente
 * di spostare liberamente i giocatori nelle zone consentite.
 */
export const FORMATIONS = {
  "4-4-2": [
    {
      position: PLAYER_POSITIONS.PORTIERE,
      role: PLAYER_ROLES.PORTIERE,
      x: 50,
      y: 92,
    },

    {
      position: PLAYER_POSITIONS.TERZINO_DESTRO,
      role: PLAYER_ROLES.TERZINO,
      x: 82,
      y: 76,
    },

    {
      position: PLAYER_POSITIONS.DIFENSORE_CENTRALE,
      role: PLAYER_ROLES.DIFENSORE_CENTRALE,
      x: 61,
      y: 78,
    },

    {
      position: PLAYER_POSITIONS.DIFENSORE_CENTRALE,
      role: PLAYER_ROLES.DIFENSORE_CENTRALE,
      x: 39,
      y: 78,
    },

    {
      position: PLAYER_POSITIONS.TERZINO_SINISTRO,
      role: PLAYER_ROLES.TERZINO,
      x: 18,
      y: 76,
    },

    {
      position: PLAYER_POSITIONS.ALA_DESTRA,
      role: PLAYER_ROLES.ALA,
      x: 82,
      y: 56,
    },

    {
      position: PLAYER_POSITIONS.CENTROCAMPISTA_CENTRALE,
      role: PLAYER_ROLES.CENTROCAMPISTA,
      x: 61,
      y: 57,
    },

    {
      position: PLAYER_POSITIONS.CENTROCAMPISTA_CENTRALE,
      role: PLAYER_ROLES.CENTROCAMPISTA,
      x: 39,
      y: 57,
    },

    {
      position: PLAYER_POSITIONS.ALA_SINISTRA,
      role: PLAYER_ROLES.ALA,
      x: 18,
      y: 56,
    },

    {
      position: PLAYER_POSITIONS.SECONDA_PUNTA,
      role: PLAYER_ROLES.SECONDA_PUNTA,
      x: 61,
      y: 31,
    },

    {
      position: PLAYER_POSITIONS.ATTACCANTE,
      role: PLAYER_ROLES.ATTACCANTE_AVANZATO,
      x: 39,
      y: 29,
    },
  ],

  "4-3-3": [
    {
      position: PLAYER_POSITIONS.PORTIERE,
      role: PLAYER_ROLES.PORTIERE,
      x: 50,
      y: 92,
    },

    {
      position: PLAYER_POSITIONS.TERZINO_DESTRO,
      role: PLAYER_ROLES.TERZINO,
      x: 82,
      y: 76,
    },

    {
      position: PLAYER_POSITIONS.DIFENSORE_CENTRALE,
      role: PLAYER_ROLES.DIFENSORE_CENTRALE,
      x: 61,
      y: 78,
    },

    {
      position: PLAYER_POSITIONS.DIFENSORE_CENTRALE,
      role: PLAYER_ROLES.DIFENSORE_CENTRALE,
      x: 39,
      y: 78,
    },

    {
      position: PLAYER_POSITIONS.TERZINO_SINISTRO,
      role: PLAYER_ROLES.TERZINO,
      x: 18,
      y: 76,
    },

    {
      position: PLAYER_POSITIONS.CENTROCAMPISTA_CENTRALE,
      role: PLAYER_ROLES.CENTROCAMPISTA,
      x: 50,
      y: 61,
    },

    {
      position: PLAYER_POSITIONS.MEDIANO,
      role: PLAYER_ROLES.MEDIANO,
      x: 35,
      y: 55,
    },

    {
      position: PLAYER_POSITIONS.MEZZALA,
      role: PLAYER_ROLES.MEZZALA,
      x: 65,
      y: 55,
    },

    {
      position: PLAYER_POSITIONS.ALA_SINISTRA,
      role: PLAYER_ROLES.ALA,
      x: 18,
      y: 34,
    },

    {
      position: PLAYER_POSITIONS.ATTACCANTE,
      role: PLAYER_ROLES.ATTACCANTE_AVANZATO,
      x: 50,
      y: 25,
    },

    {
      position: PLAYER_POSITIONS.ALA_DESTRA,
      role: PLAYER_ROLES.ALA,
      x: 82,
      y: 34,
    },
  ],

  "3-4-3": [
    {
      position: PLAYER_POSITIONS.PORTIERE,
      role: PLAYER_ROLES.PORTIERE,
      x: 50,
      y: 92,
    },

    {
      position: PLAYER_POSITIONS.DIFENSORE_CENTRALE,
      role: PLAYER_ROLES.DIFENSORE_CENTRALE,
      x: 72,
      y: 78,
    },

    {
      position: PLAYER_POSITIONS.DIFENSORE_CENTRALE,
      role: PLAYER_ROLES.DIFENSORE_CENTRALE,
      x: 50,
      y: 80,
    },

    {
      position: PLAYER_POSITIONS.DIFENSORE_CENTRALE,
      role: PLAYER_ROLES.DIFENSORE_CENTRALE,
      x: 28,
      y: 78,
    },

    {
      position: PLAYER_POSITIONS.ALA_DESTRA,
      role: PLAYER_ROLES.ESTERNO_A_TUTTA_FASCIA,
      x: 86,
      y: 55,
    },

    {
      position: PLAYER_POSITIONS.CENTROCAMPISTA_CENTRALE,
      role: PLAYER_ROLES.CENTROCAMPISTA,
      x: 61,
      y: 58,
    },

    {
      position: PLAYER_POSITIONS.CENTROCAMPISTA_CENTRALE,
      role: PLAYER_ROLES.CENTROCAMPISTA,
      x: 39,
      y: 58,
    },

    {
      position: PLAYER_POSITIONS.ALA_SINISTRA,
      role: PLAYER_ROLES.ESTERNO_A_TUTTA_FASCIA,
      x: 14,
      y: 55,
    },

    {
      position: PLAYER_POSITIONS.ALA_DESTRA,
      role: PLAYER_ROLES.ALA,
      x: 78,
      y: 28,
    },

    {
      position: PLAYER_POSITIONS.ATTACCANTE,
      role: PLAYER_ROLES.ATTACCANTE_AVANZATO,
      x: 50,
      y: 24,
    },

    {
      position: PLAYER_POSITIONS.ALA_SINISTRA,
      role: PLAYER_ROLES.ALA,
      x: 22,
      y: 28,
    },
  ],

  "3-5-2": [
    {
      position: PLAYER_POSITIONS.PORTIERE,
      role: PLAYER_ROLES.PORTIERE,
      x: 50,
      y: 92,
    },

    {
      position: PLAYER_POSITIONS.DIFENSORE_CENTRALE,
      role: PLAYER_ROLES.DIFENSORE_CENTRALE,
      x: 72,
      y: 78,
    },

    {
      position: PLAYER_POSITIONS.DIFENSORE_CENTRALE,
      role: PLAYER_ROLES.DIFENSORE_CENTRALE,
      x: 50,
      y: 80,
    },

    {
      position: PLAYER_POSITIONS.DIFENSORE_CENTRALE,
      role: PLAYER_ROLES.DIFENSORE_CENTRALE,
      x: 28,
      y: 78,
    },

    {
      position: PLAYER_POSITIONS.ALA_DESTRA,
      role: PLAYER_ROLES.ESTERNO_A_TUTTA_FASCIA,
      x: 86,
      y: 57,
    },

    {
      position: PLAYER_POSITIONS.MEDIANO,
      role: PLAYER_ROLES.MEDIANO,
      x: 50,
      y: 62,
    },

    {
      position: PLAYER_POSITIONS.MEZZALA,
      role: PLAYER_ROLES.MEZZALA,
      x: 68,
      y: 51,
    },

    {
      position: PLAYER_POSITIONS.MEZZALA,
      role: PLAYER_ROLES.MEZZALA,
      x: 32,
      y: 51,
    },

    {
      position: PLAYER_POSITIONS.ALA_SINISTRA,
      role: PLAYER_ROLES.ESTERNO_A_TUTTA_FASCIA,
      x: 14,
      y: 57,
    },

    {
      position: PLAYER_POSITIONS.SECONDA_PUNTA,
      role: PLAYER_ROLES.SECONDA_PUNTA,
      x: 62,
      y: 28,
    },

    {
      position: PLAYER_POSITIONS.ATTACCANTE,
      role: PLAYER_ROLES.ATTACCANTE_AVANZATO,
      x: 38,
      y: 26,
    },
  ],
};

/**
 * TATTICA DI DEFAULT.
 */
export const createDefaultTactics = () => ({
  // Mentalità
  mentality: "equilibrata",

  // Possesso
  passingStyle: "mista",
  tempo: "normale",
  width: "standard",

  // Costruzione
  buildUp: "equilibrata",
  playOutFromBack: true,

  // Transizioni
  counterPress: false,
  counterAttack: false,

  // Pressing
  pressingIntensity: "media",
  defensiveLine: "standard",

  // Attacco
  attackingFocus: "misto",
  throughBalls: "miste",
  crossing: "misti",
  longShots: "misti",

  // Rischio
  passingRisk: "standard",

  // Ampiezza
  overlapLeft: false,
  overlapRight: false,

  // Linea di fuorigioco
  offsideTrap: false,
});

/**
 * Crea una posizione tattica.
 */
export const createTacticalPosition = ({
  playerId = null,
  x = 50,
  y = 50,
  role = PLAYER_ROLES.CENTROCAMPISTA,
  instruction = {},
} = {}) => ({
  playerId,

  x,
  y,

  role,

  instruction: {
    mentality: instruction.mentality ?? "normale",

    freedom: instruction.freedom ?? "normale",

    pressing: instruction.pressing ?? "squadra",

    runs: instruction.runs ?? "normali",

    passingRisk:
      instruction.passingRisk ?? "squadra",

    width: instruction.width ?? "squadra",

    defensiveDuty:
      instruction.defensiveDuty ?? "normale",
  },
});

/**
 * Crea una struttura tattica completa.
 */
export const createTacticalShape = (
  formation,
  playerAssignments = []
) => {
  const preset = FORMATIONS[formation];

  if (!preset) {
    throw new Error(
      `Formazione non supportata: ${formation}`
    );
  }

  const positions = {};

  preset.forEach((slot, index) => {
    const assignment =
      playerAssignments[index];

    const playerId =
      assignment?.playerId ?? null;

    positions[playerId ?? `slot_${index}`] =
      createTacticalPosition({
        playerId,
        x: assignment?.x ?? slot.x,
        y: assignment?.y ?? slot.y,
        role: assignment?.role ?? slot.role,
        instruction:
          assignment?.instruction ?? {},
      });
  });

  return {
    formation,
    positions,
  };
};

/**
 * Crea una squadra.
 */
export const createTeam = ({
  id,
  name,
  shortName = "",
  color = null,

  players = [],

  formation = "4-3-3",

  tactics = {},
} = {}) => {
  if (!id) {
    throw new Error(
      "Una squadra deve avere un id."
    );
  }

  if (!name) {
    throw new Error(
      "Una squadra deve avere un nome."
    );
  }

  const mergedTactics = {
    ...createDefaultTactics(),
    ...tactics,
  };

  /*
   * I primi 11 giocatori sono utilizzati
   * come titolari solo se vengono assegnati
   * esplicitamente.
   *
   * Successivamente il manager sceglierà
   * manualmente la formazione.
   */
  const startingXI = players
    .slice(0, 11)
    .map((player) => player.id);

  const bench = players
    .slice(11)
    .map((player) => player.id);

  const inPossessionShape =
    createTacticalShape(
      formation
    );

  const outOfPossessionShape =
    createTacticalShape(
      formation
    );

  return {
    // ==========================================
    // IDENTITÀ
    // ==========================================

    id,
    name,
    shortName,
    color,

    // ==========================================
    // ROSA
    // ==========================================

    players,

    startingXI,

    bench,

    reserves: [],

    unavailablePlayers: [],

    // ==========================================
    // FORMAZIONE
    // ==========================================

    formation,

    inPossessionShape,

    outOfPossessionShape,

    // ==========================================
    // TATTICA
    // ==========================================

    tactics: mergedTactics,

    // ==========================================
    // SOSTITUZIONI
    // ==========================================

    substitutions: {
      used: 0,

      available: 5,

      maxPlayersOnBench: 9,

      automaticSubstitutions: false,
    },

    // ==========================================
    // STATO SQUADRA
    // ==========================================

    teamState: {
      morale: 100,

      cohesion: 100,

      tacticalFamiliarity: 100,

      chemistry: 100,

      confidence: 100,
    },

    // ==========================================
    // STATISTICHE PARTITA
    // ==========================================

    matchStats: {
      possession: 50,

      shots: 0,
      shotsOnTarget: 0,

      goals: 0,

      xG: 0,

      passesAttempted: 0,
      passesCompleted: 0,

      tackles: 0,
      interceptions: 0,

      fouls: 0,
      offsides: 0,

      corners: 0,

      yellowCards: 0,
      redCards: 0,
    },
  };
};

/**
 * Restituisce un giocatore della rosa.
 */
export function getPlayerById(team, playerId) {
  return team.players.find(
    (player) => player.id === playerId
  );
}

/**
 * Restituisce gli 11 titolari.
 */
export function getStartingPlayers(team) {
  return team.startingXI
    .map((playerId) =>
      getPlayerById(team, playerId)
    )
    .filter(Boolean);
}

/**
 * Restituisce la panchina.
 */
export function getBenchPlayers(team) {
  return team.bench
    .map((playerId) =>
      getPlayerById(team, playerId)
    )
    .filter(Boolean);
}

/**
 * Cambia il modulo.
 *
 * NON teletrasporta i giocatori.
 *
 * Modifica solamente la destinazione tattica.
 *
 * Il Movement Engine determinerà successivamente
 * come i giocatori raggiungono le nuove posizioni.
 */
export function changeFormation(
  team,
  newFormation
) {
  if (!FORMATIONS[newFormation]) {
    throw new Error(
      `Formazione non supportata: ${newFormation}`
    );
  }

  team.formation = newFormation;

  team.inPossessionShape =
    createTacticalShape(
      newFormation
    );

  team.outOfPossessionShape =
    createTacticalShape(
      newFormation
    );

  return team;
}

/**
 * Sposta un giocatore nella struttura tattica.
 *
 * x e y sono coordinate normalizzate:
 *
 * x = 0 → fascia sinistra
 * x = 50 → centro
 * x = 100 → fascia destra
 *
 * y = 0 → zona offensiva
 * y = 100 → zona difensiva
 *
 * Il limite del campo verrà gestito
 * dall'editor tattico.
 */
export function movePlayerInShape(
  team,
  playerId,
  x,
  y,
  {
    possession = true,
    role = null,
  } = {}
) {
  const shape = possession
    ? team.inPossessionShape
    : team.outOfPossessionShape;

  if (!shape.positions[playerId]) {
    throw new Error(
      `Il giocatore ${playerId} non è presente nella tattica.`
    );
  }

  shape.positions[playerId].x =
    Math.max(0, Math.min(100, x));

  shape.positions[playerId].y =
    Math.max(0, Math.min(100, y));

  if (role) {
    shape.positions[playerId].role =
      role;
  }

  return shape.positions[playerId];
}

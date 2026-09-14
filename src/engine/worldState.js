/**
 * WORLD STATE
 *
 * Stato completo della partita in un determinato istante.
 *
 * IMPORTANTE:
 * Questo file NON conosce React e NON conosce Phaser.
 * Rappresenta solamente la realtà della partita.
 */

export const MATCH_PHASES = {
  PRE_MATCH: "pre_match",
  KICKOFF: "kickoff",
  OPEN_PLAY: "open_play",
  SET_PIECE: "set_piece",
  HALF_TIME: "half_time",
  FULL_TIME: "full_time",
  PAUSED: "paused",
};

export const POSSESSION = {
  HOME: "home",
  AWAY: "away",
  CONTESTED: "contested",
  NONE: "none",
};

export const createPlayerState = ({
  id,
  name,
  number,
  teamId,
  position,
  role = null,
  x = 50,
  y = 50,
}) => ({
  id,
  name,
  number,
  teamId,

  // Posizione tattica di riferimento
  position,
  role,

  // Posizione attuale sul campo
  x,
  y,

  // Movimento
  targetX: x,
  targetY: y,
  velocityX: 0,
  velocityY: 0,

  // Stato fisico
  stamina: 100,
  fatigue: 0,
  condition: 100,

  // Stato mentale
  morale: 100,
  confidence: 100,

  // Stato durante l'azione
  currentAction: "idle",
  intent: "hold_position",

  // Possesso
  hasBall: false,

  // Disciplina
  yellowCards: 0,
  redCard: false,

  // Infortunio
  injured: false,
  injuryType: null,
  injuryMinute: null,

  // Sostituzione
  substituted: false,

  // Statistiche individuali della partita
  matchStats: {
    minutesPlayed: 0,
    touches: 0,
    passesAttempted: 0,
    passesCompleted: 0,
    shots: 0,
    shotsOnTarget: 0,
    goals: 0,
    assists: 0,
    tackles: 0,
    interceptions: 0,
    foulsCommitted: 0,
    foulsSuffered: 0,
    offsides: 0,
    saves: 0,
    yellowCards: 0,
  },
});

export const createTeamState = ({
  id,
  name,
  shortName,
  side,
  formation = "4-3-3",
  players = [],
}) => ({
  id,
  name,
  shortName,
  side,

  formation,

  // Configurazione tattica
  tactics: {
    mentality: "balanced",

    pressing: "medium",
    defensiveLine: "standard",
    width: "standard",

    tempo: "standard",
    passingStyle: "mixed",

    buildUp: "balanced",
    transition: "balanced",

    attackingFocus: "mixed",
    passingRisk: "standard",
    crossing: "mixed",
    throughBalls: "mixed",
    longShots: "mixed",

    counterPress: false,
    counterAttack: false,
    playOutFromBack: true,
    overlapLeft: false,
    overlapRight: false,
  },

  // Disposizione con possesso
  inPossessionShape: {
    formation,
    positions: {},
  },

  // Disposizione senza possesso
  outOfPossessionShape: {
    formation,
    positions: {},
  },

  // Rosa
  players,

  // Panchina
  bench: [],

  // Sostituzioni
  substitutions: {
    used: 0,
    available: 5,
  },

  // Statistiche di squadra
  matchStats: {
    possession: 50,
    shots: 0,
    shotsOnTarget: 0,
    goals: 0,
    passesAttempted: 0,
    passesCompleted: 0,
    tackles: 0,
    interceptions: 0,
    fouls: 0,
    offsides: 0,
    corners: 0,
    yellowCards: 0,
    redCards: 0,
    xG: 0,
  },
});

export const createBallState = () => ({
  x: 50,
  y: 50,

  velocityX: 0,
  velocityY: 0,

  height: 0,

  ownerId: null,
  lastTouchPlayerId: null,

  state: "free",

  targetX: 50,
  targetY: 50,

  pass: null,
  shot: null,
});

export const createMatchState = ({
  homeTeam,
  awayTeam,
  seed = null,
}) => ({
  // Identificazione partita
  id: crypto.randomUUID(),
  seed,

  // Tempo
  clock: {
    minute: 0,
    second: 0,
    totalSeconds: 0,

    half: 1,

    speed: 1,

    paused: false,
  },

  // Stato generale
  phase: MATCH_PHASES.PRE_MATCH,

  possession: POSSESSION.NONE,

  score: {
    home: 0,
    away: 0,
  },

  // Squadre
  teams: {
    home: homeTeam,
    away: awayTeam,
  },

  // Pallone
  ball: createBallState(),

  // Ultimo evento
  lastEvent: null,

  // Eventi della partita
  events: [],

  // Stato arbitrale
  referee: {
    name: null,
    accuracy: 90,
    strictness: 50,
    cardTendency: 50,
    advantageTendency: 50,
    offsideAccuracy: 95,
  },

  // VAR
  var: {
    enabled: true,
    active: false,
    review: null,
  },

  // Stato partita
  matchStatus: {
    started: false,
    finished: false,
    stoppageTime: 0,
  },

  // Pausa tattica
  tacticalPause: {
    active: false,
    reason: null,
  },

  // Statistiche generali
  statistics: {
    totalShots: 0,
    totalShotsOnTarget: 0,
    totalFouls: 0,
    totalYellowCards: 0,
    totalRedCards: 0,
    totalOffsides: 0,
    totalCorners: 0,

    homePossession: 50,
    awayPossession: 50,

    homeXG: 0,
    awayXG: 0,
  },

  // Debug
  debug: {
    enabled: false,
    selectedPlayerId: null,
    selectedTeamId: null,
  },
});

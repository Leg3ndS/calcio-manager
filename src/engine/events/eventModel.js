/**
 * EVENT MODEL
 *
 * Gli eventi rappresentano ciò che accade durante una partita.
 *
 * Un evento deve essere:
 *
 * - identificabile
 * - riproducibile
 * - collegabile ad altri eventi
 * - utilizzabile da cronaca/statistiche/highlights/replay
 */

function createId(prefix = "event") {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}`;
}

/**
 * Tipi di evento iniziali.
 */
export const EVENT_TYPES = {
  MATCH_STARTED: "MATCH_STARTED",
  ENGINE_TICK: "ENGINE_TICK",

  POSSESSION_WON: "POSSESSION_WON",
  POSSESSION_LOST: "POSSESSION_LOST",

  PLAYER_MOVE: "PLAYER_MOVE",

  PASS_ATTEMPT: "PASS_ATTEMPT",
  PASS_COMPLETE: "PASS_COMPLETE",
  PASS_FAILED: "PASS_FAILED",

  RECEIVE: "RECEIVE",

  DRIBBLE_ATTEMPT: "DRIBBLE_ATTEMPT",
  DRIBBLE_SUCCESS: "DRIBBLE_SUCCESS",
  DRIBBLE_FAILED: "DRIBBLE_FAILED",

  PRESSURE: "PRESSURE",

  TACKLE_ATTEMPT: "TACKLE_ATTEMPT",
  TACKLE_SUCCESS: "TACKLE_SUCCESS",
  TACKLE_FAILED: "TACKLE_FAILED",

  INTERCEPTION: "INTERCEPTION",

  SHOT_ATTEMPT: "SHOT_ATTEMPT",
  SHOT_ON_TARGET: "SHOT_ON_TARGET",
  SHOT_OFF_TARGET: "SHOT_OFF_TARGET",
  SHOT_BLOCKED: "SHOT_BLOCKED",

  SAVE: "SAVE",

  GOAL: "GOAL",
  OWN_GOAL: "OWN_GOAL",

  FOUL: "FOUL",
  YELLOW_CARD: "YELLOW_CARD",
  RED_CARD: "RED_CARD",

  OFFSIDE: "OFFSIDE",

  CORNER: "CORNER",
  FREE_KICK: "FREE_KICK",
  PENALTY: "PENALTY",
  THROW_IN: "THROW_IN",
  GOAL_KICK: "GOAL_KICK",

  INJURY: "INJURY",
  SUBSTITUTION: "SUBSTITUTION",

  VAR_REVIEW: "VAR_REVIEW",
  VAR_DECISION: "VAR_DECISION",

  HALF_TIME: "HALF_TIME",
  FULL_TIME: "FULL_TIME",
};

/**
 * Crea un evento.
 */
export function createMatchEvent({
  tick = 0,
  matchTime = null,
  type,
  actors = [],
  causedBy = null,
  payload = {},
} = {}) {
  if (!type) {
    throw new Error(
      "createMatchEvent: type è obbligatorio."
    );
  }

  return {
    id: createId("event"),

    tick,

    matchTime,

    type,

    actors: Array.isArray(actors)
      ? [...actors]
      : [],

    causedBy,

    payload: {
      ...payload,
    },
  };
}

/**
 * Crea un evento collegato a un altro evento.
 */
export function createCausedEvent({
  previousEvent,
  tick,
  matchTime,
  type,
  actors = [],
  payload = {},
}) {
  return createMatchEvent({
    tick,
    matchTime,
    type,
    actors,
    causedBy:
      previousEvent?.id ?? null,
    payload,
  });
}

/**
 * Event log della partita.
 */
export function createEventLog() {
  return {
    events: [],
    lastEventId: null,
  };
}

/**
 * Inserisce un evento nel log.
 */
export function appendEvent(
  eventLog,
  event
) {
  eventLog.events.push(event);

  eventLog.lastEventId =
    event.id;

  return eventLog;
}

/**
 * Recupera un evento per ID.
 */
export function findEvent(
  eventLog,
  eventId
) {
  return (
    eventLog.events.find(
      (event) =>
        event.id === eventId
    ) ?? null
  );
}

/**
 * Recupera tutti gli eventi causati
 * direttamente da un evento.
 */
export function getCausedEvents(
  eventLog,
  eventId
) {
  return eventLog.events.filter(
    (event) =>
      event.causedBy === eventId
  );
}

/**
 * Ricostruisce una catena causale.
 *
 * Esempio:
 *
 * PRESSIONE
 * ↓
 * PASSAGGIO FALLITO
 * ↓
 * INTERCETTO
 * ↓
 * TIRO
 * ↓
 * GOL
 */
export function getEventChain(
  eventLog,
  eventId
) {
  const chain = [];

  let current =
    findEvent(
      eventLog,
      eventId
    );

  while (current) {
    chain.unshift(current);

    if (!current.causedBy) {
      break;
    }

    current =
      findEvent(
        eventLog,
        current.causedBy
      );
  }

  return chain;
}

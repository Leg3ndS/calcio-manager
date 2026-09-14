/**
 * EVENT MODEL
 *
 * Gli eventi sono la cronaca strutturata della simulazione.
 *
 * Ogni evento contiene:
 * - id
 * - tick
 * - matchTime
 * - type
 * - actors
 * - causedBy
 * - payload
 *
 * Gli ID sono deterministici.
 */

export const EVENT_TYPES = {
  MATCH_STARTED: "MATCH_STARTED",
  ENGINE_TICK: "ENGINE_TICK",

  POSSESSION_WON: "POSSESSION_WON",
  POSSESSION_LOST: "POSSESSION_LOST",
  POSSESSION_CONTESTED: "POSSESSION_CONTESTED",

  PLAYER_MOVE: "PLAYER_MOVE",

  PASS_ATTEMPT: "PASS_ATTEMPT",
  PASS_COMPLETE: "PASS_COMPLETE",
  PASS_FAILED: "PASS_FAILED",

  RECEIVE: "RECEIVE",

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

export function createEventLog() {
  return {
    events: [],
    lastEventId: null,
    sequence: 0,
  };
}

export function createMatchEvent({
  matchId = "match",
  tick = 0,
  matchTime = null,
  type,
  actors = [],
  causedBy = null,
  payload = {},
  sequence = 0,
} = {}) {
  if (!type) {
    throw new Error(
      "createMatchEvent: type è obbligatorio."
    );
  }

  const id =
    `${matchId}_t${tick}_e${sequence}`;

  return {
    id,

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

export function appendEvent(
  eventLog,
  event
) {
  eventLog.events.push(event);

  eventLog.lastEventId =
    event.id;

  eventLog.sequence += 1;

  return eventLog;
}

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

export function getCausedEvents(
  eventLog,
  eventId
) {
  return eventLog.events.filter(
    (event) =>
      event.causedBy === eventId
  );
}

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

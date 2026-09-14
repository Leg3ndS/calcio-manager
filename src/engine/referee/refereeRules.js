// Core football restart/ruling helpers used by the referee.

export const RESTARTS = Object.freeze({
  KICKOFF: "kickoff",
  GOAL_KICK: "goal_kick",
  CORNER: "corner",
  THROW_IN: "throw_in",
  FREE_KICK: "free_kick",
  PENALTY: "penalty",
  DROPPED_BALL: "dropped_ball",
});

export const FOULS = Object.freeze({
  NONE: "none",
  CARELESS: "careless",
  RECKLESS: "reckless",
  EXCESSIVE_FORCE: "excessive_force",
});

export function isDirectFreeKickFoul(type) {
  return type !== FOULS.NONE;
}

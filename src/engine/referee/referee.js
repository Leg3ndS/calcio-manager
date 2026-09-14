import { createReferee } from "./refereeProfiles.js";
import { RESTARTS, FOULS } from "./refereeRules.js";

const SIDES = ["home", "away"];

function clamp(v, min = 0, max = 1) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function rng01(rng) {
  if (rng && typeof rng.next === "function") return clamp(rng.next());
  if (rng && typeof rng.random === "function") return clamp(rng.random());
  return Math.random();
}

function sideOf(state, player) {
  if (!player) return null;
  if (player.side === "home" || player.side === "away") return player.side;
  for (const side of SIDES) {
    if (state?.teams?.[side]?.players?.some((p) => p?.id === player.id)) return side;
  }
  return null;
}

function active(player) {
  return Boolean(player && player.onPitch !== false && !player.injured && !player.matchState?.substituted);
}

function players(state) {
  return SIDES.flatMap((side) => (state?.teams?.[side]?.players ?? []).filter(active));
}

function distance(a, b) {
  return Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.y ?? 0) - (b?.y ?? 0));
}

function playerPosition(player) {
  return player?.position ?? { x: player?.x ?? 0.5, y: player?.y ?? 0.5 };
}

export class Referee {
  constructor(config = {}, rng = null) {
    this.profile = createReferee(config, config.profile ?? "balanced");
    this.rng = rng;
  }

  setRng(rng) {
    this.rng = rng;
  }

  getSnapshot() {
    return { ...this.profile };
  }

  /**
   * Decide who should be awarded a loose ball.
   * This is deliberately deterministic for the same seed/state.
   */
  decideLooseBall(state, { reason = "loose_ball" } = {}) {
    const ball = state?.ball ?? { x: 0.5, y: 0.5 };
    const candidates = players(state)
      .map((player) => {
        const d = distance(playerPosition(player), ball);
        const anticipation = Number(player.attributes?.mental?.anticipazione ?? 50) / 99;
        const reactions = Number(player.attributes?.physical?.reattivita ?? 50) / 99;
        const positioning = Number(player.attributes?.mental?.posizionamento ?? 50) / 99;
        const speed = Number(player.attributes?.physical?.velocita ?? 50) / 99;
        const score = (1 - clamp(d / 0.45)) * 0.52 + anticipation * 0.18 + reactions * 0.12 + positioning * 0.10 + speed * 0.08;
        return { player, distance: d, score };
      })
      .sort((a, b) => b.score - a.score);

    if (!candidates.length) {
      return { type: "NO_DECISION", reason };
    }

    const best = candidates[0];
    const second = candidates[1] ?? null;
    const contest = second ? clamp((second.score - best.score + 0.15) / 0.30) : 0;
    const roll = rng01(this.rng);
    const winner = second && roll < contest ? second : best;
    const side = sideOf(state, winner.player);

    if (!side) return { type: "NO_DECISION", reason };

    return {
      type: "POSSESSION",
      side,
      playerId: winner.player.id,
      reason,
      distance: winner.distance,
      confidence: clamp(winner.score),
      contested: Boolean(second && Math.abs(best.score - second.score) < 0.10),
      roll,
    };
  }

  /**
   * A shot that misses the goal and goes out results in a goal kick.
   * The shot direction is simplified to the attacking side.
   */
  decideMissedShot(state, { attackingSide }) {
    if (!SIDES.includes(attackingSide)) return { type: "NO_DECISION" };
    const defendingSide = attackingSide === "home" ? "away" : "home";
    const keeper = (state?.teams?.[defendingSide]?.players ?? []).find((p) => active(p) && (p.isGoalkeeper || p.goalkeeper || String(p.primaryRole ?? p.role ?? "").toLowerCase().includes("portiere")));
    return {
      type: "RESTART",
      restart: RESTARTS.GOAL_KICK,
      side: defendingSide,
      playerId: keeper?.id ?? null,
      reason: "shot_missed",
    };
  }

  /**
   * Basic contact assessment. Higher contact/late/aggression + lower ball-play
   * increases foul probability. The referee's strictness modifies the threshold.
   */
  evaluateContact(state, {
    tackler,
    opponent,
    contact = 0.5,
    timing = 0.5,
    ballPlay = 0.5,
    dangerous = false,
  } = {}) {
    const strictness = this.profile.strictness / 100;
    const tolerance = this.profile.contactTolerance / 100;
    const aggression = Number(tackler?.attributes?.mental?.aggressivita ?? 50) / 99;
    const base = contact * 0.34 + timing * 0.25 + (1 - ballPlay) * 0.26 + aggression * 0.15;
    const foulProbability = clamp(base * (0.55 + strictness * 0.75) * (1.20 - tolerance * 0.35));
    const roll = rng01(this.rng);
    const foul = roll < foulProbability;
    let type = FOULS.NONE;
    if (foul) {
      const severity = contact * 0.45 + timing * 0.30 + (dangerous ? 0.25 : 0);
      type = severity >= 0.72 ? FOULS.EXCESSIVE_FORCE : severity >= 0.48 ? FOULS.RECKLESS : FOULS.CARELESS;
    }
    return {
      type: foul ? "FOUL" : "NO_FOUL",
      foulType: type,
      probability: foulProbability,
      roll,
      tacklerId: tackler?.id ?? null,
      opponentId: opponent?.id ?? null,
      side: foul ? sideOf(state, opponent) : null,
    };
  }

  decideAdvantage({ foul, attackingSide, possessionSide, dangerousAttack = false }) {
    if (!foul || !SIDES.includes(attackingSide) || !SIDES.includes(possessionSide)) return false;
    if (attackingSide !== possessionSide) return false;
    const tendency = this.profile.advantageTendency / 100;
    const threshold = dangerousAttack ? 0.30 : 0.58;
    return tendency / 100 > threshold;
  }
}

export function createRefereeEngine(state, rng) {
  const config = state?.referee ?? {};
  const referee = new Referee(config, rng);
  state.referee = { ...state.referee, ...referee.getSnapshot() };
  return referee;
}

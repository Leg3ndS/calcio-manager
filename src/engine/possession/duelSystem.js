/**
 * DUEL SYSTEM V3
 *
 * Il duello NON usa un tiro casuale per decidere il vincitore.
 * Il risultato nasce dallo stato fisico della situazione:
 * - posizione relativa giocatori/pallone
 * - velocita' e direzione
 * - distanza dal pallone
 * - tempo di arrivo stimato
 * - controllo del portatore
 * - equilibrio/forza/agilita'/reazione
 * - attributi tecnici e mentali come modificatori
 *
 * La fisica determina la situazione; le statistiche determinano quanto bene
 * il giocatore riesce a sfruttarla. L'arbitro valuta il contatto/fallo.
 */
import { Referee } from '../referee/referee.js';
import { applyContactDisplacement } from '../physics/playerPhysics.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, Number.isFinite(Number(v)) ? Number(v) : a));
const num = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const pos = p => p?.position ?? { x: num(p?.x, .5), y: num(p?.y, .5) };
const vec = p => p?.physics?.velocity ?? p?.velocity ?? { x: 0, y: 0 };
const distXY = (a, b) => Math.hypot(num(a?.x) - num(b?.x), num(a?.y) - num(b?.y));
const dist = (a, b) => distXY(pos(a), pos(b));
const sideOf = (state, p) => p?.side ?? p?.team ?? ['home', 'away'].find(s => (state?.teams?.[s]?.players ?? []).some(x => String(x.id) === String(p?.id))) ?? null;

function attribute(player, group, key, fallback = 50) {
  return num(player?.attributes?.[group]?.[key], num(player?.[key], fallback));
}

function normalizedSpeed(player) {
  const v = vec(player);
  const speed = Math.hypot(num(v.x), num(v.y));
  const max = num(player?.physics?.maxSpeed, num(player?.runtimeMovement?.maxSpeed, .08));
  return clamp(max > 0 ? speed / max : speed / .08);
}

function directionToward(from, to) {
  const dx = num(to?.x) - num(from?.x);
  const dy = num(to?.y) - num(from?.y);
  const d = Math.hypot(dx, dy);
  return d > 1e-8 ? { x: dx / d, y: dy / d } : { x: 0, y: 0 };
}

function velocityAlignment(player, target) {
  const v = vec(player);
  const speed = Math.hypot(num(v.x), num(v.y));
  if (speed < 1e-8) return .5;
  const d = directionToward(pos(player), pos(target));
  return clamp(((num(v.x) / speed) * d.x + (num(v.y) / speed) * d.y + 1) / 2);
}

function timeToBall(player, ball) {
  const d = dist(player, ball);
  const speed = num(player?.physics?.speed, Math.hypot(num(vec(player).x), num(vec(player).y)));
  const acceleration = num(player?.physics?.acceleration, .02);
  const reaction = num(attribute(player, 'physical', 'reattivita', 50), 50) / 99;
  const effective = Math.max(.015, speed + acceleration * (.35 + reaction * .45));
  return d / effective;
}

function ballControlState(attacker, ball) {
  const d = dist(attacker, ball);
  const v = ball?.velocity ?? ball?.physics?.velocity ?? { x: 0, y: 0 };
  const ballSpeed = Math.hypot(num(v.x), num(v.y));
  const controlDistance = .025 + attribute(attacker, 'technical', 'primoControllo', 50) / 99 * .045;
  const distanceQuality = 1 - clamp((d - .015) / .11);
  const speedPenalty = clamp(ballSpeed / .45) * .28;
  return clamp(distanceQuality * .78 + (1 - speedPenalty) * .22);
}

function pressureGeometry(attacker, defender, ball) {
  const d = dist(attacker, defender);
  const defenderBall = dist(defender, ball);
  const attackerBall = dist(attacker, ball);
  const defenderAlignment = velocityAlignment(defender, attacker);
  const attackerAlignment = velocityAlignment(attacker, defender);

  // 1 = difensore in posizione ideale; 0 = completamente fuori azione.
  const closing = clamp(normalizedSpeed(defender) * defenderAlignment);
  const angle = clamp(1 - Math.abs(attackerAlignment - defenderAlignment));
  const bodyPosition = clamp((1 - defenderBall / .16) * .60 + closing * .25 + angle * .15);
  const attackerExposure = clamp((defenderBall - attackerBall + .06) / .16);

  return { d, defenderBall, attackerBall, closing, angle, bodyPosition, attackerExposure };
}

function deterministicDuelScores({ attacker, defender, ball, geometry }) {
  const control = ballControlState(attacker, ball);
  const atkSpeed = normalizedSpeed(attacker);
  const defSpeed = normalizedSpeed(defender);

  const atkPhysical = (
    attribute(attacker, 'physical', 'agilita') * .24 +
    attribute(attacker, 'physical', 'equilibrio') * .18 +
    attribute(attacker, 'physical', 'accelerazione') * .16 +
    attribute(attacker, 'physical', 'forza') * .08 +
    attribute(attacker, 'physical', 'reattivita') * .10
  ) / 99;
  const defPhysical = (
    attribute(defender, 'physical', 'agilita') * .18 +
    attribute(defender, 'physical', 'equilibrio') * .10 +
    attribute(defender, 'physical', 'accelerazione') * .12 +
    attribute(defender, 'physical', 'forza') * .22 +
    attribute(defender, 'physical', 'reattivita') * .12
  ) / 99;

  const atkSkill = (
    attribute(attacker, 'technical', 'dribbling') * .34 +
    attribute(attacker, 'technical', 'primoControllo') * .28 +
    attribute(attacker, 'technical', 'tecnica') * .12 +
    attribute(attacker, 'mental', 'decisioni') * .12 +
    attribute(attacker, 'mental', 'anticipazione') * .14
  ) / 99;
  const defSkill = (
    attribute(defender, 'technical', 'contrasti') * .34 +
    attribute(defender, 'technical', 'marcatura') * .18 +
    attribute(defender, 'mental', 'anticipazione') * .18 +
    attribute(defender, 'mental', 'posizionamento') * .16 +
    attribute(defender, 'mental', 'decisioni') * .14
  ) / 99;

  // La situazione fisica pesa piu' delle statistiche pure.
  const attackerScore = clamp(
    control * .30 +
    (1 - geometry.bodyPosition) * .18 +
    atkSpeed * .10 +
    atkPhysical * .15 +
    atkSkill * .22 +
    geometry.attackerExposure * .05
  );

  const defenderScore = clamp(
    (1 - control) * .08 +
    geometry.bodyPosition * .31 +
    defSpeed * .12 +
    defPhysical * .16 +
    defSkill * .25 +
    geometry.closing * .08
  );

  return { attackerScore, defenderScore, control, atkSpeed, defSpeed };
}

export function shouldTriggerDuel({ state, attacker, defender, action = 'dribble' }) {
  if (!attacker || !defender || !state?.ball) return false;
  if (!attacker.hasBall && state.ball.ownerId !== attacker.id) return false;
  if (!['dribble', 'carry', 'pass', 'cross', 'shoot'].includes(String(action).toLowerCase())) return false;

  const g = pressureGeometry(attacker, defender, state.ball);
  if (g.d > .072) return false;

  // Un nuovo duello richiede una situazione fisica realmente contestata.
  const ballContest = g.defenderBall < .085;
  const closing = g.closing > .16;
  const sideContact = g.d < .045;
  return ballContest && (closing || sideContact);
}

export function resolveDuel({ state, attacker, defender, emitEvent, referee = null, action = 'dribble' }) {
  if (!attacker || !defender || !state?.ball) return null;
  if (!shouldTriggerDuel({ state, attacker, defender, action })) return null;

  const tick = num(state?.tick, 0);
  const pairKey = [attacker.id, defender.id].sort().join(':');
  const previous = state._duelMemory;
  const separation = dist(attacker, defender);

  // Lo stesso contatto non puo' generare un nuovo duello a ogni tick.
  if (previous?.pairKey === pairKey) {
    const ticksSince = tick - num(previous.tick, tick);
    if (separation < .085 && ticksSince < 8) return null;
  }

  const geometry = pressureGeometry(attacker, defender, state.ball);
  const scores = deterministicDuelScores({ attacker, defender, ball: state.ball, geometry });
  const margin = scores.attackerScore - scores.defenderScore;

  // Nessun RNG: prevale chi ha la situazione migliore. In caso di parita'
  // conta la posizione sul pallone, poi il controllo, poi l'inerzia.
  let winner;
  if (Math.abs(margin) > .018) {
    winner = margin > 0 ? 'attacker' : 'defender';
  } else if (geometry.attackerBall < geometry.defenderBall - .006) {
    winner = 'attacker';
  } else if (geometry.defenderBall < geometry.attackerBall - .006) {
    winner = 'defender';
  } else {
    winner = scores.control >= .5 ? 'attacker' : 'defender';
  }

  const ref = referee ?? new Referee(state?.referee ?? {});
  const contact = clamp((.072 - geometry.d) / .052);
  const timing = clamp(geometry.closing * .72 + (1 - geometry.angle) * .28);
  const ballPlay = scores.control;
  const foul = ref.evaluateContact(state, {
    tackler: defender,
    opponent: attacker,
    contact,
    timing,
    ballPlay,
    dangerous: action === 'shoot' && geometry.bodyPosition > .65,
  });

  const foulResult = foul?.type === 'FOUL';
  const attackingSide = sideOf(state, attacker);
  const field = pos(attacker).x;
  const forward = attackingSide === 'home'
    ? pos(defender).x - field
    : field - pos(defender).x;
  const space = clamp((.18 - geometry.defenderBall) / .18);
  const advantage = foulResult
    ? ref.decideAdvantage({
        foul,
        attackingSide,
        fieldPosition: field,
        forwardProgress: clamp(forward / .25),
        space,
        support: space,
        opponentsAhead: 2,
        counterAttack: forward > .04,
      })
    : { played: false, score: 0 };

  state._duelMemory = {
    pairKey,
    tick,
    attackerId: attacker.id,
    defenderId: defender.id,
    ballX: pos(state.ball).x,
    ballY: pos(state.ball).y,
  };

  emitEvent?.({
    type: 'DUEL_RESOLVED',
    payload: {
      attackerId: attacker.id,
      defenderId: defender.id,
      action,
      distance: geometry.d,
      attackerBallDistance: geometry.attackerBall,
      defenderBallDistance: geometry.defenderBall,
      attackerSpeed: scores.atkSpeed,
      defenderSpeed: scores.defSpeed,
      ballControl: scores.control,
      closing: geometry.closing,
      bodyPosition: geometry.bodyPosition,
      attackerScore: scores.attackerScore,
      defenderScore: scores.defenderScore,
      margin,
      winner,
      deterministic: true,
    },
  });

  if (foulResult) {
    const foulPayload = {
      foulType: foul.foulType,
      committedById: defender.id,
      sufferedById: attacker.id,
      side: attackingSide,
      probability: foul.probability,
      contact,
      timing,
      ballPlay,
    };
    emitEvent?.({ type: 'FOUL_COMMITTED', payload: foulPayload });
    if (advantage.played) {
      emitEvent?.({ type: 'ADVANTAGE_PLAYED', payload: { ...foulPayload, score: advantage.score } });
    } else {
      emitEvent?.({
        type: 'FREE_KICK_AWARDED',
        payload: { ...foulPayload, restart: 'free_kick', position: { ...pos(attacker) } },
      });
    }
  }

  // Il contatto fisico modifica davvero le traiettorie; non teletrasportiamo il giocatore.
  const impulse = clamp(.0015 + contact * .0045, .0015, .006);
  applyContactDisplacement({ player: attacker, other: defender, impulse: impulse * .75 });
  applyContactDisplacement({ player: defender, other: attacker, impulse });

  return {
    winner,
    duelScore: { attacker: scores.attackerScore, defender: scores.defenderScore },
    foul,
    advantage,
    stopped: foulResult && !advantage.played,
    attackerId: attacker.id,
    defenderId: defender.id,
    geometry,
    deterministic: true,
  };
}

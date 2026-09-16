/**
 * PLAYER PHYSICS
 * Deterministic, renderer-independent kinematic model.
 * Coordinates are normalized 0..1.
 */

const FIELD_MIN = 0.025;
const FIELD_MAX = 0.975;
const EPSILON = 1e-6;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;

function attr(player, group, name, fallback = 50) {
  const value = player?.attributes?.[group]?.[name] ?? player?.[name];
  const n = Number(value);
  return Number.isFinite(n) ? clamp(n, 1, 99) : fallback;
}

function getPhysicalProfile(player) {
  return {
    acceleration: attr(player, "physical", "accelerazione"),
    speed: attr(player, "physical", "velocita"),
    agility: attr(player, "physical", "agilita"),
    balance: attr(player, "physical", "equilibrio"),
    stamina: attr(player, "physical", "resistenza"),
    strength: attr(player, "physical", "forza"),
    reaction: attr(player, "physical", "reattivita"),
  };
}

export function getPlayerPhysicsProfile(player) {
  const p = getPhysicalProfile(player);
  const fatigue = clamp(Number(player?.fatigue ?? 0), 0, 100);
  const staminaState = clamp((100 - fatigue) / 100, 0.45, 1);

  return {
    ...p,
    fatigue,
    staminaState,
    maxSpeed: 0.022 + (p.speed / 99) * 0.055,
    accelerationRate: 0.030 + (p.acceleration / 99) * 0.060,
    decelerationRate: 0.040 + (p.agility / 99) * 0.080,
    turnRate: 2.0 + (p.agility / 99) * 6.0,
  };
}

export function ensurePlayerPhysicsState(player) {
  if (!player.physics) {
    player.physics = {};
  }
  player.physics.velocity = player.physics.velocity ?? { x: 0, y: 0 };
  player.physics.acceleration = player.physics.acceleration ?? { x: 0, y: 0 };
  player.physics.direction = Number.isFinite(player.physics.direction) ? player.physics.direction : 0;
  player.physics.speed = Number.isFinite(player.physics.speed) ? player.physics.speed : 0;
  player.physics.grounded = true;
  return player.physics;
}

export function simulatePlayerMotion({
  player,
  target,
  deltaSeconds = 0.1,
  desiredSpeedMultiplier = 1,
}) {
  if (!player) return null;

  const dt = clamp(Number(deltaSeconds) || 0, 0, 0.25);
  const physics = ensurePlayerPhysicsState(player);
  const profile = getPlayerPhysicsProfile(player);

  const current = player.position ?? { x: 0.5, y: 0.5 };
  const goal = target ?? current;
  const dx = goal.x - current.x;
  const dy = goal.y - current.y;
  const distance = Math.hypot(dx, dy);

  const fatigueMultiplier = profile.staminaState;
  const desiredMax = profile.maxSpeed * clamp(desiredSpeedMultiplier, 0.15, 1.2) * fatigueMultiplier;

  let desiredVX = 0;
  let desiredVY = 0;
  if (distance > 0.0005) {
    desiredVX = (dx / distance) * Math.min(desiredMax, distance / Math.max(dt, 0.001));
    desiredVY = (dy / distance) * Math.min(desiredMax, distance / Math.max(dt, 0.001));
  }

  const currentSpeed = Math.hypot(physics.velocity.x, physics.velocity.y);
  const desiredSpeed = Math.hypot(desiredVX, desiredVY);
  const rate = desiredSpeed >= currentSpeed ? profile.accelerationRate : profile.decelerationRate;

  const oldVX = physics.velocity.x;
  const oldVY = physics.velocity.y;
  const maxDeltaV = rate * dt;
  const dvx = desiredVX - oldVX;
  const dvy = desiredVY - oldVY;
  const dv = Math.hypot(dvx, dvy);
  const blend = dv > maxDeltaV && dv > EPSILON ? maxDeltaV / dv : 1;
  physics.velocity.x = oldVX + dvx * blend;
  physics.velocity.y = oldVY + dvy * blend;

  const nextSpeed = Math.hypot(physics.velocity.x, physics.velocity.y);
  if (nextSpeed > desiredMax && nextSpeed > EPSILON) {
    const scale = desiredMax / nextSpeed;
    physics.velocity.x *= scale;
    physics.velocity.y *= scale;
  }

  const moveX = physics.velocity.x * dt;
  const moveY = physics.velocity.y * dt;
  const nextX = clamp(current.x + moveX, FIELD_MIN, FIELD_MAX);
  const nextY = clamp(current.y + moveY, FIELD_MIN, FIELD_MAX);

  player.position = { x: nextX, y: nextY };
  player.velocity = { x: nextX - current.x, y: nextY - current.y };
  physics.acceleration = {
    x: (physics.velocity.x - oldVX) / Math.max(dt, 0.001),
    y: (physics.velocity.y - oldVY) / Math.max(dt, 0.001),
  };
  physics.speed = Math.hypot(physics.velocity.x, physics.velocity.y);

  if (physics.speed > 0.0001) {
    physics.direction = Math.atan2(physics.velocity.y, physics.velocity.x);
    player.facingDirection = physics.direction;
  }

  player.runtimeMovement = {
    ...(player.runtimeMovement ?? {}),
    distanceToTarget: distance,
    speed: physics.speed,
    maxSpeed: desiredMax,
    acceleration: Math.hypot(physics.acceleration.x, physics.acceleration.y),
    direction: physics.direction,
    fatigueMultiplier,
    moving: physics.speed > 0.0001,
  };

  return physics;
}

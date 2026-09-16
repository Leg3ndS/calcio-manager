/**
 * BALL PHYSICS
 * Deterministic 2D/vertical kinematic model for the match engine.
 * Coordinates are normalized 0..1.
 */

const FIELD_MIN = 0.01;
const FIELD_MAX = 0.99;
const GRAVITY = 9.81;
const GROUND_FRICTION = 0.92;
const AIR_DRAG = 0.985;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function ensureBall(ball) {
  ball.position = ball.position ?? { x: ball.x ?? 0.5, y: ball.y ?? 0.5 };
  ball.velocity = ball.velocity ?? { x: ball.velocityX ?? 0, y: ball.velocityY ?? 0 };
  ball.verticalVelocity = Number.isFinite(ball.verticalVelocity) ? ball.verticalVelocity : 0;
  ball.spin = Number.isFinite(ball.spin) ? ball.spin : 0;
  ball.height = Number.isFinite(ball.height) ? ball.height : 0;
  return ball;
}

export function launchBall({
  ball,
  from,
  to,
  speed = 0.25,
  height = 0,
  spin = 0,
  state = "in_flight",
}) {
  ensureBall(ball);
  const start = from ?? { x: ball.x ?? 0.5, y: ball.y ?? 0.5 };
  const end = to ?? start;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy) || 1;
  const normalizedSpeed = Math.max(0.01, Number(speed) || 0.25);

  ball.x = start.x;
  ball.y = start.y;
  ball.position = { x: start.x, y: start.y };
  ball.velocityX = (dx / distance) * normalizedSpeed;
  ball.velocityY = (dy / distance) * normalizedSpeed;
  ball.velocity = { x: ball.velocityX, y: ball.velocityY };
  ball.height = Math.max(0, Number(height) || 0);
  ball.verticalVelocity = ball.height > 0 ? Math.sqrt(2 * GRAVITY * ball.height) : 0;
  ball.spin = Number(spin) || 0;
  ball.state = state;
  ball.ownerId = null;
  ball.targetX = end.x;
  ball.targetY = end.y;
  return ball;
}

export function updateBallPhysics(ball, deltaSeconds = 0.1) {
  if (!ball) return null;
  const dt = clamp(Number(deltaSeconds) || 0, 0, 0.25);
  ensureBall(ball);

  if (ball.ownerId) {
    ball.state = "controlled";
    ball.velocityX = 0;
    ball.velocityY = 0;
    ball.velocity = { x: 0, y: 0 };
    return ball;
  }

  if (!["in_flight", "rolling", "free", "loose"].includes(ball.state)) {
    return ball;
  }

  const drag = ball.height > 0 ? AIR_DRAG : GROUND_FRICTION;
  ball.velocityX *= Math.pow(drag, dt * 10);
  ball.velocityY *= Math.pow(drag, dt * 10);

  if (ball.height > 0 || ball.verticalVelocity !== 0) {
    ball.height += ball.verticalVelocity * dt;
    ball.verticalVelocity -= GRAVITY * dt * 0.02;
    if (ball.height <= 0) {
      ball.height = 0;
      ball.verticalVelocity = 0;
      ball.state = "rolling";
    }
  }

  ball.x = clamp((ball.x ?? 0.5) + ball.velocityX * dt, FIELD_MIN, FIELD_MAX);
  ball.y = clamp((ball.y ?? 0.5) + ball.velocityY * dt, FIELD_MIN, FIELD_MAX);
  ball.position = { x: ball.x, y: ball.y };
  ball.velocity = { x: ball.velocityX, y: ball.velocityY };

  const speed = Math.hypot(ball.velocityX, ball.velocityY);
  if (speed < 0.001 && ball.height <= 0) {
    ball.velocityX = 0;
    ball.velocityY = 0;
    ball.velocity = { x: 0, y: 0 };
    ball.state = "free";
  }

  return ball;
}

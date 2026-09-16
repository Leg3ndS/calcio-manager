/**
 * COLLISION / PROXIMITY HELPERS.
 * Physics-neutral helpers used by the match engine.
 */

export function distance(a, b) {
  return Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.y ?? 0) - (b?.y ?? 0));
}

export function distanceSquared(a, b) {
  const dx = (a?.x ?? 0) - (b?.x ?? 0);
  const dy = (a?.y ?? 0) - (b?.y ?? 0);
  return dx * dx + dy * dy;
}

export function isPlayerNearBall(player, ball, radius = 0.035) {
  return distanceSquared(player?.position, ball) <= radius * radius;
}

export function findClosestPlayerToBall(players = [], ball) {
  let closest = null;
  let best = Infinity;
  for (const player of players) {
    if (!player || player.onPitch === false || player.matchState?.onPitch === false) continue;
    const d = distanceSquared(player.position, ball);
    if (d < best) {
      best = d;
      closest = player;
    }
  }
  return closest;
}

export function getBallPathPoint(ball, t) {
  const clampedT = Math.max(0, Math.min(1, Number(t) || 0));
  return {
    x: (ball?.x ?? 0.5) + (ball?.velocityX ?? 0) * clampedT,
    y: (ball?.y ?? 0.5) + (ball?.velocityY ?? 0) * clampedT,
  };
}

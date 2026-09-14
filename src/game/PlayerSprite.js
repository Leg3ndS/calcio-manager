export class PlayerSprite {
  constructor(scene, player, x, y) {
    this.scene = scene;
    this.player = player;

    this.container = scene.add.container(x, y);

    const radius = 18;

    this.circle = scene.add.circle(
      0,
      0,
      radius,
      player.team === "home" ? 0x2563eb : 0xf8fafc
    );

    this.circle.setStrokeStyle(
      2,
      player.team === "home" ? 0xffffff : 0x111827
    );

    this.number = scene.add.text(
      0,
      0,
      String(player.number),
      {
        fontFamily: "Arial",
        fontSize: "13px",
        fontStyle: "bold",
        color: player.team === "home"
          ? "#ffffff"
          : "#111827"
      }
    );

    this.number.setOrigin(0.5);

    this.container.add([
      this.circle,
      this.number
    ]);

    // Posizione desiderata
    this.targetX = x;
    this.targetY = y;

    // Movimento fisico
    this.velocityX = 0;
    this.velocityY = 0;

    this.maxSpeed = 95;
    this.acceleration = 220;
    this.deceleration = 260;
  }

  setTarget(x, y) {
    this.targetX = x;
    this.targetY = y;
  }

  update(delta) {
    const dt = delta / 1000;

    const dx = this.targetX - this.container.x;
    const dy = this.targetY - this.container.y;

    const distance = Math.sqrt(
      dx * dx + dy * dy
    );

    if (distance > 2) {
      const directionX = dx / distance;
      const directionY = dy / distance;

      this.velocityX +=
        directionX * this.acceleration * dt;

      this.velocityY +=
        directionY * this.acceleration * dt;
    } else {
      // Rallenta quando arriva a destinazione
      const slow = Math.max(
        0,
        1 - this.deceleration * dt / 100
      );

      this.velocityX *= slow;
      this.velocityY *= slow;
    }

    const speed = Math.sqrt(
      this.velocityX * this.velocityX +
      this.velocityY * this.velocityY
    );

    if (speed > this.maxSpeed) {
      this.velocityX =
        (this.velocityX / speed) * this.maxSpeed;

      this.velocityY =
        (this.velocityY / speed) * this.maxSpeed;
    }

    this.container.x += this.velocityX * dt;
    this.container.y += this.velocityY * dt;
  }

  destroy() {
    this.container.destroy(true);
  }
}

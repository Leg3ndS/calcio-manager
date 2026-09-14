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
        color: player.team === "home" ? "#ffffff" : "#111827"
      }
    );

    this.number.setOrigin(0.5);

    this.container.add([
      this.circle,
      this.number
    ]);

    this.targetX = x;
    this.targetY = y;

    this.speed = 90;
  }

  setTarget(x, y) {
    this.targetX = x;
    this.targetY = y;
  }

  update(delta) {
    const dt = delta / 1000;

    const dx = this.targetX - this.container.x;
    const dy = this.targetY - this.container.y;

    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 0.5) {
      return;
    }

    const maxMove = this.speed * dt;
    const amount = Math.min(maxMove, distance);

    this.container.x += (dx / distance) * amount;
    this.container.y += (dy / distance) * amount;
  }

  destroy() {
    this.container.destroy(true);
  }
}

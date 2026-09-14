export class Ball {
  constructor(scene, x, y) {
    this.scene = scene;

    this.sprite = scene.add.circle(
      x,
      y,
      7,
      0xffffff
    );

    this.sprite.setStrokeStyle(2, 0x111111);

    this.x = x;
    this.y = y;

    this.velocityX = 0;
    this.velocityY = 0;

    this.targetX = x;
    this.targetY = y;

    this.moving = false;
    this.speed = 300;
  }

  passTo(x, y, speed = 300) {
    this.targetX = x;
    this.targetY = y;

    this.speed = speed;
    this.moving = true;

    const dx = x - this.x;
    const dy = y - this.y;

    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
      this.moving = false;
      return;
    }

    this.velocityX = dx / distance;
    this.velocityY = dy / distance;
  }

  stop(x = this.x, y = this.y) {
    this.x = x;
    this.y = y;

    this.sprite.setPosition(x, y);

    this.velocityX = 0;
    this.velocityY = 0;

    this.moving = false;
  }

  update(delta) {
    if (!this.moving) {
      return;
    }

    const dt = delta / 1000;

    const remainingX = this.targetX - this.x;
    const remainingY = this.targetY - this.y;

    const distance = Math.sqrt(
      remainingX * remainingX +
      remainingY * remainingY
    );

    const movement = this.speed * dt;

    if (distance <= movement) {
      this.x = this.targetX;
      this.y = this.targetY;

      this.sprite.setPosition(this.x, this.y);

      this.moving = false;
      return;
    }

    this.x += this.velocityX * movement;
    this.y += this.velocityY * movement;

    this.sprite.setPosition(this.x, this.y);
  }
}

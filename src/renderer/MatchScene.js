import Phaser from "phaser";

let activeStateGetter = () => null;

const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));

export class MatchScene extends Phaser.Scene {
  constructor() {
    super("MatchScene");
    this.playerGraphics = new Map();
    this.pitchGraphics = null;
    this.ball = null;
  }

  create() {
    this.cameras.main.setBackgroundColor("#07100b");
    this.playerGraphics = new Map();
    this.drawPitch();
    this.ball = this.add.circle(0, 0, 5, 0xffffff).setDepth(20);
    this.scale.on("resize", () => this.drawPitch());
  }

  drawPitch() {
    this.pitchGraphics?.destroy();
    const g = this.add.graphics().setDepth(0);
    const w = this.scale.width;
    const h = this.scale.height;
    const pad = Math.max(12, Math.min(w, h) * 0.035);
    const x = pad;
    const y = pad;
    const pw = Math.max(10, w - pad * 2);
    const ph = Math.max(10, h - pad * 2);

    g.fillStyle(0x155c35, 1);
    g.fillRoundedRect(x, y, pw, ph, 14);
    g.lineStyle(2, 0xf2faf4, 0.9);
    g.strokeRoundedRect(x, y, pw, ph, 14);
    g.lineBetween(x + pw / 2, y, x + pw / 2, y + ph);
    g.strokeCircle(x + pw / 2, y + ph / 2, Math.min(pw, ph) * 0.13);
    g.fillStyle(0xf2faf4, 0.95);
    g.fillCircle(x + pw / 2, y + ph / 2, 3);

    const boxH = ph * 0.44;
    const boxW = pw * 0.15;
    g.strokeRect(x, y + (ph - boxH) / 2, boxW, boxH);
    g.strokeRect(x + pw - boxW, y + (ph - boxH) / 2, boxW, boxH);
    g.strokeRect(x - 5, y + ph * 0.42, 5, ph * 0.16);
    g.strokeRect(x + pw, y + ph * 0.42, 5, ph * 0.16);

    this.pitchGraphics = g;
  }

  update() {
    const state = activeStateGetter?.();
    if (!state) return;

    const w = this.scale.width;
    const h = this.scale.height;
    const pad = Math.max(12, Math.min(w, h) * 0.035);
    const px = (v) => pad + clamp01(v) * (w - pad * 2);
    const py = (v) => pad + clamp01(v) * (h - pad * 2);

    const seen = new Set();
    let homeNumber = 0;
    let awayNumber = 0;

    for (const side of ["home", "away"]) {
      const team = state.teams?.[side];
      for (const player of team?.players ?? []) {
        if (player.matchState?.onPitch === false || player.matchState?.substituted || player.matchState?.injured) continue;
        const pos = player.matchState?.actualPosition ?? player.position;
        if (!pos) continue;
        seen.add(player.id);

        const number = player.number ?? player.shirtNumber ?? (side === "home" ? ++homeNumber : ++awayNumber);
        let graphic = this.playerGraphics.get(player.id);

        if (!graphic) {
          const token = this.add.circle(px(pos.x), py(pos.y), Math.max(8, Math.min(w, h) * 0.018), side === "home" ? 0x2878e8 : 0xd83b43).setDepth(10);
          token.setStrokeStyle(2, 0xffffff, 0.9);
          const label = this.add.text(px(pos.x), py(pos.y), String(number), {
            fontFamily: "Arial",
            fontSize: Math.max(9, Math.min(w, h) * 0.018),
            fontStyle: "bold",
            color: "#ffffff",
          }).setOrigin(0.5).setDepth(11);
          graphic = { token, label };
          this.playerGraphics.set(player.id, graphic);
        }

        const tx = px(pos.x);
        const ty = py(pos.y);
        graphic.token.x += (tx - graphic.token.x) * 0.28;
        graphic.token.y += (ty - graphic.token.y) * 0.28;
        graphic.label.x = graphic.token.x;
        graphic.label.y = graphic.token.y;
      }
    }

    for (const [id, graphic] of this.playerGraphics) {
      if (!seen.has(id)) {
        graphic.token.destroy();
        graphic.label.destroy();
        this.playerGraphics.delete(id);
      }
    }

    const ball = state.ball;
    if (ball && this.ball) {
      const bx = px(ball.x ?? 0.5);
      const by = py(ball.y ?? 0.5);
      this.ball.x += (bx - this.ball.x) * 0.45;
      this.ball.y += (by - this.ball.y) * 0.45;
    }
  }
}

export function createMatchGame(parent, getState) {
  activeStateGetter = getState ?? (() => null);
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 540,
    backgroundColor: "#07100b",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 960,
      height: 540,
    },
    scene: [MatchScene],
    render: { antialias: true },
  });
}

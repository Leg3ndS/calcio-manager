import Phaser from "phaser";


export class MatchScene extends Phaser.Scene {
  constructor() {
    super("MatchScene");
    this.getState = () => null;
  }

  create() {
    this.cameras.main.setBackgroundColor("#0a120d");
    this.playerGraphics = new Map();
    this.ball = this.add.circle(0, 0, 5, 0xf5f5ed);
    this.drawPitch();
  }

  setStateGetter(getState) {
    this.getState = getState;
  }

  drawPitch() {
    const g = this.add.graphics();
    const w = this.scale.width;
    const h = this.scale.height;
    const pad = 18;
    const x = pad, y = pad, pw = w - pad * 2, ph = h - pad * 2;

    g.fillStyle(0x155c35, 1);
    g.fillRoundedRect(x, y, pw, ph, 14);
    g.lineStyle(2, 0xeaf5ed, .72);
    g.strokeRoundedRect(x, y, pw, ph, 14);
    g.lineBetween(x + pw / 2, y, x + pw / 2, y + ph);
    g.strokeCircle(x + pw / 2, y + ph / 2, Math.min(pw, ph) * .13);
    g.fillStyle(0xeaf5ed, .85);
    g.fillCircle(x + pw / 2, y + ph / 2, 3);

    const boxH = ph * .44, boxW = pw * .15;
    g.strokeRect(x, y + (ph - boxH) / 2, boxW, boxH);
    g.strokeRect(x + pw - boxW, y + (ph - boxH) / 2, boxW, boxH);
    g.strokeRect(x - 5, y + ph * .42, 5, ph * .16);
    g.strokeRect(x + pw, y + ph * .42, 5, ph * .16);
  }

  update() {
    const state = this.getState?.();
    if (!state) return;
    const w = this.scale.width, h = this.scale.height, pad = 18;
    const px = x => pad + x * (w - pad * 2);
    const py = y => pad + y * (h - pad * 2);

    const all = [];
    for (const side of ["home", "away"]) {
      const team = state.teams?.[side];
      for (const player of team?.players ?? []) {
        const pos = player.matchState?.actualPosition ?? player.position;
        if (!pos || player.matchState?.onPitch === false) continue;
        all.push({player,side,pos});
      }
    }

    for (const item of all) {
      let token = this.playerGraphics.get(item.player.id);
      if (!token) {
        token = this.add.circle(px(item.pos.x), py(item.pos.y), 9, item.side === "home" ? 0x2868d4 : 0xc93636);
        token.setStrokeStyle(2, 0xffffff, .82);
        this.playerGraphics.set(item.player.id, token);
      }
      token.x += (px(item.pos.x) - token.x) * .35;
      token.y += (py(item.pos.y) - token.y) * .35;
    }

    const b = state.ball;
    if (b) {
      this.ball.x += (px(b.x ?? .5) - this.ball.x) * .45;
      this.ball.y += (py(b.y ?? .5) - this.ball.y) * .45;
    }
  }
}

export function createMatchGame(parent, getState) {
  const scene = new MatchScene();
  scene.setStateGetter(getState);
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 540,
    backgroundColor: "#0a120d",
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [scene],
    render: { antialias: true },
  });
}

import Phaser from "phaser";
import { drawStadium } from "./Stadium";
import { PlayerSprite } from "./PlayerSprite";
import { Ball } from "./Ball";

const HOME_PLAYERS = [
  { number: 1, name: "Alex", role: "GK", team: "home" },
  { number: 2, name: "Marco", role: "RB", team: "home" },
  { number: 5, name: "Lorenzo", role: "CB", team: "home" },
  { number: 13, name: "Diego", role: "CB", team: "home" },
  { number: 3, name: "Nico", role: "LB", team: "home" },

  { number: 8, name: "Leo", role: "CM", team: "home" },
  { number: 6, name: "Andrea", role: "CM", team: "home" },
  { number: 10, name: "Matteo", role: "AM", team: "home" },

  { number: 7, name: "Luca", role: "RW", team: "home" },
  { number: 9, name: "Simone", role: "ST", team: "home" },
  { number: 11, name: "Davide", role: "LW", team: "home" }
];

const AWAY_PLAYERS = [
  { number: 1, name: "Thomas", role: "GK", team: "away" },
  { number: 2, name: "Kevin", role: "RB", team: "away" },
  { number: 4, name: "Jonas", role: "CB", team: "away" },
  { number: 5, name: "Niklas", role: "CB", team: "away" },
  { number: 3, name: "Paul", role: "LB", team: "away" },

  { number: 8, name: "Max", role: "CM", team: "away" },
  { number: 6, name: "Leon", role: "CM", team: "away" },
  { number: 10, name: "Felix", role: "AM", team: "away" },

  { number: 7, name: "Eric", role: "RW", team: "away" },
  { number: 9, name: "Lucas", role: "ST", team: "away" },
  { number: 11, name: "Julian", role: "LW", team: "away" }
];

function getFormationPosition(role, team, field) {
  const { x, y, width, height } = field;

  const home = team === "home";

  const positions = {
    GK: [0.05, 0.50],

    RB: [0.20, 0.18],
    CB: [0.17, 0.40],
    LB: [0.20, 0.82],

    CM: [0.38, 0.38],
    AM: [0.48, 0.50],

    RW: [0.62, 0.18],
    ST: [0.72, 0.50],
    LW: [0.62, 0.82]
  };

  let [px, py] = positions[role] || [0.5, 0.5];

  if (!home) {
    px = 1 - px;
  }

  return {
    x: x + width * px,
    y: y + height * py
  };
}

export default class MatchScene extends Phaser.Scene {
  constructor() {
    super("MatchScene");

    this.players = [];
    this.ball = null;
  }

  create() {
    this.field = drawStadium(this);

    this.createPlayers();

    const centerX = this.field.x + this.field.width / 2;
    const centerY = this.field.y + this.field.height / 2;

    this.ball = new Ball(
      this,
      centerX,
      centerY
    );

    // Piccolo test iniziale:
    // la palla passerà lentamente tra alcuni giocatori.
    this.testPassTimer = 0;
    this.testPassIndex = 0;
  }

  createPlayers() {
    const allPlayers = [
      ...HOME_PLAYERS,
      ...AWAY_PLAYERS
    ];

    allPlayers.forEach((player) => {
      const position = getFormationPosition(
        player.role,
        player.team,
        this.field
      );

      const sprite = new PlayerSprite(
        this,
        player,
        position.x,
        position.y
      );

      this.players.push({
        data: player,
        sprite
      });
    });
  }

  update(time, delta) {
    this.players.forEach((player) => {
      player.sprite.update(delta);
    });

    if (this.ball) {
      this.ball.update(delta);
    }

    this.testPassTimer += delta;

    if (
      this.testPassTimer > 1800 &&
      this.ball &&
      !this.ball.moving
    ) {
      this.testPassTimer = 0;

      const targets = this.players.filter(
        (p) => p.data.team === "home"
      );

      const target =
        targets[this.testPassIndex % targets.length];

      this.testPassIndex++;

      this.ball.passTo(
        target.sprite.container.x,
        target.sprite.container.y,
        260
      );
    }
  }
}

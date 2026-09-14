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
  { number: 10, name: "Matteo", role: "CM", team: "home" },

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
  { number: 10, name: "Felix", role: "CM", team: "away" },

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

    CM: [0.38, 0.50],

    RW: [0.62, 0.18],
    ST: [0.72, 0.50],
    LW: [0.62, 0.82]
  };

  let [px, py] = positions[role];

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

    this.ballCarrier = null;

    this.tacticalTimer = 0;
    this.passTimer = 0;
    this.passIndex = 0;
  }

  create() {
    this.field = drawStadium(this);

    this.createPlayers();

    const centerX =
      this.field.x + this.field.width / 2;

    const centerY =
      this.field.y + this.field.height / 2;

    this.ball = new Ball(
      this,
      centerX,
      centerY
    );

    // Inizialmente palla al centro
    this.ball.stop(centerX, centerY);

    // Facciamo partire il gioco
    this.passTimer = 1200;
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
        sprite,
        baseX: position.x,
        baseY: position.y
      });
    });
  }

  updateTacticalMovement() {
    if (!this.ball) return;

    const ballX = this.ball.x;
    const ballY = this.ball.y;

    const centerX =
      this.field.x + this.field.width / 2;

    const centerY =
      this.field.y + this.field.height / 2;

    this.players.forEach((player) => {
      const { data, baseX, baseY } = player;

      let targetX = baseX;
      let targetY = baseY;

      /*
       * MOVIMENTO DI SQUADRA
       *
       * Tutta la squadra segue leggermente
       * la posizione della palla.
       */

      const ballOffset =
        (ballX - centerX) * 0.13;

      if (data.team === "home") {
        targetX += ballOffset;
      } else {
        targetX += ballOffset;
      }

      /*
       * MOVIMENTO VERTICALE
       *
       * I giocatori si muovono in relazione
       * alla posizione verticale della palla.
       */

      const verticalInfluence =
        (ballY - centerY) * 0.08;

      targetY += verticalInfluence;

      /*
       * COMPORTAMENTO PER RUOLO
       */

      if (data.role === "GK") {
        targetX =
          data.team === "home"
            ? this.field.x + this.field.width * 0.055
            : this.field.x + this.field.width * 0.945;

        targetY =
          centerY +
          (ballY - centerY) * 0.25;
      }

      // Terzini: seguono maggiormente la fascia
      if (
        data.role === "RB" ||
        data.role === "LB"
      ) {
        targetX +=
          (ballX - centerX) * 0.16;
      }

      // Centrocampisti seguono maggiormente la palla
      if (data.role === "CM") {
        targetX +=
          (ballX - centerX) * 0.20;

        targetY +=
          (ballY - centerY) * 0.14;
      }

      // Ali mantengono ampiezza ma avanzano
      if (
        data.role === "RW" ||
        data.role === "LW"
      ) {
        targetX +=
          (ballX - centerX) * 0.24;

        targetY +=
          (ballY - centerY) * 0.10;
      }

      // Punta attacca la zona avanzata
      if (data.role === "ST") {
        targetX +=
          (ballX - centerX) * 0.25;

        targetY +=
          (ballY - centerY) * 0.12;
      }

      /*
       * Se la palla è lontana, i giocatori
       * non devono rimanere completamente immobili.
       */

      const distanceToBall = Phaser.Math.Distance.Between(
        player.sprite.container.x,
        player.sprite.container.y,
        ballX,
        ballY
      );

      if (distanceToBall < 260) {
        const dx =
          ballX - player.sprite.container.x;

        const dy =
          ballY - player.sprite.container.y;

        const distance =
          Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
          const influence =
            Math.max(
              0,
              1 - distance / 260
            );

          targetX +=
            (dx / distance) *
            influence *
            45;

          targetY +=
            (dy / distance) *
            influence *
            45;
        }
      }

      // Limiti del campo
      targetX = Phaser.Math.Clamp(
        targetX,
        this.field.x + 20,
        this.field.x + this.field.width - 20
      );

      targetY = Phaser.Math.Clamp(
        targetY,
        this.field.y + 20,
        this.field.y + this.field.height - 20
      );

      player.sprite.setTarget(
        targetX,
        targetY
      );
    });
  }

  moveBallToPlayer(player) {
    if (!player || !this.ball) return;

    this.ball.passTo(
      player.sprite.container.x,
      player.sprite.container.y,
      260
    );
  }

  chooseNextPassTarget() {
    const homePlayers =
      this.players.filter(
        (player) =>
          player.data.team === "home"
      );

    if (!homePlayers.length) return;

    const target =
      homePlayers[
        this.passIndex % homePlayers.length
      ];

    this.passIndex++;

    this.moveBallToPlayer(target);
  }

  update(time, delta) {
    // Atualiza movimentação dos jogadores
    this.tacticalTimer += delta;

    if (this.tacticalTimer >= 120) {
      this.tacticalTimer = 0;

      this.updateTacticalMovement();
    }

    // Atualiza física del pallone
    if (this.ball) {
      this.ball.update(delta);
    }

    /*
     * Temporaneamente facciamo circolare
     * la palla tra i giocatori.
     *
     * Questo verrà eliminato quando entrerà
     * in funzione il Match Engine vero.
     */

    this.passTimer += delta;

    if (
      this.passTimer >= 1800 &&
      !this.ball.moving
    ) {
      this.passTimer = 0;

      this.chooseNextPassTarget();
    }
  }
}

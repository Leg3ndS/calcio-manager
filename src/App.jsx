import { useEffect, useRef } from "react";
import Phaser from "phaser";
import MatchScene from "./game/MatchScene";
import "./App.css";

function App() {
  const gameRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) {
      return;
    }

    const config = {
      type: Phaser.AUTO,

      parent: containerRef.current,

      width: 1200,
      height: 700,

      backgroundColor: "#071a12",

      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1200,
        height: 700
      },

      render: {
        antialias: true,
        pixelArt: false,
        roundPixels: false
      },

      scene: [MatchScene]
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="game-page">
      <header className="topbar">
        <div>
          <div className="game-title">CALCIO MANAGER</div>
          <div className="game-subtitle">
            Match Engine • Prototype
          </div>
        </div>

        <div className="match-info">
          <span>NAP</span>
          <strong>0 - 0</strong>
          <span>JUV</span>
        </div>
      </header>

      <main className="game-main">
        <div
          ref={containerRef}
          className="phaser-container"
        />
      </main>

      <footer className="bottom-panel">
        <div className="match-status">
          <span className="live-dot" />
          MATCH ENGINE
        </div>

        <div className="speed-controls">
          <button>▶</button>
          <button>1x</button>
          <button>2x</button>
          <button>4x</button>
        </div>

        <div className="match-minute">
          00:00
        </div>
      </footer>
    </div>
  );
}

export default App;

import { useEffect, useRef, useState } from "react";

import { createTestEngine } from "./engine/matchTest.js";

import "./App.css";

function App() {
  const engineRef = useRef(null);
  const animationFrameRef = useRef(null);

  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const engine = createTestEngine();

    engineRef.current = engine;

    const unsubscribe = engine.subscribe((event) => {
      setEvents((previous) => {
        const next = [...previous, event];

        return next.slice(-30);
      });
    });

    engine.start();

    setMatch({
      ...engine.getState(),
      clock: {
        ...engine.getClockState(),
      },
    });

    let lastTime = performance.now();

    const loop = (currentTime) => {
      const delta = currentTime - lastTime;

      lastTime = currentTime;

      try {
        engine.update(delta);
      } catch (error) {
        console.error(
          "MATCH ENGINE ERROR:",
          error
        );

        const errorEvent = {
          type: "ENGINE_ERROR",
          matchMinute: engine.getClockState().minute,
          matchSecond: engine.getClockState().second,
          timestamp:
            engine.getClockState().totalSimulatedSeconds,
          payload: {
            message:
              error?.message ??
              String(error),

            stack:
              error?.stack ??
              "",
          },
        };

        setEvents((previous) => {
          const next = [
            ...previous,
            errorEvent,
          ];

          return next.slice(-30);
        });

        setMatch({
          ...engine.getState(),
          clock: {
            ...engine.getClockState(),
          },
        });

        return;
      }

      setMatch({
        ...engine.getState(),
        clock: {
          ...engine.getClockState(),
        },
      });

      animationFrameRef.current =
        requestAnimationFrame(loop);
    };

    animationFrameRef.current =
      requestAnimationFrame(loop);

    return () => {
      if (
        animationFrameRef.current
      ) {
        cancelAnimationFrame(
          animationFrameRef.current
        );
      }

      unsubscribe();

      engine.stop();

      engineRef.current = null;
    };
  }, []);

  if (!match) {
    return (
      <main className="app">
        <div className="app-content">
          <h1>
            Avvio Match Engine...
          </h1>
        </div>
      </main>
    );
  }

  const homeTeam =
    match.teams.home;

  const awayTeam =
    match.teams.away;

  const clock =
    match.clock ??
    {
      minute: 0,
      second: 0,
      speed: 1,
    };

  const hasEngineError =
    events.some(
      (event) =>
        event.type ===
        "ENGINE_ERROR"
    );

  return (
    <main className="app">
      <div className="match-test">

        <header className="match-header">
          <span>
            CALCIO MANAGER
          </span>

          <strong>
            ENGINE TEST
          </strong>
        </header>

        <section className="scoreboard">

          <div className="team">
            <small>
              CASA
            </small>

            <h2>
              {homeTeam.shortName}
            </h2>
          </div>

          <div className="score">
            <div>
              {match.score.home}
              {" - "}
              {match.score.away}
            </div>

            <span>
              {clock.minute}'
              {String(
                clock.second
              ).padStart(2, "0")}
            </span>
          </div>

          <div className="team">
            <small>
              OSPITE
            </small>

            <h2>
              {awayTeam.shortName}
            </h2>
          </div>

        </section>

        <section className="engine-info">

          <div>
            <span>
              STATO
            </span>

            <strong>
              {match.phase}
            </strong>
          </div>

          <div>
            <span>
              POSSESSO
            </span>

            <strong>
              {match.possession}
            </strong>
          </div>

          <div>
            <span>
              VELOCITÀ
            </span>

            <strong>
              {clock.speed}x
            </strong>
          </div>

          <div>
            <span>
              SEED
            </span>

            <strong>
              {match.seed}
            </strong>
          </div>

        </section>

        <section className="controls">

          <button
            onClick={() =>
              engineRef.current?.pause()
            }
          >
            PAUSA
          </button>

          <button
            onClick={() =>
              engineRef.current?.resume()
            }
          >
            RIPRENDI
          </button>

          <button
            onClick={() =>
              engineRef.current?.setSpeed(1)
            }
          >
            1x
          </button>

          <button
            onClick={() =>
              engineRef.current?.setSpeed(2)
            }
          >
            2x
          </button>

          <button
            onClick={() =>
              engineRef.current?.setSpeed(4)
            }
          >
            4x
          </button>

          <button
            onClick={() =>
              engineRef.current?.setSpeed(8)
            }
          >
            8x
          </button>

        </section>

        <section className="teams">

          <div>
            <h3>
              {homeTeam.name}
            </h3>

            <p>
              {homeTeam.players.length}{" "}
              giocatori
            </p>

            <p>
              Modulo:{" "}
              {homeTeam.formation}
            </p>

            <p>
              Titolari:{" "}
              {homeTeam.startingXI.length}
            </p>
          </div>

          <div>
            <h3>
              {awayTeam.name}
            </h3>

            <p>
              {awayTeam.players.length}{" "}
              giocatori
            </p>

            <p>
              Modulo:{" "}
              {awayTeam.formation}
            </p>

            <p>
              Titolari:{" "}
              {awayTeam.startingXI.length}
            </p>
          </div>

        </section>

        {hasEngineError && (
          <section
            className="event-log"
            style={{
              borderColor:
                "#8b3030",
            }}
          >
            <h3>
              ERRORE MATCH ENGINE
            </h3>

            {events
              .filter(
                (event) =>
                  event.type ===
                  "ENGINE_ERROR"
              )
              .map(
                (event, index) => (
                  <div
                    key={`error-${index}`}
                    style={{
                      padding:
                        "12px",
                      background:
                        "#241212",
                      borderRadius:
                        "8px",
                      overflow:
                        "auto",
                    }}
                  >
                    <strong>
                      {event.payload
                        ?.message ??
                        "Errore sconosciuto"}
                    </strong>

                    {event.payload
                      ?.stack && (
                      <pre
                        style={{
                          marginTop:
                            "10px",
                          whiteSpace:
                            "pre-wrap",
                          fontSize:
                            "11px",
                          color:
                            "#d0b0b0",
                        }}
                      >
                        {
                          event.payload
                            .stack
                        }
                      </pre>
                    )}
                  </div>
                )
              )}
          </section>
        )}

        <section className="event-log">

          <h3>
            EVENTI ENGINE
          </h3>

          <div className="events">

            {events
              .slice()
              .reverse()
              .map(
                (
                  event,
                  index
                ) => (
                  <div
                    key={`${event.id ?? event.timestamp}-${index}`}
                  >
                    <span>
                      {event.matchMinute ?? 0}'
                      {String(
                        event.matchSecond ?? 0
                      ).padStart(
                        2,
                        "0"
                      )}
                    </span>

                    <strong>
                      {event.type}
                    </strong>
                  </div>
                )
              )}

          </div>

        </section>

      </div>
    </main>
  );
}

export default App;

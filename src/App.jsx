import { useEffect, useRef, useState } from "react";

import { createTestEngine } from "./engine/matchTest.js";

import "./App.css";

function App() {
  const engineRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Contiene TUTTI gli eventi della partita.
  const fullEventsRef = useRef([]);

  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    const engine = createTestEngine();

    engineRef.current = engine;

    const unsubscribe = engine.subscribe((event) => {
      /**
       * IMPORTANTE:
       * salviamo tutto il log senza limitarlo.
       */
      fullEventsRef.current.push(event);

      /**
       * Nell'interfaccia mostriamo
       * solamente gli ultimi 30 eventi.
       */
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

          matchMinute:
            engine.getClockState()
              .minute,

          matchSecond:
            engine.getClockState()
              .second,

          timestamp:
            engine.getClockState()
              .totalSimulatedSeconds,

          payload: {
            message:
              error?.message ??
              String(error),

            stack:
              error?.stack ??
              "",
          },
        };

        /**
         * Anche gli errori finiscono
         * nel log completo.
         */
        fullEventsRef.current.push(
          errorEvent
        );

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

  /**
   * Scarica tutto il log della partita
   * come file TXT.
   */
  function downloadFullMatchLog() {
    const engine =
      engineRef.current;

    const currentState =
      engine?.getState?.();

    const currentClock =
      engine?.getClockState?.();

    const log = {
      exportVersion: 1,

      game: {
        name: "Calcio Manager",
        type: "Match Engine Test",
      },

      match: {
        id:
          currentState?.id ??
          null,

        seed:
          currentState?.seed ??
          null,

        phase:
          currentState?.phase ??
          null,

        possession:
          currentState?.possession ??
          null,

        score:
          currentState?.score ??
          null,

        status:
          currentState?.matchStatus ??
          null,
      },

      clock:
        currentClock ??
        null,

      teams:
        currentState?.teams ??
        null,

      ball:
        currentState?.ball ??
        null,

      statistics:
        currentState?.statistics ??
        null,

      events:
        fullEventsRef.current,
    };

    /**
     * JSON formattato:
     * rimane un TXT leggibile ma conserva
     * tutta la struttura del log.
     */
    const text =
      JSON.stringify(
        log,
        null,
        2
      );

    try {
      const blob =
        new Blob(
          [text],
          {
            type:
              "text/plain;charset=utf-8",
          }
        );

      const url =
        URL.createObjectURL(
          blob
        );

      /**
       * Genera un nome file leggibile.
       */
      const now =
        new Date();

      const year =
        now.getFullYear();

      const month =
        String(
          now.getMonth() + 1
        ).padStart(
          2,
          "0"
        );

      const day =
        String(
          now.getDate()
        ).padStart(
          2,
          "0"
        );

      const hours =
        String(
          now.getHours()
        ).padStart(
          2,
          "0"
        );

      const minutes =
        String(
          now.getMinutes()
        ).padStart(
          2,
          "0"
        );

      const filename =
        `calcio-manager-match-${year}-${month}-${day}-${hours}${minutes}.txt`;

      const link =
        document.createElement(
          "a"
        );

      link.href = url;

      link.download =
        filename;

      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );

      URL.revokeObjectURL(
        url
      );

      setCopyStatus(
        `LOG SCARICATO — ${fullEventsRef.current.length} eventi`
      );

      setTimeout(() => {
        setCopyStatus("");
      }, 3000);
    } catch (error) {
      console.error(
        "LOG DOWNLOAD ERROR:",
        error
      );

      setCopyStatus(
        "ERRORE NEL DOWNLOAD DEL LOG"
      );
    }
  }

  /**
   * Numero totale degli eventi
   * presenti nel log completo.
   */
  function getFullLogSize() {
    return fullEventsRef.current.length;
  }

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
              ).padStart(
                2,
                "0"
              )}
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
              engineRef.current?.setSpeed(
                1
              )
            }
          >
            1x
          </button>

          <button
            onClick={() =>
              engineRef.current?.setSpeed(
                2
              )
            }
          >
            2x
          </button>

          <button
            onClick={() =>
              engineRef.current?.setSpeed(
                4
              )
            }
          >
            4x
          </button>

          <button
            onClick={() =>
              engineRef.current?.setSpeed(
                8
              )
            }
          >
            8x
          </button>
        </section>

        {/* ========================= */}
        {/* LOG EXPORT */}
        {/* ========================= */}

        <section className="event-log">
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: "15px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h3
                style={{
                  marginBottom:
                    "5px",
                }}
              >
                LOG PARTITA
              </h3>

              <p
                style={{
                  margin: 0,
                  color:
                    "#77857e",
                  fontSize:
                    "12px",
                }}
              >
                {getFullLogSize()} eventi
                registrati
              </p>
            </div>

            <button
              onClick={
                downloadFullMatchLog
              }
              style={{
                border:
                  "1px solid #304238",
                borderRadius:
                  "9px",
                padding:
                  "10px 16px",
                background:
                  "#132019",
                color:
                  "white",
                cursor:
                  "pointer",
                fontWeight:
                  "600",
              }}
            >
              ⬇️ SCARICA LOG .TXT
            </button>
          </div>

          {copyStatus && (
            <div
              style={{
                marginTop:
                  "12px",
                padding:
                  "10px 12px",
                borderRadius:
                  "8px",
                background:
                  "#111f18",
                color:
                  "#7dff9b",
                fontSize:
                  "13px",
              }}
            >
              {copyStatus}
            </div>
          )}
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
                (
                  event,
                  index
                ) => (
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
            ULTIMI EVENTI ENGINE
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
                      {event.matchMinute ??
                        0}
                      '
                      {String(
                        event.matchSecond ??
                          0
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

import { Component, useEffect, useMemo, useRef, useState } from "react";
import { createTestEngine } from "./engine/matchTest.js";
import { createMatchGame } from "./renderer/MatchScene.js";
import "./App.css";

const eventNames = {
  GOAL: "⚽ Gol", SHOT: "🎯 Tiro", SAVE: "🧤 Parata", PASS: "→ Passaggio",
  PASS_COMPLETED: "✓ Passaggio riuscito", PASS_INTERCEPTED: "✕ Intercetto",
  DUEL_RESOLVED: "⚔ Duello", FOUL_COMMITTED: "⚑ Fallo", HALF_TIME: "Ⅱ Intervallo",
  FULL_TIME: "✓ Fine partita", KICKOFF: "• Kick-off", KICKOFF_AFTER_GOAL: "• Ripresa"
};
const speeds = [1, 2, 4, 8];
const BASE_SIM_RATE = 10;

function timeOf(e) { return `${e?.matchMinute ?? 0}:${String(e?.matchSecond ?? 0).padStart(2, "0")}`; }

function statsFrom(events, state) {
  const s = { home: { shots: 0, on: 0, xg: 0, passes: 0, completed: 0, interceptions: 0, fouls: 0 }, away: { shots: 0, on: 0, xg: 0, passes: 0, completed: 0, interceptions: 0, fouls: 0 } };
  let hp = 0, ap = 0;
  for (const e of events) {
    const p = e.payload ?? {};
    const side = p.side ?? (p.teamId === state?.teams?.home?.id ? "home" : p.teamId === state?.teams?.away?.id ? "away" : e.actors?.[0]?.startsWith?.("home_") ? "home" : e.actors?.[0]?.startsWith?.("away_") ? "away" : null);
    if (e.type === "ENGINE_TICK") {
      if (p.possession === "home") hp += p.simulatedSeconds || .1;
      if (p.possession === "away") ap += p.simulatedSeconds || .1;
    }
    if (!side) continue;
    if (["SHOT", "SHOT_ATTEMPT"].includes(e.type)) { s[side].shots++; s[side].on += p.onTarget ? 1 : 0; s[side].xg += Number(p.xg || 0); }
    if (e.type === "PASS") s[side].passes++;
    if (e.type === "PASS_COMPLETED") s[side].completed++;
    if (e.type === "PASS_INTERCEPTED") s[side].interceptions++;
    if (e.type === "FOUL_COMMITTED") s[side].fouls++;
  }
  const total = hp + ap;
  return { s, pos: { home: total ? Math.round(hp / total * 100) : 50, away: total ? Math.round(ap / total * 100) : 50 } };
}

function downloadMatchLog(state, events) {
  const payload = {
    exportedAt: new Date().toISOString(),
    match: {
      id: state?.id,
      seed: state?.seed,
      home: state?.teams?.home?.name,
      away: state?.teams?.away?.name,
      score: state?.score,
      clock: state?.clock,
    },
    events,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `calcio-manager-${state?.seed ?? "match"}-log.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error(error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return <div className="fatal"><h1>Calcio Manager</h1><b>Errore dell'interfaccia</b><pre>{this.state.error.stack || this.state.error.message}</pre><button onClick={() => location.reload()}>Ricarica</button></div>;
  }
}

function AppContent() {
  const engine = useRef(null), game = useRef(null), host = useRef(null), allEvents = useRef([]);
  const [state, setState] = useState(null), [events, setEvents] = useState([]), [phase, setPhase] = useState("ready"), [tab, setTab] = useState("live"), [speed, setSpeed] = useState(1);

  useEffect(() => {
    try {
      const e = createTestEngine(); engine.current = e;
      const sync = () => setState({ ...e.getState(), clock: { ...e.getClockState() } });
      const unsub = e.subscribe(ev => {
        allEvents.current.push(ev);
        setEvents(v => [...v, ev].slice(-100));
        if (ev.type === "HALF_TIME") setPhase("halftime");
        if (ev.type === "FULL_TIME") setPhase("finished");
      });
      sync();
      if (host.current) game.current = createMatchGame(host.current, () => engine.current?.getState?.());
      let last = performance.now(), raf;
      const loop = now => {
        const dt = Math.min(100, now - last); last = now;
        if (phaseRef.current === "playing") e.update(dt * BASE_SIM_RATE);
        sync();
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      return () => { cancelAnimationFrame(raf); unsub?.(); game.current?.destroy(true); e.stop?.(); };
    } catch (err) { setState({ __error: err?.stack || err?.message || String(err) }); }
  }, []);

  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  const stats = useMemo(() => statsFrom(allEvents.current, state), [events, state]);
  if (state?.__error) return <div className="fatal"><h1>Calcio Manager</h1><b>Errore Match Engine</b><pre>{state.__error}</pre></div>;
  if (!state) return <div className="loading">CALCIO MANAGER<div>Preparazione partita…</div></div>;

  const clock = state.clock, home = state.teams.home, away = state.teams.away;
  const start = () => { engine.current.start(); setPhase("playing"); };
  const pause = () => { engine.current.pause(); setPhase("paused"); };
  const resume = () => { engine.current.resume(); setPhase("playing"); };
  const second = () => { engine.current.startSecondHalf(); setPhase("playing"); };

  return <main className="app">
    <header><div className="brand"><span>CM</span><div><b>CALCIO MANAGER</b><small>LIVE MATCH ENGINE</small></div></div><div className="status">{phase === "ready" ? "PRONTA" : phase === "paused" ? "PAUSA" : phase === "halftime" ? "INTERVALLO" : phase === "finished" ? "FINALE" : "LIVE"}</div></header>
    <section className="score"><div className="team"><strong>{home.name}</strong><small>CASA</small></div><div className="numbers"><b>{state.score.home}</b><i>—</i><b>{state.score.away}</b><small>{timeOf({ matchMinute: clock.minute, matchSecond: clock.second })}</small></div><div className="team away"><strong>{away.name}</strong><small>OSPITE</small></div></section>
    <section className="controls">
      {phase === "ready" && <button className="primary" onClick={start}>▶ INIZIA PARTITA</button>}
      {phase === "playing" && <button onClick={pause}>Ⅱ PAUSA</button>}
      {phase === "paused" && <button className="primary" onClick={resume}>▶ RIPRENDI</button>}
      {phase === "halftime" && <button className="primary" onClick={second}>▶ INIZIA SECONDO TEMPO</button>}
      {phase === "finished" && <span>✓ PARTITA TERMINATA</span>}
      <div className="speeds">{speeds.map(x => <button key={x} className={speed === x ? "active" : ""} onClick={() => { engine.current.setSpeed(x); setSpeed(x); }}>{x}x</button>)}</div>
      <button className="log-button" onClick={() => downloadMatchLog(engine.current?.getState?.(), allEvents.current)}>⇩ SCARICA LOG</button>
    </section>
    <section className="board"><div className="pitch" ref={host}/><aside><div className="tabs">{["live", "events", "tactics", "analysis"].map(x => <button key={x} className={tab === x ? "active" : ""} onClick={() => setTab(x)}>{x === "live" ? "LIVE" : x === "events" ? "EVENTI" : x === "tactics" ? "TATTICA" : "ANALISI"}</button>)}</div>
      {tab === "live" && <div className="stats">{[["Possesso", `${stats.pos.home}%`, `${stats.pos.away}%`], ["Tiri", stats.s.home.shots, stats.s.away.shots], ["Tiri in porta", stats.s.home.on, stats.s.away.on], ["xG", stats.s.home.xg.toFixed(2), stats.s.away.xg.toFixed(2)], ["Passaggi", stats.s.home.passes, stats.s.away.passes], ["Riusciti", stats.s.home.completed, stats.s.away.completed], ["Intercetti", stats.s.home.interceptions, stats.s.away.interceptions], ["Falli", stats.s.home.fouls, stats.s.away.fouls]].map(r => <div className="row" key={r[0]}><b>{r[1]}</b><span>{r[0]}</span><b>{r[2]}</b></div>)}</div>}
      {tab === "events" && <div className="events">{events.slice().reverse().filter(e => eventNames[e.type]).map((e, i) => <div key={i}><time>{timeOf(e)}</time><span>{eventNames[e.type]}</span></div>)}</div>}
      {tab === "tactics" && <div className="placeholder"><h3>Tattica</h3><p>Formazioni, zone, ruoli, mentalità e istruzioni saranno collegati al modello tattico del Match Engine.</p></div>}
      {tab === "analysis" && <div className="placeholder"><h3>Analisi</h3><p>xG, zone di tiro, possesso territoriale e metriche avanzate.</p></div>}
    </aside></section>
  </main>;
}

export default function App() { return <ErrorBoundary><AppContent /></ErrorBoundary>; }

/**
 * MATCH ENGINE V4 - decision cadence.
 * A player does not make a new football decision every physics tick.
 */
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(Number(v))?Number(v):a));
const n=(v,f=50)=>Number.isFinite(Number(v))?Number(v):f;
const attr=(p,g,k,f=50)=>n(p?.attributes?.[g]?.[k],f)/99;
const pos=p=>p?.position??{x:.5,y:.5};
const dist=(a,b)=>Math.hypot(pos(a).x-pos(b).x,pos(a).y-pos(b).y);

export function decisionInterval(player,{pressure=.0,ballFree=false,action=null}={}){
  const anticipation=attr(player,'mental','anticipazione');
  const decisions=attr(player,'mental','decisioni');
  const concentration=attr(player,'mental','concentrazione');
  const vision=attr(player,'mental','visione');
  const reaction=attr(player,'physical','reattivita');
  const base=1.05 - anticipation*.20 - decisions*.18 - concentration*.10 - vision*.07 - reaction*.05;
  const pressureFactor=clamp(pressure)*.42;
  const freeBallPenalty=ballFree?.18:0;
  const actionPenalty=(action==='shoot'||action==='dribble')?.05:0;
  return clamp(base + freeBallPenalty - pressureFactor + actionPenalty,.85,2.40);
}

export function ensureDecisionState(player,now=0,context={}){
  player.matchState??={};
  player.matchState.decisionState??={
    nextDecisionAt:now,
    lastDecisionAt:now,
    thinkUntil:now,
    decisionCount:0,
    currentAction:'idle',
    contextHash:null,
  };
  const ds=player.matchState.decisionState;
  if(!Number.isFinite(ds.nextDecisionAt)) ds.nextDecisionAt=now;
  return ds;
}

export function canDecide(player,now,context={}){
  const ds=ensureDecisionState(player,now,context);
  return now >= ds.nextDecisionAt;
}

export function scheduleNextDecision(player,now,context={}){
  const ds=ensureDecisionState(player,now,context);
  const interval=decisionInterval(player,context);
  ds.lastDecisionAt=now;
  ds.nextDecisionAt=now+interval;
  ds.thinkUntil=ds.nextDecisionAt;
  ds.decisionCount=(ds.decisionCount??0)+1;
  return interval;
}

export function pressureAt(state,player){
  if(!state||!player)return 0;
  const side=player.side??(['home','away'].find(s=>(state.teams?.[s]?.players??[]).some(x=>x.id===player.id))??'home');
  const opponents=(state.teams?.[side==='home'?'away':'home']?.players??[]).filter(p=>p?.onPitch!==false&&!p?.substituted&&!p?.injured);
  const nearest=opponents.reduce((m,o)=>Math.min(m,dist(player,o)),Infinity);
  return clamp(1-nearest/.18);
}

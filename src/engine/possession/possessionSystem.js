/**
 * MATCH ENGINE V4 - physically driven possession/action layer.
 *
 * Key changes:
 * - decision cadence instead of one action every engine tick;
 * - passes are trajectories, not instant possession teleports;
 * - reception/interception happen when the ball reaches the target area;
 * - shots are gated by an actual shooting situation (zone, angle, control, pressure);
 * - goals restart from midfield with the team that conceded in possession;
 * - deterministic duel resolution is delegated to duelSystem V3;
 * - match statistics are updated at the source of the event.
 */
import {resolveDuel,shouldTriggerDuel} from './duelSystem.js';
import {launchBall} from '../physics/ballPhysics.js';
import {canDecide,scheduleNextDecision,pressureAt} from './decisionCadence.js';

const POSSESSION={HOME:'home',AWAY:'away',NONE:'none',CONTESTED:'contested'};
const ACTIONS={PASS:'pass',CARRY:'carry',DRIBBLE:'dribble',SHOOT:'shoot',CROSS:'cross',CLEAR:'clear',HOLD:'hold',PRESS:'press',TACKLE:'tackle',MOVE:'move',SUPPORT:'support',NONE:'none'};
const forwardDirection=side=>side==='home'?1:-1;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(Number(v))?Number(v):a));
const num=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const pos=p=>p?.position??{x:num(p?.x,.5),y:num(p?.y,.5)};
const dist=(a,b)=>Math.hypot(pos(a).x-pos(b).x,pos(a).y-pos(b).y);
const sideOf=(state,p)=>p?.side??p?.team??(['home','away'].find(s=>(state?.teams?.[s]?.players??[]).some(x=>String(x.id)===String(p?.id)))??null);
const players=(state,side)=>(state?.teams?.[side]?.players??[]).filter(p=>p&&p.onPitch!==false&&!p.substituted&&!p.redCard&&!p.injured);
const all=(state)=>[...players(state,'home'),...players(state,'away')];
const byId=(state,id)=>all(state).find(p=>String(p.id)===String(id))??null;
const attr=(p,g,k,f=50)=>num(p?.attributes?.[g]?.[k],f);
const rng01=r=>clamp(typeof r==='function'?r():r?.next?.()??r?.random?.()??.5);
const emit=(fn,type,payload={},causedBy=null)=>fn?.({type,payload,causedBy});

function clearFlags(state){for(const p of all(state)){p.hasBall=false;p.matchState??={};p.matchState.hasBall=false;}}
function ensureStats(state){state.statistics??={totalShots:0,totalShotsOnTarget:0,totalFouls:0,totalYellowCards:0,totalRedCards:0,totalOffsides:0,totalCorners:0,homePossession:50,awayPossession:50,homeXG:0,awayXG:0};for(const s of ['home','away']){state.teams[s].matchStats??={};}}
function incTeam(state,side,key,n=1){ensureStats(state);state.teams[side].matchStats[key]=(state.teams[side].matchStats[key]??0)+n;}
function incPlayer(p,key,n=1){p.matchStats??={};p.matchStats[key]=(p.matchStats[key]??0)+n;}

export function setPossession(state,side,playerId,{silent=false,emitEvent=null,reason='recovery'}={}){
  const p=byId(state,playerId),s=side==='home'||side==='away'?side:sideOf(state,p);if(!p||!s||p.onPitch===false)return false;
  clearFlags(state);p.hasBall=true;p.matchState??={};p.matchState.hasBall=true;
  state.ball??={};state.ball.ownerId=p.id;state.ball.ownerSide=s;state.ball.state='controlled';state.ball.lastTouchPlayerId=p.id;state.ball.lastTouchSide=s;state.ball.x=pos(p).x;state.ball.y=pos(p).y;state.ball.position={x:pos(p).x,y:pos(p).y};state.ball.velocityX=0;state.ball.velocityY=0;state.ball.pass=null;state.possession=s;state.possessionSide=s;state.possessionPlayerId=p.id;state._lastPossessionChangeTime=num(state.clock?.totalSeconds,state.timeSeconds);
  if(!silent)emit(emitEvent,'POSSESSION_WON',{side:s,playerId:p.id,reason},p.id);return true;
}
function loose(state,position=null){clearFlags(state);state.ball??={};if(position){state.ball.x=position.x;state.ball.y=position.y;state.ball.position={...position};}state.ball.ownerId=null;state.ball.ownerSide=POSSESSION.NONE;state.ball.state='free';state.ball.pass=null;state.possession=POSSESSION.NONE;state.possessionPlayerId=null;}
function controlledBall(state,owner){state.ball.x=owner.position.x;state.ball.y=owner.position.y;state.ball.position={x:owner.position.x,y:owner.position.y};state.ball.velocityX=0;state.ball.velocityY=0;state.ball.velocity={x:0,y:0};state.ball.ownerId=owner.id;state.ball.state='controlled';}
function passTarget(state,p,decision){const side=sideOf(state,p);const list=players(state,side).filter(x=>String(x.id)!==String(p.id));const id=decision?.targetPlayerId??decision?.receiverId??decision?.targetId;if(id){const t=list.find(x=>String(x.id)===String(id));if(t)return t;}if(!list.length)return null;const opponents=players(state,side==='home'?'away':'home');return list.map(t=>{const forward=side==='home'?t.position.x-p.position.x:p.position.x-t.position.x;const nearest=opponents.reduce((m,o)=>Math.min(m,dist(t,o)),Infinity);const score=forward*.55+nearest*.85+(1-dist(p,t))*.12;return{t,score};}).sort((a,b)=>b.score-a.score)[0].t;}
function passQuality(state,p,t){const d=dist(p,t);const space=clamp(players(state,sideOf(state,p)==='home'?'away':'home').reduce((m,o)=>Math.min(m,dist(t,o)),.5)/.25);const pass=attr(p,'technical','passaggi')/99,vision=attr(p,'mental','visione')/99,control=attr(t,'technical','primoControllo')/99;return clamp(.62+pass*.16+vision*.12+control*.05+space*.10-d*.45,.42,.92);}
function startPass(state,p,t,r,emitEvent,decision){
  const from={...pos(p)},to={...pos(t)};const d=Math.max(.035,dist(p,t));const speed=.18+attr(p,'technical','passaggi')/99*.08;const duration=clamp(d/speed,.35,2.10);const quality=passQuality(state,p,t);const completed=rng01(r)<=quality;
  state.ball.pass={passerId:p.id,receiverId:t.id,from,to,elapsed:0,duration,quality,completed,intercepted:false};state.ball.ownerId=p.id;state.ball.ownerSide=sideOf(state,p);state.ball.state='in_flight';state.ball.lastTouchPlayerId=p.id;state.ball.targetX=to.x;state.ball.targetY=to.y;state.ball.velocityX=(to.x-from.x)/duration;state.ball.velocityY=(to.y-from.y)/duration;state.ball.velocity={x:state.ball.velocityX,y:state.ball.velocityY};p.hasBall=false;p.matchState??={};p.matchState.hasBall=false;
  incPlayer(p,'passesAttempted');incTeam(state,sideOf(state,p),'passesAttempted');
  emit(emitEvent,'PASS',{passerId:p.id,receiverId:t.id,from,to,distance:d,duration,quality,completed});
  return{executed:true,result:'pass_started',duration,quality};
}
function segmentPoint(a,b,t){return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}
function advancePass(state,r,emitEvent){
  const pass=state.ball?.pass;if(!pass)return null;
  const point=state.ball.position??{x:state.ball.x,y:state.ball.y};
  const receiver=byId(state,pass.receiverId);
  const opponents=receiver?players(state,sideOf(state,receiver)==='home'?'away':'home'):[];
  const intercept=opponents.map(o=>({o,d:Math.hypot(o.position.x-point.x,o.position.y-point.y)})).sort((a,b)=>a.d-b.d)[0];
  if(!pass.intercepted&&intercept&&intercept.d<.022&&pass.elapsed>pass.duration*.12&&pass.elapsed<pass.duration*.94){
    const control=attr(intercept.o,'technical','primoControllo')/99+attr(intercept.o,'mental','anticipazione')/99*.35;
    const receiverControl=receiver?attr(receiver,'technical','primoControllo')/99+attr(receiver,'mental','anticipazione')/99*.25:0;
    if(control>receiverControl*.84){pass.intercepted=true;setPossession(state,sideOf(state,intercept.o),intercept.o.id,{silent:true,reason:'pass_interception'});emit(emitEvent,'PASS_INTERCEPTED',{passerId:pass.passerId,receiverId:pass.receiverId,interceptorId:intercept.o.id,position:{...point}});return{result:'intercepted'};}
  }
  if(pass.elapsed<pass.duration)return{result:'in_flight'};
  if(pass.completed&&receiver){setPossession(state,sideOf(state,receiver),receiver.id,{silent:true,reason:'pass_reception'});const passer=byId(state,pass.passerId);incPlayer(passer,'passesCompleted');incTeam(state,sideOf(state,passer),'passesCompleted');emit(emitEvent,'PASS_COMPLETED',{passerId:pass.passerId,receiverId:receiver.id,position:{...point}});return{result:'completed'};}
  loose(state,point);emit(emitEvent,'BALL_LOOSE',{lastTouchPlayerId:pass.passerId,position:{...point}});return{result:'failed'};
}
function shootingSituation(state,p){const side=sideOf(state,p),x=pos(p).x,y=pos(p).y,goalX=side==='home'?.975:.025,dx=goalX-x,distGoal=Math.abs(dx);const lateral=Math.abs(y-.5);const angle=1-clamp(lateral/.48);const inZone=distGoal<.34;const box=distGoal<.19&&lateral<.19;const pressure=pressureAt(state,p);const control=attr(p,'technical','primoControllo')/99;const finishing=attr(p,'technical','finalizzazione')/99;const shooting=attr(p,'technical','tiro')/99;const longShots=attr(p,'technical','tiriDaLontano')/99;const quality=clamp((box?.46:0)+(inZone?.16:0)+angle*.12+control*.10+finishing*.09+shooting*.07+longShots*(inZone&&!box?.10:0)-pressure*.24);const min=box?.44:inZone?.54:.99;const baseXg=box?.032:inZone?.010:.003;const xg=clamp(baseXg+angle*.020+control*.014+finishing*.030+shooting*.014-pressure*.030,.003,.28);return{eligible:quality>=min,side,goalX,distGoal,lateral,angle,inZone,box,pressure,control,finishing,shooting,longShots,quality,xg};}
function performShot(state,p,r,emitEvent){const sit=shootingSituation(state,p);if(!sit.eligible)return{executed:false,result:'shot_rejected',situation:sit};const keeper=players(state,sit.side==='home'?'away':'home').find(x=>x.isGoalkeeper||String(x.role??x.primaryRole??'').toLowerCase().includes('portiere'));const power=clamp(.55+attr(p,'technical','tiro')/99*.30);const saveSkill=keeper?(attr(keeper,'goalkeeper','riflessi')/99+attr(keeper,'goalkeeper','posizione')/99*.5)/1.5:.5;const shotChance=clamp(sit.xg*(.58+attr(p,'technical','finalizzazione')/99*.30)*(.86+power*.14));const roll=rng01(r);const goal=roll<shotChance;const onTarget=goal||roll<shotChance+.28*(.45+sit.quality*.45);incPlayer(p,'shots');incTeam(state,sit.side,'shots');state.statistics??={};state.statistics.totalShots=(state.statistics.totalShots??0)+1;state.statistics[sit.side+'XG']=(state.statistics[sit.side+'XG']??0)+sit.xg;incTeam(state,sit.side,'xG',sit.xg);
  emit(emitEvent,'SHOT',{playerId:p.id,side:sit.side,position:pos(p),distanceToGoal:sit.distGoal,lateralOffset:sit.lateral,angle:sit.angle,pressure:sit.pressure,quality:sit.quality,xG:sit.xg,shotChance,roll,onTarget});
  if(onTarget){incPlayer(p,'shotsOnTarget');incTeam(state,sit.side,'shotsOnTarget');state.statistics.totalShotsOnTarget=(state.statistics.totalShotsOnTarget??0)+1;}
  if(goal){state.score??={home:0,away:0};state.score[sit.side]=(state.score[sit.side]??0)+1;incPlayer(p,'goals');incTeam(state,sit.side,'goals');state.ball.lastTouchPlayerId=p.id;state.ball.ownerId=null;state.ball.state='goal';state.ball.pass=null;state.lastGoalPlayerId=p.id;emit(emitEvent,'GOAL',{scoringSide:sit.side,playerId:p.id,score:{...state.score},xG:sit.xg});const conceded=sit.side==='home'?'away':'home';const restart=players(state,conceded).filter(x=>x.isGoalkeeper===false).sort((a,b)=>Math.abs(a.position.x-.5)-Math.abs(b.position.x-.5))[0]??players(state,conceded)[0];if(restart){restart.position={x:.5,y:.5};restart.targetPosition={x:.5,y:.5};setPossession(state,conceded,restart.id,{silent:true,reason:'kickoff_after_goal'});state.ball.x=.5;state.ball.y=.5;state.ball.position={x:.5,y:.5};emit(emitEvent,'KICKOFF_AFTER_GOAL',{side:conceded,playerId:restart.id,score:{...state.score}});}return{executed:true,result:'goal',situation:sit};}
  if(onTarget&&keeper){incPlayer(keeper,'saves');emit(emitEvent,'SAVE',{shooterId:p.id,keeperId:keeper.id,position:pos(p),xG:sit.xg,saveSkill});setPossession(state,sit.side==='home'?'away':'home',keeper.id,{silent:true,reason:'save'});return{executed:true,result:'saved',situation:sit};}
  emit(emitEvent,'SHOT_MISSED',{playerId:p.id,side:sit.side,position:pos(p),xG:sit.xg});loose(state,pos(p));return{executed:true,result:'missed',situation:sit};}
function carry(state,p,emitEvent){const side=sideOf(state,p),dir=forwardDirection(side);const opp=players(state,side==='home'?'away':'home').sort((a,b)=>dist(p,a)-dist(p,b))[0];if(opp&&shouldTriggerDuel({state,attacker:p,defender:opp,action:'carry'})){const duel=resolveDuel({state,attacker:p,defender:opp,emitEvent,action:'carry'});if(duel?.stopped)return{executed:true,result:'foul',duel};if(duel?.winner==='defender'){setPossession(state,side==='home'?'away':'home',opp.id,{silent:true,reason:'duel_win'});incPlayer(opp,'tackles');incTeam(state,side==='home'?'away':'home','tackles');return{executed:true,result:'tackled',duel};}}
  const pressure=pressureAt(state,p);const length=.018+attr(p,'technical','dribbling')/99*.012-pressure*.009;p.targetPosition={x:clamp(p.position.x+dir*length,.025,.975),y:clamp(p.position.y+(p.position.y<.5?-1:1)*.004,.025,.975)};return{executed:true,result:'carry'};}
function execute(state,p,decision,r,emitEvent){const a=String(decision?.action??decision?.intent??'hold').toLowerCase();if(a==='shoot')return performShot(state,p,r,emitEvent);if(a==='pass'||a==='cross'){const t=passTarget(state,p,decision);return t?startPass(state,p,t,r,emitEvent,decision):{executed:false,result:'no_target'};}if(a==='dribble'||a==='carry')return carry(state,p,emitEvent);return{executed:true,result:'hold'};}

export function processPossession({state,rng,decisions={},emitEvent=null}){
  ensureStats(state);const now=num(state.clock?.totalSeconds,state.timeSeconds);
  if(state.ball?.pass){return advancePass(state,rng,emitEvent);}
  state._lastEnginePossessionProcessTime=now;
  if(!state?.ball?.ownerId)return null;
  const owner=byId(state,state.ball.ownerId);if(!owner||owner.onPitch===false){loose(state);return null;}
  controlledBall(state,owner);
  const pressure=pressureAt(state,owner);const action=String(decisions[owner.id]?.action??decisions?.[sideOf(state,owner)]?.[owner.id]?.action??owner.currentAction??'hold').toLowerCase();
  if(!canDecide(owner,now,{pressure,ballFree:false,action}))return{executed:false,result:'thinking'};
  const decision=decisions[owner.id]??decisions?.[sideOf(state,owner)]?.[owner.id]??{action:'hold'};scheduleNextDecision(owner,now,{pressure,ballFree:false,action});
  const beforeOwner=owner.id,beforeSide=state.possession;let duel=null;
  if(['dribble','carry','cross'].includes(action)){const def=players(state,sideOf(state,owner)==='home'?'away':'home').sort((a,b)=>dist(owner,a)-dist(owner,b))[0];if(def&&shouldTriggerDuel({state,attacker:owner,defender:def,action}))duel=resolveDuel({state,attacker:owner,defender:def,emitEvent,action});}
  let result;if(duel?.stopped){result={executed:true,result:'foul',duel};incPlayer(owner,'foulsSuffered');incTeam(state,sideOf(state,owner),'foulsSuffered');state.statistics.totalFouls=(state.statistics.totalFouls??0)+1;}else if(duel?.winner==='defender'&&action!=='pass'){const ds=sideOf(state,owner)==='home'?'away':'home';setPossession(state,ds,duel.defenderId,{silent:true,reason:'duel_win'});incPlayer(byId(state,duel.defenderId),'tackles');incTeam(state,ds,'tackles');result={executed:true,result:'tackled',duel};}else result=execute(state,owner,decision,rng,emitEvent);
  emit(emitEvent,'AI_ACTION_RESOLVED',{version:4,playerId:owner.id,decision:action,decisionScore:num(decision?.score,null),decisionProbability:decision?.probability??null,thinkingUntil:owner.matchState?.decisionState?.thinkUntil,pressureBefore:pressure,execution:!!result?.executed,result:result?.result??'unknown',possessionBefore:beforeSide,ownerBefore:beforeOwner,possessionAfter:state.possession,ownerAfter:state.ball?.ownerId??null,duel:duel?{winner:duel.winner,foulType:duel.foul?.foulType??'none',advantagePlayed:!!duel.advantage?.played}:null},owner.id);
  return result;
}
export function getPlayerSide(state,playerId){return sideOf(state,typeof playerId==='object'?playerId:byId(state,playerId));}
export {POSSESSION,ACTIONS};

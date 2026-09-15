/** MATCH ENGINE V4 - tactical targets + physical motion. */
import {simulatePlayerMotion,ensurePlayerPhysicsState} from '../physics/playerPhysics.js';
import {updateBallPhysics} from '../physics/ballPhysics.js';
const MIN=.025,MAX=.975,clamp=(v,a=MIN,b=MAX)=>Math.max(a,Math.min(b,Number(v)||a));
const d=(a,b)=>Math.hypot((a?.x??0)-(b?.x??0),(a?.y??0)-(b?.y??0));
const role=p=>String(p?.assignedRole??p?.role??p?.primaryRole??'centrocampista').toLowerCase();
function separation(p,team){let x=0,y=0;for(const o of team){if(!o||o.id===p.id||o.onPitch===false)continue;const q=d(p.position,o.position);if(q>.001&&q<.065){x+=(p.position.x-o.position.x)/q*.008;y+=(p.position.y-o.position.y)/q*.008;}}return{x,y};}
function targetFor({player,ball,teammates,opponents,side}){
 const p=player.position??{x:.5,y:.5},dir=side==='home'?1:-1,r=role(player);let x=p.x,y=p.y;
 const bp=ball?.position??{x:ball?.x??.5,y:ball?.y??.5};
 if(ball?.pass?.receiverId===player.id){x=bp.x;y=bp.y;}
 else if(player.id===ball?.ownerId){x=p.x;y=p.y;}
 else {
  const inf=Math.max(0,1-d(p,bp)/.40);x+= (bp.x-p.x)/Math.max(d(p,bp),.001)*inf*.012;y+=(bp.y-p.y)/Math.max(d(p,bp),.001)*inf*.012;
  if(r.includes('ala')||r.includes('esterno')||r.includes('terzino')) y+=(p.y<.5?-1:1)*.004;
  if(r.includes('attacc')) x+=dir*.008;
  if(r.includes('mediano')||r.includes('difens')) x+=(bp.x-p.x)*.015;
 }
 const sep=separation(player,teammates);x+=sep.x*.35;y+=sep.y*.35;
 // Under pressure, attackers open a diagonal escape lane rather than freezing.
 const nearest=opponents.reduce((m,o)=>Math.min(m,d(p,o.position)),Infinity);
 if(nearest<.055&&(r.includes('attacc')||r.includes('ala')||r.includes('trequart'))){y+=p.y<.5?.006:-.006;}
 return{x:clamp(x),y:clamp(y)};
}
export function updatePlayerTarget({player,ball,teammates=[],opponents=[],side='home',tacticalTarget=null}){if(!player)return;player.position??={x:.5,y:.5};const t=tacticalTarget??targetFor({player,ball,teammates,opponents,side});player.targetPosition={x:clamp(t.x),y:clamp(t.y)};player.matchState??={};player.matchState.targetPosition={...player.targetPosition};}
export function updatePlayerMovement(player,deltaSimulationSeconds=.1){if(!player||player.onPitch===false||player.matchState?.onPitch===false)return;player.position??={x:.5,y:.5};player.targetPosition??={...player.position};ensurePlayerPhysicsState(player);let rem=Math.max(0,Number(deltaSimulationSeconds)||0);while(rem>0){const dt=Math.min(.1,rem);simulatePlayerMotion({player,target:player.targetPosition,deltaSeconds:dt,desiredSpeedMultiplier:player.currentAction==='sprint'?1.08:1});rem-=dt;}player.position.x=clamp(player.position.x);player.position.y=clamp(player.position.y);player.matchState??={};player.matchState.actualPosition={...player.position};player.matchState.targetPosition={...player.targetPosition};player.matchState.velocity={...player.velocity};}
export function updateTeamMovement({players=[],opponents=[],ball=null,side='home',tacticalTargets={},deltaSimulationSeconds=.1}){for(const p of players){if(!p||p.onPitch===false||p.matchState?.onPitch===false)continue;updatePlayerTarget({player:p,ball,teammates:players,opponents,side,tacticalTarget:tacticalTargets[p.id]??null});}for(const p of players)updatePlayerMovement(p,deltaSimulationSeconds);}
export function updateAllPlayerMovement({homePlayers=[],awayPlayers=[],ball=null,homeTacticalTargets={},awayTacticalTargets={},deltaSimulationSeconds=.1}){updateTeamMovement({players:homePlayers,opponents:awayPlayers,ball,side:'home',tacticalTargets:homeTacticalTargets,deltaSimulationSeconds});updateTeamMovement({players:awayPlayers,opponents:homePlayers,ball,side:'away',tacticalTargets:awayTacticalTargets,deltaSimulationSeconds});if(ball&&(ball.pass||!ball.ownerId))updateBallPhysics(ball,Math.min(.1,Math.max(0,Number(deltaSimulationSeconds)||0)));}
export {role};

/** Player Physics V2 - deterministic normalized-field kinematics. */
const FIELD_MIN=0.025, FIELD_MAX=0.975, EPS=1e-8;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const n=(v,f=50)=>Number.isFinite(Number(v))?clamp(Number(v),1,99):f;
function attr(p,k){return n(p?.attributes?.physical?.[k]??p?.[k]);}
export function getPlayerPhysicsProfile(player){
 const fatigue=clamp(Number(player?.fatigue??0),0,100), fit=clamp((100-fatigue)/100,.40,1);
 const speed=attr(player,'velocita'), accel=attr(player,'accelerazione'), agility=attr(player,'agilita'), balance=attr(player,'equilibrio'), strength=attr(player,'forza'), stamina=attr(player,'resistenza'), reaction=attr(player,'reattivita');
 return {speed,acceleration:accel,agility,balance,strength,stamina,reaction,fatigue,fitness:fit,maxSpeed:(.022+speed/99*.055)*fit,accelerationRate:.030+accel/99*.060,decelerationRate:.040+agility/99*.080,turnRate:2+agility/99*6};
}
export function ensurePlayerPhysicsState(player){
 player.physics??={}; player.physics.velocity??={x:0,y:0}; player.physics.acceleration??={x:0,y:0}; player.physics.direction=Number.isFinite(player.physics.direction)?player.physics.direction:0; player.physics.speed=Number.isFinite(player.physics.speed)?player.physics.speed:0; player.physics.stability=Number.isFinite(player.physics.stability)?player.physics.stability:1; return player.physics;
}
export function simulatePlayerMotion({player,target,deltaSeconds=.1,desiredSpeedMultiplier=1}){
 if(!player)return null; const dt=clamp(Number(deltaSeconds)||0,0,.1), ph=ensurePlayerPhysicsState(player), prof=getPlayerPhysicsProfile(player); const cur=player.position??{x:.5,y:.5}, goal=target??cur; const dx=goal.x-cur.x,dy=goal.y-cur.y,d=Math.hypot(dx,dy);
 let desired={x:0,y:0}; if(d>.0005){const s=Math.min(prof.maxSpeed*clamp(desiredSpeedMultiplier,.15,1.15),d/Math.max(dt,.001));desired={x:dx/d*s,y:dy/d*s};}
 const cs=Math.hypot(ph.velocity.x,ph.velocity.y), ds=Math.hypot(desired.x,desired.y), rate=ds>=cs?prof.accelerationRate:prof.decelerationRate; const maxDV=rate*dt, dvx=desired.x-ph.velocity.x,dvy=desired.y-ph.velocity.y,dv=Math.hypot(dvx,dvy),blend=dv>maxDV&&dv>EPS?maxDV/dv:1;
 const oldX=ph.velocity.x,oldY=ph.velocity.y; ph.velocity.x+=dvx*blend; ph.velocity.y+=dvy*blend; const sp=Math.hypot(ph.velocity.x,ph.velocity.y), cap=prof.maxSpeed*clamp(desiredSpeedMultiplier,.15,1.15); if(sp>cap){const q=cap/sp;ph.velocity.x*=q;ph.velocity.y*=q;}
 const nx=clamp(cur.x+ph.velocity.x*dt,FIELD_MIN,FIELD_MAX),ny=clamp(cur.y+ph.velocity.y*dt,FIELD_MIN,FIELD_MAX); player.position={x:nx,y:ny}; player.velocity={x:(nx-cur.x)/Math.max(dt,.001),y:(ny-cur.y)/Math.max(dt,.001)}; ph.acceleration={x:(ph.velocity.x-oldX)/Math.max(dt,.001),y:(ph.velocity.y-oldY)/Math.max(dt,.001)};ph.speed=Math.hypot(ph.velocity.x,ph.velocity.y);if(ph.speed>.0001)ph.direction=Math.atan2(ph.velocity.y,ph.velocity.x);player.facingDirection=ph.direction;
 player.runtimeMovement={...(player.runtimeMovement??{}),distanceToTarget:d,speed:ph.speed,maxSpeed:cap,acceleration:Math.hypot(ph.acceleration.x,ph.acceleration.y),direction:ph.direction,fatigueMultiplier:prof.fitness,moving:ph.speed>.0001}; return ph;
}
export function applyContactDisplacement({player,other,impulse=.01}){if(!player||!other)return;const dx=player.position.x-other.position.x,dy=player.position.y-other.position.y,d=Math.hypot(dx,dy)||1;const q=Math.max(0,Number(impulse)||0);player.position.x=clamp(player.position.x+dx/d*q,FIELD_MIN,FIELD_MAX);player.position.y=clamp(player.position.y+dy/d*q,FIELD_MIN,FIELD_MAX);}

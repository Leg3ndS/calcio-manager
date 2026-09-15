import { createMatchState, MATCH_PHASES, POSSESSION } from "./worldState.js";
import { getFormation } from "./data/formations.js";
import { RNG, createMatchSeed } from "./rng.js";
import { createMatchEvent, appendEvent, createEventLog } from "./events/eventModel.js";

const DT=0.1, MIN_X=.025, MAX_X=.975, MIN_Y=.035, MAX_Y=.965;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a));
const d=(a,b)=>Math.hypot((a?.x??0)-(b?.x??0),(a?.y??0)-(b?.y??0));
const dir=s=>s==="home"?1:-1, opp=s=>s==="home"?"away":"home";
function A(p,g,k,f=60){return Number.isFinite(p?.attributes?.[g]?.[k])?p.attributes[g][k]:f}
function AVG(p,keys,f=60){return keys.reduce((n,[g,k])=>n+A(p,g,k,f),0)/keys.length}
function cls(r=""){r=String(r).toLowerCase();if(r.includes("portiere"))return"GK";if(r.includes("terzino")||r.includes("esterno"))return"FB";if(r.includes("difensore"))return"CB";if(r.includes("mediano")||r.includes("centrocamp"))return"CM";if(r.includes("trequart"))return"AM";if(r.includes("ala"))return"W";return"ST"}
function slotCls(r=""){r=String(r).toUpperCase();if(r==="GK")return"GK";if(["RB","LB","RWB","LWB"].includes(r))return"FB";if(["RCB","LCB","CB"].includes(r))return"CB";if(["DM","RCM","LCM","RM","LM"].includes(r))return"CM";if(r==="AM")return"AM";if(["RW","LW"].includes(r))return"W";return"ST"}

export class MatchEngine{
 constructor({homeTeam,awayTeam,seed=null}={}){
  if(!homeTeam||!awayTeam)throw Error("MatchEngine: teams missing");
  this.seed=seed??createMatchSeed();this.rng=new RNG(this.seed);
  this.state=createMatchState({homeTeam,awayTeam,seed:this.seed});
  this.eventLog=createEventLog();this.listeners=new Set();this.running=false;this.acc=0;this.tick=0;this.sim=0;this.lastShotAt=new Map();this.lastTeamShotAt={home:-999,away:-999};this.lastPassAt=new Map();this.lastTeamPassAt={home:-999,away:-999};
  this.slots={home:[],away:[]};this.lastDecision=new Map();this.buildLineups();this.resetPositions(1);this.sync();
 }
 subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn)}
 emit(type,payload={},actors=[]){
  const e=createMatchEvent({type,matchId:this.state.id,timestamp:Date.now(),matchMinute:Math.floor(this.sim/60),matchSecond:Math.floor(this.sim%60),actors,payload});
  appendEvent(this.eventLog,e);this.state.events=this.eventLog.events;this.state.lastEvent=e;
  for(const f of this.listeners)try{f(e)}catch(err){console.error(err)} return e
 }
 buildLineups(){
  for(const side of ["home","away"]){
   const team=this.state.teams[side], formation=team.formation||"4-3-3", slots=getFormation(formation), players=(team.players||[]).slice(0,11), used=new Set();
   const choose=slot=>{let p=players.find(x=>!used.has(x.id)&&cls(x.role??x.primaryRole)===slotCls(slot[0]));if(!p)p=players.find(x=>!used.has(x.id));if(!p)throw Error("Formation cannot assign 11 players");used.add(p.id);return p};
   this.slots[side]=slots.map(slot=>({slot,player:choose(slot)}));
   team.inPossessionShape={formation,positions:{}};team.outOfPossessionShape={formation,positions:{}};
   for(const {slot,player:p} of this.slots[side]){
    p.side=side;p.onPitch=true;p.matchState=p.matchState||{};p.matchState.onPitch=true;p.matchState.formationRole=slot[0];
    const y=side==="home"?slot[2]:1-slot[2];const x=slot[1];
    p.matchState.formationPosition={x,y};p.matchState.tacticalPosition={x,y};p.matchState.actualPosition={x,y};p.matchState.targetPosition={x,y};p.matchState.velocity={x:0,y:0};
    p.position={x,y};p.targetPosition={x,y};p.velocity={x:0,y:0};p.hasBall=false;p.currentAction="idle";p.intent="hold_position";
    team.inPossessionShape.positions[p.id]={x,y};team.outOfPossessionShape.positions[p.id]={x,y};
   }
  }
 }
 players(side){return this.slots[side].map(x=>x.player).filter(p=>p.onPitch!==false&&!p.matchState?.substituted&&!p.matchState?.injured)}
 resetPositions(half){
  for(const side of ["home","away"])for(const {slot,player:p} of this.slots[side]){
   const x=half===1?slot[1]:1-slot[1],y=side==="home"?slot[2]:1-slot[2];
   p.position={x,y};p.targetPosition={x,y};p.velocity={x:0,y:0};p.hasBall=false;p.currentAction="idle";p.intent="hold_position";
   p.matchState.actualPosition={x,y};p.matchState.targetPosition={x,y};p.matchState.tacticalPosition={x,y};p.matchState.formationPosition={x,y};p.matchState.velocity={x:0,y:0};
  }
  this.state.ball.x=.5;this.state.ball.y=.5;this.state.ball.velocityX=0;this.state.ball.velocityY=0;this.state.ball.ownerId=null;this.state.ball.pass=null;this.state.ball.state="kickoff";this.state.possession=POSSESSION.NONE
 }
 start(){if(this.state.matchStatus.finished||this.running)return;if(!this.state.matchStatus.started){this.state.matchStatus.started=true;this.state.phase=MATCH_PHASES.KICKOFF;this.running=true;this.state.clock.paused=false;this.kickoff("home");this.emit("MATCH_STARTED",{seed:this.seed,half:1})}else this.resume()}
 pause(){if(this.state.matchStatus.finished)return;this.running=false;this.state.clock.paused=true;this.state.phase=MATCH_PHASES.PAUSED}
 resume(){if(this.state.matchStatus.finished)return;this.running=true;this.state.clock.paused=false;this.state.phase=MATCH_PHASES.OPEN_PLAY}
 stop(){this.running=false;this.state.clock.paused=true}
 setSpeed(s){s=Number(s);this.state.clock.speed=[1,2,4,8].includes(s)?s:1}
 update(ms){if(!this.running||this.state.matchStatus.finished)return;this.acc+=Math.max(0,Math.min(250,ms))/1000*this.state.clock.speed;let n=0;while(this.acc>=DT&&n++<40){this.acc-=DT;this.step()}this.sync()}
 step(){
  this.tick++;this.sim+=DT;this.state.clock.totalSeconds=Math.min(5400,this.sim);this.state.clock.minute=Math.floor(this.sim/60);this.state.clock.second=Math.floor(this.sim%60);
  if(this.sim>=2700&&this.state.clock.half===1){this.halfTime();return}if(this.sim>=5400){this.fullTime();return}
  if(this.state.phase===MATCH_PHASES.KICKOFF)this.state.phase=MATCH_PHASES.OPEN_PLAY;
  this.updateTargets();this.movePlayers();this.moveBall();this.decisions();this.resolveLooseBall();this.possessionStats();
  this.emit("ENGINE_TICK",{simulatedSeconds:DT,tick:this.tick,speed:this.state.clock.speed,possession:this.state.possession,ballOwnerId:this.state.ball.ownerId})
 }
 kickoff(side){this.resetPositions(this.state.clock.half);const p=this.slots[side].find(x=>["ST","AM","CM"].includes(x.slot[0]))?.player||this.slots[side][0].player;this.assign(p,side);this.state.ball.x=.5;this.state.ball.y=.5;this.emit("KICKOFF",{side,teamId:this.state.teams[side].id,playerId:p.id},[p.id])}
 halfTime(){this.sim=2700;this.state.clock.totalSeconds=2700;this.state.clock.minute=45;this.state.clock.second=0;this.state.clock.half=2;this.running=false;this.state.clock.paused=true;this.state.phase=MATCH_PHASES.HALF_TIME;this.resetPositions(2);this.emit("HALF_TIME",{score:{...this.state.score},half:1})}
 startSecondHalf(){if(this.state.clock.half!==2||this.state.matchStatus.finished)return;this.running=true;this.state.clock.paused=false;this.state.phase=MATCH_PHASES.KICKOFF;this.kickoff("away");this.emit("SECOND_HALF_STARTED",{half:2})}
 fullTime(){this.sim=5400;this.state.clock.totalSeconds=5400;this.state.clock.minute=90;this.state.clock.second=0;this.running=false;this.state.clock.paused=true;this.state.phase=MATCH_PHASES.FULL_TIME;this.state.matchStatus.finished=true;this.emit("FULL_TIME",{score:{...this.state.score}})}
 assign(p,side){if(!p)return;for(const s of["home","away"])for(const q of this.players(s))q.hasBall=false;p.hasBall=true;p.currentAction="control";p.intent="possess";this.state.ball.ownerId=p.id;this.state.ball.lastTouchPlayerId=p.id;this.state.ball.x=p.position.x;this.state.ball.y=p.position.y;this.state.ball.state="controlled";this.state.possession=side}
 nearestOpp(p){let best=null,bd=1;for(const q of this.players(opp(p.side))){const z=d(p.position,q.position);if(z<bd){bd=z;best=q}}return{p:best,d:bd}}
 nearestMate(p){return this.players(p.side).filter(q=>q.id!==p.id).map(q=>({p:q,d:d(p.position,q.position)})).sort((a,b)=>a.d-b.d)}
 pressure(p){let n=0;for(const q of this.players(opp(p.side))){const z=d(p.position,q.position);if(z<.20)n+=(.20-z)/.20}return clamp(n/2.8)}
 updateTargets(){
  for(const side of["home","away"]){const has=this.state.possession===side,team=this.state.teams[side],bx=this.state.ball.x,by=this.state.ball.y,dd=dir(side);
   for(const {slot,player:p} of this.slots[side]){
    if(p.id===this.state.ball.ownerId&&!this.state.ball.pass){p.targetPosition={...p.position};continue}
    let x=this.state.clock.half===1?slot[1]:1-slot[1],y=side==="home"?slot[2]:1-slot[2];
    x=clamp(x+(bx-.5)*.18*dd);
    const role=slot[0];
    if(has){if(role==="ST")x+=.035*dd;if(role==="AM")x+=.025*dd;if(["RW","LW"].includes(role))y+=(by-y)*.06;
      if((role==="RB"||role==="RWB")&&team.tactics?.overlapRight)x+=.055*dd;
      if((role==="LB"||role==="LWB")&&team.tactics?.overlapLeft)x+=.055*dd;
    }else{
      const block=team.tactics?.defensiveLine==="high"?.055:.095;x=clamp(x+(bx-x)*.05-dd*block*.03);
      y+=(by-y)*.025;
    }
    // Compactness: midfielders stay central; wide players preserve width.
    if(role==="DM")y+=(.5-y)*.12;
    if(["RW","LW","RWB","LWB"].includes(role))y+=( (role==="RW"||role==="RWB"?(.84):.16)-y)*.08;
    p.targetPosition={x:clamp(x,MIN_X,MAX_X),y:clamp(y,MIN_Y,MAX_Y)};p.matchState.targetPosition={...p.targetPosition}
   }
  }
 }
 movePlayers(){
  for(const side of["home","away"])for(const {player:p} of this.slots[side]){
   if(!p.onPitch||p.id===this.state.ball.ownerId)continue;
   const dx=p.targetPosition.x-p.position.x,dy=p.targetPosition.y-p.position.y,dd=Math.hypot(dx,dy);
   const acc=.003+A(p,"physical","accelerazione",65)/100*.006,max=.006+A(p,"physical","velocita",65)/100*.010;
   const nx=dd>.001?dx/dd:0,ny=dd>.001?dy/dd:0;
   p.velocity.x=p.velocity.x+(nx*max-p.velocity.x)*Math.min(1,acc/.009);
   p.velocity.y=p.velocity.y+(ny*max-p.velocity.y)*Math.min(1,acc/.009);
   if(dd<.008){p.velocity.x*=.55;p.velocity.y*=.55}
   p.position.x=clamp(p.position.x+p.velocity.x,MIN_X,MAX_X);p.position.y=clamp(p.position.y+p.velocity.y,MIN_Y,MAX_Y);
   p.matchState.actualPosition={...p.position};p.matchState.velocity={...p.velocity};p.currentAction=dd>.018?"move":"hold"
  }
 }
 bestPass(p){
  const mates=this.nearestMate(p);let best=null,score=-999;
  for(const m of mates){const q=m.p,forward=(q.position.x-p.position.x)*dir(p.side),space=1-this.pressure(q),role=cls(q.role??q.primaryRole);const s=forward*.95+space*.55+(["ST","W","AM"].includes(role)?.09:0)-Math.max(0,m.d-.30);if(s>score){score=s;best=q}}
  return best
 }
 decisions(){
  const owner=this.state.ball.ownerId;if(!owner||this.state.ball.pass)return;const ballOwner=this.players("home").concat(this.players("away")).find(q=>q.id===owner);if(!ballOwner)return;
  const side=ballOwner.side,pressure=this.pressure(ballOwner),last=this.lastDecision.get(owner)||-99,reaction=AVG(ballOwner,[["mental","decisioni"],["mental","anticipazione"],["mental","concentrazione"]],60)/100,interval=.80+(1-reaction)*.70+pressure*.55;
  if(this.sim-last<interval)return;this.lastDecision.set(owner,this.sim);
  const mates=this.nearestMate(ballOwner),target=this.bestPass(ballOwner),goalDist=side==="home"?1-ballOwner.position.x:ballOwner.position.x,fin=AVG(ballOwner,[["technical","finalizzazione"],["technical","tiro"],["mental","freddezza"]]),passing=AVG(ballOwner,[["technical","passaggi"],["mental","visione"],["mental","decisioni"]]);
  let action="carry";
const playerShotGap=this.sim-(this.lastShotAt.get(ballOwner.id)??-999);
const playerPassGap=this.sim-(this.lastPassAt.get(ballOwner.id)??-999);
const teamPassGap=this.sim-(this.lastTeamPassAt[side]??-999);
const shootingOpportunity=goalDist<.22&&fin>72&&pressure<.46&&playerShotGap>35&&this.rng.nextFloat()<.020;
const roleClass=cls(ballOwner.role??ballOwner.primaryRole);
const forwardSpace=target?Math.max(0,(target.position.x-ballOwner.position.x)*dir(side)):0;
const passNeed=pressure*.75+Math.max(0,goalDist-.35)*.18;
const passQuality=clamp((passing-55)/45+forwardSpace*.35-pressure*.25,.05,.95);
const passAllowed=target&&playerPassGap>5.0&&teamPassGap>3.5&&pressure<.88;
const passChoice=passAllowed&&(
  pressure>.48 ||
  forwardSpace>.08 ||
  ["CM","AM","W","ST"].includes(roleClass)
)&&this.rng.nextFloat()<(.16+.48*passQuality+.10*pressure);
if(shootingOpportunity) action="shoot";
else if(passChoice) action="pass";
  this.emit("AI_ACTION_RESOLVED",{playerId:owner,teamId:this.state.teams[side].id,action,pressure,decisionInterval:interval,goalDistance:goalDist},[owner]);
  if(action==="pass")this.pass(ballOwner,target);else if(action==="shoot")this.shoot(ballOwner,pressure);else{ballOwner.position.x=clamp(ballOwner.position.x+dir(side)*(.004+A(ballOwner,"physical","accelerazione",60)/100*.003));this.state.ball.x=ballOwner.position.x;this.state.ball.y=ballOwner.position.y;this.emit("CARRY",{playerId:owner,teamId:this.state.teams[side].id},[owner])}
  this.duel(ballOwner)
 }
 pass(p,t){if(!t)return;const dd=d(p.position,t.position),quality=clamp(AVG(p,[["technical","passaggi"],["mental","visione"],["mental","decisioni"]],60)/100-this.pressure(p.side)*.20,.25,.98);this.state.ball.pass={passerId:p.id,receiverId:t.id,side:p.side,start:{...p.position},target:{...t.position},elapsed:0,duration:clamp(.55+dd*5,.55,1.35),quality};p.hasBall=false;p.currentAction="pass";this.state.ball.state="in_flight";
this.lastPassAt.set(p.id,this.sim);this.lastTeamPassAt[p.side]=this.sim;
const tm=this.state.teams[p.side];
tm.matchStats.passesAttempted=(tm.matchStats.passesAttempted||0)+1;
p.matchStats=p.matchStats||{};p.matchStats.passesAttempted=(p.matchStats.passesAttempted||0)+1;
this.emit("PASS",{passerId:p.id,receiverId:t.id,teamId:tm.id,distance:dd},[p.id,t.id])}
 moveBall(){
  const b=this.state.ball;if(!b.pass){if(b.ownerId){const p=this.players("home").concat(this.players("away")).find(q=>q.id===b.ownerId);if(p){b.x=p.position.x;b.y=p.position.y}}return}
  const x=b.pass;b.pass.elapsed+=DT;const t=clamp(x.elapsed/x.duration);b.x=x.start.x+(x.target.x-x.start.x)*t;b.y=x.start.y+(x.target.y-x.start.y)*t;b.height=Math.sin(Math.PI*t)*.04;
  const rec=this.players(x.side).find(q=>q.id===x.receiverId);if(rec){const dx=x.target.x-rec.position.x,dy=x.target.y-rec.position.y,z=Math.hypot(dx,dy)||1;const s=.008+A(rec,"physical","velocita",65)/100*.006;rec.position.x=clamp(rec.position.x+dx/z*s);rec.position.y=clamp(rec.position.y+dy/z*s)}
  const intr=this.players(opp(x.side)).map(p=>({p,z:d(p.position,b)})).sort((a,c)=>a.z-c.z)[0];
  if(intr&&intr.z<.028&&t<.9){const chance=clamp(.12+A(intr.p,"mental","anticipazione",60)/400+A(intr.p,"technical","contrasti",60)/500,.12,.42);if(this.rng.nextFloat()<chance){this.state.teams[opp(x.side)].matchStats.interceptions=(this.state.teams[opp(x.side)].matchStats.interceptions||0)+1;
this.emit("PASS_INTERCEPTED",{passerId:x.passerId,interceptorId:intr.p.id,teamId:this.state.teams[opp(x.side)].id},[x.passerId,intr.p.id]);b.pass=null;this.assign(intr.p,opp(x.side));return}}
  if(t>=1){const control=AVG(rec,[["technical","primoControllo"],["technical","tecnica"],["mental","decisioni"]],60),success=clamp(.55+control/250-this.pressure(x.side)*.20+x.quality*.10,.25,.96);if(rec&&this.rng.nextFloat()<success){b.pass=null;this.assign(rec,x.side);
const tm=this.state.teams[x.side];tm.matchStats.passesCompleted=(tm.matchStats.passesCompleted||0)+1;
rec.matchStats=rec.matchStats||{};
this.emit("PASS_COMPLETED",{passerId:x.passerId,receiverId:rec.id,teamId:tm.id},[x.passerId,rec.id])}else{b.pass=null;b.ownerId=null;b.state="free";this.state.possession=POSSESSION.NONE;this.emit("BALL_LOOSE",{lastTouchPlayerId:x.passerId})}}
 }
 duel(p){const n=this.nearestOpp(p);if(!n.p||n.d>.045)return;const atk=AVG(p,[["technical","dribbling"],["technical","primoControllo"],["mental","decisioni"],["physical","accelerazione"]],60),def=AVG(n.p,[["technical","contrasti"],["technical","marcatura"],["mental","anticipazione"],["physical","forza"]],60);const winner=atk-def>3?"attacker":atk-def<-3?"defender":this.rng.nextFloat()<.5+((atk-def)/30)?"attacker":"defender";this.emit("DUEL_RESOLVED",{attackerId:p.id,defenderId:n.p.id,distance:n.d,winner},[p.id,n.p.id]);if(winner==="defender")this.assign(n.p,n.p.side)}
 shoot(p,pressure){
  const side=p.side;this.lastShotAt.set(p.id,this.sim);this.lastTeamShotAt[side]=this.sim;const distGoal=side==="home"?1-p.position.x:p.position.x,angle=1-Math.min(1,Math.abs(p.position.y-.5)/.48)*.55,fin=A(p,"technical","finalizzazione",65),tech=A(p,"technical","tiro",65);
  const xg=clamp(.025+(1-distGoal)*.28*angle+(fin-60)/380+tech/1800-pressure*.07,.008,.42),on=clamp(.38+tech/250-pressure*.16,.15,.90)>this.rng.nextFloat();const keeper=this.players(opp(side)).find(q=>cls(q.role??q.primaryRole)==="GK"),ks=keeper?AVG(keeper,[["goalkeeper","riflessi"],["goalkeeper","posizionamento"],["mental","decisioni"]],65):65,goal=this.rng.nextFloat()<clamp(xg*(.27+fin/520)*(1-ks/480),.003,.28);
  p.matchStats=p.matchStats||{};p.matchStats.shots=(p.matchStats.shots||0)+1;this.state.teams[side].matchStats.shots=(this.state.teams[side].matchStats.shots||0)+1;this.state.teams[side].matchStats.xG=(this.state.teams[side].matchStats.xG||0)+xg;
  this.emit("SHOT",{playerId:p.id,teamId:this.state.teams[side].id,xg,onTarget:on,pressure,distance:distGoal},[p.id]);
  if(goal)this.goal(side,p,xg);else if(on){if(keeper){keeper.matchStats=keeper.matchStats||{};keeper.matchStats.saves=(keeper.matchStats.saves||0)+1}this.emit("SAVE",{shooterId:p.id,goalkeeperId:keeper?.id??null},[p.id,keeper?.id].filter(Boolean));this.state.ball.ownerId=null;this.state.ball.state="free";this.state.possession=POSSESSION.NONE}else{this.emit("SHOT_MISSED",{playerId:p.id,teamId:this.state.teams[side].id,xg},[p.id]);this.state.ball.ownerId=null;this.state.ball.state="free";this.state.possession=POSSESSION.NONE}
 }
 goal(side,p,xg){this.state.score[side]++;this.state.teams[side].matchStats.goals=(this.state.teams[side].matchStats.goals||0)+1;p.matchStats.goals=(p.matchStats.goals||0)+1;this.emit("GOAL",{teamId:this.state.teams[side].id,scorerId:p.id,xg,score:{...this.state.score}},[p.id]);this.resetPositions(this.state.clock.half);this.kickoff(opp(side));this.emit("KICKOFF_AFTER_GOAL",{side:opp(side),teamId:this.state.teams[opp(side)].id,playerId:this.state.ball.ownerId},[this.state.ball.ownerId])}
 resolveLooseBall(){if(this.state.ball.ownerId)return;let best=null,bd=.035;for(const side of["home","away"])for(const p of this.players(side)){const z=d(p.position,this.state.ball);if(z<bd){bd=z;best=p}}if(best)this.assign(best,best.side)}
 possessionStats(){if(this.state.possession==="home")this.state.statistics.homePossession=(this.state.statistics.homePossession||0)+DT;if(this.state.possession==="away")this.state.statistics.awayPossession=(this.state.statistics.awayPossession||0)+DT;const t=(this.state.statistics.homePossession||0)+(this.state.statistics.awayPossession||0);if(t){this.state.statistics.homePossessionPct=this.state.statistics.homePossession/t*100;this.state.statistics.awayPossessionPct=100-this.state.statistics.homePossessionPct}}
 sync(){this.state.clock.paused=!this.running;this.state.statistics.homeXG=this.state.teams.home.matchStats.xG||0;this.state.statistics.awayXG=this.state.teams.away.matchStats.xG||0;this.state.statistics.totalShots=(this.state.teams.home.matchStats.shots||0)+(this.state.teams.away.matchStats.shots||0);for(const side of["home","away"])for(const p of this.players(side)){p.matchState.actualPosition={...p.position};p.matchState.hasBall=p.id===this.state.ball.ownerId&&!this.state.ball.pass;p.matchState.currentAction=p.currentAction;p.matchState.intent=p.intent}}
 getState(){return this.state} getClockState(){return {...this.state.clock}}
}

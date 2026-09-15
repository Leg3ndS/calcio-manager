import {createReferee} from './refereeProfiles.js';
import {RESTARTS,FOULS} from './refereeRules.js';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(Number(v))?Number(v):a));
const sideOf=(state,p)=>p?.side??(['home','away'].find(s=>(state?.teams?.[s]?.players??[]).some(x=>String(x.id)===String(p?.id)))??null);
const pos=p=>p?.position??{x:p?.x??.5,y:p?.y??.5};
const dist=(a,b)=>Math.hypot(pos(a).x-pos(b).x,pos(a).y-pos(b).y);
export class Referee{
 constructor(config={},rng=null){this.profile=createReferee(config,config.profile??'balanced');this.rng=rng;}
 setRng(r){this.rng=r;} getSnapshot(){return {...this.profile};}
 evaluateDuel(state,{attacker,defender,contact=.5,timing=.5,ballPlay=.5,relativeSpeed=.5,dangerous=false}={}){
  const atk=Number(attacker?.attributes?.mental?.aggressivita??50)/99; const str=Number(defender?.attributes?.physical?.forza??50)/99; const bal=Number(attacker?.attributes?.physical?.equilibrio??50)/99; const agi=Number(defender?.attributes?.physical?.agilita??50)/99;
  const tackle=clamp(str*.30+agi*.12+(1-timing)*.18+ballPlay*.20+(1-contact)*.20); const dribble=clamp(atk*.05+bal*.22+(1-ballPlay)*.18+(1-contact)*.20+(1-tackle)*.35);
  const winner=dribble>=tackle?'attacker':'defender'; const foul=this.evaluateContact(state,{tackler:defender,opponent:attacker,contact,timing,ballPlay,dangerous});
  return {winner,duelScore:{attacker:dribble,defender:tackle},foul,...{relativeSpeed}};
 }
 evaluateContact(state,{tackler,opponent,contact=.5,timing=.5,ballPlay=.5,dangerous=false}={}){
  const strict=this.profile.strictness/100,tol=this.profile.contactTolerance/100,ag=Number(tackler?.attributes?.mental?.aggressivita??50)/99;
  const base=contact*.34+timing*.25+(1-ballPlay)*.26+ag*.15; const probability=clamp(base*(.55+strict*.75)*(1.2-tol*.35)); const threshold=clamp(.58+tol*.18-strict*.08); const foul=probability>=threshold;
  const severity=contact*.45+timing*.30+(dangerous?.25:0); const foulType=!foul?FOULS.NONE:severity>=.72?FOULS.EXCESSIVE_FORCE:severity>=.48?FOULS.RECKLESS:FOULS.CARELESS;
  return {type:foul?'FOUL':'NO_FOUL',foulType,probability,threshold,tacklerId:tackler?.id??null,opponentId:opponent?.id??null,side:foul?sideOf(state,opponent):null};
 }
 decideAdvantage({foul,attackingSide,fieldPosition=.5,forwardProgress=0,space=.5,support=.5,opponentsAhead=1,counterAttack=false}){
  if(!foul||foul.foulType===FOULS.NONE||attackingSide==null)return {played:false,score:0};
  const tendency=this.profile.advantageTendency/100; const position=clamp(fieldPosition); const danger=clamp(forwardProgress*.35+space*.25+support*.18+clamp(1-opponentsAhead/6)*.12+(counterAttack?.10:0)+position*.05); const threshold=.48; const score=clamp(tendency*.55+danger*.65); const played=score>=threshold;
  return {played,score,threshold,reason:played?'favorable_attack':'insufficient_advantage'};
 }
 decideLooseBall(state){const all=['home','away'].flatMap(s=>(state?.teams?.[s]?.players??[]).filter(p=>p?.onPitch!==false));const b=state?.ball??{x:.5,y:.5};if(!all.length)return{type:'NO_DECISION'};let best=null;for(const p of all){const d=dist(p,b);const a=Number(p.attributes?.mental?.anticipazione??50)/99;const r=Number(p.attributes?.physical?.reattivita??50)/99;const s=Number(p.attributes?.physical?.velocita??50)/99;const score=(1-clamp(d/.45))*.55+a*.18+r*.15+s*.12;if(!best||score>best.score)best={p,d,score};}return{type:'POSSESSION',side:sideOf(state,best.p),playerId:best.p.id,distance:best.d,confidence:clamp(best.score)};}
 decideMissedShot(state,{attackingSide}){const def=attackingSide==='home'?'away':'home';const k=(state?.teams?.[def]?.players??[]).find(p=>p.isGoalkeeper||String(p.role??p.primaryRole??'').toLowerCase().includes('portiere'));return{type:'RESTART',restart:RESTARTS.GOAL_KICK,side:def,playerId:k?.id??null,reason:'shot_missed'};}
}
export const createRefereeEngine=(state,rng)=>{const r=new Referee(state?.referee??{},rng);state.referee={...(state.referee??{}),...r.getSnapshot()};return r;};

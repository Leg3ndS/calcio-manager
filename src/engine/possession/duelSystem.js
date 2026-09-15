import {Referee} from '../referee/referee.js';
import {applyContactDisplacement} from '../physics/playerPhysics.js';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(Number(v))?Number(v):a));
const dist=(a,b)=>Math.hypot((a?.position?.x??.5)-(b?.position?.x??.5),(a?.position?.y??.5)-(b?.position?.y??.5));
const side=p=>p?.side??p?.team??null;
const rng=r=>clamp(typeof r==='function'?r():r?.next?.()??r?.random?.()??Math.random());
export function resolveDuel({state,attacker,defender,rngSource,emitEvent,referee=null}){
 if(!attacker||!defender)return null; referee??=new Referee(state?.referee??{},rngSource); referee.setRng(rngSource);
 const d=dist(attacker,defender); if(d>.085)return null;
 const rel=Math.hypot((attacker.velocity?.x??0)-(defender.velocity?.x??0),(attacker.velocity?.y??0)-(defender.velocity?.y??0));
 const contact=clamp((.085-d)/.06), timing=clamp(rel/.08), ballPlay=attacker.hasBall?clamp(1-d/.085):clamp(1-d/.12), dangerous=!!state?.ball?.dangerous;
 const result=referee.evaluateDuel(state,{attacker,defender,contact,timing,ballPlay,relativeSpeed:timing,dangerous});
 emitEvent?.({type:'DUEL_RESOLVED',payload:{attackerId:attacker.id,defenderId:defender.id,distance:d,winner:result.winner,attackerScore:result.duelScore.attacker,defenderScore:result.duelScore.defender}});
 applyContactDisplacement({player:attacker,other:defender,impulse:.0035}); applyContactDisplacement({player:defender,other:attacker,impulse:.0025});
 if(result.foul.type==='FOUL'){
   const as=side(attacker), foulSide=side(attacker); const field=attacker.position?.x??.5; const forward=as==='home'?(defender.position?.x??field)-field:field-(defender.position?.x??field); const oppX=defender.position?.x??field; const gap=as==='home'?Math.max(0,.5-oppX):Math.max(0,oppX-.5); const space=clamp(gap/.5); const advantage=referee.decideAdvantage({foul:result.foul,attackingSide:foulSide,fieldPosition:field,forwardProgress:clamp(forward/.25),space,support:.5,opponentsAhead:2,counterAttack:forward>.05});
   const foulPayload={foulType:result.foul.foulType,committedById:defender.id,sufferedById:attacker.id,side:foulSide,probability:result.foul.probability};
   emitEvent?.({type:'FOUL_COMMITTED',payload:foulPayload});
   if(advantage.played){emitEvent?.({type:'ADVANTAGE_PLAYED',payload:{...foulPayload,score:advantage.score}});return {...result,defenderId:defender.id,attackerId:attacker.id,advantage,stopped:false};}
   emitEvent?.({type:'FREE_KICK_AWARDED',payload:{...foulPayload,side:foulSide,restart:'free_kick',position:{...attacker.position}}}); return {...result,defenderId:defender.id,attackerId:attacker.id,advantage,stopped:true};
 }
 return {...result,defenderId:defender.id,attackerId:attacker.id,advantage:{played:false,score:0},stopped:false};
}

/**
 * MATCH ENGINE V4 - deterministic ball physics.
 *
 * The ball is never teleported between players. A pass is a timed trajectory;
 * reception/interception is resolved by the possession layer when the ball
 * reaches the relevant area.
 */
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const F=.01, MAX=.99, G=9.81;
function ensure(b){b.position??={x:b.x??.5,y:b.y??.5};b.velocity??={x:b.velocityX??0,y:b.velocityY??0};b.velocityX??=b.velocity.x??0;b.velocityY??=b.velocity.y??0;b.height=Number.isFinite(b.height)?b.height:0;b.verticalVelocity=Number.isFinite(b.verticalVelocity)?b.verticalVelocity:0;b.spin=Number.isFinite(b.spin)?b.spin:0;return b;}
function point(a,b,t){return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}
export function launchBall({ball,from,to,speed=.25,height=0,spin=0,state='in_flight',pass=null}){ensure(ball);const s=from??ball.position,e=to??s,d=Math.hypot(e.x-s.x,e.y-s.y)||1;ball.x=s.x;ball.y=s.y;ball.position={...s};ball.velocityX=dx(e,s)/d*speed;ball.velocityY=dy(e,s)/d*speed;ball.velocity={x:ball.velocityX,y:ball.velocityY};ball.height=Math.max(0,height);ball.verticalVelocity=ball.height>0?Math.sqrt(2*G*ball.height):0;ball.spin=spin;ball.state=state;ball.targetX=e.x;ball.targetY=e.y;ball.ownerId=null;if(pass)ball.pass=pass;return ball;}
function dx(a,b){return a.x-b.x;} function dy(a,b){return a.y-b.y;}
export function updateBallPhysics(ball,dt=.1){if(!ball)return null;const b=ensure(ball),t=clamp(Number(dt)||0,0,.1);
  if(b.pass){const p=b.pass;p.elapsed=Math.min(p.duration,(p.elapsed??0)+t);const q=clamp(p.elapsed/p.duration);const next=point(p.from,p.to,q);b.x=next.x;b.y=next.y;b.position={...next};b.velocityX=(p.to.x-p.from.x)/Math.max(p.duration,.001);b.velocityY=(p.to.y-p.from.y)/Math.max(p.duration,.001);b.velocity={x:b.velocityX,y:b.velocityY};b.state='in_flight';return b;}
  if(b.ownerId){b.velocityX=b.velocityY=0;b.velocity={x:0,y:0};b.state='controlled';b.x=b.position?.x??b.x;b.y=b.position?.y??b.y;return b;}
  if(!['in_flight','rolling','free','loose','contested'].includes(b.state))return b;
  const drag=b.height>0?.985:.92;b.velocityX*=Math.pow(drag,t*10);b.velocityY*=Math.pow(drag,t*10);if(b.height>0||b.verticalVelocity!==0){b.height+=b.verticalVelocity*t;b.verticalVelocity-=G*t*.02;if(b.height<=0){b.height=0;b.verticalVelocity=0;b.state='rolling';}}b.x=clamp((b.x??b.position.x)+b.velocityX*t,F,MAX);b.y=clamp((b.y??b.position.y)+b.velocityY*t,F,.99);b.position={x:b.x,y:b.y};b.velocity={x:b.velocityX,y:b.velocityY};if(Math.hypot(b.velocityX,b.velocityY)<.001&&b.height<=0){b.velocityX=b.velocityY=0;b.velocity={x:0,y:0};b.state='free';}return b;}

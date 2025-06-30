// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// DOM elements
const scoreSpan = document.getElementById('score');
const highscoreSpan = document.getElementById('highscore');
const levelSpan = document.getElementById('level');
const lineupDiv = document.getElementById('lineup');
const resetBtn = document.getElementById('resetBtn');
const gameOverDiv = document.getElementById('gameOverMessage');

// Audio
const bgm = document.getElementById('bgm');
const mergeSfx = document.getElementById('mergeSfx');
const dropSfx = document.getElementById('dropSfx');
const orangeMountainSfx = document.getElementById('orangeMountainSfx');
const fizzSfx = document.getElementById('fizzSfx');
const gameoverSfx = document.getElementById('gameoverSfx');

// Constants
const CANVAS_W = 480, CANVAS_H = 600;
const BOX = { x: 40, y: 60, w: 400, h: 480 };
const GRAVITY = 0.25, FRICTION = 0.99;
const RADIUS_TABLE = [22,24,25,27,29,32,35,39,44,50,54,58,26,23,24,25,28,29,32,36,44,50,54,58];
const SPAWN_Y = BOX.y + 45, SPAWN_DELAY = 380;
const LEVEL_1_LEN = 12, ORANGE_IDX = 12, LEVEL2_START = 13;

// Game state
let sodasInPlay = [], current = null, currentX = CANVAS_W/2;
let readyToDrop = true, canDrop = true;
let score = 0, highscore = 0, level = 1;
let unlockedOM = false, OMChance = 0;
let secretMode = false, comboFizz = false, gameOver = false;
let particles = [];

// Soda data
const sodas = [
  "Shasta","Dr. Thunder","Faygo","Mug Root Beer","RC Cola",
  "Barq’s","Sprite","Mountain Dew","Fanta","Dr. Pepper",
  "Coca-Cola","Pepsi","Orange Mountain",

  "LaCroix","Red Bull","Monster","Rockstar","7Up",
  "Canada Dry","Pepsi Zero","Diet Coke","Coke Vanilla",
  "Big Cola","Fanta Exotic","Coke Classic"
];
const sodaImgs = sodas.map(n => {
  const i = new Image();
  i.src = ""; // You can fill in your image URLs here
  return i;
});

// Soda class
class Soda {
  constructor(lvl, x, y) {
    this.level = lvl; this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.radius = RADIUS_TABLE[lvl];
    this.img = sodaImgs[lvl];
    this.merging = false;
    this.fizzing = false;
  }

  draw() {
    // Optional shadow for smoother look
    ctx.shadowColor = "rgba(0,0,0,0.2)";
    ctx.shadowBlur = 4;
    
    if(this.merging) {
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI * 2);
      ctx.fillStyle = "#fff86e";
      ctx.fill(); ctx.restore();
    }

    if(this.img.complete) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(this.img, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
      ctx.restore();
    }

    ctx.shadowBlur = 0;
  }
}

// Particle
function spawnFizz(x,y,count) {
  for(let i=0;i<count;i++){
    particles.push({
      x, y,
      vx: (Math.random()*2-1)*4,
      vy: (Math.random()*2-1)*4,
      life: 30 + Math.random()*20
    });
  }
}

function updateFizz() {
  particles = particles.filter(p=>p.life>0);
  particles.forEach(p=>{
    p.x += p.vx; p.y += p.vy; p.vy += 0.15;
    p.life--;
  });
}

function drawFizz() {
  particles.forEach(p=>{
    ctx.globalAlpha = p.life/50;
    ctx.beginPath();
    ctx.arc(p.x,p.y,5,0,Math.PI*2);
    ctx.fillStyle = "#fff86e";
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

// Game loop
function gameLoop() {
  ctx.clearRect(0,0,CANVAS_W,CANVAS_H);

  // Draw container
  ctx.fillStyle="#181818";
  ctx.fillRect(BOX.x,BOX.y,BOX.w,BOX.h);
  ctx.strokeStyle="#fff";
  ctx.lineWidth=4;
  ctx.strokeRect(BOX.x,BOX.y,BOX.w,BOX.h);

  sodasInPlay.forEach(s=>s.draw());
  if(current && !gameOver) {
    ctx.save(); ctx.globalAlpha=0.8;
    ctx.beginPath();
    ctx.arc(currentX, SPAWN_Y, current.radius, 0, Math.PI*2);
    ctx.clip();
    ctx.drawImage(current.img, currentX-current.radius, SPAWN_Y-current.radius, current.radius*2, current.radius*2);
    ctx.restore();
  }
  updateFizz(); drawFizz();

  updateSodas(); renderLineup();
  requestAnimationFrame(gameLoop);
}

// Spawning & dropping
function spawn() {
  if(gameOver) return;
  let lvl;
  if(secretMode){
    lvl = LEVEL2_START + Math.floor(Math.random()*12);
  } else {
    if(unlockedOM && Math.random()<OMChance) lvl=ORANGE_IDX;
    else lvl=Math.floor(Math.random()*LEVEL_1_LEN);
  }
  current = new Soda(lvl, currentX, SPAWN_Y);
  readyToDrop=true; canDrop=true;
}

function drop() {
  if(!readyToDrop || gameOver) return;
  readyToDrop=false; dropSfx.play();
  current.x = currentX; current.y = SPAWN_Y;
  sodasInPlay.push(current); current=null;
  setTimeout(spawn, SPAWN_DELAY);
}

// Physics & merging
function updateSodas(){
  if(gameOver) return;
  sodasInPlay.forEach(s=>{
    if(s.merging) return;
    s.vy+=GRAVITY; s.x+=s.vx; s.y+=s.vy;
    s.vx*=FRICTION; s.vy*=FRICTION;

    // Boundaries
    if(s.x-s.radius<BOX.x) { s.x=BOX.x+s.radius; s.vx*=-0.4; }
    if(s.x+s.radius>BOX.x+BOX.w) { s.x=BOX.x+BOX.w-s.radius; s.vx*=-0.4; }
    if(s.y+s.radius>BOX.y+BOX.h) {
      s.y=BOX.y+BOX.h-s.radius;
      if(Math.abs(s.vy)>2) s.vy*=-0.4;
      else s.vy=0;
    }
  });

  // Collisions
  for(let i=0;i<sodasInPlay.length;i++){
    for(let j=i+1;j<sodasInPlay.length;j++){
      let a=sodasInPlay[i], b=sodasInPlay[j];
      if(a.merging || b.merging) continue;
      let dx=b.x-a.x, dy=b.y-a.y;
      let dist=Math.hypot(dx,dy), minD=a.radius+b.radius;
      if(dist<minD){
        let overlap=(minD-dist)/2, ang=Math.atan2(dy,dx);
        a.x-=Math.cos(ang)*overlap; a.y-=Math.sin(ang)*overlap;
        b.x+=Math.cos(ang)*overlap; b.y+=Math.sin(ang)*overlap;

        let nx=dx/dist, ny=dy/dist;
        let p = 2*(a.vx*nx + a.vy*ny - b.vx*nx - b.vy*ny)/2;
        a.vx-=p*nx; a.vy-=p*ny; b.vx+=p*nx; b.vy+=p*ny;

        if(Math.abs(a.vx-b.vx)<2 && Math.abs(a.vy-b.vy)<2 && dist<minD*0.9){
          if(a.level===b.level) { merge(i,j); return; }
        }
      }
    }
  }
}

function merge(i,j){
  const a=sodasInPlay[i], b=sodasInPlay[j];
  const lvl=a.level; const nextLvl=lvl+1;
  const mx=(a.x+b.x)/2, my=(a.y+b.y)/2;

  mergeSfx.play(); a.merging=b.merging=true;
  spawnFizz(mx,my,30);

  setTimeout(()=>{
    sodasInPlay = sodasInPlay.filter((_,idx)=>idx!==i && idx!==j);
    sodasInPlay.push(new Soda(nextLvl,mx,my-20));
    score += 20*(nextLvl+1);
    updateScore();
  }, 200);
}

// Render lineup
function renderLineup(){
  lineupDiv.innerHTML='';
  const list = secretMode
    ? sodas.slice(LEVEL2_START,LEVEL2_START+12)
    : sodas.slice(0,LEVEL_1_LEN).concat(unlockedOM && !secretMode ? sodas[ORANGE_IDX] : []);
  list.forEach((_,idx)=>{
    const img = document.createElement('img');
    img.src = sodaImgs[idx].src;
    lineupDiv.appendChild(img);
  });
}

// Score, game over, reset
function updateScore(){
  scoreSpan.textContent = score;
  if(score>highscore){
    highscore = score;
    localStorage.setItem('sodaHighscore', highscore);
    highscoreSpan.textContent = highscore;
  }
}

function reset(){
  sodasInPlay=[]; current=null;
  score=0; level=1; unlockedOM=false;
  secretMode=false; comboFizz=false; gameOver=false;
  particles = [];
  updateScore(); levelSpan.textContent = level;
  gameOverDiv.classList.add('hidden');
  spawn(); renderLineup();
  bgm.currentTime = 0; bgm.volume = 0.08; bgm.play();
}

function endGame(msg){
  gameOver=true; gameoverSfx.play();
  gameOverDiv.textContent = msg;
  gameOverDiv.classList.remove('hidden');
}

// Input
canvas.addEventListener('mousemove', e=>{
  let mx=e.clientX-canvas.getBoundingClientRect().left;
  currentX=Math.max(BOX.x+30, Math.min(BOX.x+BOX.w-30, mx));
});
canvas.addEventListener('click', ()=>drop());
document.addEventListener('keydown', e=>{
  if(e.code==="Space") drop();
});

// Main
function init(){
  highscore = parseInt(localStorage.getItem('sodaHighscore'))||0;
  highscoreSpan.textContent = highscore;
  spawn(); renderLineup();
  bgm.play();
  gameLoop();
}

resetBtn.addEventListener('click', reset);
init();

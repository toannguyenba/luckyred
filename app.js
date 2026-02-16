// app.js - Wheel drawing and spin logic
const UNIT = 'K'; // change currency/unit here (e.g. 'K', 'đ', 'USD')

// WEIGHT_MAP: hard-coded probabilities (percent or relative weights) for specific amounts.
// Keys are the amount values (as strings or numbers). Values are percentages/weights.
// Example: 100 => 1%, 200 => 20%, 500 => 79%
const WEIGHT_MAP = {
  '100': 1,
  '200': 20,
  '500': 79
};
// confetti/fireworks canvas
const confettiCanvas = document.getElementById('confetti');
const confCtx = confettiCanvas.getContext('2d');
const envelopesContainer = document.getElementById('envelopes');
const resetBtn = document.getElementById('resetBtn');
const resultBox = document.getElementById('resultBox');
const resultModal = document.getElementById('resultModal');

// Hard-coded amounts (fixed in code)
let amounts = [100,200,500];
let colors = [];
let opening = false; // prevent multiple opens at the same time
let openedOnce = false; // enforce only one envelope can be opened per session until reset

const NUM_ENVELOPES = 6; // number of closed lì xì shown on screen

function randomColor(){
  const r = 200 + Math.floor(Math.random()*55);
  const g = Math.floor(Math.random()*120);
  const b = Math.floor(Math.random()*120);
  return `rgb(${r},${g},${b})`;
}

function resizeCanvases(){
  const dpr = window.devicePixelRatio || 1;
  confettiCanvas.width = window.innerWidth * dpr;
  confettiCanvas.height = window.innerHeight * dpr;
  confCtx.setTransform(dpr,0,0,dpr,0,0);
}

function prepareColors(){
  colors = amounts.map((_,i)=>{
    return i%2===0? '#ffebee' : '#ffccbc';
  });
}

function getWeightsForAmounts(){
  // produce weights array in same order as `amounts`
  const weights = amounts.map(a=>{
    const key = String(a);
    if(key in WEIGHT_MAP){
      return Number(WEIGHT_MAP[key]) || 0;
    }
    return 0; // unspecified amounts get 0 weight by default
  });
  const total = weights.reduce((s,x)=>s+x,0);
  if(total === 0){
    // fallback to equal weights if none specified
    return amounts.map(()=>1);
  }
  return weights;
}

// Render envelopes on screen. Clicking one will open a random (weighted) amount.
function renderEnvelopes(){
  envelopesContainer.innerHTML = '';
  for(let i=0;i<NUM_ENVELOPES;i++){
    const el = document.createElement('div');
    el.className = 'envelope';
    el.innerHTML = `
      <div class="card">
        <div class="front">
          <div class="heart">❤</div>
          <div class="label">Lì xì</div>
        </div>
        <div class="back">
          <div class="amount">?</div>
        </div>
      </div>`;
    el.addEventListener('click',()=>{
      if(openedOnce) return; // only allow one open
      openEnvelope(el);
    });
    envelopesContainer.appendChild(el);
  }
}

// amounts are fixed in code; no input UI. prepareColors will be called on init or reset.

function pickIndexRandom(){
  // pick an index using the configured weights
  const weights = getWeightsForAmounts();
  const total = weights.reduce((s,x)=>s+x,0);
  if(total === 0){
    return Math.floor(Math.random()*amounts.length);
  }
  let r = Math.random()*total;
  for(let i=0;i<weights.length;i++){
    r -= weights[i];
    if(r <= 0) return i;
  }
  return weights.length - 1; // fallback
}

function easeOutCubic(t){return 1 - Math.pow(1-t,3)}

// open a specific envelope element: animate shake -> flip -> reveal -> fireworks
function openEnvelope(el){
  if(opening) return;
  opening = true;
  resultBox.textContent = 'Đang mở...';
  el.classList.add('shaking');
  // simple UI timing: shake 700ms then open
  setTimeout(()=>{
    el.classList.remove('shaking');
    const chosen = pickIndexRandom();
    const value = amounts[chosen];
    const back = el.querySelector('.back .amount');
    back.textContent = `${value} ${UNIT}`;
    el.classList.add('opened');
    // show modal with result and prevent background scroll
    if(resultBox){
      resultBox.innerHTML = `<strong>Chúc mừng!</strong><br>Bạn nhận được <strong>${value} ${UNIT}</strong>`;
    }
    if(resultModal){
      resultModal.classList.add('visible');
      resultModal.setAttribute('aria-hidden','false');
      document.body.classList.add('no-scroll');
    }
    // fireworks
    launchFireworks();
    // lock further openings until reset
    openedOnce = true;
    // disable other envelopes visually and prevent clicks
    Array.from(envelopesContainer.children).forEach(child=>{
      if(child !== el) child.classList.add('disabled');
    });
    // allow internal animation to finish, but keep openedOnce true
    setTimeout(()=>{ opening = false; }, 1200);
  },700);
}

function resetEnvelopes(){
  // clear states and re-render
  openedOnce = false;
  opening = false;
  // clear confetti/fireworks canvas
  confCtx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);
  // reset result text
  if(resultBox) resultBox.textContent = '';
  // hide modal and allow scroll
  if(resultModal){
    resultModal.classList.remove('visible');
    resultModal.setAttribute('aria-hidden','true');
    document.body.classList.remove('no-scroll');
  }
  renderEnvelopes();
}

/* --- simple confetti --- */
// simple fireworks burst centered on screen
let fireworksParticles = [];
function createFireworks(){
  fireworksParticles = [];
  const w = confettiCanvas.width / (window.devicePixelRatio||1);
  const h = confettiCanvas.height / (window.devicePixelRatio||1);
  const cx = w/2; const cy = h/3; // origin a bit above center
  const colorsList = ['#ff6b6b','#ffd54f','#ff8a65','#ffccbc','#ffd1dc','#fff176'];
  for(let burst=0;burst<6;burst++){
    const count = 18 + Math.floor(Math.random()*12);
    const color = colorsList[Math.floor(Math.random()*colorsList.length)];
    for(let i=0;i<count;i++){
      const angle = Math.random()*Math.PI*2;
      const speed = 2 + Math.random()*5 + burst*0.4;
      fireworksParticles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle)*speed,
        vy: Math.sin(angle)*speed,
        life: 0,
        ttl: 60 + Math.floor(Math.random()*40),
        size: 2 + Math.random()*3,
        color
      });
    }
  }
}

let fireworksRunning = false;
function launchFireworks(){
  if(fireworksRunning) return;
  createFireworks();
  fireworksRunning = true;
  const w = confettiCanvas.width / (window.devicePixelRatio||1);
  const h = confettiCanvas.height / (window.devicePixelRatio||1);
  let t0 = performance.now();
  function frame(now){
    const dt = (now-t0)/1000; t0 = now;
    confCtx.clearRect(0,0,w,h);
    fireworksParticles.forEach(p=>{
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05; // slight gravity
      p.life++;
      const alpha = Math.max(0,1 - p.life/p.ttl);
      confCtx.beginPath();
      confCtx.fillStyle = p.color;
      confCtx.globalAlpha = alpha;
      confCtx.arc(p.x,p.y,p.size,0,Math.PI*2);
      confCtx.fill();
      confCtx.globalAlpha = 1;
    });
    fireworksParticles = fireworksParticles.filter(p=>p.life < p.ttl);
    if(fireworksParticles.length>0){
      requestAnimationFrame(frame);
    } else {
      confCtx.clearRect(0,0,w,h);
      fireworksRunning = false;
    }
  }
  requestAnimationFrame(frame);
}

/* --- events and init --- */
window.addEventListener('resize',()=>{resizeCanvases();});

if(resetBtn){
  resetBtn.addEventListener('click',()=>resetEnvelopes());
}

// initial setup
function init(){
  resizeCanvases();
  prepareColors();
  // hide reset by default until an envelope is opened
  if(resetBtn){
    resetBtn.classList.remove('visible');
    resetBtn.setAttribute('aria-hidden','true');
  }
  renderEnvelopes();
}

init();

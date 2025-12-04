import Player from './Player.mjs';
import Collectible from './Collectible.mjs';

const socket = io();
const canvas = document.getElementById('game-window');
const context = canvas.getContext('2d');

const players = {};      // id -> Player instance
const collectibles = {}; // id -> Collectible

let myId = null;
const SPEED = 5;
const KEYS = {};

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  Object.values(collectibles).forEach(c => {
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(c.x, c.y, (c.size || 8), 0, Math.PI * 2);
    ctx.fill();
  });

  Object.values(players).forEach(p => {
    if (p.id === myId) ctx.fillStyle = '#00aaff';
    else ctx.fillStyle = '#ff4466';
    ctx.fillRect(p.x - 8, p.y - 8, 16, 16);

    ctx.fillStyle = '#000';
    ctx.font = '12px monospace';
    const allPlayers = Object.values(players).map(x => ({ id: x.id, score: x.score }));
    const rank = new Player({ x:0,y:0,score:p.score, id:p.id }).calculateRank(allPlayers);
    ctx.fillText(`${p.score} ${rank}`, p.x + 10, p.y - 10);
  });
}

function handleInput() {
  if (!myId || !players[myId]) return;

  const me = players[myId];
  let moved = false;

  if (KEYS['ArrowUp'] || KEYS['w'] || KEYS['W']) {
    me.y -= SPEED; moved = true;
  }
  if (KEYS['ArrowDown'] || KEYS['s'] || KEYS['S']) {
    me.y += SPEED; moved = true;
  }
  if (KEYS['ArrowLeft'] || KEYS['a'] || KEYS['A']) {
    me.x -= SPEED; moved = true;
  }
  if (KEYS['ArrowRight'] || KEYS['d'] || KEYS['D']) {
    me.x += SPEED; moved = true;
  }

  if (me.x < 0) me.x = 0;
  if (me.x > canvas.width) me.x = canvas.width;
  if (me.y < 0) me.y = 0;
  if (me.y > canvas.height) me.y = canvas.height;

  if (moved) {
    socket.emit('move', { x: me.x, y: me.y });
  }
}

window.addEventListener('keydown', (e) => { KEYS[e.key] = true; });
window.addEventListener('keyup', (e) => { KEYS[e.key] = false; });

socket.on('connect', () => {});

socket.on('init', (data) => {
  myId = data.you;

  Object.keys(data.players).forEach(id => {
    const pd = data.players[id];
    players[id] = new Player({ x: pd.x, y: pd.y, score: pd.score, id: pd.id });
  });

  data.collectibles.forEach(c => {
    collectibles[c.id] = new Collectible(c);
  });
});

socket.on('player-joined', p => {
  players[p.id] = new Player({ x: p.x, y: p.y, score: p.score, id: p.id });
});

socket.on('player-moved', data => {
  const p = players[data.id];
  if (p) {
    p.x = data.x;
    p.y = data.y;
    p.score = data.score;
  } else {
    players[data.id] = new Player({ x: data.x, y: data.y, score: data.score, id: data.id });
  }
});

socket.on('collected', (info) => {
  if (info.collectibleId && collectibles[info.collectibleId]) {
    delete collectibles[info.collectibleId];
  }
  if (info.newCollectible) {
    collectibles[info.newCollectible.id] = new Collectible(info.newCollectible);
  }
  if (info.players) {
    Object.keys(info.players).forEach(id => {
      const pd = info.players[id];
      if (players[id]) players[id].score = pd.score;
    });
  }
});

socket.on('player-left', id => {
  delete players[id];
});

function gameLoop() {
  handleInput();
  draw();
  requestAnimationFrame(gameLoop);
}
gameLoop();
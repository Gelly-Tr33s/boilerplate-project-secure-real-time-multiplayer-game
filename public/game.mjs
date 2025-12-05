console.log("game.mjs LOADED");

const scoreboard = document.getElementById("scoreboard");

import Player from './Player.mjs';
import Collectible from './Collectible.mjs';

document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  const canvas = document.getElementById('game-window');
  const ctx = canvas.getContext('2d');

  // Store players + items from server
  let players = {};
  let collectibles = {};

  // Draw everything
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw players as circles
    for (const id in players) {
        const p = players[id];
        // player body
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = p.color || "blue";
        ctx.fill();

        // name display
        ctx.fillStyle = "black";
        ctx.font = "12px monospace";
        ctx.textAlign = "center";
        ctx.fillText(p.name || id.slice(0,4), p.x, p.y - 15);
    }

    // Draw collectibles as yellow squares
    for (const id in collectibles) {
      const c = collectibles[id];
      ctx.fillStyle = "yellow";
      ctx.fillRect(c.x - 5, c.y - 5, 10, 10);
    }
  }

function updateScoreboard() {
  const you = players[socket.id];
  if (!you) return;

  // Convert object → array
  const list = Object.values(players);

  // Sort by score desc
  list.sort((a, b) => b.score - a.score);
  
  // compute rank
  const rank = list.findIndex(p => p.id === you.id) + 1;
  const total = list.length;

  // Render
  let html = `You: Score ${you.score} — Rank ${rank}/${total}<br><br>`;
  html += "Players:<br>";

  list.forEach((p) => {
    const label = p.id === you.id ? "(You)" : p.name;
    html += `<span style="color:${p.color}; font-weight:bold">${label}</span> — Score: ${p.score}<br>`;
  });

  scoreboard.innerHTML = html;
}

  // Update loop
  function gameLoop() {
    draw();
    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);

  // Handle server updates
  socket.on("state", (data) => {
    players = data.players;
    collectibles = data.collectibles;
    updateScoreboard();
  });

  // Movement input
window.addEventListener("keydown", (e) => {
  const me = players[socket.id];
  if (!me) return;

  let newX = me.x;
  let newY = me.y;

  const speed = 4;

  if (e.key === "w" || e.key === "ArrowUp") newY -= speed;
  if (e.key === "s" || e.key === "ArrowDown") newY += speed;
  if (e.key === "a" || e.key === "ArrowLeft") newX -= speed;
  if (e.key === "d" || e.key === "ArrowRight") newX += speed;

  // send updated position to server
  socket.emit("move", { x: newX, y: newY });
});

});

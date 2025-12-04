require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const expect = require('chai');
const socketio = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');

const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner.js');

const app = express();

// Security measures
app.use(
  helmet({
    noSniff: true,
    xssFilter: true,
    hidePoweredBy: {
      setTo: 'PHP 7.4.3',
    },
  })
);
app.use(helmet.noCache());


app.use('/public', express.static(process.cwd() + '/public'));
app.use('/assets', express.static(process.cwd() + '/assets'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));



//For FCC testing purposes and enables user to connect from outside the hosting platform
app.use(cors({origin: '*'})); 

// Index page (static HTML)
app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  }); 

//For FCC testing purposes
fccTestingRoutes(app);
    
// 404 Not Found Middleware
app.use(function(req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

const portNum = process.env.PORT || 3000;

// Set up server and tests
const server = app.listen(portNum, () => {
  console.log(`Listening on port ${portNum}`);
  if (process.env.NODE_ENV==='test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch (error) {
        console.log('Tests are not valid:');
        console.error(error);
      }
    }, 1500);
  }
});


// --- Socket.IO game server ---
// minimal, secure-ish implementation used for testing
const io = socketio(server, {
  // allow same-origin connections only in production; tests use cors above
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Simple in-memory game state
const players = {};      // socketId -> { id, x, y, score }
const collectibles = {}; // id -> { id, x, y, value }

let nextCollectibleId = 1;

// create initial collectible
function spawnCollectible() {
  const id = (nextCollectibleId++).toString();
  const item = {
    id,
    x: Math.floor(Math.random() * 600) + 20,
    y: Math.floor(Math.random() * 400) + 20,
    value: 1
  };
  collectibles[id] = item;
  return item;
}
spawnCollectible();

io.on('connection', socket => {
  // Add player
  const startX = Math.floor(Math.random() * 600) + 20;
  const startY = Math.floor(Math.random() * 400) + 20;
  players[socket.id] = {
    id: socket.id,
    x: startX,
    y: startY,
    score: 0
  };

  // send initial state
  socket.emit('init', {
    you: socket.id,
    players,
    collectibles: Object.values(collectibles)
  });

  // broadcast new player to others
  socket.broadcast.emit('player-joined', players[socket.id]);

  // handle movement update from client
  socket.on('move', data => {
    // data: { dir: 'up'|'down'|'left'|'right', speed: number, x, y }
    const p = players[socket.id];
    if (!p) return;
    // accept authoritative position if provided (small games)
    if (typeof data.x === 'number') p.x = data.x;
    if (typeof data.y === 'number') p.y = data.y;

    // collision detection server-side (simple AABB)
    for (const id in collectibles) {
      const c = collectibles[id];
      const dx = Math.abs(p.x - c.x);
      const dy = Math.abs(p.y - c.y);
      const collisionThreshold = 20; // pixel threshold for pickup
      if (dx <= collisionThreshold && dy <= collisionThreshold) {
        // pickup
        p.score += c.value;
        delete collectibles[id];
        // spawn new collectible and broadcast
        const newC = spawnCollectible();
        io.emit('collected', { playerId: p.id, collectibleId: id, newCollectible: newC, players });
        return;
      }
    }

    // broadcast position change
    io.emit('player-moved', { id: p.id, x: p.x, y: p.y, score: p.score });
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('player-left', socket.id);
  });
});



module.exports = app; // For testing

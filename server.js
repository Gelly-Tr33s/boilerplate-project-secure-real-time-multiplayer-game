require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const expect = require('chai');
const socketio = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');

const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner.js');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

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
    

// Basic in-memory game state 
const players = {};      // socketId => { id, x, y, score }
const collectibles = {}; // id => { id, x, y, value, size }

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function makeCollectible() {
  const id = 'c_' + Math.random().toString(36).slice(2,9);
  const item = {
    id,
    x: randInt(20, 580),
    y: randInt(20, 380),
    value: 1,
    size: 8
  };
  collectibles[id] = item;
  return item;
}

// Ensure a few collectibles exist
for (let i = 0; i < 6; i++) makeCollectible();

// Socket.io logic
io.on('connection', (socket) => {
  // create a player object
  const p = {
    id: socket.id,
    x: randInt(40, 520),
    y: randInt(40, 320),
    score: 0
  };
  players[socket.id] = p;

  // send initial state to new client
  socket.emit('init', {
    you: socket.id,
    players,
    collectibles: Object.values(collectibles)
  });

  // announce new player to others
  socket.broadcast.emit('player-joined', p);

  // handle move messages
  socket.on('move', (data) => {
    const player = players[socket.id];
    if (!player) return;

    // Accept client position update
    player.x = data.x;
    player.y = data.y;

    // collision detection with collectibles (circle vs point)
    let collidedId = null;
    for (const cid in collectibles) {
      const c = collectibles[cid];
      const dx = player.x - c.x;
      const dy = player.y - c.y;
      const dist2 = dx*dx + dy*dy;
      const thresh = (c.size + 8) * (c.size + 8); // player half-size ~8
      if (dist2 <= thresh) {
        collidedId = cid;
        break;
      }
    }

    if (collidedId) {
      const removed = collectibles[collidedId];
      delete collectibles[collidedId];

      // award score
      player.score += removed.value;

      // create replacement collectible
      const newC = makeCollectible();

      // broadcast collected event
      io.emit('collected', {
        collectibleId: collidedId,
        newCollectible: newC,
        players
      });
    }

    // broadcast movement (including updated score if changed)
    io.emit('player-moved', { id: player.id, x: player.x, y: player.y, score: player.score });
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('player-left', socket.id);
  });
});


// 404 Not Found Middleware
app.use(function(req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

// Start the server and tests
const portNum = process.env.PORT || 3000;
server.listen(portNum, () => {
  console.log(`Listening on port ${portNum}`);
  if (process.env.NODE_ENV === 'test') {
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

module.exports = app; // For testing

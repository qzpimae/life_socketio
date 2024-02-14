const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  pingTimeout: 5000, // milliseconds
  pingInterval: 10000 // milliseconds
});

const cellSize = 5;
const canvasHeight = 600;
const canvasWidth = 400;
const numRows = Math.floor(canvasHeight / cellSize);
const numCols = Math.floor(canvasWidth / cellSize);

let usersConnected = 0;
let frameCount = 0;
const gameMods = {
  clear: true
}
let globalGameState = initializeGameState();

app.use(express.static('public'));

app.get('/check', (req, res) => {
  res.json({
    connections: usersConnected
  });
});

io.on('connection', (socket) => {
  usersConnected++;
  console.log('[c] users: ' + usersConnected);

  socket.on('disconnect', () => {
    usersConnected--;
    console.log('[d] users: ' + usersConnected);
  });
});

function initializeGame() {
  console.log("Starting game");
  setInterval(() => {
    frameCount++;
    console.log(frameCount);

    globalGameState = calculateNextGameState();
    
    if (frameCount % 8 == 0 )io.emit('updateGameState', globalGameState);
    if (frameCount % 50 == 0) gameMods.clear = !gameMods.clear
    if (frameCount % 10000 == 0) globalGameState = initializeGameState()
    
  }, 100); // Adjust the interval as needed
}

function initializeGameState() {
  frameCount = 0;
  const state = [];
  for (let i = 0; i < numRows; i++) {
    const row = [];
    for (let j = 0; j < numCols; j++) {
      row.push({ alive: Math.round(Math.random() - .3), age: 0 });
    }
    state.push(row);
  }
  return {
    frame: 0,
    users: usersConnected,
    state: state,
    mods: gameMods,
  };
}

function countNeighbors(x, y) {
  let count = 0;
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      if (i === 0 && j === 0) continue; // Skip the current cell
      const row = (x + i + numRows) % numRows; // Handle edge wrapping
      const col = (y + j + numCols) % numCols; // Handle edge wrapping
      count += globalGameState.state[row][col].alive;
    }
  }
  return count;
}

function calculateNextGameState() {
  const nextGameState = [];
  for (let i = 0; i < numRows; i++) {
    const newRow = [];
    for (let j = 0; j < numCols; j++) {
      const neighbors = countNeighbors(i, j);
      const currentCell = globalGameState.state[i][j];
      if (currentCell.alive) {
        newRow.push({ alive: neighbors === 2 || neighbors === 3 ? 1 : 0, age: neighbors === 2 || neighbors === 3 ? currentCell.age + 1 : 0 });
      } else {
        newRow.push({ alive: neighbors === 3 ? 1 : 0, age: neighbors === 3 ? 1 : 0 });
      }
    }
    nextGameState.push(newRow);
  }
  return {
    users: usersConnected,
    frame: frameCount,
    state: nextGameState,
    mods: gameMods
  };
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}\nhttp://localhost:${PORT}\n\n`);
  initializeGame();
});

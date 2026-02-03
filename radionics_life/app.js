const fs = require('fs');
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
const gameMods = {
  clear: true
}
let globalGameState = initializeGameState();

console.log(globalGameState);

app.use(express.static('public'));

app.get('/check', (req, res) => {
  res.json({
    connections: usersConnected
  });
});

io.on('connection', (socket) => {
  usersConnected++;
  // console.log('[c] users: ' + usersConnected);


  socket.on('mysteryMod', () => {
    // console.log("incoming");
    userUpdateGame();
  })

  socket.on('disconnect', () => {
    usersConnected--;
    // console.log('[d] users: ' + usersConnected);
  });
});

function userUpdateGame () {
	console.log("\n\na user planted some seeds\n\n")
  for (let i = 0; i < 10; i++) {
    const ranRow = Math.floor(Math.random() * numRows);
    const ranCol = Math.floor(Math.random() * numCols);
    globalGameState.state[ranRow][ranCol].alive = true;
  } 
}

function gameLoop() {
  console.log("Starting game");
  setInterval(() => {
    
    globalGameState = calculateNextGameState();
    const currentFrame = globalGameState.frame
    const currentBorn = globalGameState.born
    const currentDied = globalGameState.died
    //MAIN LOOP LOG//////////////////////////////////////////////////////
    console.log("gqz - cellular automata - plant/ed - users connected: " + usersConnected + " - Generation: " + currentFrame + " - Born: " + currentBorn + " - Died: " + currentDied);

   
    if (currentFrame % 8 == 0 ) {
      //**update state.json
      writeGameStateToFile();
      //send game state to connected users
      io.emit('updateGameState', globalGameState);
    }
    if (currentFrame % 50 == 0) gameMods.clear = !gameMods.clear

  }, 100); // Adjust the interval as needed
}


function writeGameStateToFile () {
  fs.writeFileSync('./state.json', JSON.stringify(globalGameState, null, 2));
} 


function createInitialGameState () {
  const state = [];
  for (let i = 0; i < numRows; i++) {
    const row = [];
    for (let j = 0; j < numCols; j++) {
      row.push({ 
        alive: 0,//Math.round(Math.random() - .3) 
        age: 0 
      });
    }
    state.push(row);
  }
  return {
    frame: 0,
    users: usersConnected,
    mods: gameMods,
    born: 0, 
    died: 0,
    state: state,
  };
}

function initializeGameState() {

  try {
      const gameStateFromFile = fs.readFileSync('./state.json', 'utf8');
      const fileGameState = JSON.parse(gameStateFromFile);
      return fileGameState;

  } catch (err) {
      if (err.code === 'ENOENT') {
          console.log(`Game state not yet initialized, creating 'state.json' in the root directory`);
          //if game state has not been initialized
          return createInitialGameState();
      } else {
          console.log(`Game not properly initialized`);
          console.error(`Error reading from state.json:`, err);
      }
  }

}

function countNeighbors(x, y) {
  let count = 0;
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      if (i === 0 && j === 0) continue; // skip the current cell that is having its neighbors counted
      // handle edge wrapping for left/right boundary
      const row = (x + i + numRows) % numRows; 
      // handle edge wrapping for top/bottom boundary
      const col = (y + j + numCols) % numCols; 
      // if the cell being looked at is alive add one to the count
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

        const hasCellDied = !(neighbors === 2 || neighbors === 3);
        const newAge = !hasCellDied ? currentCell.age + 1 : 0 

        if (hasCellDied) globalGameState.died++
	
        newRow.push({ 
          alive: hasCellDied ? 1 : 0, 
          age: newAge
        });
        

      } else {
        
        const cellRevived = neighbors === 3

        if (cellRevived) globalGameState.born++;

        newRow.push({ 
          alive: cellRevived ? 1 : 0, 
          age: cellRevived ? 1 : 0 
        });
      }
    }
    nextGameState.push(newRow);
  }
  return {
    users: usersConnected,
    frame: globalGameState.frame+1,
    mods: gameMods,
    born: globalGameState.born,
    died: globalGameState.died,
    state: nextGameState,
  };
}

const PORT = process.env.PORT || 3333;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}\nhttp://localhost:${PORT}\n\n`);
  gameLoop();
});

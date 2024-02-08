    console.log("test");
    const socket = io();

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const cellSize = 4;
    const numRows = Math.floor(canvas.height / cellSize);
    const numCols = Math.floor(canvas.width / cellSize);

    let gameState = initializeGameState();
    let intervalId;
    let isMouseDown = false;
    let cellsToAdd = [];

    function initializeGameState() {
      const state = [];
      for (let i = 0; i < numRows; i++) {
        const row = [];
        for (let j = 0; j < numCols; j++) {
          row.push({ alive: 0, age: 0 });
        }
        state.push(row);
      }
      return {
        frame: 0,
        state: state
      };
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numCols; j++) {
          const cell = gameState.state[i][j];
          const color = cell.alive ? `hsl(0, 50%, ${((100 - cell.age * 12.75)%50)+50}%)` : `hsl(130, 50%, 30%)`;;
          ctx.fillStyle = color;
          ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
        }
      }
      document.getElementById('frameCount').innerText = `Frame: ${gameState.frame}`;
    }

    function drawPreview() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        draw(); // Draw the current state first
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Semi-transparent black for preview cells
        for (const cell of cellsToAdd) {
            ctx.fillRect(cell.x * cellSize, cell.y * cellSize, cellSize, cellSize);
        }
        }


    function updateGameState(newGameState) {
      gameState = newGameState;
      draw();
    }

    function countNeighbors(x, y) {
      let count = 0;
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          if (i === 0 && j === 0) continue; // Skip the current cell
          const row = (x + i + numRows) % numRows; // Handle edge wrapping
          const col = (y + j + numCols) % numCols; // Handle edge wrapping
          count += gameState.state[row][col].alive;
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
          const currentCell = gameState.state[i][j];
          if (currentCell.alive) {
            newRow.push({ alive: neighbors === 2 || neighbors === 3 ? 1 : 0, age: neighbors === 2 || neighbors === 3 ? currentCell.age + 1 : 0 });
          } else {
            newRow.push({ alive: neighbors === 3 ? 1 : 0, age: neighbors === 3 ? 1 : 0 });
          }
        }
        nextGameState.push(newRow);
      }
      return {
        frame: gameState.frame + 1,
        state: nextGameState
      };
    }

    canvas.addEventListener('mousedown', (event) => {
      isMouseDown = true;
      const x = Math.floor(event.offsetX / cellSize);
      const y = Math.floor(event.offsetY / cellSize);
      cellsToAdd.push({ x, y });
      drawPreview()
    });

    canvas.addEventListener('mousemove', (event) => {
      if (isMouseDown) {
        const x = Math.floor(event.offsetX / cellSize);
        const y = Math.floor(event.offsetY / cellSize);
        if (!cellsToAdd.some(cell => cell.x === x && cell.y === y)) { // Avoid adding duplicate cells
          cellsToAdd.push({ x, y });
          drawPreview()
        }
      }
    });

    canvas.addEventListener('mouseup', () => {
      isMouseDown = false;
      for (const cell of cellsToAdd) {
        gameState.state[cell.y][cell.x] = { alive: 1, age: 1 };
      }
      cellsToAdd = [];
      updateGameState(gameState);
      socket.emit('updateGameState', gameState);
    });

    socket.on('updateGameState', (newGameState) => {
      updateGameState(newGameState);
    });

    document.getElementById('startButton').addEventListener('click', () => {
      intervalId = setInterval(() => {
        gameState = calculateNextGameState();
        updateGameState(gameState);
        socket.emit('updateGameState', gameState); // Broadcast the new game state to all connected clients
      }, 100); // Adjust the interval as needed
    });

    document.getElementById('pauseButton').addEventListener('click', () => {
      clearInterval(intervalId);
    });

    document.getElementById('stepButton').addEventListener('click', () => {
      gameState = calculateNextGameState();
      updateGameState(gameState);
      socket.emit('updateGameState', gameState); // Broadcast the new game state to all connected clients
    });
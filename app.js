const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the "public" directory
app.use(express.static('public'));

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A user connected');

  // Handle updates to the game state
  socket.on('updateGameState', (newGameState) => {
    io.emit('updateGameState', newGameState); // Broadcast the new game state to all connected clients
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}\nhttp://localhost:3000\n\n`);
});

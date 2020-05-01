const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const port = process.env.PORT || 5000;
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.resolve(__dirname, 'client', 'build')));
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
});

const users = {};

io.on('connection', (socket) => {
  if (!users[socket.id]) {
    users[socket.id] = socket.id;
  }

  socket.emit('yourID', socket.id);
  io.sockets.emit('allUsers', users);

  socket.on('disconnect', () => {
    delete users[socket.id];
    console.log('Client disconnected');
  });

  socket.on('callUser', (data) => {
    io.to(data.userToCall).emit('hey', {
      signal: data.signalData,
      from: data.from
    });
  });

  socket.on('acceptCall', (data) => {
    io.to(data.to).emit('callAccepted', data.signal);
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));

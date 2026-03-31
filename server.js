const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const app = require('./app');
const { initChatSocket } = require('./socket/chatSocket');

dotenv.config({ path: './config.env' });

// -------------------- Connect to Remote Hosted DataBase ---------------------- //
const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

mongoose.connect(DB, {
  useNewUrlParser: true,
}).then(() => console.log('Remote database connection successfull!')).catch(err => {
  console.log("ERROR: " + err);
});

// mongoose.connect(process.env.DATABASE_LOCAL, {
// }).then(() => console.log('Local database connection successfull!')).catch(err => {
//     console.log("ERROR: " + err);
// });

// Create HTTP server and attach Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});
initChatSocket(io);

const port = process.env.PORT || '3000';
server.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const app = require('./app');
const { initChatSocket } = require('./socket/chatSocket');
const { startAutoRelease } = require('./services/autoReleaseService');
const releasePaymentService = require('./services/releasePaymentService');
dotenv.config({ path: './config.env' });

// -------------------- Connect to Remote Hosted DataBase ---------------------- //
const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

mongoose.connect(DB, {
  // useNewUrlParser: true,
}).then(() => console.log('Remote database connection successfull!')).catch(err => {
  console.log("ERROR: " + err);
});

// mongoose.connect(process.env.DATABASE_LOCAL, {
// }).then(async () => {
//   console.log('Local database connection successfull!');
//   // Drop any stale unique index on chatrooms.participants — a unique index on
//   // an array field prevents users from being in more than one chat room
//   try {
//     await mongoose.connection.collection('chatrooms').dropIndex('participants_1');
//     console.log('[startup] Dropped stale participants_1 index from chatrooms');
//   } catch (_) {
//     // Index doesn't exist or is already non-unique — safe to ignore
//   }
// }).catch(err => {
//   console.log("ERROR: " + err);
// });

// Create HTTP server and attach Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

initChatSocket(io);
app.set('io', io);
releasePaymentService.setIo(io);

const port = process.env.PORT || '3000';
server.listen(port, () => {
  console.log(`App running on port ${port}...`);
  startAutoRelease();
});

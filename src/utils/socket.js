const socket = require('socket.io');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const { Chat } = require('../models/chat');
const { Follow } = require('../models/follow');
const { User } = require('../models/user');

const authenticateSocket = async (socket) => {
  const cookieHeader = socket.handshake.headers.cookie;
  if (!cookieHeader) {
    throw new Error('Missing auth token');
  }
  const { token } = cookie.parse(cookieHeader);
  if (!token) {
    throw new Error('Missing auth token');
  }
  const { _id } = jwt.verify(token, process.env.JWT_SECRET_TOKEN);
  const user = await User.findById(_id);
  if (!user) {
    throw new Error('User does not Exist');
  }
  return user;
};

const areMutualFollowers = async (userId, targetId) => {
  const [followsTarget, followedByTarget] = await Promise.all([
    Follow.findOne({ followerId: userId, followingId: targetId }),
    Follow.findOne({ followerId: targetId, followingId: userId }),
  ]);
  return Boolean(followsTarget && followedByTarget);
};

const initializeSocket = (server, allowedOrigins) => {
  const io = socket(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const user = await authenticateSocket(socket);
      socket.userId = user._id.toString();
      socket.firstName = user.firstName;
      next();
    } catch (err) {
      next(new Error('Authentication Failed'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('joinChat', async ({ targetId }) => {
      try {
        if (!(await areMutualFollowers(socket.userId, targetId))) {
          throw new Error('Users have no connections between them');
        }
        const roomId = [socket.userId, targetId].sort().join('_');
        socket.join(roomId);
      } catch (err) {
        console.log(err);
      }
    });
    socket.on('sendMessage', async ({ targetId, message, timeStamp }) => {
      const userId = socket.userId;
      const roomId = [userId, targetId].sort().join('_');
      const text = message;
      try {
        if (!text || text.length > 280) {
          throw new Error('Message is empty or exceeds 280 characters');
        }
        if (!(await areMutualFollowers(userId, targetId))) {
          throw new Error('Users have no connections between them');
        }
        let chat = await Chat.findOne({
          participants: { $all: [userId, targetId] },
        });
        if (!chat) {
          // create a chat
          chat = await Chat.create({
            participants: [userId, targetId],
            messages: [],
          });
        }
        chat.messages.push({ text, senderId: userId });
        await chat.save();
        io.to(roomId).emit('receivedMessage', {
          senderId: { _id: userId, firstName: socket.firstName },
          text: message,
          createdAt: timeStamp,
        });
      } catch (err) {
        console.log(err);
      }
    });
    socket.on('disconnect', () => {});
  });
};

module.exports = initializeSocket;

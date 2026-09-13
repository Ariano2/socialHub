const express = require('express');
const app = express();
const http = require('http');
const { connectDB } = require('./config/database');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
require('dotenv').config();
const initializeSocket = require('./utils/socket');

const cookieParser = require('cookie-parser');

const allowedOrigins = ['http://localhost:5173', process.env.CLIENT_URL].filter(Boolean);

// Behind nginx, every request's socket address is 127.0.0.1. Trust exactly
// one proxy hop so req.ip is the real client (from X-Forwarded-For). Not
// `true`: that trusts the whole header chain, which a client can forge.
app.set('trust proxy', 1);

app.use(
  helmet({
    // The API is called cross-site from the Netlify frontend.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

const { authRouter } = require('./routers/authRouter');
const { profileRouter } = require('./routers/profileRouter');
const { followRouter } = require('./routers/followRouter');
const { userRouter } = require('./routers/userRouter');
const { chatRouter } = require('./routers/chatRouter');
const { postRouter } = require('./routers/postRouter');
const { commentRouter } = require('./routers/commentRouter');

app.use(authRouter);
app.use(profileRouter);
app.use(followRouter);
app.use(userRouter);
app.use(chatRouter);
app.use(postRouter);
app.use(commentRouter);

app.use((req, res) => {
  res.status(404).send('Error : Route not Found');
});

// Only reached by errors routes don't catch themselves: malformed JSON,
// oversized bodies, or a sync throw. Without this, Express answers with an
// HTML page (including a stack trace unless NODE_ENV=production).
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).send('Error : Request body is not valid JSON');
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).send('Error : Request body is too large');
  }
  console.error(err);
  res.status(err.status || 500).send('Error : Something went wrong');
});

const server = http.createServer(app);
initializeSocket(server, allowedOrigins);

const PORT = process.env.PORT || 7777;

connectDB()
  .then(() => {
    console.log('Connected to DB');
    server.listen(PORT, () => {
      console.log(`Server Running at Port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Error Connection to DB could not be Established!');
  });

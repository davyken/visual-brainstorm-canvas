import createError from 'http-errors';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import connectDB from './src/config/db.js';
import './src/schemas/index.js'; // Initialize all database schemas
import cors from 'cors';

// Import your routers
import canvasRoutes from './src/routes/canvasRoutes.js';
import roomsRouter from './src/routes/rooms.js';
import usersRouter from './src/routes/users.js';
import chatRouter from './src/routes/chat.js';

// Connect to the database
connectDB();

// ES6 equivalent of __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// app.use(
//   cors({
//     origin: true, // allow all origins
//     credentials: true, // allow cookies if using session auth
//   })
// );

const allowedOrigins = ['http://192.168.1.122:3000', 'http://localhost:3002', 'http://localhost:3001'];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },

    credentials: true,
  })
);
app.options('*', 
  cors());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Use your routers for specific API endpoints
// app.use('/api/canvases', canvasRoutes);
app.use('/api/rooms', roomsRouter);
app.use('/users', usersRouter);
// app.use('/canvas', canvasRouter);
app.use('/chat', chatRouter);


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler - return JSON instead of rendering views
app.use(function (err, req, res, next) {

  const isDevelopment = req.app.get('env') === 'development';
  

  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: isDevelopment ? err : {},
    status: err.status || 500
  });
});

export default app; // Export the Express app
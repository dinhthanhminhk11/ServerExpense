import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import fs from 'fs';
import morgan from 'morgan';
import dotenv from 'dotenv';
import socket from 'socket.io';
const addon = require('../build/Release/addon');
dotenv.config();
const app = express();

const routerFiles = fs.readdirSync('./src/routes');
const PORT = process.env.PORT || 3001;
const key = process.env.KEY_128
const iv = process.env.IV_128
const path = require('path');
// middlewares
app.use(morgan('tiny'));
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static('uploads'));
app.use('/audio', express.static(path.resolve(__dirname, '..', 'audio')));
// using router
routerFiles.forEach((file) => {
  app.use('/api', require(`./routes/${file}`).default);
});

const server = app.listen(PORT, () => {
  console.info(`Server listening on port ${PORT}`);
  addon.init(key, iv)
});

mongoose.set('strictQuery', true);
// connect database
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    family: 4
  })
  .then(() => {
    console.info('Connect database successfully');
  })
  .catch((error) => {
    console.info(error);
  });

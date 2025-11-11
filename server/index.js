import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3001;
const VEO_API_BASE = 'https://aisandbox-pa.googleapis.com/v1';

// ===============================
// 📝 LOGGER
// ===============================
const log = (level, req, ...messages) => {
  const timestamp = new Date().toLocaleString('sv-SE', {
    timeZone: 'Asia/Kuala_Lumpur',
  });
  const username = req ? (req.headers['x-user-username'] || 'anonymous') : 'SYSTEM';
  const prefix = `[${timestamp}] [${username}]`;

  // Stringify objects for better readability
  const processedMessages = messages.map(msg => {
    if (typeof msg === 'object' && msg !== null) {
      try
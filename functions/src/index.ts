import { initializeApp } from 'firebase-admin/app';
import { onRequest } from 'firebase-functions/v2/https';
import app from './app';

initializeApp();

export const api = onRequest(
  {
    cors: true,
    region: 'us-central1',
    // Secrets are read from process.env at runtime.
    // For deployed functions: firebase functions:secrets:set PLAID_CLIENT_ID / PLAID_SECRET
    // For local emulator: set values in functions/.env
  },
  app
);

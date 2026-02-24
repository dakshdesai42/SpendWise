import express from 'express';
import cors from 'cors';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { plaidRouter } from './routes/plaid';

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());
app.use(authMiddleware);
app.use('/plaid', plaidRouter);
app.use(errorHandler);

export default app;

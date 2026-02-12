
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

app.get('/hello', (req, res) => {
    res.send('Hello from Fabric Muse Backend!');
});

export default app;

import express from 'express';
import { PORT } from './config/env.js';
import connectToDatabase from './database/mongodb.js';

const app = express();

app.get('/', (req, res) => {
    res.send('Welecome to TaskPluse API!');
});

app.listen(PORT, () => {
    console.log(`Task Pluse API is running on http://localhost:${PORT}`);
    connectToDatabase();
});

export default app;
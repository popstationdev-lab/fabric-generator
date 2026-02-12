
import { Router } from 'express';
import axios from 'axios';
import sessionRoutes from './sessionRoutes';

const router = Router();

router.use('/session', sessionRoutes);


router.get('/proxy-image', async (req, res) => {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
        res.status(400).send('URL is required');
        return;
    }

    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });

        // Forward content-type header
        if (response.headers['content-type']) {
            res.setHeader('Content-Type', response.headers['content-type']);
        }

        response.data.pipe(res);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).send('Error fetching image');
    }
});

export default router;


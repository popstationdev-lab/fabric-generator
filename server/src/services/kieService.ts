
import axios from 'axios';

const KIE_API_BASE_URL = 'https://api.kie.ai/api/v1/jobs';
const KIE_API_KEY = process.env.KIE_AI_API_KEY;

export const generateImage = async (prompt: string, referenceImageUrl: string, ...additionalImageUrls: (string | undefined)[]) => {
    if (!KIE_API_KEY) throw new Error('KIE_AI_API_KEY is not configured');

    const imageInputs = [referenceImageUrl];
    additionalImageUrls.forEach(url => {
        if (url) imageInputs.push(url);
    });

    try {
        const response = await axios.post(
            `${KIE_API_BASE_URL}/createTask`,
            {
                model: 'nano-banana-pro',
                input: {
                    prompt,
                    image_input: imageInputs,
                    aspect_ratio: '3:4', // Portrait
                    resolution: '1K',
                    output_format: 'png'
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${KIE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        // Based on docs: response.data.data.taskId
        if (response.data.code !== 200) {
            throw new Error(`KIE API Error: ${response.data.msg}`);
        }

        return response.data.data;
    } catch (error) {
        console.error('Error creating KIE task:', error);
        throw error;
    }
};

export const getJobStatus = async (taskId: string) => {
    if (!KIE_API_KEY) throw new Error('KIE_AI_API_KEY is not configured');

    try {
        const response = await axios.get(
            `${KIE_API_BASE_URL}/recordInfo`,
            {
                params: { taskId },
                headers: {
                    'Authorization': `Bearer ${KIE_API_KEY}`,
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error('Error fetching KIE job status:', error);
        throw error;
    }
};

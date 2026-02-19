
import axios from 'axios';
import { generateImage } from './services/kieService';

// Mock axios post
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('kieService model switch', () => {
    it('should call createTask with new model and parameters', async () => {
        process.env.KIE_AI_API_KEY = 'test_key';

        mockedAxios.post.mockResolvedValue({
            data: {
                code: 200,
                msg: 'success',
                data: { taskId: 'test_task_id' }
            }
        });

        const prompt = 'test prompt';
        const referenceImageUrl = 'http://example.com/image1.png';

        await generateImage(prompt, referenceImageUrl);

        expect(mockedAxios.post).toHaveBeenCalledWith(
            expect.stringContaining('/createTask'),
            expect.objectContaining({
                model: 'google/nano-banana-edit',
                input: expect.objectContaining({
                    prompt: expect.stringContaining(prompt),
                    image_urls: expect.arrayContaining([referenceImageUrl]),
                    image_size: '3:4'
                })
            }),
            expect.any(Object)
        );
    });
});

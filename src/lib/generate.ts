import axios from "axios";
import { POSE_INSTRUCTIONS } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

export async function generateImages(
  file: File,
  prompt: string,
  onImageReady: (index: number, url: string) => void
): Promise<string[]> {

  // 1. Upload Swatch
  const formData = new FormData();
  formData.append('swatch', file);

  const uploadRes = await axios.post(`${API_BASE_URL}/session/upload`, formData);

  if (!uploadRes.data.ok) {
    throw new Error('Failed to upload swatch');
  }

  const { sessionId } = uploadRes.data;

  // 2. Start Generation
  const generateRes = await axios.post(`${API_BASE_URL}/session/generate`, {
    sessionId,
    prompt,
    options: {}, // Options can be passed if needed
  });

  if (!generateRes.data.ok) {
    throw new Error('Failed to start generation');
  }

  const { jobId } = generateRes.data;

  // 3. Poll for Status
  return new Promise((resolve, reject) => {
    const pollInterval = setInterval(async () => {
      try {
        const statusRes = await axios.get(`${API_BASE_URL}/session/job/${jobId}/status`);
        const statusData = await statusRes.data;

        if (statusData.status === 'COMPLETED') {
          clearInterval(pollInterval);
          // Assuming images are returned in order, or we map them
          // The backend returns { id, url, seed, ... }
          const imageUrls = statusData.images.map((img: any) => img.url);

          // Notify callback for each image
          imageUrls.forEach((url: string, index: number) => {
            onImageReady(index, url);
          });

          resolve(imageUrls);
        } else if (statusData.status === 'FAILED') {
          clearInterval(pollInterval);
          reject(new Error(statusData.error || 'Generation failed'));
        }
      } catch (error) {
        clearInterval(pollInterval);
        reject(error);
      }
    }, 2000); // Poll every 2 seconds
  });
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

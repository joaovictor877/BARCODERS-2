import faceapi from 'face-api.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to use canvas if available (local), otherwise face-api will use built-in
let canvas;
try {
    canvas = await import('canvas');
    const { Canvas, Image, ImageData } = canvas.default;
    faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
    console.log('Canvas nativo carregado com sucesso');
} catch (err) {
    console.warn('Canvas não disponível, usando implementação face-api.js', err.message);
}

const MODEL_URL = path.join(__dirname, '../models');
let modelsLoaded = false;

export async function loadModels() {
    if (modelsLoaded) return;
    try {
        console.log('Carregando modelos de reconhecimento facial...');
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_URL);
        modelsLoaded = true;
        console.log('Modelos carregados com sucesso!');
    } catch (err) {
        console.error('Erro ao carregar modelos:', err);
        throw err;
    }
}

export async function recognizeFace(imageBuffer, storedDescriptorJson) {
    if (!modelsLoaded) await loadModels();

    try {
        // Load image from buffer - use canvas if available, otherwise use fetch
        let img;
        if (canvas) {
            const { loadImage } = canvas.default;
            img = await loadImage(imageBuffer);
        } else {
            // Convert buffer to base64 data URL for face-api
            const base64 = imageBuffer.toString('base64');
            const dataUrl = `data:image/jpeg;base64,${base64}`;
            
            // Use fetch API to load image (works in Node.js 18+)
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            img = await faceapi.bufferToImage(blob);
        }

        // Detect face
        const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

        if (!detection) {
            return { match: false, message: 'Nenhuma face detectada na imagem.' };
        }

        const capturedDescriptor = detection.descriptor;
        const storedDescriptor = new Float32Array(JSON.parse(storedDescriptorJson));

        const distance = faceapi.euclideanDistance(capturedDescriptor, storedDescriptor);
        const THRESHOLD = 0.45; // Same as frontend

        console.log(`Distância calculada: ${distance.toFixed(4)}`);

        if (distance < THRESHOLD) {
            return { match: true, distance };
        } else {
            return { match: false, message: `Rosto não reconhecido (distância: ${distance.toFixed(2)})`, distance };
        }

    } catch (err) {
        console.error('Erro no reconhecimento facial:', err);
        throw new Error('Erro interno no reconhecimento facial.');
    }
}

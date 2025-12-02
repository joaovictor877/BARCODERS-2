import faceapi from 'face-api.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Função simplificada que apenas compara descritores
// O reconhecimento facial acontece no frontend
export async function compareFaceDescriptors(capturedDescriptorArray, storedDescriptorJson) {
    try {
        const capturedDescriptor = new Float32Array(capturedDescriptorArray);
        const storedDescriptor = new Float32Array(JSON.parse(storedDescriptorJson));

        const distance = faceapi.euclideanDistance(capturedDescriptor, storedDescriptor);
        const THRESHOLD = 0.45;

        console.log(`Distância calculada: ${distance.toFixed(4)}`);

        if (distance < THRESHOLD) {
            return { match: true, distance };
        } else {
            return { match: false, message: `Rosto não reconhecido (distância: ${distance.toFixed(2)})`, distance };
        }

    } catch (err) {
        console.error('Erro na comparação de descritores:', err);
        throw new Error('Erro interno na comparação facial.');
    }
}

// Mantém compatibilidade com código antigo (deprecated)
export async function loadModels() {
    console.warn('loadModels() deprecated - reconhecimento facial agora acontece no frontend');
}

export async function recognizeFace(imageBuffer, storedDescriptorJson) {
    throw new Error('recognizeFace() deprecated - use compareFaceDescriptors() no frontend');
}
    }
}

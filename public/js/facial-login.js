// js/facial-login.js (atualizado)

const MODEL_URL = '/models';
const THRESHOLD = 0.45;

let video, canvas, displaySize, storedDescriptor = null;

async function loadModels() {
  try {
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    console.log('Modelos face-api.js carregados com sucesso!');
  } catch (err) {
    console.error('Erro ao carregar models:', err);
    showError('Erro ao carregar modelos de IA. Verifique conexão.');
  }
}

async function iniciarLoginFacial() {
  const id = document.getElementById('employeeId').value.trim();
  if (!id || isNaN(id)) {
    showError('Digite um ID de funcionário válido (número).');
    return;
  }

  try {
    // 1. Busca dados do funcionário no backend
    const response = await fetch(`/api/funcionario/${id}`);
    if (!response.ok) {
      const text = await response.text();  // Lê como texto para debug
      console.error('Resposta não-OK:', text);  // Log para ver o HTML
      throw new Error(`Erro no servidor: ${response.status} - ${text.substring(0, 100)}...`);
    }
    const data = await response.json();
    const { funcionario } = data;
    if (!funcionario.Face_Embedding) {
      throw new Error('Funcionário sem foto facial cadastrada. Contate o administrador.');
    }

    // Converte embedding para Float32Array
    storedDescriptor = new Float32Array(JSON.parse(funcionario.Face_Embedding));
    console.log('Embedding facial carregado para ID:', id);

    // 2. Carrega models e setup câmera
    await loadModels();
    setupCamera();

    document.getElementById('cameraSection').classList.remove('hidden');
    document.getElementById('status').textContent = 'Posicione o rosto na moldura e clique "Capturar Rosto".';
    document.getElementById('captureBtn').focus();
  } catch (err) {
    console.error('Erro no login facial:', err);
    showError(err.message);
  }
}

function setupCamera() {
  video = document.getElementById('video');
  canvas = document.getElementById('canvas');

  navigator.mediaDevices.getUserMedia({ 
    video: { 
      width: { ideal: 640 }, 
      height: { ideal: 480 },
      facingMode: 'user'  // Frontal para selfie
    } 
  })
    .then(stream => {
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play();
        // Setup canvas para detecção (overlay opcional)
        displaySize = { width: video.videoWidth, height: video.videoHeight };
        canvas.width = displaySize.width;
        canvas.height = displaySize.height;
        const context = canvas.getContext('2d', { willReadFrequently: true });        context.fillStyle = 'rgba(0,0,0,0.5)';
        context.fillRect(0, 0, canvas.width, canvas.height);  // Overlay semi-transparente
      };
    })
    .catch(err => {
      console.error('Erro ao acessar câmera:', err);
      let msg = 'Erro na câmera: ';
      if (err.name === 'NotAllowedError') msg += 'Permita acesso à câmera nas configurações.';
      else if (err.name === 'NotFoundError') msg += 'Nenhuma câmera encontrada.';
      showError(msg);
    });
}

async function capturarERecognize() {
  if (!storedDescriptor) return showError('Embedding não carregado. Reinicie o login.');

  const context = canvas.getContext('2d', { willReadFrequently: true });  context.drawImage(video, 0, 0, displaySize.width, displaySize.height);

  try {
    // Detecta face e gera descriptor
    const input = await faceapi.detectSingleFace(canvas, new faceapi.SsdMobilenetv1Options())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!input) {
      showError('Nenhuma face detectada. Certifique-se de que o rosto está centralizado e bem iluminado.');
      return;
    }

    const capturedDescriptor = input.descriptor;
    const distance = faceapi.euclideanDistance(capturedDescriptor, storedDescriptor);

    console.log('Distância euclidiana calculada:', distance.toFixed(4));

    if (distance < THRESHOLD) {
      // Match! Envia para backend criar session
      const id = document.getElementById('employeeId').value;
      const loginResponse = await fetch('/api/login-facial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const loginData = await loginResponse.json();
      if (loginResponse.ok) {
        showSuccess(loginData.message);
        setTimeout(() => {
          window.location.href = loginData.redirect;
        }, 2000);
      } else {
        showError(loginData.message);
      }
    } else {
      showError(`Rosto não reconhecido (distância: ${distance.toFixed(2)}). Tente novamente com melhor iluminação ou ângulo.`);
    }
  } catch (err) {
    console.error('Erro na detecção/recognition:', err);
    showError('Erro na análise facial: ' + err.message);
  }
}

function showSuccess(msg) {
  document.getElementById('errorMsg').classList.add('hidden');
  document.getElementById('successMsg').textContent = msg;
  document.getElementById('successMsg').classList.remove('hidden');
  document.getElementById('result').classList.remove('hidden');
  // Para câmera
  if (video && video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
  }
}

function showError(msg) {
  document.getElementById('successMsg').classList.add('hidden');
  document.getElementById('errorMsg').textContent = msg;
  document.getElementById('errorMsg').classList.remove('hidden');
  document.getElementById('result').classList.remove('hidden');
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  const captureBtn = document.getElementById('captureBtn');
  if (captureBtn) captureBtn.addEventListener('click', capturarERecognize);
});
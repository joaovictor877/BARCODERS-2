// js/facial-login.js (Server-Side Recognition)

let video, canvas, displaySize;
let modelsLoaded = false;

// Carrega os modelos do face-api.js
async function loadFaceApiModels() {
  if (modelsLoaded) return;
  
  try {
    console.log('Carregando modelos face-api.js...');
    const MODEL_URL = '/models';
    
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);
    
    modelsLoaded = true;
    console.log('Modelos carregados com sucesso!');
  } catch (err) {
    console.error('Erro ao carregar modelos:', err);
    throw new Error('Falha ao carregar modelos de reconhecimento facial');
  }
}

async function iniciarLoginFacial() {
  const id = document.getElementById('employeeId').value.trim();
  if (!id || isNaN(id)) {
    showError('Digite um ID de funcionário válido (número).');
    return;
  }

  try {
    // Carrega modelos primeiro
    showError('Carregando modelos... Aguarde.');
    await loadFaceApiModels();
    
    // Setup câmera
    setupCamera();

    document.getElementById('cameraSection').classList.remove('hidden');
    document.getElementById('status').textContent = 'Posicione o rosto na moldura e clique "Capturar Rosto".';
    document.getElementById('captureBtn').focus();
    showError(''); // Limpa mensagem
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
        // Não precisamos desenhar overlay aqui, mas mantemos o canvas pronto
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
  const id = document.getElementById('employeeId').value.trim();
  if (!id) return showError('ID do funcionário não encontrado.');

  try {
    showError('Detectando rosto... Aguarde.');

    // Detecta rosto e extrai descriptor
    const detections = await faceapi
      .detectSingleFace(video)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detections) {
      return showError('Nenhum rosto detectado. Posicione-se melhor e tente novamente.');
    }

    // Converte descriptor para array para enviar ao servidor
    const descriptor = Array.from(detections.descriptor);

    showError('Processando... Aguarde.');

    const response = await fetch('/api/login-facial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, descriptor })
    });

    const data = await response.json();

    if (response.ok) {
      showSuccess(data.message);
      setTimeout(() => {
        window.location.href = data.redirect;
      }, 2000);
    } else {
      showError(data.message);
    }
  } catch (err) {
    console.error('Erro na requisição:', err);
    showError('Erro ao processar reconhecimento facial: ' + err.message);
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
  if (msg) {
    document.getElementById('errorMsg').textContent = msg;
    document.getElementById('errorMsg').classList.remove('hidden');
    document.getElementById('result').classList.remove('hidden');
  } else {
    document.getElementById('errorMsg').classList.add('hidden');
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  const captureBtn = document.getElementById('captureBtn');
  if (captureBtn) captureBtn.addEventListener('click', capturarERecognize);
});
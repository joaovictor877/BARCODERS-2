// js/facial-login.js (Server-Side Recognition)

let video, canvas, displaySize;

async function iniciarLoginFacial() {
  const id = document.getElementById('employeeId').value.trim();
  if (!id || isNaN(id)) {
    showError('Digite um ID de funcionário válido (número).');
    return;
  }

  try {
    // 1. Setup câmera
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

  // Captura frame atual para o canvas
  const context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, displaySize.width, displaySize.height);

  // Converte para Base64
  const imageData = canvas.toDataURL('image/jpeg');

  try {
    showError('Processando... Aguarde.'); // Usa msg de erro como status temporário ou cria um novo elemento de status

    const response = await fetch('/api/login-facial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, image: imageData })
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
    showError('Erro ao conectar com o servidor: ' + err.message);
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
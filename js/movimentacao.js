// js/movimentacao.js

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DO FORMULÁRIO ---
    const form = document.getElementById('movimentacaoForm');
    const codigoLoteInput = document.getElementById('codigoLote');
    const maquinaSelect = document.getElementById('maquina');
    const registrarBtn = document.getElementById('registrarBtn');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');

    // --- ELEMENTOS DA CÂMERA ---
    const startCameraBtn = document.getElementById('startCameraBtn');
    const stopCameraBtn = document.getElementById('stopCameraBtn');
    const scannerContainer = document.getElementById('scanner-container');
    const cameraControls = document.getElementById('camera-controls');
    const videoSelect = document.getElementById('videoSource');
    
    // --- LÓGICA DO SCANNER ZXING ---
    let codeReader = null; 

    const hideMessages = () => {
        successMessage.classList.add('hidden');
        errorMessage.classList.add('hidden');
    };

    const startScanner = () => {
        if (!selectedDeviceId) return;
        
        codeReader.decodeFromVideoDevice(selectedDeviceId, 'video-preview', (result, err) => {
            if (result) {
                console.log('Código detectado:', result);
                codigoLoteInput.value = result.getText();
                stopScanner();
                
                // Feedback visual e sonoro
                codigoLoteInput.classList.add('bg-green-100', 'border-green-500');
                setTimeout(() => {
                    codigoLoteInput.classList.remove('bg-green-100', 'border-green-500');
                }, 1000);
                new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU'+Array(300).join('123')).play();
            }
            if (err && !(err instanceof ZXing.NotFoundException)) {
                console.error('Erro de decodificação:', err);
                errorMessage.textContent = `Erro: ${err.message}`;
                errorMessage.classList.remove('hidden');
            }
        });
    };

    const stopScanner = () => {
        if (codeReader) {
            codeReader.reset(); // Libera a câmera
        }
        scannerContainer.classList.add('hidden');
        cameraControls.classList.add('hidden');
        stopCameraBtn.classList.add('hidden');
        startCameraBtn.classList.remove('hidden');
    };

    startCameraBtn.addEventListener('click', () => {
        hideMessages();
        codigoLoteInput.value = ''; // Limpa o campo de texto
        codeReader = new ZXing.BrowserMultiFormatReader(); // Cria uma NOVA instância do leitor
        scannerContainer.classList.remove('hidden');
        cameraControls.classList.remove('hidden');
        startCameraBtn.classList.add('hidden');
        stopCameraBtn.classList.remove('hidden');

        codeReader.listVideoInputDevices()
            .then((videoInputDevices) => {
                if (videoInputDevices.length > 0) {
                    videoSelect.innerHTML = ''; 
                    videoInputDevices.forEach((device) => {
                        const option = document.createElement('option');
                        option.value = device.deviceId;
                        option.text = device.label || `Câmera ${videoSelect.length + 1}`;
                        videoSelect.appendChild(option);
                    });
                    
                    selectedDeviceId = videoInputDevices[0].deviceId;
                    startScanner();
                } else {
                    errorMessage.textContent = 'Nenhuma câmera encontrada.';
                    errorMessage.classList.remove('hidden');
                }
            })
            .catch(err => {
                console.error(err);
                errorMessage.textContent = 'Erro ao acessar a câmera. Verifique as permissões.';
                errorMessage.classList.remove('hidden');
            });
    });

    stopCameraBtn.addEventListener('click', stopScanner);

    videoSelect.addEventListener('change', () => {
        selectedDeviceId = videoSelect.value;
        if (codeReader) {
            codeReader.reset();
        }
        startScanner();
    });

    // --- LÓGICA DO FORMULÁRIO ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideMessages();
        registrarBtn.disabled = true;

        const data = {
            codigoLote: codigoLoteInput.value,
            maquinaId: maquinaSelect.value,
        };

        try {
            const response = await fetch('/api/movimentacao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await response.json();

            if (response.ok) {
                successMessage.textContent = result.message;
                successMessage.classList.remove('hidden');
                codigoLoteInput.value = '';
                codigoLoteInput.focus();
            } else {
                errorMessage.textContent = result.message || 'Ocorreu um erro.';
                errorMessage.classList.remove('hidden');
            }
        } catch (error) {
            errorMessage.textContent = 'Erro de conexão. Tente novamente.';
            errorMessage.classList.remove('hidden');
        } finally {
            registrarBtn.disabled = false;
        }
    });
});
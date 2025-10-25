// js/qualidade.js

window.addEventListener('load', function () {
    // --- SELEÇÃO DOS ELEMENTOS DO DOM ---
    const codigoLoteInput = document.getElementById('codigoLote');
    const buscarBtn = document.getElementById('buscarBtn');
    const identificacaoForm = document.getElementById('identificacaoForm');
    const salvarBtn = document.getElementById('salvarBtn');
    const loteBarcode = document.getElementById('lote-barcode');
    const loteFornecedor = document.getElementById('lote-fornecedor');
    const loteQuantidade = document.getElementById('lote-quantidade');
    const loteStatus = document.getElementById('lote-status');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    const statusElement = document.getElementById('status');  // Opcional: adicionar no HTML para debug

    // Elementos da Câmera
    const startCameraBtn = document.getElementById('startCameraBtn');
    const stopCameraBtn = document.getElementById('stopCameraBtn');
    const scannerContainer = document.getElementById('scanner-container');
    const cameraControls = document.getElementById('camera-controls');
    const videoSelect = document.getElementById('videoSource');
    const testCameraBtn = document.getElementById('testCameraBtn');  // Botão debug opcional

    // Instância do leitor de código de barras
    let codeReader = new ZXing.BrowserMultiFormatReader();
    let selectedDeviceId = null;

    // --- FUNÇÕES AUXILIARES ---
    const hideMessages = () => {
        if (successMessage) successMessage.classList.add('hidden');
        if (errorMessage) errorMessage.classList.add('hidden');
    };

    const resetInterface = () => {
        identificacaoForm.classList.add('hidden');
        codigoLoteInput.value = '';
        if (salvarBtn) salvarBtn.disabled = true;
        codigoLoteInput.focus();
    };

    // Função para resetar scanner (como base)
    const resetScanner = () => {
        if (codeReader) codeReader.reset();
        scannerContainer.classList.add('hidden');
        cameraControls.classList.add('hidden');
        stopCameraBtn.classList.add('hidden');
        startCameraBtn.classList.remove('hidden');
        if (statusElement) statusElement.textContent = 'Scanner parado.';
        if (testCameraBtn) testCameraBtn.classList.remove('hidden');  // Mostra debug se quiser
    };

    // --- TESTE DIRETO DE CÂMERA (DEBUG) ---
    if (testCameraBtn) {
        testCameraBtn.addEventListener('click', async () => {
            const video = document.getElementById('video-preview');
            try {
                console.log('Teste direto: Iniciando getUserMedia...');
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        facingMode: 'environment'  // Traseira em mobile
                    }
                });
                video.srcObject = stream;
                video.play();
                console.log('Vídeo stream OK!');
                if (successMessage) {
                    successMessage.textContent = 'Câmera funcionando! Agora teste o scanner.';
                    successMessage.classList.remove('hidden');
                }
                setTimeout(() => {
                    stream.getTracks().forEach(track => track.stop());
                    video.srcObject = null;
                }, 10000);
            } catch (err) {
                console.error('Erro no getUserMedia direto:', err);
                let msg = `Erro: ${err.name} - ${err.message}. `;
                if (err.name === 'NotAllowedError') {
                    msg += 'Permissão negada. Reset: chrome://settings/content/camera > localhost:3000 > Permitir.';
                } else if (err.name === 'NotFoundError') {
                    msg += 'Sem câmera detectada.';
                } else if (err.name === 'OverconstrainedError') {
                    msg += 'Constraints inválidas — teste sem elas.';
                }
                if (errorMessage) {
                    errorMessage.textContent = msg;
                    errorMessage.classList.remove('hidden');
                }
            }
        });
    }

    // --- LÓGICA DO SCANNER ---
    startCameraBtn.addEventListener('click', () => {
        hideMessages();
        resetInterface();
        startCameraBtn.classList.add('hidden');
        scannerContainer.classList.remove('hidden');
        cameraControls.classList.remove('hidden');
        stopCameraBtn.classList.remove('hidden');
        if (testCameraBtn) testCameraBtn.classList.add('hidden');  // Esconde debug durante scan
        if (statusElement) statusElement.textContent = 'Solicitando permissão da câmera...';

        initializeScanner();
    });

    function initializeScanner() {
        codeReader.listVideoInputDevices()
            .then((videoInputDevices) => {
                if (videoInputDevices.length > 0) {
                    selectedDeviceId = videoInputDevices[0].deviceId;
                    videoSelect.innerHTML = '';

                    videoInputDevices.forEach((device) => {
                        const option = document.createElement('option');
                        option.value = device.deviceId;
                        option.text = device.label || `Câmera ${videoSelect.children.length + 1}`;
                        videoSelect.appendChild(option);
                    });

                    if (statusElement) statusElement.textContent = 'Câmera pronta. Aponte para um código.';
                    startDecoding();
                } else {
                    if (statusElement) statusElement.textContent = 'Nenhuma câmera encontrada.';
                    resetScanner();
                }
            })
            .catch((err) => {
                console.error('Erro ao listar câmeras:', err);
                if (statusElement) statusElement.textContent = 'Erro ao acessar câmera. Conceda permissão e recarregue.';
                resetScanner();
            });
    }

    function startDecoding() {
        codigoLoteInput.value = '';
        console.log(`Iniciando scanner com device: ${selectedDeviceId}`);
        codeReader.decodeFromVideoDevice(selectedDeviceId, 'video-preview', (result, err) => {
            if (result) {
                console.log('Código detectado:', result.text);
                codigoLoteInput.value = result.text;
                if (statusElement) statusElement.textContent = 'Código encontrado!';
                // Beep de sucesso
                const beep = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU'+Array(300).join('123'));
                beep.play().catch(() => {});
                resetScanner();  // Para após detecção
                buscarLote();  // Auto-busca o lote após scan
            }
            if (err && !(err instanceof ZXing.NotFoundException)) {
                console.error('Erro de decodificação:', err);
                if (err.name === 'NotAllowedError') {
                    if (statusElement) statusElement.textContent = 'Permissão negada. Reset em chrome://settings/content/camera.';
                } else {
                    if (statusElement) statusElement.textContent = `Erro: ${err.message}`;
                }
            }
        }).catch(err => {
            console.error('Falha no decodeFromVideoDevice:', err);
            if (err.name === 'NotAllowedError') {
                if (statusElement) statusElement.textContent = 'Câmera bloqueada sem prompt. Verifique configurações.';
            } else {
                if (statusElement) statusElement.textContent = `Falha na câmera: ${err.message}`;
            }
            resetScanner();
        });
    }

    stopCameraBtn.addEventListener('click', resetScanner);

    videoSelect.addEventListener('change', () => {
        selectedDeviceId = videoSelect.value;
        if (codeReader) codeReader.reset();
        startDecoding();
    });

    // --- LÓGICA PRINCIPAL ---
    const buscarLote = async () => {
        const barcode = codigoLoteInput.value.trim();
        if (!barcode) return;

        hideMessages();
        identificacaoForm.classList.add('hidden');

        try {
            const response = await fetch(`/api/lote/${barcode}`);
            const result = await response.json();

            if (!response.ok) {
                if (errorMessage) {
                    errorMessage.textContent = result.message;
                    errorMessage.classList.remove('hidden');
                }
                return;
            }

            const lote = result.lote;
            if (loteBarcode) loteBarcode.textContent = lote.BarCode;
            if (loteFornecedor) loteFornecedor.textContent = lote.FornecedorNome;
            if (loteQuantidade) loteQuantidade.textContent = lote.Quantidade;
            if (loteStatus) loteStatus.textContent = lote.fk_Tipos_MP_TipoMP;
            identificacaoForm.classList.remove('hidden');

            // Valida se o lote pode ser identificado
            if (lote.fk_Tipos_MP_TipoMP === 'Aguardando Identificação') {
                if (loteStatus) loteStatus.className = 'font-bold text-yellow-600';
                if (salvarBtn) salvarBtn.disabled = false;
            } else {
                if (loteStatus) loteStatus.className = 'font-bold text-green-600';
                if (errorMessage) {
                    errorMessage.textContent = 'Este lote já foi identificado.';
                    errorMessage.classList.remove('hidden');
                }
                if (salvarBtn) salvarBtn.disabled = true;
            }
        } catch (error) {
            console.error('Erro ao buscar lote:', error);
            if (errorMessage) {
                errorMessage.textContent = 'Erro de conexão ao buscar lote.';
                errorMessage.classList.remove('hidden');
            }
        }
    };

    // Event listeners 
    if (buscarBtn) buscarBtn.addEventListener('click', buscarLote);

    codigoLoteInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            buscarLote();
        }
    });

    if (identificacaoForm) {
        identificacaoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (salvarBtn) salvarBtn.disabled = true;
            hideMessages();

            const data = {
                codigoLote: loteBarcode ? loteBarcode.textContent : '',
                novoTipoMP: document.getElementById('novoTipoMP') ? document.getElementById('novoTipoMP').value : ''
            };

            try {
                const response = await fetch('/api/identificar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();

                if (response.ok) {
                    if (successMessage) {
                        successMessage.textContent = result.message;
                        successMessage.classList.remove('hidden');
                    }
                    resetInterface();
                } else {
                    if (errorMessage) {
                        errorMessage.textContent = result.message;
                        errorMessage.classList.remove('hidden');
                    }
                    if (salvarBtn) salvarBtn.disabled = false;
                }
            } catch (error) {
                console.error("Erro ao salvar identificação:", error);
                if (errorMessage) {
                    errorMessage.textContent = 'Erro de conexão ao salvar.';
                    errorMessage.classList.remove('hidden');
                }
                if (salvarBtn) salvarBtn.disabled = false;
            }
        });
    }
});
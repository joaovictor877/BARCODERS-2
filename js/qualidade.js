// js/qualidade.js

document.addEventListener('DOMContentLoaded', () => {
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

    // Elementos da Câmera
    const startCameraBtn = document.getElementById('startCameraBtn');
    const stopCameraBtn = document.getElementById('stopCameraBtn');
    const scannerContainer = document.getElementById('scanner-container');
    const cameraControls = document.getElementById('camera-controls');
    const videoSelect = document.getElementById('videoSource');

    // Instância do leitor de código de barras (será inicializada ao clicar)
    let codeReader = null;
    let selectedDeviceId = null;

    // --- FUNÇÕES AUXILIARES ---

    const hideMessages = () => {
        successMessage.classList.add('hidden');
        errorMessage.classList.add('hidden');
    };

    const resetInterface = () => {
        identificacaoForm.classList.add('hidden');
        codigoLoteInput.value = '';
        salvarBtn.disabled = true;
        codigoLoteInput.focus();
    };

    // --- LÓGICA PRINCIPAL ---

    const buscarLote = async () => {
        const barcode = codigoLoteInput.value.trim();
        if (!barcode) return; // Não faz nada se o campo estiver vazio
        
        hideMessages();
        identificacaoForm.classList.add('hidden');

        try {
            const response = await fetch(`/api/lote/${barcode}`);
            const result = await response.json();

            if (!response.ok) {
                errorMessage.textContent = result.message;
                errorMessage.classList.remove('hidden');
                return;
            }

            const lote = result.lote;
            loteBarcode.textContent = lote.BarCode;
            loteFornecedor.textContent = lote.FornecedorNome;
            loteQuantidade.textContent = lote.Quantidade;
            loteStatus.textContent = lote.fk_Tipos_MP_TipoMP;
            identificacaoForm.classList.remove('hidden');

            // Valida se o lote pode ser identificado
            if (lote.fk_Tipos_MP_TipoMP === 'Aguardando Identificação') {
                loteStatus.className = 'font-bold text-yellow-600';
                salvarBtn.disabled = false;
            } else {
                loteStatus.className = 'font-bold text-green-600';
                errorMessage.textContent = 'Este lote já foi identificado.';
                errorMessage.classList.remove('hidden');
                salvarBtn.disabled = true;
            }
        } catch (error) {
            console.error("Erro na busca do lote:", error);
            errorMessage.textContent = 'Erro de conexão ao buscar lote.';
            errorMessage.classList.remove('hidden');
        }
    };

    // --- LÓGICA DA CÂMERA ---

    const onScanSuccess = (decodedText) => {
        codigoLoteInput.value = decodedText;
        stopScanner();
        buscarLote(); // Busca automaticamente após escanear
    };

    const startScanner = () => {
        if (!selectedDeviceId) return;
        codeReader.decodeFromVideoDevice(selectedDeviceId, 'video-preview', (result, err) => {
            if (result) {
                onScanSuccess(result.getText());
            }
            if (err && !(err instanceof ZXing.NotFoundException)) {
                console.error('Erro de decodificação:', err);
            }
        });
    };
    
    const stopScanner = () => {
        if (codeReader) {
            codeReader.reset(); // Libera a câmera e para o processo de scan
        }
        scannerContainer.classList.add('hidden');
        cameraControls.classList.add('hidden');
        stopCameraBtn.classList.add('hidden');
        startCameraBtn.classList.remove('hidden');
    };

    startCameraBtn.addEventListener('click', () => {
        hideMessages();
        resetInterface();
        codeReader = new ZXing.BrowserMultiFormatReader(); // Cria uma nova instância limpa

        // Mostra os controles da câmera
        scannerContainer.classList.remove('hidden');
        cameraControls.classList.remove('hidden');
        startCameraBtn.classList.add('hidden');
        stopCameraBtn.classList.remove('hidden');

        // Lista as câmeras disponíveis
        codeReader.listVideoInputDevices().then((devices) => {
            if (devices.length > 0) {
                videoSelect.innerHTML = ''; // Limpa a lista
                devices.forEach(d => {
                    const opt = document.createElement('option');
                    opt.value = d.deviceId;
                    opt.text = d.label || `Câmera ${videoSelect.length + 1}`;
                    videoSelect.appendChild(opt);
                });
                selectedDeviceId = devices[0].deviceId;
                startScanner();
            } else {
                errorMessage.textContent = 'Nenhuma câmera encontrada.';
                errorMessage.classList.remove('hidden');
            }
        }).catch(err => {
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

    // --- EVENT LISTENERS DO FORMULÁRIO ---
    
    buscarBtn.addEventListener('click', buscarLote);
    
    codigoLoteInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            buscarLote();
        }
    });
    
    identificacaoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        salvarBtn.disabled = true;
        hideMessages();

        const data = {
            codigoLote: loteBarcode.textContent,
            novoTipoMP: document.getElementById('novoTipoMP').value
        };

        try {
            const response = await fetch('/api/identificar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();

            if (response.ok) {
                successMessage.textContent = result.message;
                successMessage.classList.remove('hidden');
                resetInterface();
            } else {
                errorMessage.textContent = result.message;
                errorMessage.classList.remove('hidden');
                salvarBtn.disabled = false;
            }
        } catch (error) {
            console.error("Erro ao salvar identificação:", error);
            errorMessage.textContent = 'Erro de conexão ao salvar.';
            errorMessage.classList.remove('hidden');
            salvarBtn.disabled = false;
        }
    });
});
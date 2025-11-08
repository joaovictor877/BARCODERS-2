document.addEventListener('DOMContentLoaded', () => {
    // --- Seleção dos Elementos do DOM ---
    const buscaSection = document.getElementById('busca-section');
    const formSection = document.getElementById('form-section');
    const qualidadeForm = document.getElementById('qualidadeForm');
    
    const barcodeInput = document.getElementById('barcodeInput');
    const buscarBtn = document.getElementById('buscarBtn');
    const finalizarBtn = document.getElementById('finalizarBtn');
    
    const loteBarcodeSpan = document.getElementById('lote-barcode');
    const loteFornecedorSpan = document.getElementById('lote-fornecedor');
    const loteLocalSpan = document.getElementById('lote-local');

    const errorMessage = document.getElementById('errorMessage');

    // --- ELEMENTOS DA CÂMERA ---
    const startCameraBtn = document.getElementById('startCameraBtn');
    const stopCameraBtn = document.getElementById('stopCameraBtn');
    const scannerContainer = document.getElementById('scanner-container');
    const cameraControls = document.getElementById('camera-controls');
    const videoSelect = document.getElementById('videoSource');

    /**
     * Função para abrir a página de impressão em uma nova aba.
     */
    function abrirPaginaDeImpressao(dados) {
        localStorage.setItem('dadosParaImpressao', JSON.stringify(dados));
        const printWindow = window.open('/print/impressao.html', '_blank');
        if (printWindow) {
            printWindow.focus();
        } else {
            alert('Por favor, habilite pop-ups para este site para poder imprimir a etiqueta.');
        }
    }

    // --- LÓGICA DO SCANNER  ---
    const codeReader = new ZXing.BrowserMultiFormatReader();
    let selectedDeviceId = null;

    function resetScanner() {
        codeReader.reset();
        scannerContainer.classList.add('hidden');
        cameraControls.classList.add('hidden');
        stopCameraBtn.classList.add('hidden');
        startCameraBtn.classList.remove('hidden');
    }

    function startDecoding() {
        codeReader.decodeFromVideoDevice(selectedDeviceId, 'video-preview', (result, err) => {
            if (result) {
                barcodeInput.value = result.text;
                resetScanner();
                new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU'+Array(300).join('123')).play();
                buscarLote();
            }
            if (err && !(err instanceof ZXing.NotFoundException)) {
                console.error('Erro de decodificação:', err);
                errorMessage.textContent = `Erro do scanner: ${err.message}`;
                errorMessage.classList.remove('hidden');
                resetScanner();
            }
        });
    }

startCameraBtn.addEventListener('click', () => {
    errorMessage.classList.add('hidden');
    startCameraBtn.classList.add('hidden');
    scannerContainer.classList.remove('hidden');
    stopCameraBtn.classList.remove('hidden');

    codeReader.listVideoInputDevices()
        .then((videoInputDevices) => {
            if (videoInputDevices.length > 0) {
                selectedDeviceId = videoInputDevices[0].deviceId; // Padrão
                
                // Só mostra o seletor se houver mais de uma câmera
                if (videoInputDevices.length > 1) {
                    videoSelect.innerHTML = '';
                    videoInputDevices.forEach((device) => {
                        const option = new Option(device.label || `Câmera ${videoSelect.options.length + 1}`, device.deviceId);
                        videoSelect.appendChild(option);
                    });
                    cameraControls.classList.remove('hidden');
                }
                
                startDecoding();
            } else {
                errorMessage.textContent = 'Nenhuma câmera encontrada.';
                errorMessage.classList.remove('hidden');
                resetScanner();
            }
        }).catch(err => {
            console.error(err);
            errorMessage.textContent = 'Erro ao acessar dispositivos de vídeo.';
            errorMessage.classList.remove('hidden');
            resetScanner();
        });
});

stopCameraBtn.addEventListener('click', resetScanner);

videoSelect.addEventListener('change', () => {
    selectedDeviceId = videoSelect.value;
    codeReader.reset();
    startDecoding();
});

    /**
     * Função para buscar os detalhes do lote no backend.
     */
    async function buscarLote() {
        const barcode = barcodeInput.value.trim();
        if (!barcode) {
            errorMessage.textContent = 'Por favor, insira um código de lote.';
            errorMessage.classList.remove('hidden');
            return;
        }

        errorMessage.classList.add('hidden');
        formSection.classList.add('hidden');
        buscarBtn.disabled = true;
        buscarBtn.textContent = 'Buscando...';

        try {
            const response = await fetch(`/api/lote/para-identificar/${encodeURIComponent(barcode)}`);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Erro ao buscar o lote.');
            }

            const lote = result.lote;
            loteBarcodeSpan.textContent = lote.BarCode;
            loteFornecedorSpan.textContent = lote.NomeFornecedor;
            loteLocalSpan.textContent = `${lote.NomeBerco} - Prateleira ${lote.Prateleira_Ocupada}`;

            formSection.classList.remove('hidden');
            buscaSection.classList.add('hidden');

        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.classList.remove('hidden');
        } finally {
            buscarBtn.disabled = false;
            buscarBtn.textContent = 'Buscar';
        }
    }

    /**
     * Função para finalizar o registro e gerar a etiqueta.
     */
    qualidadeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        finalizarBtn.disabled = true;
        finalizarBtn.textContent = 'Finalizando...';
        errorMessage.classList.add('hidden');

        const formData = new FormData(qualidadeForm);
        const data = Object.fromEntries(formData.entries());
        
        data.barcode = loteBarcodeSpan.textContent;

        try {
            const response = await fetch('/api/qualidade/finalizar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Erro ao finalizar o registro.');
            }

            abrirPaginaDeImpressao(result.dadosEtiqueta);
            
            qualidadeForm.reset();
            barcodeInput.value = '';
            formSection.classList.add('hidden');
            buscaSection.classList.remove('hidden');
            barcodeInput.focus();

        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.classList.remove('hidden');
        } finally {
            finalizarBtn.disabled = false;
            finalizarBtn.textContent = 'Finalizar e Gerar Etiqueta';
        }
    });

    // --- Event Listeners Principais ---
    buscarBtn.addEventListener('click', buscarLote);
    barcodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            buscarLote();
        }
    });
});
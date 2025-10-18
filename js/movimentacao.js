//js/movimentacao.js

document.addEventListener('DOMContentLoaded', () => {
    // Elementos do formulário
    const form = document.getElementById('movimentacaoForm');
    const codigoLoteInput = document.getElementById('codigoLote');
    const maquinaSelect = document.getElementById('maquina');
    const registrarBtn = document.getElementById('registrarBtn');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');

    // Elementos da câmera
    const startCameraBtn = document.getElementById('startCameraBtn');
    const stopCameraBtn = document.getElementById('stopCameraBtn');
    const readerDiv = document.getElementById('reader');
    
    // Instancia o leitor de código de barras
    const html5QrCode = new Html5Qrcode("reader");

    const hideMessages = () => {
        successMessage.classList.add('hidden');
        errorMessage.classList.add('hidden');
    };

    // Função que é chamada quando um código é lido com sucesso
    const onScanSuccess = (decodedText, decodedResult) => {
        console.log(`Código lido: ${decodedText}`, decodedResult);
        codigoLoteInput.value = decodedText; // Preenche o campo de texto
        stopCamera(); // Para a câmera
        
        // Simula um "flash" verde para feedback visual
        codigoLoteInput.classList.add('bg-green-100', 'border-green-500');
        setTimeout(() => {
            codigoLoteInput.classList.remove('bg-green-100', 'border-green-500');
        }, 1000);
    };

    // Função que é chamada quando a leitura falha 
    const onScanFailure = (error) => {
        console.warn(`Erro na leitura do código = ${error}`);
    };

    // Função para parar a câmera e resetar os botões
    const stopCamera = () => {
        html5QrCode.stop().then(() => {
            console.log("Câmera parada.");
            readerDiv.style.display = 'none';
            stopCameraBtn.classList.add('hidden');
            startCameraBtn.classList.remove('hidden');
        }).catch(err => {
            console.error("Falha ao parar a câmera.", err);
        });
    };

    // Event listener para o botão de INICIAR a câmera
    startCameraBtn.addEventListener('click', () => {
        hideMessages();
        readerDiv.style.display = 'block';
        startCameraBtn.classList.add('hidden');
        stopCameraBtn.classList.remove('hidden');

        // Inicia a câmera
        html5QrCode.start(
            { facingMode: "environment" }, // Usa a câmera traseira
            {
                fps: 10,    // Quadros por segundo
                qrbox: { width: 250, height: 150 } // Tamanho da caixa de leitura
            },
            onScanSuccess,
            onScanFailure
        ).catch(err => {
            console.error("Não foi possível iniciar a câmera.", err);
            errorMessage.textContent = "Não foi possível iniciar a câmera. Verifique as permissões.";
            errorMessage.classList.remove('hidden');
            stopCamera();
        });
    });

    // Event listener para o botão de PARAR a câmera
    stopCameraBtn.addEventListener('click', stopCamera);

    // Event listener para o SUBMIT do formulário
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
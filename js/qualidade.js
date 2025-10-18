// js/qualidade.js

document.addEventListener('DOMContentLoaded', () => {
    // --- SELEÇÃO DOS ELEMENTOS DO DOM ---

    // Elementos da seção de busca
    const codigoLoteInput = document.getElementById('codigoLote');
    const buscarBtn = document.getElementById('buscarBtn');
    
    // Elementos do formulário de identificação (inicialmente oculto)
    const identificacaoForm = document.getElementById('identificacaoForm');
    const salvarBtn = document.getElementById('salvarBtn');
    const novoTipoMPSelect = document.getElementById('novoTipoMP');

    // Elementos para exibir os detalhes do lote encontrado
    const loteBarcode = document.getElementById('lote-barcode');
    const loteFornecedor = document.getElementById('lote-fornecedor');
    const loteQuantidade = document.getElementById('lote-quantidade');
    const loteStatus = document.getElementById('lote-status');

    // Elementos para mensagens de feedback e controle da câmera
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    const startCameraBtn = document.getElementById('startCameraBtn');
    const stopCameraBtn = document.getElementById('stopCameraBtn');
    const readerDiv = document.getElementById('reader');
    const html5QrCode = new Html5Qrcode("reader");

    // --- FUNÇÕES AUXILIARES ---

    // Esconde todas as mensagens de feedback
    const hideMessages = () => {
        successMessage.classList.add('hidden');
        errorMessage.classList.add('hidden');
    };

    // Reseta a interface para o estado inicial, pronta para uma nova busca
    const resetInterface = () => {
        identificacaoForm.classList.add('hidden'); // Esconde a seção de detalhes
        codigoLoteInput.value = ''; // Limpa o campo de busca
        salvarBtn.disabled = true; // Desabilita o botão de salvar
        codigoLoteInput.focus(); // Coloca o foco de volta no campo de busca
    };

    // --- FUNÇÕES PRINCIPAIS ---

    // Função assíncrona para buscar os detalhes de um lote na API
    const buscarLote = async () => {
        const barcode = codigoLoteInput.value.trim();
        if (!barcode) {
            alert('Por favor, digite ou escaneie um código de lote.');
            return;
        }

        hideMessages();
        identificacaoForm.classList.add('hidden'); // Garante que o form antigo seja escondido

        try {
            const response = await fetch(`/api/lote/${barcode}`);
            const result = await response.json();

            if (!response.ok) {
                errorMessage.textContent = result.message;
                errorMessage.classList.remove('hidden');
                return;
            }

            // Se encontrou o lote, preenche os detalhes na tela
            const lote = result.lote;
            loteBarcode.textContent = lote.BarCode;
            loteFornecedor.textContent = lote.FornecedorNome;
            loteQuantidade.textContent = lote.Quantidade;
            loteStatus.textContent = lote.fk_Tipos_MP_TipoMP;
            
            // Mostra a seção de identificação que estava oculta
            identificacaoForm.classList.remove('hidden');

            // Validação de negócio: verifica se o lote pode ser identificado
            if (lote.fk_Tipos_MP_TipoMP === 'Aguardando Identificação') {
                // Lote válido para identificação
                loteStatus.className = 'font-bold text-yellow-600'; // Estilo de "Atenção"
                salvarBtn.disabled = false; // Habilita o botão para salvar
            } else {
                // Lote já foi identificado anteriormente
                loteStatus.className = 'font-bold text-green-600'; // Estilo de "OK"
                errorMessage.textContent = 'Este lote já foi identificado anteriormente.';
                errorMessage.classList.remove('hidden');
                salvarBtn.disabled = true; // Desabilita o botão para prevenir re-identificação
            }

        } catch (error) {
            console.error("Erro na busca do lote:", error);
            errorMessage.textContent = 'Erro de conexão ao buscar o lote. Tente novamente.';
            errorMessage.classList.remove('hidden');
        }
    };

    // --- LÓGICA DA CÂMERA ---

    // Função chamada quando a câmera lê um código com sucesso
    const onScanSuccess = (decodedText, decodedResult) => {
        codigoLoteInput.value = decodedText;
        stopCamera();
        buscarLote(); // Após escanear, busca automaticamente os detalhes do lote
    };

    // Função para parar a câmera e resetar os botões
    const stopCamera = () => {
        html5QrCode.stop().then(() => {
            readerDiv.style.display = 'none';
            stopCameraBtn.classList.add('hidden');
            startCameraBtn.classList.remove('hidden');
        }).catch(err => {
            // Ignora o erro se a câmera já estava parada
        });
    };

    // --- EVENT LISTENERS ---

    // Gatilho para buscar o lote ao clicar no botão
    buscarBtn.addEventListener('click', buscarLote);

    // Gatilho para buscar o lote ao pressionar "Enter" no campo de texto
    codigoLoteInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Impede o envio do formulário
            buscarLote();
        }
    });

    // Gatilho para salvar a identificação ao enviar o formulário
    identificacaoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        salvarBtn.disabled = true; // Previne cliques múltiplos
        hideMessages();

        const data = {
            codigoLote: loteBarcode.textContent,
            novoTipoMP: novoTipoMPSelect.value
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
                resetInterface(); // Limpa a tela para a próxima identificação
            } else {
                errorMessage.textContent = result.message;
                errorMessage.classList.remove('hidden');
                salvarBtn.disabled = false; // Reabilita o botão em caso de erro
            }
        } catch (error) {
            console.error("Erro ao salvar identificação:", error);
            errorMessage.textContent = 'Erro de conexão ao salvar. Tente novamente.';
            errorMessage.classList.remove('hidden');
            salvarBtn.disabled = false;
        }
    });

    // Gatilho para iniciar a câmera
    startCameraBtn.addEventListener('click', () => {
        hideMessages();
        readerDiv.style.display = 'block';
        startCameraBtn.classList.add('hidden');
        stopCameraBtn.classList.remove('hidden');

        html5QrCode.start(
            { facingMode: "environment" }, // Prioriza a câmera traseira
            { fps: 10, qrbox: { width: 250, height: 150 } },
            onScanSuccess,
            () => {} // Ignora falhas de leitura contínuas
        ).catch(err => {
            errorMessage.textContent = "Não foi possível iniciar a câmera. Verifique as permissões.";
            errorMessage.classList.remove('hidden');
            stopCamera();
        });
    });

    // Gatilho para parar a câmera manualmente
    stopCameraBtn.addEventListener('click', stopCamera);
});
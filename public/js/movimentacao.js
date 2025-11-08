document.addEventListener('DOMContentLoaded', () => {
    // --- Gerenciador de Estado ---
    const passos = {
        maquina: document.getElementById('passo-1-maquina'),
        material: document.getElementById('passo-2-material'),
        buscar: document.getElementById('passo-3-buscar'),
        confirmar: document.getElementById('passo-4-confirmar'),
    };
    const mensagemSucesso = document.getElementById('mensagem-sucesso');
    const mensagemErro = document.getElementById('mensagem-erro');
    let estadoDaMovimentacao = {};

    function mostrarPasso(nomePasso) {
        Object.values(passos).forEach(passo => passo.classList.add('hidden'));
        if (passos[nomePasso]) {
            passos[nomePasso].classList.remove('hidden');
        }
    }
    
    function resetarTudo() {
        estadoDaMovimentacao = {};
        mensagemSucesso.classList.add('hidden');
        mensagemErro.classList.add('hidden');
        // Limpa a lista de materiais para a próxima execução
        const lista = document.getElementById('lista-materiais');
        if (lista) lista.innerHTML = '';
        mostrarPasso('maquina');
    }

    function exibirErroTemporario(mensagem) {
        mensagemErro.textContent = mensagem;
        mensagemErro.classList.remove('hidden');
        setTimeout(() => mensagemErro.classList.add('hidden'), 4000);
    }

    // --- Função Genérica para Criar um Scanner ---
    function criarScanner(containerId, btnId, onScanSuccess) {
    const container = document.getElementById(containerId);
    const btn = document.getElementById(btnId);
    const video = document.createElement('video');
    
    // Adiciona o seletor de câmera ao escopo da função
    const videoSelect = document.createElement('select');
    videoSelect.className = 'w-full p-2 border rounded mt-2';
    
    const codeReader = new ZXing.BrowserMultiFormatReader();
    let selectedDeviceId = null;
    let active = false;

    const reset = () => {
        codeReader.reset();
        container.innerHTML = '';
        btn.classList.remove('hidden');
        active = false;
    };
    
    const startDecoding = () => {
        codeReader.decodeFromVideoDevice(selectedDeviceId, video, (result, err) => {
            if (result && active) {
                active = false;
                new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU'+Array(300).join('123')).play();
                reset();
                onScanSuccess(result.text);
            }
        });
    };

    btn.addEventListener('click', () => {
        if (active) return;
        btn.classList.add('hidden');
        container.appendChild(video);
        active = true;
        
        codeReader.listVideoInputDevices().then(devices => {
            if (devices.length > 0) {
                selectedDeviceId = devices[0].deviceId; // Padrão é a primeira câmera
                
                // Popula o seletor se houver mais de uma câmera
                if (devices.length > 1) {
                    videoSelect.innerHTML = '';
                    devices.forEach(device => {
                        const option = new Option(device.label || `Câmera ${videoSelect.options.length + 1}`, device.deviceId);
                        option.selected = device.deviceId === selectedDeviceId;
                        videoSelect.appendChild(option);
                    });
                    container.appendChild(videoSelect);
                }
                
                startDecoding();
            } else {
                alert('Nenhuma câmera encontrada.');
                reset();
            }
        }).catch(err => {
            console.error(err);
            alert('Erro ao acessar a câmera.');
            reset();
        });
    });
    
    videoSelect.addEventListener('change', () => {
        selectedDeviceId = videoSelect.value;
        codeReader.reset(); // Para o stream antigo
        startDecoding(); // Inicia com a nova câmera
    });
    
    return { reset };
    }
    // --- Lógica de Cada Passo ---

    // Passo 1: Escanear Máquina
    const scannerMaquina = criarScanner('scanner-container-maquina', 'iniciar-scanner-maquina', async (maquinaId) => {
        try {
            const response = await fetch(`/api/maquina/${maquinaId}/compatibilidades`);
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            estadoDaMovimentacao.maquinaId = maquinaId;
            document.getElementById('info-maquina').textContent = `ID ${maquinaId}`;
            
            const lista = document.getElementById('lista-materiais');
            lista.innerHTML = '';
            result.materiais.forEach(material => {
                const btn = document.createElement('button');
                btn.className = 'material-btn';
                btn.textContent = material;
                btn.onclick = () => onMaterialSelecionado(material);
                lista.appendChild(btn);
            });
            
            mostrarPasso('material');
        } catch (error) {
            exibirErroTemporario(error.message);
            resetarTudo();
        }
    });

    // Passo 2: Selecionar Material
    async function onMaterialSelecionado(tipoMaterial) {
    // Fornece feedback visual imediato
    const listaBotoes = document.querySelectorAll('.material-btn');
    listaBotoes.forEach(btn => btn.disabled = true);
    mensagemErro.classList.add('hidden');

    try {
        const response = await fetch(`/api/material/localizacao?tipo=${encodeURIComponent(tipoMaterial)}`);
        const result = await response.json();
        
        // Se a resposta for um erro (como 404), lança um erro para ser pego pelo catch
        if (!response.ok) {
            throw new Error(result.message || 'Erro ao buscar localização.');
        }

        // Se deu tudo certo, preenche os dados e avança
        estadoDaMovimentacao.materialEsperadoBarcode = result.localizacao.BarCode;
        document.getElementById('info-material-tipo').textContent = tipoMaterial;
        document.getElementById('info-localizacao').textContent = `${result.localizacao.NomeBerco}, Prateleira ${result.localizacao.Prateleira_Ocupada}`;
        
        mostrarPasso('buscar');

    } catch (error) {
        // Exibe a mensagem de erro específica vinda do backend
        exibirErroTemporario(error.message);
        
        // Mantém o usuário no Passo 2, permitindo que ele escolha outro material.
        // Não reinicia o processo inteiro.
        
    } finally {
        // Reabilita os botões para que o usuário possa tentar outro material
        listaBotoes.forEach(btn => btn.disabled = false);
    }
    }
    
    // Passo 3: Escanear e VALIDAR Material
    const scannerMaterial = criarScanner('scanner-container-material', 'iniciar-scanner-material', async (materialLidoBarcode) => {
        try {
            const response = await fetch('/api/movimentacao/validar-material', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    maquinaId: estadoDaMovimentacao.maquinaId,
                    materialEsperadoBarcode: estadoDaMovimentacao.materialEsperadoBarcode,
                    materialLidoBarcode: materialLidoBarcode
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            // Se a validação passou, armazena o material lido e avança
            estadoDaMovimentacao.materialLidoBarcode = materialLidoBarcode;
            mostrarPasso('confirmar');

        } catch (error) {
            // Se a validação falhou, o backend já registrou o erro.
            // Apenas exibe a mensagem e mantém o usuário neste passo.
            exibirErroTemporario(error.message);
            // Não precisa fazer mais nada, o usuário pode tentar escanear de novo.
        }
    });

    // Passo 4: Confirmar Máquina e FINALIZAR
    const scannerConfirmacao = criarScanner('scanner-container-confirmacao', 'iniciar-scanner-confirmacao', async (maquinaConfirmacaoId) => {
    
    // PRIMEIRO: Valida se a máquina de confirmação é a correta.
    if (maquinaConfirmacaoId !== estadoDaMovimentacao.maquinaId) {
        // Se a máquina estiver errada, chama o backend para registrar a falha.
        try {
            await fetch('/api/movimentacao/finalizar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    maquinaId: estadoDaMovimentacao.maquinaId,
                    materialBarcode: estadoDaMovimentacao.materialLidoBarcode,
                    maquinaConfirmacaoId: maquinaConfirmacaoId,
                    quantidadeMovida: 0 // Quantidade 0 para registro de erro
                })
            });
        } catch(e) { console.error("Falha ao logar erro de máquina:", e); }

        // Informa o usuário e o mantém neste passo para tentar novamente.
        exibirErroTemporario('Erro: Máquina de confirmação incorreta. Escaneie a máquina correta.');
        return; // Interrompe a execução
    }

    // SEGUNDO: Se a máquina estiver correta, SÓ ENTÃO pede a quantidade.
    const quantidade = prompt("Máquina confirmada! Digite a quantidade a ser movida:", "1");
    if (!quantidade || isNaN(quantidade) || parseInt(quantidade) <= 0) {
        exibirErroTemporario("Quantidade inválida. A operação foi cancelada. Reiniciando...");
        setTimeout(resetarTudo, 2000);
        return;
    }

    // TERCEIRO: Com todos os dados validados, finaliza a operação.
    try {
        const response = await fetch('/api/movimentacao/finalizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                maquinaId: estadoDaMovimentacao.maquinaId,
                materialBarcode: estadoDaMovimentacao.materialLidoBarcode,
                maquinaConfirmacaoId: maquinaConfirmacaoId, // Agora será igual ao maquinaId
                quantidadeMovida: parseInt(quantidade)
            })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);

        // Sucesso final!
        mensagemSucesso.textContent = result.message;
        mensagemSucesso.classList.remove('hidden');
        setTimeout(resetarTudo, 3000);
        
    } catch (error) {
        // Este erro agora só deve acontecer por falta de estoque ou outro problema de servidor
        exibirErroTemporario(error.message);
        setTimeout(resetarTudo, 3000);
    }
    });

    // --- Inicialização ---
    resetarTudo();
});
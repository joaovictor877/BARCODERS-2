//js/recebimento.js

document.addEventListener('DOMContentLoaded', () => {
    // Selecionando os novos elementos
    const form = document.getElementById('recebimentoForm');
    const gerarCodigoBtn = document.getElementById('gerarCodigoBtn');
    const codigoLoteInput = document.getElementById('codigoLote');
    const registrarBtn = document.getElementById('registrarBtn');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    const barcodeDisplay = document.getElementById('barcode-display');
    const barcodeElement = document.getElementById('barcode');

    const hideMessages = () => {
        successMessage.classList.add('hidden');
        errorMessage.classList.add('hidden');
    };

    gerarCodigoBtn.addEventListener('click', () => {
        hideMessages();
        const pad = (num) => num.toString().padStart(2, '0');
        const now = new Date();
        const dataHoraMilisegundos = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${now.getMilliseconds().toString().padStart(3, '0')}`;
        const numeroAleatorio = Math.floor(Math.random() * 9000) + 1000;
        const codigoGerado = `${dataHoraMilisegundos}-${numeroAleatorio}`;
        
        codigoLoteInput.value = codigoGerado;

        // Renderiza o código de barras na tela
        JsBarcode(barcodeElement, codigoGerado, {
            format: "CODE128", // Formato industrial comum
            displayValue: true, // Mostra o texto do código abaixo da barra
            fontSize: 18,
            height: 80,
            margin: 10
        });

        // Mostra a área do código de barras
        barcodeDisplay.classList.remove('hidden');

        registrarBtn.disabled = false;
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideMessages();
        registrarBtn.disabled = true;

        const formData = new FormData(form);
        // Objeto de dados atualizado, sem 'tipoMP'
        const data = {
            fornecedorCnpj: formData.get('fornecedor'),
            quantidade: formData.get('quantidade'),
            codigoLote: formData.get('codigoLote'),
        };

        try {
            const response = await fetch('/api/recebimento', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await response.json();

            if (response.ok) {
                successMessage.textContent = result.message;
                successMessage.classList.remove('hidden');
                form.reset();
                codigoLoteInput.value = '';
                
                // Esconde e limpa a área do código de barras após o sucesso
                barcodeDisplay.classList.add('hidden');
                barcodeElement.innerHTML = '';
            } else {
                errorMessage.textContent = result.message || 'Ocorreu um erro.';
                errorMessage.classList.remove('hidden');
                registrarBtn.disabled = false;
            }
        } catch (error) {
            errorMessage.textContent = 'Erro de conexão. Tente novamente.';
            errorMessage.classList.remove('hidden');
            registrarBtn.disabled = false;
        }
    });
});
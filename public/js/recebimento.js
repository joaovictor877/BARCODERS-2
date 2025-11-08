// public/js/recebimento.js
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('recebimentoForm');
    const fornecedorSelect = document.getElementById('fornecedor');
    const bercoSelect = document.getElementById('berco');
    const prateleiraSelect = document.getElementById('prateleira');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');

    let bercosData = [];

    async function carregarDadosIniciais() {
        // Carregar Fornecedores
        fetch('/api/fornecedores').then(res => res.json()).then(data => {
            if(data.success) data.fornecedores.forEach(f => fornecedorSelect.add(new Option(f.Nome, f.CNPJ)));
        });
        // Carregar Berços
        const bercoRes = await fetch('/api/bercos/disponiveis');
        const bercoResult = await bercoRes.json();
        if (bercoResult.success) {
            bercosData = bercoResult.bercos;
            bercoSelect.innerHTML = '<option value="">Selecione</option>';
            bercosData.forEach(b => bercoSelect.add(new Option(b.nome, b.id)));
        }
    }

    bercoSelect.addEventListener('change', () => {
        const bercoId = bercoSelect.value;
        const bercoSelecionado = bercosData.find(b => b.id == bercoId);
        prateleiraSelect.innerHTML = '<option value="">Selecione</option>';
        if (bercoSelecionado) {
            bercoSelecionado.prateleirasLivres.forEach(p => prateleiraSelect.add(new Option(p, p)));
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        successMessage.classList.add('hidden');
        errorMessage.classList.add('hidden');
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        const response = await fetch('/api/recebimento/registrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();

        if (response.ok) {
            successMessage.innerHTML = `${result.message}<br><strong>Código do Lote: ${result.codigoLote}</strong>`;
            successMessage.classList.remove('hidden');
            form.reset();
            carregarDadosIniciais(); // Recarrega berços para atualizar disponibilidade
        } else {
            errorMessage.textContent = result.message || 'Erro ao registrar.';
            errorMessage.classList.remove('hidden');
        }
    });

    carregarDadosIniciais();
});
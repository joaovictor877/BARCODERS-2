document.addEventListener('DOMContentLoaded', () => {
    // --- Seleção de Elementos do DOM ---
    const select = document.getElementById('employee-select');
    const viewBtn = document.getElementById('view-dashboard-btn');
    const resultsContainer = document.getElementById('dashboard-results');
    
    // Mapeamento dos painéis (seções) do dashboard
    const dashboards = {
        movimentacao: document.getElementById('movimentacao-dashboard'),
        qualidade: document.getElementById('qualidade-dashboard'),
        recebimento: document.getElementById('recebimento-dashboard'),
    };

    /**
     * Esconde todos os painéis de resultados para limpar a interface antes de uma nova busca.
     */
    const hideAllDashboards = () => {
        Object.values(dashboards).forEach(dashboard => {
            if (dashboard) dashboard.classList.add('hidden');
        });
    };

    /**
     * Event listener principal para o botão "Ver".
     */
    viewBtn.addEventListener('click', async () => {
        const employeeId = select.value;
        if (!employeeId) {
            alert('Por favor, selecione um funcionário.');
            return;
        }

        // --- Reset e feedback visual ---
        hideAllDashboards();
        resultsContainer.classList.add('hidden');
        viewBtn.disabled = true;
        viewBtn.textContent = 'Carregando...';
        
        try {
            // --- Busca os dados na API ---
            const response = await fetch(`/api/dashboard/funcionario/${employeeId}`);
            if (!response.ok) {
                const err = await response.json().catch(() => ({ message: 'Erro ao carregar dados do funcionário.' }));
                throw new Error(err.message);
            }
            
            const data = await response.json();
            resultsContainer.classList.remove('hidden');

            // --- Lógica de Renderização Condicional ---
            
            // Se houver dados de estatísticas (stats), renderiza o painel de movimentação.
            if (data.stats) {
                renderMovementDashboard(data.registros.movimentacoes || [], data.stats);
                dashboards.movimentacao.classList.remove('hidden');
            }

            // Se houver registros de identificação, renderiza o painel de qualidade.
            if (data.registros.identificacoes && data.registros.identificacoes.length > 0) {
                renderQualidadeDashboard(data.registros.identificacoes);
                dashboards.qualidade.classList.remove('hidden');
            }

            // Se houver registros de recebimento, renderiza o painel de recebimento.
            if (data.registros.recebimentos && data.registros.recebimentos.length > 0) {
                renderRecebimentoDashboard(data.registros.recebimentos);
                dashboards.recebimento.classList.remove('hidden');
            }

        } catch (error) {
            alert(error.message);
        } finally {
            viewBtn.disabled = false;
            viewBtn.textContent = 'Ver';
        }
    });

    /**
     * Renderiza o painel completo de movimentação (KPIs e tabela).
     * @param {Array} registros - A lista de movimentações.
     * @param {object} stats - O objeto com as estatísticas processadas.
     */
    function renderMovementDashboard(registros, stats) {
        document.getElementById('stat-total').textContent = stats.totalOperacoes;
        document.getElementById('stat-acertos').textContent = stats.acertos;
        document.getElementById('stat-erros').textContent = stats.erros;
        document.getElementById('stat-taxa').textContent = `${stats.taxaAcerto}%`;

        const errosContainer = document.getElementById('erros-por-tipo');
        errosContainer.innerHTML = '<h3 class="font-bold mb-2">Detalhes dos Erros</h3>';
        if (stats.erros > 0 && stats.errosPorTipo) {
            for (const [tipo, count] of Object.entries(stats.errosPorTipo)) {
                errosContainer.innerHTML += `<p class="capitalize">${tipo.replace('_', ' ')}: <strong class="text-red-600">${count}</strong></p>`;
            }
        } else {
            errosContainer.innerHTML += '<p class="text-green-600">Nenhum erro registrado!</p>';
        }

        const tableBody = document.getElementById('movimentacao-table');
        tableBody.innerHTML = registros.map(r => `
            <tr class="border-b ${r.OperacaoValida ? 'bg-green-50' : 'bg-red-50'}">
                <td class="p-2">${new Date(r.DataHoraMovimento).toLocaleString('pt-BR')}</td>
                <td class="p-2 font-mono">${r.fk_Estoque_MP_BarCode}</td>
                <td class="p-2 text-center">${r.QuantidadeMovida}</td>
                <td class="p-2 font-bold ${r.OperacaoValida ? 'text-green-700' : 'text-red-700'}">
                    ${r.OperacaoValida ? 'Válida' : 'Inválida'}
                </td>
                <td class="p-2">${r.TipoErro}</td>
            </tr>
        `).join('');
    }

    /**
     * Renderiza o painel com o histórico de identificações (qualidade).
     * @param {Array} registros - A lista de identificações.
     */
    function renderQualidadeDashboard(registros) {
        const container = dashboards.qualidade;
        let tableHTML = `
            <h3 class="font-bold mb-2 text-xl">Histórico de Identificação (Qualidade)</h3>
            <div class="overflow-x-auto">
                <table class="w-full text-sm"><thead class="bg-gray-50 text-left">
                    <tr><th class="p-2">Data</th><th class="p-2">Lote Inspecionado</th><th class="p-2">Tipo Identificado</th></tr>
                </thead><tbody>`;
        
        tableHTML += registros.map(r => `
            <tr class="border-b">
                <td class="p-2">${new Date(r.DataHoraIdentificacao).toLocaleString('pt-BR')}</td>
                <td class="p-2 font-mono">${r.fk_Estoque_MP_BarCode}</td>
                <td class="p-2">${r.fk_Tipos_MP_TipoMP}</td>
            </tr>
        `).join('');

        tableHTML += '</tbody></table></div>';
        container.innerHTML = tableHTML;
    }

    /**
     * Renderiza o painel com o histórico de recebimentos.
     * @param {Array} registros - A lista de recebimentos.
     */
    function renderRecebimentoDashboard(registros) {
        const container = dashboards.recebimento;
        let tableHTML = `
            <h3 class="font-bold mb-2 text-xl">Histórico de Recebimento</h3>
            <div class="overflow-x-auto">
                <table class="w-full text-sm"><thead class="bg-gray-50 text-left">
                    <tr><th class="p-2">Data</th><th class="p-2">Lote Gerado</th></tr>
                </thead><tbody>`;

        tableHTML += registros.map(r => `
            <tr class="border-b">
                <td class="p-2">${new Date(r.DataHoraRegistro).toLocaleString('pt-BR')}</td>
                <td class="p-2 font-mono">${r.fk_Estoque_MP_BarCode}</td>
            </tr>
        `).join('');

        tableHTML += '</tbody></table></div>';
        container.innerHTML = tableHTML;
    }
});
document.addEventListener('DOMContentLoaded', () => {
    let chartInstance = null;

    // --- Seleção de Elementos ---
    const select = document.getElementById('employee-select');
    const viewBtn = document.getElementById('view-dashboard-btn');
    const resultsContainer = document.getElementById('dashboard-results');

    // Mapeamento de Painéis
    const panels = {
        movimentacao: document.getElementById('movimentacao-dashboard'),
        qualidade: document.getElementById('qualidade-dashboard'),
        recebimento: document.getElementById('recebimento-dashboard'),
        timeStats: document.getElementById('time-stats-container'),
        chart: document.getElementById('chart-container')
    };

    // --- Reset ---
    const hideAll = () => {
        Object.values(panels).forEach(el => {
            if (el) el.classList.add('hidden');
        });
        resultsContainer.classList.add('hidden');
    };

    // --- Ação de Visualizar ---
    viewBtn.addEventListener('click', async () => {
        console.log("Botão Ver clicado.");
        const employeeId = select.value;
        const startDate = document.getElementById('date-start').value;
        const endDate = document.getElementById('date-end').value;

        console.log("Params:", { employeeId, startDate, endDate });

        if (!employeeId) {
            alert('Selecione um funcionário.');
            return;
        }

        viewBtn.disabled = true;
        viewBtn.textContent = 'Carregando...';
        hideAll();

        try {
            // Construir URL com Query Params
            let url = `/api/dashboard/funcionario/${employeeId}`;
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            if (params.toString()) url += `?${params.toString()}`;

            console.log("Fetching URL:", url);

            const res = await fetch(url);
            console.log("Response status:", res.status);

            const data = await res.json();
            console.log("Response data:", data);

            if (!res.ok) throw new Error(data.message || 'Erro ao carregar dados.');

            renderDashboard(data);

        } catch (error) {
            console.error("Erro no fetch:", error);
            alert(error.message);
        } finally {
            viewBtn.disabled = false;
            viewBtn.textContent = 'Filtrar e Visualizar';
        }
    });

    // --- Renderização Principal ---
    function renderDashboard(data) {
        resultsContainer.classList.remove('hidden');

        // 1. Renderizar Analytics de Tempo (Se disponível)
        if (data.analytics) {
            renderTimeStats(data.analytics);
            renderChart(data.analytics);
        }

        // 2. Renderizar Dados Específicos por Disponibilidade de Registros
        let hasData = false;

        if (data.registros.movimentacoes && data.registros.movimentacoes.length > 0) {
            renderMovimentacao(data);
            panels.movimentacao.classList.remove('hidden');
            hasData = true;
        }

        if (data.registros.identificacoes && data.registros.identificacoes.length > 0) {
            renderQualidade(data);
            panels.qualidade.classList.remove('hidden');
            hasData = true;
        }

        if (data.registros.recebimentos && data.registros.recebimentos.length > 0) {
            renderRecebimento(data);
            panels.recebimento.classList.remove('hidden');
            hasData = true;
        }

        if (!hasData) {
            // Se não tiver dados, talvez mostrar mensagem
            console.log("Sem dados específicos encontrados para o período.");
        }
    }

    // --- Renderização de Componentes ---

    function renderTimeStats(analytics) {
        const grid = document.getElementById('time-stats-grid');
        grid.innerHTML = '';
        panels.timeStats.classList.remove('hidden');

        const createCard = (title, avg, min, max, colorClass = 'bg-blue-50') => `
            <div class="${colorClass} p-4 rounded shadow border border-blue-100">
                <h4 class="font-bold text-gray-700">${title}</h4>
                <div class="mt-2 text-sm text-gray-600">
                    <p>Média: <span class="font-bold text-lg">${avg}s</span></p>
                    <div class="flex justify-between mt-1 text-xs">
                        <span>Min: ${min}s</span>
                        <span>Max: ${max}s</span>
                    </div>
                </div>
            </div>
        `;

        // Métricas de Movimentação
        if (analytics.tempoMaterial && analytics.tempoMaterial.min !== Infinity) {
            grid.innerHTML += createCard('Verificação Material', analytics.tempoMaterial.avg, analytics.tempoMaterial.min, analytics.tempoMaterial.max);
            grid.innerHTML += createCard('Verificação Máquina', analytics.tempoMaquina.avg, analytics.tempoMaquina.min, analytics.tempoMaquina.max);
            grid.innerHTML += createCard('Tempo Total Operação', analytics.tempoTotal.avg, analytics.tempoTotal.min, analytics.tempoTotal.max, 'bg-indigo-50');
        }
        // Métricas de Qualidade
        if (analytics.tempoIdentificacao && analytics.tempoIdentificacao.min !== Infinity) {
            grid.innerHTML += createCard('Tempo até Identificação', analytics.tempoIdentificacao.avg, analytics.tempoIdentificacao.min, analytics.tempoIdentificacao.max, 'bg-purple-50');
        }

        if (grid.innerHTML === '') {
            grid.innerHTML = '<p class="text-gray-500 italic">Sem dados de tempo suficientes para este período.</p>';
        }
    }

    function renderChart(analytics) {
        if (!analytics.series || analytics.series.length === 0) {
            panels.chart.classList.add('hidden');
            return;
        }
        panels.chart.classList.remove('hidden');

        const ctx = document.getElementById('performanceChart').getContext('2d');
        if (chartInstance) chartInstance.destroy();

        // Preparar datasets
        const labels = analytics.series.map(s => {
            const d = new Date(s.t || s.val); // Adaptação para diferentes estruturas de objeto
            return d.getDate() + '/' + (d.getMonth() + 1) + ' ' + d.getHours() + ':' + d.getMinutes();
        });

        const datasets = [];

        if (analytics.tempoMaterial) {
            datasets.push({
                label: 'Tempo Total (s)',
                data: analytics.series.map(s => s.total),
                borderColor: 'rgb(79, 70, 229)',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                tension: 0.2,
                fill: true
            });
            datasets.push({
                label: 'Verif. Material (s)',
                data: analytics.series.map(s => s.mat),
                borderColor: 'rgb(16, 185, 129)',
                borderDash: [5, 5],
                tension: 0.1
            });
        } else if (analytics.tempoIdentificacao) {
            datasets.push({
                label: 'Tempo Identificação (s)',
                data: analytics.series.map(s => s.val),
                borderColor: 'rgb(147, 51, 234)',
                backgroundColor: 'rgba(147, 51, 234, 0.1)',
                tension: 0.2,
                fill: true
            });
        }

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Segundos' } }
                }
            }
        });
    }

    function renderMovimentacao(data) {
        // KPIs
        if (data.stats) {
            document.getElementById('stat-total').textContent = data.stats.totalOperacoes;
            document.getElementById('stat-acertos').textContent = data.stats.acertos;
            document.getElementById('stat-erros').textContent = data.stats.erros;
            document.getElementById('stat-taxa').textContent = data.stats.taxaAcerto + '%';

            // Erros
            const erroContainer = document.getElementById('erros-por-tipo');
            erroContainer.innerHTML = '';
            if (data.stats.erros > 0 && data.stats.errosPorTipo) {
                erroContainer.innerHTML = '<h4 class="font-bold text-red-600 mb-2">Tipos de Erro</h4>';
                for (const [tipo, qtd] of Object.entries(data.stats.errosPorTipo)) {
                    erroContainer.innerHTML += `<div class="flex justify-between text-sm border-b py-1"><span>${tipo}</span><span class="font-bold">${qtd}</span></div>`;
                }
            }
        }

        // Tabela
        const tbody = document.getElementById('movimentacao-table');
        tbody.innerHTML = '';
        if (data.registros.movimentacoes) {
            data.registros.movimentacoes.forEach(m => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="p-2 border-b text-gray-600">${new Date(m.DataHoraMovimento).toLocaleString()}</td>
                    <td class="p-2 border-b font-mono text-xs">${(m.fk_Estoque_MP_BarCode || m.BarcodeLido || '-')}</td>
                    <td class="p-2 border-b">${m.QuantidadeMovida}</td>
                    <td class="p-2 border-b text-center font-mono">${m.Tempo_Total_Operacao ? m.Tempo_Total_Operacao + 's' : '-'}</td>
                    <td class="p-2 border-b">
                        ${m.OperacaoValida ?
                        '<span class="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">OK</span>' :
                        '<span class="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">ERRO</span>'}
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    function renderQualidade(data) {
        const div = panels.qualidade;
        let html = `
            <h3 class="font-bold mb-4 text-gray-800">Histórico de Identificação</h3>
            <div class="overflow-x-auto bg-white rounded shadow">
                <table class="w-full text-sm text-left">
                    <thead class="bg-gray-50 text-gray-700 uppercase">
                        <tr>
                            <th class="px-4 py-3">Data</th>
                            <th class="px-4 py-3">Lote</th>
                            <th class="px-4 py-3">Material</th>
                            <th class="px-4 py-3">Tempo(s)</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (data.registros.identificacoes) {
            data.registros.identificacoes.forEach(i => {
                html += `
                    <tr class="border-b hover:bg-gray-50">
                        <td class="px-4 py-3">${new Date(i.DataHoraIdentificacao).toLocaleString()}</td>
                        <td class="px-4 py-3 font-mono">${i.fk_Estoque_MP_BarCode}</td>
                        <td class="px-4 py-3 font-semibold">${i.fk_Tipos_MP_TipoMP}</td>
                        <td class="px-4 py-3 text-purple-600 font-bold">${i.Tempo_Ate_Identificacao ? i.Tempo_Ate_Identificacao + 's' : '-'}</td>
                    </tr>
                `;
            });
        }
        html += '</tbody></table></div>';
        div.innerHTML = html;
    }

    function renderRecebimento(data) {
        const div = panels.recebimento;
        let html = `
            <h3 class="font-bold mb-4 text-gray-800">Histórico de Recebimento</h3>
             <div class="overflow-x-auto bg-white rounded shadow">
                <table class="w-full text-sm text-left">
                    <thead class="bg-gray-50 text-gray-700 uppercase">
                        <tr>
                            <th class="px-4 py-3">Data</th>
                            <th class="px-4 py-3">Lote</th>
                            <th class="px-4 py-3">Local</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        if (data.registros.recebimentos) {
            data.registros.recebimentos.forEach(r => {
                html += `
                    <tr class="border-b hover:bg-gray-50">
                        <td class="px-4 py-3">${new Date(r.DataHoraRegistro).toLocaleString()}</td>
                        <td class="px-4 py-3 font-mono">${r.fk_Estoque_MP_BarCode}</td>
                        <td class="px-4 py-3">Berço ${r.fk_Berco_ID || '-'} / Prat. ${r.Prateleira_Ocupada || '-'}</td>
                    </tr>
                `;
            });
        }
        html += '</tbody></table></div>';
        div.innerHTML = html;
    }

});
document.addEventListener('DOMContentLoaded', () => {
    // Variáveis para guardar as instâncias dos gráficos
    let stockChartInstance = null;
    let consumptionChartInstance = null;

    /**
     * Função principal para buscar os dados do dashboard e renderizar a página.
     */
    const fetchDashboardData = async () => {
        try {
            const response = await fetch('/api/dashboard/gestao');
            if (!response.ok) {
                throw new Error(`Falha ao carregar dados: ${response.statusText}`);
            }
            const data = await response.json();

            // 1. Preencher KPIs
            document.getElementById('kpi-total-stock').textContent = data.kpis.totalStock || 0;
            document.getElementById('kpi-awaiting-id').textContent = data.kpis.awaitingId || 0;
            document.getElementById('kpi-movements-today').textContent = data.kpis.movementsToday || 0;
            document.getElementById('kpi-units-moved-today').textContent = data.kpis.unitsMovedToday || 0;
            document.getElementById('kpi-total-employees').textContent = data.kpis.totalEmployees || 0;

            // 2. Preencher Tabela de Entradas Recentes
            const entriesBody = document.getElementById('recent-entries-body');
            entriesBody.innerHTML = '';
            if (data.recentEntries && data.recentEntries.length > 0) {
                data.recentEntries.forEach(entry => {
                    const date = new Date(entry.DataHoraRegistro).toLocaleString('pt-BR');
                    entriesBody.innerHTML += `
                        <tr>
                            <td class="px-4 py-2">${date}</td>
                            <td class="px-4 py-2 font-mono">${entry.BarCode}</td>
                            <td class="px-4 py-2">${entry.funcionarioNome}</td>
                        </tr>`;
                });
            } else {
                entriesBody.innerHTML = '<tr><td colspan="3" class="text-center p-4">Nenhuma entrada recente.</td></tr>';
            }

            // 3. Preencher Tabela de Movimentações Recentes
            const movementsBody = document.getElementById('recent-movements-body');
            movementsBody.innerHTML = '';
            if (data.recentMovements && data.recentMovements.length > 0) {
                data.recentMovements.forEach(mov => {
                    const date = new Date(mov.DataHoraMovimento).toLocaleString('pt-BR');
                    movementsBody.innerHTML += `
                        <tr>
                            <td class="px-4 py-2">${date}</td>
                            <td class="px-4 py-2 font-mono">${mov.BarCode}</td>
                            <td class="px-4 py-2 text-center font-bold">${mov.quantidadeMovida}</td>
                            <td class="px-4 py-2">${mov.maquinaNome}</td>
                            <!-- CÉLULA ADICIONADA -->
                            <td class="px-4 py-2">${mov.funcionarioNome}</td>
                        </tr>`;
                });
            } else {
                movementsBody.innerHTML = '<tr><td colspan="5" class="text-center p-4">Nenhuma movimentação recente.</td></tr>';
            }

            // 4. Renderizar Gráficos
            renderStockChart(data.stockByType || []);
            renderConsumptionChart(data.consumptionByMachine || []);

        } catch (error) {
            console.error("Erro no dashboard:", error);
            // Exibe uma mensagem de erro na página se a API falhar
            document.querySelector('.container').innerHTML = `
                <h1 class="text-3xl text-center text-red-600 font-bold">Não foi possível carregar os dados do dashboard.</h1>
                <p class="text-center text-gray-600 mt-2">Verifique o console para mais detalhes.</p>`;
        }
    };

    /**
     * Renderiza o gráfico de composição do estoque.
     * @param {Array} stockData - Dados do estoque por tipo.
     */
    const renderStockChart = (stockData) => {
        if (stockChartInstance) stockChartInstance.destroy();
        const ctx = document.getElementById('stockChart').getContext('2d');

        stockChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: stockData.map(item => item.tipo),
                datasets: [{
                    label: 'Lotes por Tipo',
                    data: stockData.map(item => item.lotes),
                    backgroundColor: ['#4F46E5', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'],
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const dataIndex = context.dataIndex;
                                const item = stockData[dataIndex];
                                return [`Lotes: ${item.lotes}`, `Quantidade Total: ${item.totalQuantidade || 0}`];
                            }
                        }
                    }
                }
            }
        });
    };

    /**
     * Renderiza o gráfico de consumo por máquina.
     * @param {Array} consumptionData - Dados de consumo por máquina.
     */
    const renderConsumptionChart = (consumptionData) => {
        if (consumptionChartInstance) consumptionChartInstance.destroy();
        const ctx = document.getElementById('consumptionChart').getContext('2d');
        consumptionChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: consumptionData.map(item => item.Modelo),
                datasets: [{
                    label: 'Unidades Consumidas',
                    data: consumptionData.map(item => item.totalMovido),
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y', // Gráfico de barras horizontais
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true } }
            }
        });
    };

    // --- Inicialização ---
    fetchDashboardData();
});
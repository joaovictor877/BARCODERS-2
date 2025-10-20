//js/gestao.js

document.addEventListener('DOMContentLoaded', () => {
    // Variáveis para guardar as instâncias dos gráficos e poder destruí-las depois
    let stockChartInstance = null;
    let consumptionChartInstance = null;

    const fetchDashboardData = async () => {
        try {
            const response = await fetch('/api/dashboard/gestao');
            if (!response.ok) {
                throw new Error(`Falha ao carregar dados: ${response.statusText}`);
            }
            const data = await response.json();

            // 1. Preencher KPIs (lendo as propriedades corretas com fallback para 0)
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
                    entriesBody.innerHTML += `<tr><td class="px-4 py-2">${date}</td><td class="px-4 py-2 font-mono">${entry.BarCode}</td><td class="px-4 py-2">${entry.funcionarioNome}</td></tr>`;
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
                    movementsBody.innerHTML += `<tr>
                        <td class="px-4 py-2">${date}</td>
                        <td class="px-4 py-2 font-mono">${mov.BarCode}</td>
                        <td class="px-4 py-2 text-center font-bold">${mov.quantidadeMovida}</td>
                        <td class="px-4 py-2">${mov.maquinaNome}</td>
                    </tr>`;
                });
            } else {
                movementsBody.innerHTML = '<tr><td colspan="4" class="text-center p-4">Nenhuma movimentação recente.</td></tr>';
            }

            // 4. Renderizar Gráficos (com verificação para evitar erros)
            const stockData = data.stockByType || [];
            const consumptionData = data.consumptionByMachine || [];
            renderStockChart(stockData);
            renderConsumptionChart(consumptionData);

        } catch (error) {
            console.error("Erro no dashboard:", error);
            document.querySelector('.container').innerHTML = '<h1 class="text-3xl text-center text-red-600 font-bold">Não foi possível carregar os dados do dashboard.</h1><p class="text-center text-gray-600 mt-2">Verifique o console para mais detalhes.</p>';
        }
    };

    const renderStockChart = (stockData) => {
    // Destrói o gráfico anterior se ele existir, para evitar sobreposição
    if (window.stockChartInstance) window.stockChartInstance.destroy();

    const ctx = document.getElementById('stockChart').getContext('2d');
    
    window.stockChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: stockData.map(item => item.tipo),
            datasets: [{
                label: 'Lotes por Tipo',
                // O tamanho da fatia do gráfico  é baseado na CONTAGEM de lotes
                data: stockData.map(item => item.lotes),
                backgroundColor: ['rgba(75, 192, 192, 0.7)', 'rgba(255, 99, 132, 0.7)', 'rgba(255, 206, 86, 0.7)', 'rgba(54, 162, 235, 0.7)', 'rgba(153, 102, 255, 0.7)'],
                borderColor: '#fff', 
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        // Esta função é chamada para cada linha do tooltip
                        label: function(context) {
                            // Pega o objeto de dados completo para a fatia atual
                            const dataIndex = context.dataIndex;
                            const item = stockData[dataIndex];
                            
                            // Cria as linhas de texto para o tooltip
                            const lotesLabel = `Lotes: ${item.lotes}`;
                            const quantidadeLabel = `Quantidade Total: ${item.totalQuantidade || 0}`;
                            
                            // Retorna um array de strings, onde cada string é uma linha
                            return [lotesLabel, quantidadeLabel];
                        }
                    }
                }
            }
        }
    });
};

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
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true } }
            }
        });
    };

    fetchDashboardData();
});
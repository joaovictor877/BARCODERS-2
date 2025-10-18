//js/gestao.js

document.addEventListener('DOMContentLoaded', () => {
    const fetchDashboardData = async () => {
        try {
            const response = await fetch('/api/dashboard/gestao');
            if (!response.ok) throw new Error('Falha ao carregar dados');
            const data = await response.json();

            // 1. Preencher KPIs
            document.getElementById('kpi-total-stock').textContent = data.kpis.totalStock;
            document.getElementById('kpi-awaiting-id').textContent = data.kpis.awaitingId;
            document.getElementById('kpi-movements-today').textContent = data.kpis.movementsToday;
            document.getElementById('kpi-total-employees').textContent = data.kpis.totalEmployees;

            // 2. Preencher Tabela de Entradas Recentes
            const entriesBody = document.getElementById('recent-entries-body');
            entriesBody.innerHTML = ''; // Limpa o "Carregando..."
            if (data.recentEntries.length > 0) {
                data.recentEntries.forEach(entry => {
                    const date = new Date(entry.DataHoraRegistro).toLocaleString('pt-BR');
                    const row = `<tr>
                        <td class="px-4 py-2">${date}</td>
                        <td class="px-4 py-2 font-mono">${entry.BarCode}</td>
                        <td class="px-4 py-2">${entry.FuncionarioNome}</td>
                    </tr>`;
                    entriesBody.innerHTML += row;
                });
            } else {
                entriesBody.innerHTML = '<tr><td colspan="3" class="text-center p-4">Nenhuma entrada recente.</td></tr>';
            }

            // 3. Preencher Tabela de Movimentações Recentes
            const movementsBody = document.getElementById('recent-movements-body');
            movementsBody.innerHTML = '';
            if (data.recentMovements.length > 0) {
                data.recentMovements.forEach(mov => {
                    const date = new Date(mov.DataHoraMovimento).toLocaleString('pt-BR');
                    const row = `<tr>
                        <td class="px-4 py-2">${date}</td>
                        <td class="px-4 py-2 font-mono">${mov.BarCode}</td>
                        <td class="px-4 py-2">${mov.MaquinaNome}</td>
                    </tr>`;
                    movementsBody.innerHTML += row;
                });
            } else {
                movementsBody.innerHTML = '<tr><td colspan="3" class="text-center p-4">Nenhuma movimentação recente.</td></tr>';
            }

            // 4. Renderizar Gráfico de Estoque
            renderStockChart(data.stockByType);

        } catch (error) {
            console.error("Erro no dashboard:", error);
            document.querySelector('.container').innerHTML = '<p class="text-red-500 text-center">Não foi possível carregar os dados do dashboard.</p>';
        }
    };

    const renderStockChart = (stockData) => {
        const ctx = document.getElementById('stockChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut', 
            data: {
                labels: stockData.map(item => item.tipo),
                datasets: [{
                    label: 'Lotes por Tipo',
                    data: stockData.map(item => item.quantidade),
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(153, 102, 255, 0.7)',
                        'rgba(255, 159, 64, 0.7)'
                    ],
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                }
            }
        });
    };

    fetchDashboardData();
});
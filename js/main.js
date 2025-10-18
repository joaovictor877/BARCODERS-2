// Navegação suave sem alterar a URL
function setupSmoothScroll() {
    document.querySelectorAll('a[data-scroll]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('data-scroll');
            const target = document.getElementById(targetId);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', setupSmoothScroll);

// Estatísticas dinâmicas (simulação de dados vindos do banco)
async function fetchStats() {
    // Busca os dados de estoque do backend
    try {
        const response = await fetch('/estoque');
        const estoque = await response.json();
        // Exibe cada lote de matéria-prima como estatística
        return estoque.slice(0, 4).map(item => ({
            value: item.BarCode,
            label: `Tipo: ${item.fk_Tipos_MP_TipoMP} | Qtd: ${item.Quantidade}`
        }));
    } catch (error) {
        // Se falhar, mostra mensagem de erro
        return [{ value: 'Erro', label: 'Não foi possível carregar os dados do banco.' }];
    }
}

async function renderStats() {
    const stats = await fetchStats();
    const grid = document.getElementById('statsGrid');
    if (grid) {
        grid.innerHTML = '';
        stats.forEach(stat => {
            const div = document.createElement('div');
            div.className = 'bg-white bg-opacity-10 rounded-lg p-6';
            div.innerHTML = `
                <div class="text-3xl font-bold text-white mb-2">${stat.value}</div>
                <div class="text-indigo-200">${stat.label}</div>
            `;
            grid.appendChild(div);
        });
    }
}
document.addEventListener('DOMContentLoaded', renderStats);

// Upload de imagem de tecnologia
function uploadTechImage(element, techName) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                element.innerHTML = `<img src="${e.target.result}" alt="${techName}" class="w-full h-full object-contain rounded-lg">`;
                element.classList.remove('tech-image-placeholder');
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}

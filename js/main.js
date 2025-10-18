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


// Estatísticas reais do backend
async function fetchStats() {
    try {
        // Detecta ambiente local ou produção
        const apiUrl = window.location.hostname === 'localhost'
            ? 'http://localhost:3000/api/estatisticas'
            : '/api/estatisticas';
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Erro ao buscar estatísticas');
        const stats = await response.json();
        return stats;
    } catch (error) {
        return [{ value: 'Erro', label: 'Não foi possível carregar estatísticas.' }];
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

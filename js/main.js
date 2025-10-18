// js/main.js

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

// Executa a configuração da rolagem suave quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', setupSmoothScroll);

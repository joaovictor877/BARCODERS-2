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


/*evento de clique a todos os link com # quando clicado correspondente a uma página de com efeito deslizante*/

    document.addEventListener("DOMContentLoaded", function () {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();

                document.querySelector(this.getAttribute('href')).scrollIntoView({
                    behavior: 'smooth'
                });
            });
        });
    });
    
// Executa a configuração da rolagem suave quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', setupSmoothScroll);

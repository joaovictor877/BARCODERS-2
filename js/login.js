// js/login.js

// Defina o endpoint do backend para produção
var API_ENDPOINT = 'https://barcoders.azurewebsites.net';

document.addEventListener('DOMContentLoaded', function () {
    const loginBtn = document.getElementById('loginBtn');
    const loginModal = document.getElementById('loginModal');
    const closeModal = document.getElementById('closeModal');
    const loginForm = document.getElementById('loginForm');
    const loginErrorMessage = document.getElementById('loginErrorMessage');

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            loginModal.classList.remove('hidden');
        });
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            loginModal.classList.add('hidden');
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(loginForm);
            const endpoint = `${API_ENDPOINT}/api/login`; 

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    body: JSON.stringify(Object.fromEntries(formData)),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Redireciona para a URL fornecida pelo backend
                    window.location.href = data.redirectUrl; 
                } else {
                    loginErrorMessage.textContent = data.message || 'Email ou senha inválidos.';
                    loginErrorMessage.classList.remove('hidden');
                }
            } catch (error) {
                console.error('Erro no login:', error);
                loginErrorMessage.textContent = 'Erro de conexão. Tente novamente.';
                loginErrorMessage.classList.remove('hidden');
            }
        });
    }
});
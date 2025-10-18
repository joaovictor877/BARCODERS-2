if (typeof API_ENDPOINT === 'undefined') {
    var API_ENDPOINT = 'https://barcoders.azurewebsites.net';
}
// var API_ENDPOINT = 'https://barcoders.azurewebsites.net'; --- IGNORE ---
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
            
            // Clear previous error messages
            loginErrorMessage.classList.add('hidden');
            
            e.preventDefault();

            // Crie o formData antes de acessar os campos
            const formData = new FormData(loginForm);

            // Validate form data before sending
            const email = formData.get('email');
            const password = formData.get('password');
            
            if (!email || !password) {
                loginErrorMessage.textContent = 'Por favor, preencha todos os campos.';
                loginErrorMessage.classList.remove('hidden');
                return;
            }
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
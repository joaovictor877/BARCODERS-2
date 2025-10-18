// js/login.js

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

    const form = document.getElementById('loginForm');
    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            const username = form.username.value;
            const password = form.password.value;

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                if (!response.ok) {
                    alert('Login failed!');
                    return;
                }

                const data = await response.json();
                // Handle successful login (e.g., redirect, store token, etc.)
                alert('Login successful!');
                // window.location.href = '/dashboard'; // Example redirect
            } catch (error) {
                alert('Error connecting to server.');
            }
        });
    }
});
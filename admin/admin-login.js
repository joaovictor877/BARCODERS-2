// admin-login.js

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('loginForm');
    const btn = document.getElementById('loginBtn');
    const btnText = document.getElementById('loginBtnText');
    const spinner = document.getElementById('loginSpinner');
    const errorMsg = document.getElementById('loginError');

    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            errorMsg.classList.add('hidden');
            btn.disabled = true;
            btnText.textContent = 'Entrando...';
            spinner.classList.remove('hidden');
            const cpf = form.cpf.value.trim();
            const password = form.password.value;
            try {
                const apiUrl = window.location.hostname === 'localhost'
                    ? 'http://localhost:3000/api/login'
                    : '/api/login';
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cpf, password })
                });
                const result = await response.json();
                if (response.ok && result.success) {
                    // Redireciona para página de administração
                    window.location.href = 'contatos.html';
                } else {
                    errorMsg.textContent = result.message || 'CPF ou senha incorretos';
                    errorMsg.classList.remove('hidden');
                }
            } catch (err) {
                errorMsg.textContent = 'Erro ao conectar com o servidor.';
                errorMsg.classList.remove('hidden');
            } finally {
                btn.disabled = false;
                btnText.textContent = 'Entrar';
                spinner.classList.add('hidden');
            }
        });
    }
});

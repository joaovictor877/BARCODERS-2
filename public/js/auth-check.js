// Interceptor global para tratar erros de sessão expirada
// Adicione este script em todas as páginas protegidas

// Função auxiliar para fazer fetch com tratamento de sessão
async function fetchWithAuth(url, options = {}) {
    try {
        const response = await fetch(url, options);
        
        // Se retornou HTML em vez de JSON, provavelmente sessão expirou
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
            alert('Sessão expirada! Faça login novamente.');
            window.location.href = '/';
            return null;
        }
        
        // Se não foi autorizado, redireciona
        if (response.status === 401 || response.status === 403) {
            alert('Acesso negado! Faça login novamente.');
            window.location.href = '/';
            return null;
        }
        
        return response;
    } catch (error) {
        // Se erro de parsing JSON, provavelmente é HTML
        if (error.message.includes('Unexpected token') || error.message.includes('JSON')) {
            alert('Sessão expirada! Faça login novamente.');
            window.location.href = '/';
            return null;
        }
        throw error;
    }
}

// Interceptor global de erros não capturados
window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.message) {
        const msg = event.reason.message;
        if (msg.includes('Unexpected token') && msg.includes('<!DOCTYPE')) {
            event.preventDefault();
            alert('Sessão expirada! Faça login novamente.');
            window.location.href = '/';
        }
    }
});

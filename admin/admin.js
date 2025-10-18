// admin.js - Busca e exibe os contatos recebidos

async function fetchContatos() {
    try {
        const apiUrl = window.location.hostname === 'localhost'
            ? 'http://localhost:3000/api/contatos'
            : '/api/contatos';
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Erro ao buscar contatos');
        return await response.json();
    } catch (error) {
        return [];
    }
}

async function renderContatos() {
    const contatos = await fetchContatos();
    const tbody = document.getElementById('contatosTable');
    tbody.innerHTML = '';
    if (contatos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="py-4 text-center text-gray-500">Nenhum contato encontrado.</td></tr>';
        return;
    }
    contatos.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="py-2 px-4 border-b">${c.id}</td>
            <td class="py-2 px-4 border-b">${c.nome}</td>
            <td class="py-2 px-4 border-b">${c.email}</td>
            <td class="py-2 px-4 border-b">${c.assunto}</td>
            <td class="py-2 px-4 border-b">${c.mensagem}</td>
            <td class="py-2 px-4 border-b">${c.data_envio ? new Date(c.data_envio).toLocaleString() : ''}</td>
            <td class="py-2 px-4 border-b">${c.projeto || ''}</td>
        `;
        tbody.appendChild(tr);
    });
}

document.addEventListener('DOMContentLoaded', renderContatos);

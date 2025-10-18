//js/admin.js

document.addEventListener('DOMContentLoaded', () => {
    // --- SELETORES GLOBAIS ---
    const modal = document.getElementById('admin-modal');
    const modalContent = document.getElementById('modal-content');

    let allData = {}; // Cache para guardar todos os dados da API

    // --- FUNÇÕES DE RENDERIZAÇÃO ---

    const renderMachines = (machines) => {
        const tableBody = document.getElementById('machines-table-body');
        tableBody.innerHTML = '';
        machines.forEach(m => {
            const row = `<tr>
                <td class="px-4 py-2">${m.Modelo}</td>
                <td class="px-4 py-2"><button class="edit-machine-btn text-indigo-600 hover:underline" data-id="${m.Identificacao}" data-modelo="${m.Modelo}">Editar</button></td>
            </tr>`;
            tableBody.innerHTML += row;
        });
    };

    const renderMaterials = (materials) => {
        const tableBody = document.getElementById('materials-table-body');
        tableBody.innerHTML = '';
        materials.forEach(m => {
            const row = `<tr>
                <td class="px-4 py-2">${m.TipoMP}</td>
                <td class="px-4 py-2"><button class="edit-material-btn text-indigo-600 hover:underline" data-tipo="${m.TipoMP}">Editar</button></td>
            </tr>`;
            tableBody.innerHTML += row;
        });
    };

    const renderCompatibility = (compatibilities, materials, machines) => {
        const tableBody = document.getElementById('compatibility-table-body');
        const materialSelect = document.getElementById('comp-material-select');
        const machineSelect = document.getElementById('comp-machine-select');
        
        tableBody.innerHTML = '';
        materialSelect.innerHTML = materials.map(m => `<option value="${m.TipoMP}">${m.TipoMP}</option>`).join('');
        machineSelect.innerHTML = machines.map(m => `<option value="${m.Identificacao}">${m.Modelo}</option>`).join('');

        compatibilities.forEach(c => {
            const material = materials.find(m => m.TipoMP === c.tipoMP);
            const machine = machines.find(m => m.Identificacao === c.maquinaId);
            if (!material || !machine) return; 

            const row = `<tr>
                <td class="px-4 py-2">${material.TipoMP}</td>
                <td class="px-4 py-2">${machine.Modelo}</td>
                <td class="px-4 py-2"><button class="remove-comp-btn text-red-600 hover:underline" data-tipo="${c.tipoMP}" data-maquina-id="${c.maquinaId}">Remover</button></td>
            </tr>`;
            tableBody.innerHTML += row;
        });
    };

    // --- FUNÇÕES DE MODAL ---

    const showModal = (content) => {
        modalContent.innerHTML = content;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.querySelector('.close-modal-btn')?.addEventListener('click', closeModal);
    };

    const closeModal = () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modalContent.innerHTML = '';
    };

    // --- FUNÇÃO PRINCIPAL DE BUSCA E RENDERIZAÇÃO ---

    const fetchAndRender = async () => {
        try {
            const response = await fetch('/api/admin/data');
            if (!response.ok) throw new Error('Falha na resposta da API');
            allData = await response.json();
            
            renderMachines(allData.machines);
            renderMaterials(allData.materials);
            renderCompatibility(allData.compatibilities, allData.materials, allData.machines);
        } catch (error) {
            console.error("Falha ao carregar dados do admin:", error);
            alert('Não foi possível carregar os dados do painel.');
        }
    };

    // --- LÓGICA DE EVENTOS ---

    // Adicionar Funcionário
    document.getElementById('add-employee-btn').addEventListener('click', () => {
    const content = `
        <h2 class="text-2xl font-bold mb-4">Adicionar Novo Funcionário</h2>
        <form id="employee-form" class="space-y-4" novalidate>
            <div>
                <input type="text" name="nome" placeholder="Nome Completo" required class="w-full p-2 border rounded">
            </div>
            <div>
                <input type="email" name="email" id="employee-email" placeholder="Email" required class="w-full p-2 border rounded">
                <p id="email-error" class="text-red-500 text-xs mt-1 hidden"></p>
            </div>
            <div>
                <input type="text" name="cpf" id="employee-cpf" placeholder="CPF" required class="w-full p-2 border rounded">
                <p id="cpf-error" class="text-red-500 text-xs mt-1 hidden"></p>
            </div>
            <input type="password" name="senha" placeholder="Senha" required class="w-full p-2 border rounded">
            
            <!-- CAMPO CARGO TRANSFORMADO EM SELECT -->
            <div>
                <label for="employee-cargo" class="text-sm font-medium text-gray-700">Cargo</label>
                <select name="cargo" id="employee-cargo" class="w-full p-2 border rounded mt-1">
                    <option value="" disabled selected>Selecione um cargo...</option>
                    <option value="Conferente">Conferente</option>
                    <option value="Inspetor de Qualidade">Inspetor de Qualidade</option>
                    <option value="Alimentador de Linha">Alimentador de Linha</option>
                    <option value="Gerente de Produção">Gerente de Produção</option>
                    <option value="Administrador">Administrador</option>
                </select>
            </div>

            <!-- CAMPO NIVEL DE ACESSO AUTOMÁTICO E SOMENTE LEITURA -->
            <div>
                <label for="employee-nivel" class="text-sm font-medium text-gray-700">Nível de Acesso</label>
                <input type="text" name="nivelAcesso" id="employee-nivel" readonly class="w-full p-2 border rounded bg-gray-100 cursor-not-allowed mt-1" placeholder="Definido pelo cargo">
            </div>

            <div class="mt-4 flex justify-end gap-2">
                <button type="button" class="close-modal-btn px-4 py-2 bg-gray-300 rounded">Cancelar</button>
                <button type="submit" id="save-employee-btn" class="px-4 py-2 bg-blue-500 text-white rounded">Salvar</button>
            </div>
        </form>
    `;
    showModal(content);

    // --- LÓGICA DA MÁSCARA, VALIDAÇÃO E MAPEAMENTO DE CARGO ---
    const form = document.getElementById('employee-form');
    const emailInput = document.getElementById('employee-email');
    const cpfInput = document.getElementById('employee-cpf');
    const cargoSelect = document.getElementById('employee-cargo');
    const nivelInput = document.getElementById('employee-nivel');
    const emailError = document.getElementById('email-error');
    const cpfError = document.getElementById('cpf-error');
    const saveBtn = document.getElementById('save-employee-btn');

    // 1. Aplica a máscara de CPF 
    const cpfMask = IMask(cpfInput, { mask: '000.000.000-00' });
    
    // 2. Mapeamento de Cargo para Nível de Acesso
    const cargoNivelMap = {
        'Conferente': 'Usuario',
        'Inspetor de Qualidade': 'Usuario',
        'Alimentador de Linha': 'Usuario',
        'Gerente de Produção': 'Gestor',
        'Administrador': 'Total'
    };

    // 3. Evento que atualiza o nível quando o cargo muda
    cargoSelect.addEventListener('change', () => {
        const selectedCargo = cargoSelect.value;
        const nivel = cargoNivelMap[selectedCargo] || '';
        nivelInput.value = nivel;
    });

    // 4. Função de verificação 
    const checkExistence = async (field, value) => {
        try {
            const response = await fetch('/api/admin/employees/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: value })
            });
            const result = await response.json();
            
            let emailHasError = !emailError.classList.contains('hidden');
            let cpfHasError = !cpfError.classList.contains('hidden');

            if (field === 'email') {
                emailError.textContent = result.emailExists ? 'Este email já está em uso.' : '';
                emailError.classList.toggle('hidden', !result.emailExists);
                emailHasError = result.emailExists;
            }
            if (field === 'cpf') {
                cpfError.textContent = result.cpfExists ? 'Este CPF já está em uso.' : '';
                cpfError.classList.toggle('hidden', !result.cpfExists);
                cpfHasError = result.cpfExists;
            }
            
            saveBtn.disabled = emailHasError || cpfHasError;
        } catch (error) { console.error('Erro na verificação:', error); }
    };

    // 5. Adiciona os gatilhos de verificação
    emailInput.addEventListener('blur', () => checkExistence('email', emailInput.value));
    cpfInput.addEventListener('blur', () => checkExistence('cpf', cpfMask.unmaskedValue));

    // 6. Lógica de submissão do formulário
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        saveBtn.disabled = true;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        data.cpf = cpfMask.unmaskedValue;

        const response = await fetch('/api/admin/employees', { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify(data) 
        });
        
        const result = await response.json();

        if (response.ok) {
            closeModal();
            alert(result.message);
        } else {
            alert(`Erro: ${result.message}`);
            saveBtn.disabled = false;
        }
    });
    });

    // Adicionar Máquina
    document.getElementById('add-machine-btn').addEventListener('click', () => {
        const content = `
            <h2 class="text-2xl font-bold mb-4">Adicionar Nova Máquina</h2>
            <form id="machine-form">
                <input type="text" name="modelo" placeholder="Modelo da Máquina" required class="w-full p-2 border rounded">
                <div class="mt-4 flex justify-end gap-2">
                    <button type="button" class="close-modal-btn px-4 py-2 bg-gray-300 rounded">Cancelar</button>
                    <button type="submit" class="px-4 py-2 bg-blue-500 text-white rounded">Salvar</button>
                </div>
            </form>
        `;
        showModal(content);
        document.getElementById('machine-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            await fetch('/api/admin/machines', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(Object.fromEntries(formData)) });
            closeModal();
            fetchAndRender();
        });
    });
    
    // Adicionar Tipo de Material
    document.getElementById('add-material-btn').addEventListener('click', () => {
        const content = `
            <h2 class="text-2xl font-bold mb-4">Adicionar Tipo de Material</h2>
            <form id="material-form">
                <input type="text" name="tipoMP" placeholder="Nome do Material" required class="w-full p-2 border rounded">
                <div class="mt-4 flex justify-end gap-2">
                    <button type="button" class="close-modal-btn px-4 py-2 bg-gray-300 rounded">Cancelar</button>
                    <button type="submit" class="px-4 py-2 bg-blue-500 text-white rounded">Salvar</button>
                </div>
            </form>
        `;
        showModal(content);
        document.getElementById('material-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            await fetch('/api/admin/materials', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(Object.fromEntries(formData)) });
            closeModal();
            fetchAndRender();
        });
    });

    // Delegação de Eventos para botões de Editar e Remover
    document.body.addEventListener('click', async (e) => {
        // Editar Máquina
        if (e.target.classList.contains('edit-machine-btn')) {
            const id = e.target.dataset.id;
            const modelo = e.target.dataset.modelo;
            const content = `
                <h2 class="text-2xl font-bold mb-4">Editar Máquina</h2>
                <form id="edit-machine-form">
                    <input type="text" name="modelo" value="${modelo}" required class="w-full p-2 border rounded">
                    <div class="mt-4 flex justify-end gap-2">
                        <button type="button" class="close-modal-btn px-4 py-2 bg-gray-300 rounded">Cancelar</button>
                        <button type="submit" class="px-4 py-2 bg-blue-500 text-white rounded">Salvar</button>
                    </div>
                </form>
            `;
            showModal(content);
            document.getElementById('edit-machine-form').addEventListener('submit', async (ev) => {
                ev.preventDefault();
                const formData = new FormData(ev.target);
                await fetch(`/api/admin/machines/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(Object.fromEntries(formData)) });
                closeModal();
                fetchAndRender();
            });
        }

        // Editar Material
        if (e.target.classList.contains('edit-material-btn')) {
            const tipo = e.target.dataset.tipo;
            const content = `
                <h2 class="text-2xl font-bold mb-4">Editar Tipo de Material</h2>
                <form id="edit-material-form">
                    <input type="text" name="novoTipoMP" value="${tipo}" required class="w-full p-2 border rounded">
                    <div class="mt-4 flex justify-end gap-2">
                        <button type="button" class="close-modal-btn px-4 py-2 bg-gray-300 rounded">Cancelar</button>
                        <button type="submit" class="px-4 py-2 bg-blue-500 text-white rounded">Salvar</button>
                    </div>
                </form>
            `;
            showModal(content);
            document.getElementById('edit-material-form').addEventListener('submit', async (ev) => {
                ev.preventDefault();
                const formData = new FormData(ev.target);
                await fetch(`/api/admin/materials/${encodeURIComponent(tipo)}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(Object.fromEntries(formData)) });
                closeModal();
                fetchAndRender();
            });
        }

        // Remover Compatibilidade
        if (e.target.classList.contains('remove-comp-btn')) {
            if (confirm('Tem certeza que deseja remover esta compatibilidade?')) {
                const tipoMP = e.target.dataset.tipo;
                const maquinaId = e.target.dataset.maquinaId;
                await fetch('/api/admin/compatibility', { method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ tipoMP, maquinaId }) });
                fetchAndRender();
            }
        }
    });
    
    // Adicionar Compatibilidade
    document.getElementById('compatibility-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            tipoMP: document.getElementById('comp-material-select').value,
            maquinaId: document.getElementById('comp-machine-select').value
        };
        await fetch('/api/admin/compatibility', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
        fetchAndRender();
    });

    // --- INICIALIZAÇÃO ---
    fetchAndRender();
});
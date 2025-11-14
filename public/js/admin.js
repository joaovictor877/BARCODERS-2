// js/admin.js

const MODEL_URL = '/models';
let currentModalType = '';  // 'employee', 'machine', 'material'
let currentEditId = null;  // Para edição
let video, canvas, displaySize;

document.addEventListener('DOMContentLoaded', () => {
    // Carrega dados iniciais
    loadEmployees();
    loadMachines();
    loadMaterials();
    loadCompatibilities();

    // Event listeners para botões de adicionar
    document.getElementById('add-employee-btn').addEventListener('click', () => openModal('employee', null));
    document.getElementById('add-machine-btn').addEventListener('click', () => openModal('machine', null));
    document.getElementById('add-material-btn').addEventListener('click', () => openModal('material', null));

    // Form de compatibilidade
    document.getElementById('compatibility-form').addEventListener('submit', addCompatibility);

    // Fecha modal clicando fora
    document.getElementById('admin-modal').addEventListener('click', (e) => {
        if (e.target.id === 'admin-modal') closeModal();
    });
});

/**
 * Abre o modal, gera o conteúdo e inicializa as funcionalidades específicas.
 */
function openModal(type, editId) {
    currentModalType = type;
    currentEditId = editId;
    const modalContent = document.getElementById('modal-content');
    modalContent.innerHTML = generateModalContent(type, editId);
    document.getElementById('admin-modal').classList.remove('hidden');

    if (type === 'employee') {
        setupFacialCapture();

        // Aplica a máscara de CPF
        IMask(document.getElementById('employee-cpf'), { mask: '000.000.000-00' });

        // Adiciona a lógica para definir o nível de acesso automático
        const cargoSelect = document.getElementById('employee-cargo');
        const nivelInput = document.getElementById('employee-nivel');
        cargoSelect.addEventListener('change', (e) => {
            const cargo = e.target.value;
            let nivel = 'Usuario'; // Padrão
            if (cargo === 'Administrador') nivel = 'Total';
            if (cargo === 'Gerente de Produção') nivel = 'Gestor';
            nivelInput.value = nivel;
        });

        if (editId) {
            loadEmployeeData(editId);
        }
        
    } else if (type === 'machine') {
        if (editId) loadMachineData(editId);
    } else if (type === 'material') {
        if (editId) loadMaterialData(editId);
    }
}

/**
 *  Gera o conteúdo HTML do formulário de funcionário.
 */
function generateModalContent(type, editId) {
    const isEdit = !!editId;
    let title = isEdit ? 'Editar' : 'Adicionar';
    let formId = '';

    // Define o título e o ID do formulário com base no tipo
    if (type === 'employee') { title += ' Funcionário'; formId = 'employee-form'; }
    if (type === 'machine') { title += ' Máquina'; formId = 'machine-form'; }
    if (type === 'material') { title += ' Material'; formId = 'material-form'; }

    let content = `<h3 class="text-xl font-semibold mb-4">${title}</h3>
                   <form id="${formId}">
                       <div class="space-y-4">
                           <input type="hidden" id="${type}-id" value="${editId || ''}">`;

    if (type === 'employee') {
        content += `
            <input type="text" id="employee-nome" placeholder="Nome Completo" class="w-full px-4 py-3 border rounded-lg" required>
            <input type="email" id="employee-email" placeholder="Email" class="w-full px-4 py-3 border rounded-lg" required>
            <input type="text" id="employee-cpf" placeholder="CPF (000.000.000-00)" class="w-full px-4 py-3 border rounded-lg" required>
            <select id="employee-cargo" class="w-full px-4 py-3 border rounded-lg" required>
                <option value="" disabled selected>Selecione o Cargo</option>
                <option value="Administrador">Administrador</option>
                <option value="Gerente de Produção">Gerente de Produção</option>
                <option value="Conferente">Conferente (Recebimento)</option>
                <option value="Inspetor de Qualidade">Inspetor de Qualidade</option>
                <option value="Alimentador de Linha">Alimentador de Linha</option>
            </select>
            <input type="hidden" id="employee-nivel" name="nivelAcesso">
            <div id="facial-section">
                <h4 class="font-medium mb-2">Foto Facial</h4>
                <button type="button" id="capture-facial-btn" class="w-full bg-green-500 text-white py-2 rounded">Capturar Foto Facial</button>
                <div id="facial-camera" class="hidden mt-4">
                    <video id="admin-video" class="w-full rounded-lg" height="240" autoplay muted playsinline></video>
                    <div id="camera-controls-admin" class="flex items-center gap-2 mt-2 hidden">
                        <label for="videoSourceAdmin" class="text-sm">Câmera:</label>
                        <select id="videoSourceAdmin" class="flex-grow p-1 border rounded text-sm"></select>
                    </div>
                    <canvas id="admin-canvas" class="hidden"></canvas>
                    <p id="facial-status" class="text-center text-sm text-gray-600 mt-2">Posicione o rosto...</p>
                    <button type="button" id="capture-foto-btn" class="w-full bg-blue-600 text-white py-2 rounded mt-2">Confirmar Captura</button>
                </div>
                <input type="hidden" id="employee-foto" name="foto">
                <input type="hidden" id="employee-embedding" name="face_embedding">
                <div id="facial-preview" class="mt-2 hidden"></div>
            </div>
        `;
    } else if (type === 'machine') {
        content += `
            <input type="text" id="machine-modelo" placeholder="Modelo da Máquina" class="w-full px-4 py-3 border rounded-lg" required>
            <input type="text" id="machine-identificacao" placeholder="Identificação Única" class="w-full px-4 py-3 border rounded-lg" required ${isEdit ? 'readonly' : ''}>
        `;
    } else if (type === 'material') {
        content += `
            <input type="text" id="material-tipomp" placeholder="Tipo de Material (Ex: Aço Carbono 1020)" class="w-full px-4 py-3 border rounded-lg" required>
        `;
    }
    content += `
            <button type="submit" class="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700">Salvar</button>
            </div></form>
            <button onclick="closeModal()" class="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl">&times;</button>`;
    return content;
}

// Setup captura facial no modal employee
function setupFacialCapture() {
    const captureBtn = document.getElementById('capture-facial-btn');
    if (captureBtn) {
        captureBtn.addEventListener('click', async () => {
            await loadAdminModels();
            const cameraSection = document.getElementById('facial-camera');
            cameraSection.classList.remove('hidden');
            setupAdminCamera();
            document.getElementById('facial-status').textContent = 'Posicione o rosto na câmera e confirme a captura.';
        });
    }

    const fotoBtn = document.getElementById('capture-foto-btn');
    if (fotoBtn) {
        fotoBtn.addEventListener('click', async () => captureAdminFace());
    }
}

// Carrega models para admin
async function loadAdminModels() {
    try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        console.log('Modelos face-api.js carregados para admin.');
    } catch (err) {
        console.error('Erro ao carregar models admin:', err);
        document.getElementById('facial-status').textContent = 'Erro ao carregar modelos de IA.';
    }
}

// Setup câmera admin
function setupAdminCamera() {
    video = document.getElementById('admin-video');
    canvas = document.getElementById('admin-canvas');
    const videoSelect = document.getElementById('videoSourceAdmin');
    const controlsContainer = document.getElementById('camera-controls-admin');
    const codeReader = new faceapi.nets.ssdMobilenetv1.constructor(); // Usamos um objeto temporário só para listar devices
    let selectedDeviceId = null;
    let stream = null;

    const startStream = () => {
        // Para o stream antigo, se existir
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        navigator.mediaDevices.getUserMedia({ 
            video: { 
                deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
                width: { ideal: 320 }, 
                height: { ideal: 240 },
                facingMode: 'user'
            } 
        })
        .then(newStream => {
            stream = newStream;
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                video.play();
                displaySize = { width: video.videoWidth, height: video.videoHeight };
                canvas.width = displaySize.width;
                canvas.height = displaySize.height;
            };
        })
        .catch(err => {
            console.error('Erro câmera admin:', err);
            document.getElementById('facial-status').textContent = `Erro na câmera: ${err.message}.`;
        });
    };

    // Lista os dispositivos de vídeo
    navigator.mediaDevices.enumerateDevices()
        .then(devices => {
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            if (videoDevices.length > 0) {
                selectedDeviceId = videoDevices[0].deviceId; // Padrão

                if (videoDevices.length > 1) {
                    videoSelect.innerHTML = '';
                    videoDevices.forEach(device => {
                        const option = new Option(device.label || `Câmera ${videoSelect.options.length + 1}`, device.deviceId);
                        videoSelect.appendChild(option);
                    });
                    controlsContainer.classList.remove('hidden');
                }
                
                startStream();
            } else {
                 document.getElementById('facial-status').textContent = 'Nenhuma câmera encontrada.';
            }
        });
    
    videoSelect.addEventListener('change', () => {
        selectedDeviceId = videoSelect.value;
        startStream();
    });
}

// Captura face no admin
async function captureAdminFace() {
    const context = canvas.getContext('2d', { willReadFrequently: true });    context.drawImage(video, 0, 0);

    try {
        const input = await faceapi.detectSingleFace(canvas, new faceapi.SsdMobilenetv1Options())
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!input) {
            document.getElementById('facial-status').textContent = 'Nenhuma face detectada. Reposicione e tente novamente.';
            return;
        }

        // Salva foto como base64 (para preview e envio)
        const fotoData = canvas.toDataURL('image/jpeg', 0.8);
        document.getElementById('employee-foto').value = fotoData;

        // Gera embedding (array de 128 floats como JSON)
        const embeddingArray = Array.from(input.descriptor);
        document.getElementById('employee-embedding').value = JSON.stringify(embeddingArray);

        // Preview da foto
        const preview = document.getElementById('facial-preview');
        preview.innerHTML = `<img src="${fotoData}" class="w-full h-32 object-cover rounded" alt="Foto Facial">`;
        preview.classList.remove('hidden');

        document.getElementById('facial-status').textContent = 'Foto e embedding capturados com sucesso! Você pode prosseguir.';
        
        // Para câmera
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
    } catch (err) {
        console.error('Erro na captura admin:', err);
        document.getElementById('facial-status').textContent = 'Erro na análise: ' + err.message;
    }
}

// Carrega dados para edição de employee
async function loadEmployeeData(id) {
    try {
        const response = await fetch(`/api/admin/employees/${id}`);
        const data = await response.json();
        if (response.ok) {
            const emp = data.employee;
            document.getElementById('employee-nome').value = emp.Nome || '';
            document.getElementById('employee-email').value = emp.Email || '';
            document.getElementById('employee-cpf').value = emp.CPF || '';
            document.getElementById('employee-cargo').value = emp.Cargo || '';
            document.getElementById('employee-nivel').value = emp.NivelAcesso || '';
            // Preview se tem foto
            if (emp.fotoBase64) {
                const preview = document.getElementById('facial-preview');
                preview.innerHTML = `<img src="${emp.fotoBase64}" class="w-full h-32 object-cover rounded" alt="Foto Facial Existente">`;
                preview.classList.remove('hidden');
            }
        }
    } catch (err) {
        console.error('Erro ao carregar employee:', err);
        alert('Erro ao carregar dados do funcionário.');
    }
}

// Carrega dados para edição de machine
async function loadMachineData(id) {
    try {
        const response = await fetch(`/api/admin/machines/${id}`);
        const data = await response.json();
        if (response.ok) {
            const machine = data.machine;
            document.getElementById('machine-modelo').value = machine.Modelo || '';
            document.getElementById('machine-identificacao').value = machine.Identificacao || '';
        }
    } catch (err) {
        console.error('Erro ao carregar machine:', err);
        alert('Erro ao carregar dados da máquina.');
    }
}

// Carrega dados para edição de material
async function loadMaterialData(id) {
    try {
        const response = await fetch(`/api/admin/materials/${id}`);
        const data = await response.json();
        if (response.ok) {
            const material = data.material;
            document.getElementById('material-tipo').value = material.TipoMP || '';
        }
    } catch (err) {
        console.error('Erro ao carregar material:', err);
        alert('Erro ao carregar dados do material.');
    }
}

// Fecha modal
function closeModal() {
    document.getElementById('admin-modal').classList.add('hidden');
    if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }
}
document.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const id = form.querySelector('input[type=hidden]').value;
    let url, data, method = 'POST';

    if (form.id === 'employee-form') {
        url = '/api/admin/employees';
        data = {
            id: id || null,
            nome: document.getElementById('employee-nome').value,
            email: document.getElementById('employee-email').value,
            cpf: document.getElementById('employee-cpf').value,
            cargo: document.getElementById('employee-cargo').value,
            foto: document.getElementById('employee-foto').value,
            face_embedding: document.getElementById('employee-embedding').value
        };
    } else if (form.id === 'machine-form') {
        url = '/api/admin/machines';
        if (id) {
            url += `/${id}`;
            method = 'PUT'; // Usa PUT para edição, como esperado pelo backend
        }
        data = {
            modelo: document.getElementById('machine-modelo').value,
            identificacao: document.getElementById('machine-identificacao').value
        };
    } else if (form.id === 'material-form') {
        url = '/api/admin/materials';
        if (id) {
            url += `/${id}`;
            method = 'PUT';
        }
        data = {
            tipoMP: document.getElementById('material-tipomp').value
        };
    }

    if (!url) return;

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (response.ok) {
            alert(result.message);
            closeModal();
            // Recarrega a tabela correspondente
            if (form.id === 'employee-form') loadEmployees();
            if (form.id === 'machine-form') loadMachines();
            if (form.id === 'material-form') {
                loadMaterials();
                loadCompatibilities(); // Materiais afetam a compatibilidade
            }
        } else {
            alert(`Erro: ${result.message}`);
        }
    } catch (err) {
        console.error(`Erro no submit do formulário ${form.id}:`, err);
        alert('Erro de conexão.');
    }
});

// Carrega tabela de funcionários
async function loadEmployees() {
    try {
        const response = await fetch('/api/admin/employees');
        const data = await response.json();
        if (response.ok) {
            const tbody = document.getElementById('employees-table-body');
            tbody.innerHTML = data.employees.map(emp => `
                    <tr>
                        <td class="px-4 py-2">${emp.Nome}</td>
                        <td class="px-4 py-2">${emp.Cargo}</td>
                        <td class="px-4 py-2">${emp.NivelAcesso}</td>
                        <td class="px-4 py-2">
                            <button onclick="openModal('employee', ${emp.IDFuncionario})" class="text-blue-600 hover:underline">Editar</button>
                            <button onclick="deleteItem('employee', ${emp.IDFuncionario})" class="text-red-600 hover:underline ml-2">Deletar</button>
                        </td>
                    </tr>
                `).join('');
        }
    } catch (err) {
        console.error('Erro ao carregar funcionários:', err);
    }
}

// Carrega tabela de máquinas
async function loadMachines() {
    try {
        const response = await fetch('/api/admin/machines');
        const data = await response.json();
        if (response.ok) {
            const tbody = document.getElementById('machines-table-body');
            tbody.innerHTML = data.machines.map(machine => `
                <tr>
                    <td class="px-4 py-2">${machine.Modelo}</td>
                    <td class="px-4 py-2">
                        <button onclick="openModal('machine', ${machine.Identificacao})" class="text-blue-600 hover:underline">Editar</button>
                        <button onclick="deleteItem('machine', ${machine.Identificacao})" class="text-red-600 hover:underline ml-2">Deletar</button>
                    </td>
                </tr>
            `).join('');
            // Preenche select de máquinas em compatibilidade
            populateSelect('comp-machine-select', data.machines, 'Identificacao', 'Modelo');
        }
    } catch (err) {
        console.error('Erro ao carregar máquinas:', err);
    }
}

// Carrega tabela de materiais
async function loadMaterials() {
    try {
        const response = await fetch('/api/admin/materials');
        const data = await response.json();
        if (response.ok) {
            const tbody = document.getElementById('materials-table-body');
            tbody.innerHTML = data.materials.map(material => `
                <tr>
                    <td class="px-4 py-2">${material.TipoMP}</td>
                    <td class="px-4 py-2">
                        <button onclick="openModal('material', '${material.ID}')" class="text-blue-600 hover:underline">Editar</button>
                        <button onclick="deleteItem('material', '${material.ID}')" class="text-red-600 hover:underline ml-2">Deletar</button>
                    </td>
                </tr>
            `).join('');
            // Preenche select de materiais em compatibilidade
            populateSelect('comp-material-select', data.materials, 'ID', 'TipoMP');
        }
    } catch (err) {
        console.error('Erro ao carregar materiais:', err);
    }
}

// Carrega tabela de compatibilidades
async function loadCompatibilities() {
    try {
        const response = await fetch('/api/admin/compatibilities');
        const data = await response.json();
        if (response.ok) {
            const tbody = document.getElementById('compatibility-table-body');
            tbody.innerHTML = data.compatibilities.map(comp => `
                <tr>
                    <td class="px-4 py-2">${comp.TipoMP}</td>
                    <td class="px-4 py-2">${comp.Modelo}</td>
                    <td class="px-4 py-2">
                        <button onclick="deleteCompatibility(${comp.ID})" class="text-red-600 hover:underline">Deletar</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error('Erro ao carregar compatibilidades:', err);
    }
}

// Função helper para popular selects
function populateSelect(selectId, items, valueKey, textKey) {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">Selecione...</option>' + items.map(item => `<option value="${item[valueKey]}">${item[textKey]}</option>`).join('');
}

// Deletar item genérico
async function deleteItem(type, id) {
    if (!confirm(`Confirmar exclusão do ${type}?`)) return;

    const url = `/api/admin/${type}s/${id}`;
    try {
        const response = await fetch(url, { method: 'DELETE' });
        if (response.ok) {
            alert('Item deletado com sucesso!');
            if (type === 'employee') loadEmployees();
            else if (type === 'machine') loadMachines();
            else if (type === 'material') loadMaterials();
            loadCompatibilities();  // Atualiza se afetar
        } else {
            alert('Erro ao deletar.');
        }
    } catch (err) {
        console.error(`Erro ao deletar ${type}:`, err);
        alert('Erro de conexão.');
    }
}

// Adicionar compatibilidade
async function addCompatibility(e) {
    e.preventDefault();
    const material = document.getElementById('comp-material-select').value;
    const machine = document.getElementById('comp-machine-select').value;
    if (!material || !machine) return alert('Selecione material e máquina.');

    try {
        const response = await fetch('/api/admin/compatibilities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipoMP: material, identificacao: machine })
        });
        if (response.ok) {
            alert('Compatibilidade adicionada!');
            loadCompatibilities();
            document.getElementById('compatibility-form').reset();
        } else {
            alert('Erro ao adicionar.');
        }
    } catch (err) {
        console.error('Erro ao adicionar compatibilidade:', err);
        alert('Erro de conexão.');
    }
}

// Deletar compatibilidade
async function deleteCompatibility(id) {
    if (!confirm('Confirmar exclusão da compatibilidade?')) return;

    try {
        const response = await fetch(`/api/admin/compatibilities/${id}`, { method: 'DELETE' });
        if (response.ok) {
            alert('Compatibilidade deletada!');
            loadCompatibilities();
        } else {
            alert('Erro ao deletar.');
        }
    } catch (err) {
        console.error('Erro ao deletar compatibilidade:', err);
        alert('Erro de conexão.');
    }
}
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

// Função para abrir modal
function openModal(type, editId) {
    currentModalType = type;
    currentEditId = editId;
    const modalContent = document.getElementById('modal-content');
    modalContent.innerHTML = generateModalContent(type, editId);
    document.getElementById('admin-modal').classList.remove('hidden');

    // Setup específico
    if (type === 'employee') {
        setupFacialCapture();

        // --- INÍCIO DAS NOVAS MODIFICAÇÕES ---

        // 1. Aplica a máscara de CPF
        const cpfInput = document.getElementById('employee-cpf');
        const cpfMask = IMask(cpfInput, {
            mask: '000.000.000-00'
        });

        // 2. Adiciona a lógica para definir o nível de acesso
        const cargoSelect = document.getElementById('employee-cargo');
        const nivelInput = document.getElementById('employee-nivel');

        cargoSelect.addEventListener('change', (e) => {
            const cargo = e.target.value;
            let nivel = '';
            switch (cargo) {
                case 'Administrador':
                    nivel = 'Total';
                    break;
                case 'Gerente de Produção':
                    nivel = 'Gestor';
                    break;
                case 'Conferente':
                case 'Inspetor de Qualidade':
                case 'Alimentador de Linha':
                    nivel = 'Usuario';
                    break;
            }
            nivelInput.value = nivel;
        });
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
    let content = `<h3 class="text-xl font-semibold mb-4">${isEdit ? 'Editar' : 'Adicionar'} Funcionário</h3>
                   <form id="employee-form" onsubmit="return false;">
                       <div class="space-y-4">
                           <input type="hidden" id="employee-id" value="${editId || ''}">`;

    if (type === 'employee') {
        content += `
            <input type="text" id="employee-nome" placeholder="Nome Completo" class="w-full px-4 py-3 border rounded-lg" required>
            <input type="email" id="employee-email" placeholder="Email" class="w-full px-4 py-3 border rounded-lg" required>
            <input type="text" id="employee-cpf" placeholder="CPF (000.000.000-00)" class="w-full px-4 py-3 border rounded-lg" required>
            <select id="employee-cargo" class="w-full px-4 py-3 border rounded-lg" required>
                <option value="">Selecione o Cargo</option>
                <option value="Administrador">Administrador</option>
                <option value="Gerente de Produção">Gerente de Produção</option>
                <option value="Conferente">Conferente (Recebimento)</option>
                <option value="Inspetor de Qualidade">Inspetor de Qualidade</option>
                <option value="Alimentador de Linha">Alimentador de Linha (Movimentação)</option>
            </select>
            <input type="hidden" id="employee-nivel" name="nivelAcesso">
            <div id="facial-section">
                <h4 class="font-medium mb-2">Foto Facial para Reconhecimento</h4>
                <button type="button" id="capture-facial-btn" class="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600">Capturar Foto Facial</button>
                <div id="facial-camera" class="hidden mt-4">
                    <video id="admin-video" class="w-full rounded-lg" height="240" autoplay muted playsinline></video>
                    <div id="camera-controls-admin" class="flex items-center gap-2 mt-2 hidden">
                        <label for="videoSourceAdmin" class="text-sm">Câmera:</label>
                        <select id="videoSourceAdmin" class="flex-grow p-1 border rounded text-sm"></select>
                    </div>
                    <canvas id="admin-canvas" class="hidden"></canvas>
                    <p id="facial-status" class="text-center text-sm text-gray-600 mt-2">Posicione o rosto...</p>
                    <button type="button" id="capture-foto-btn" class="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 mt-2">Confirmar Captura</button>
                </div>
                <input type="hidden" id="employee-foto" name="foto">
                <input type="hidden" id="employee-embedding" name="face_embedding">
                <div id="facial-preview" class="mt-2 hidden"></div>
            </div>
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
    // Reset facial section
    const facialCamera = document.getElementById('facial-camera');
    if (facialCamera) facialCamera.classList.add('hidden');
    const facialPreview = document.getElementById('facial-preview');
    if (facialPreview) facialPreview.innerHTML = '';
    document.getElementById('employee-foto').value = '';
    document.getElementById('employee-embedding').value = '';
}

// Form submits
document.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    let url, method = 'POST';

    if (form.id === 'employee-form') {
        const id = document.getElementById('employee-id').value;
        url = id ? `/api/admin/employees/${id}` : '/api/admin/employees';
        if (id) method = 'PUT';

        const data = {
            nome: document.getElementById('employee-nome').value,
            email: document.getElementById('employee-email').value,
            cpf: document.getElementById('employee-cpf').value.replace(/\D/g, ''),  // Limpa máscara
            cargo: document.getElementById('employee-cargo').value,
            NivelAcesso: document.getElementById('employee-nivel').value,
            foto: document.getElementById('employee-foto').value,
            face_embedding: document.getElementById('employee-embedding').value
        };

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (response.ok) {
                alert(result.message || 'Funcionário salvo com sucesso!');
                closeModal();
                loadEmployees();
            } else {
                alert('Erro: ' + (result.message || 'Falha ao salvar.'));
            }
        } catch (err) {
            console.error('Erro no submit employee:', err);
            alert('Erro de conexão: ' + err.message);
        }
    } else if (form.id === 'machine-form') {
        const id = document.getElementById('machine-id').value;
        url = id ? `/api/admin/machines/${id}` : '/api/admin/machines';
        if (id) method = 'PUT';

        const data = {
            modelo: document.getElementById('machine-modelo').value,
            identificacao: document.getElementById('machine-identificacao').value
        };

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (response.ok) {
                alert(result.message || 'Máquina salva com sucesso!');
                closeModal();
                loadMachines();
            } else {
                alert('Erro: ' + (result.message || 'Falha ao salvar.'));
            }
        } catch (err) {
            console.error('Erro no submit machine:', err);
            alert('Erro de conexão: ' + err.message);
        }
    } else if (form.id === 'material-form') {
        const id = document.getElementById('material-id').value;
        url = id ? `/api/admin/materials/${id}` : '/api/admin/materials';
        if (id) method = 'PUT';

        const data = {
            tipoMP: document.getElementById('material-tipo').value
        };

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (response.ok) {
                alert(result.message || 'Material salvo com sucesso!');
                closeModal();
                loadMaterials();
                loadCompatibilities();  // Atualiza selects
            } else {
                alert('Erro: ' + (result.message || 'Falha ao salvar.'));
            }
        } catch (err) {
            console.error('Erro no submit material:', err);
            alert('Erro de conexão: ' + err.message);
        }
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
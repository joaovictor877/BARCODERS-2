use estoque;
select * from funcionarios;
INSERT INTO Funcionarios (Nome, CPF, Email, Senha, Cargo, NivelAcesso)
VALUES ('João da Silva', '11122233344', 'joao.silva@empresa.com', '1234', 'Conferente', 'Usuario');

INSERT INTO Funcionarios (Nome, CPF, Email, Senha, Cargo, NivelAcesso)
VALUES ('João de Jesus', '22233344455', 'joao.jesus@empresa.com', '1234', 'Inspetor de Qualidade', 'Usuario');

INSERT INTO Funcionarios (Nome, CPF, Email, Senha, Cargo, NivelAcesso)
VALUES ('Luan Gonçalves', '33344455566', 'Luan.goncalves@empresa.com', '1234', 'Alimentador de Linha', 'Usuario');

INSERT INTO Funcionarios (Nome, CPF, Email, Senha, Cargo, NivelAcesso)
VALUES ('Leonan Gonçalves', '44455566677', 'Leonan.goncalves@empresa.com', '1234', 'Gerente de Produção', 'Gestor');

INSERT INTO Funcionarios (Nome, CPF, Email, Senha, Cargo, NivelAcesso)
VALUES ('Admin', '99988877766', 'admin@barcoders.com', 'admin1234', 'Administrador', 'Total');

-- --- Inserindo dados básicos em Fornecedores ---
INSERT INTO Fornecedores (CNPJ, Nome, Telefone, Email) VALUES
('01.234.567/0001-88', 'Aços Votorantim', '(11) 98765-4321', 'contato@votorantim.com'),
('10.987.654/0001-22', 'Gerdau S.A.', '(51) 91234-5678', 'vendas@gerdau.com.br'),
('22.333.444/0001-55', 'Fornecedor de Parafusos ABC', '(19) 95555-1234', 'pedidos@parafusosabc.com');

-- --- Inserindo dados básicos em Tipos_MP (Catálogo de Matérias-Primas) ---
INSERT INTO Tipos_MP (TipoMP) VALUES
('Aço Carbono 1020'),
('Aço Inox 304'),
('Chapa de Alumínio 5052'),
('Parafuso Sextavado M12'),
('Aguardando Identificação');

-- --- Inserindo dados básicos em Maquinas ---
-- (O IDIdentificacao é AUTO_INCREMENT, então só precisamos passar o Modelo)
INSERT INTO Maquinas (Modelo) VALUES
('Torno CNC Romi D800'),
('Centro de Usinagem Haas VF-2'),
('Máquina de Corte a Laser Trumpf 3030');

-- --- Inserindo dados em Compativel (Associando Máquinas com Tipos de MP) ---
INSERT INTO Compativel (fk_Tipos_MP_TipoMP, fk_Maquina_Identificacao) VALUES
('Aço Carbono 1020', 1),        -- Torno CNC (ID 1) é compatível com Aço Carbono
('Aço Inox 304', 1),            -- Torno CNC (ID 1) é compatível com Aço Inox
('Aço Inox 304', 2),            -- Centro de Usinagem (ID 2) é compatível com Aço Inox
('Chapa de Alumínio 5052', 2),  -- Centro de Usinagem (ID 2) é compatível com Alumínio
('Aço Inox 304', 3),            -- Corte a Laser (ID 3) é compatível com Aço Inox
('Chapa de Alumínio 5052', 3);  -- Corte a Laser (ID 3) é compatível com Alumínio

-- 1. Consultas Simples (Consultando Catálogos)
-- (Descomente a linha que deseja executar)

SELECT * FROM Fornecedores;
SELECT * FROM Tipos_MP;
SELECT * FROM Maquinas;
SELECT * FROM Funcionarios;
SELECT * FROM Estoque_MP;
SELECT * FROM Registro_Movimentacao;
-- 2. Consultas com Filtro (WHERE)
-- Encontrar um funcionário específico pelo seu e-mail (EX: TELA DE LOGIN)
SELECT IDFuncionario, Nome, Cargo, NivelAcesso, Senha
FROM Funcionarios
WHERE Email = 'admin@barcoders.com';
-- Listar todos os funcionários que são 'Usuario'
SELECT Nome, Cargo
FROM Funcionarios
WHERE NivelAcesso = 'Usuario';


-- Ver os detalhes de um lote de estoque específico usando seu código de barras

SELECT * FROM Estoque_MP
WHERE BarCode = '20251017193015123-4567';

-- 3. Consultas com JOIN (Relatórios e Visões do Sistema)
-- RELATÓRIO DE ESTOQUE ATUAL (O que temos, de quem compramos e qual o tipo)
SELECT
    e.BarCode AS Codigo_Lote,
    t.TipoMP AS Tipo_Material,
    e.Quantidade,
    f.Nome AS Nome_Fornecedor
FROM
    Estoque_MP AS e
JOIN
    Tipos_MP AS t ON e.fk_Tipos_MP_TipoMP = t.TipoMP
JOIN
    Fornecedores AS f ON e.fk_Fornecedores_CNPJ = f.CNPJ;



-- RELATÓRIO DE COMPATIBILIDADE (Quais máquinas podem usar quais materiais?)

SELECT
    m.Modelo AS Maquina,
    t.TipoMP AS Material_Compativel
FROM
    Maquinas AS m
JOIN
    Compativel AS c ON m.Identificacao = c.fk_Maquina_Identificacao
JOIN
    Tipos_MP AS t ON c.fk_Tipos_MP_TipoMP = t.TipoMP
ORDER BY
    m.Modelo;



-- RELATÓRIO DE ENTRADAS (Quem registrou, qual material e quando?)

SELECT
    r.DataHoraRegistro AS Data_Hora,
    f.Nome AS Funcionario_Registrou,
    e.BarCode,
    t.TipoMP AS Tipo_Material,
    e.Quantidade
FROM
    Registro_Entrada_MP AS r
JOIN
    Funcionarios AS f ON r.fk_Funcionarios_IDFuncionario = f.IDFuncionario
JOIN
    Estoque_MP AS e ON r.fk_Estoque_MP_BarCode = e.BarCode
JOIN
    Tipos_MP AS t ON e.fk_Tipos_MP_TipoMP = t.TipoMP
ORDER BY
    r.DataHoraRegistro DESC; -- Mostra os mais recentes primeiro



-- RELATÓRIO DE MOVIMENTAÇÃO (O que foi para a produção, para qual máquina e quem levou?)

SELECT
    rm.DataHoraMovimento AS Data_Hora,
    f.Nome AS Funcionario_Moveu,
    e.BarCode,
    e.fk_Tipos_MP_TipoMP AS Material,
    m.Modelo AS Maquina_Destino
FROM
    Registro_Movimentacao AS rm
JOIN
    Funcionarios AS f ON rm.fk_Funcionarios_IDFuncionario = f.IDFuncionario
JOIN
    Estoque_MP AS e ON rm.fk_Estoque_MP_BarCode = e.BarCode
JOIN
    Maquinas AS m ON rm.fk_Maquina_Identificacao = m.Identificacao
ORDER BY
    rm.DataHoraMovimento DESC;



-- RELATÓRIO DE INSPEÇÃO DE QUALIDADE (Quem inspecionou, o que e quando?)

SELECT
    ri.DataHoraIdentificacao AS Data_Hora,
    f.Nome AS Inspetor,
    ri.fk_Estoque_MP_BarCode AS BarCode_Inspecionado,
    t.TipoMP AS Tipo_Identificado
FROM
    Registro_Identificacao_MP AS ri
JOIN
    Funcionarios AS f ON ri.fk_Funcionarios_IDFuncionario = f.IDFuncionario
JOIN
    Tipos_MP AS t ON ri.fk_Tipos_MP_TipoMP = t.TipoMP
ORDER BY
    ri.DataHoraIdentificacao DESC;

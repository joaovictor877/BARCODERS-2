-- DML.sql (ATUALIZADO PARA O NOVO FLUXO DE TRABALHO)
USE estoque;

-- --- Inserindo dados de Funcionários com papéis específicos ---
INSERT INTO Funcionarios 
    (Nome, Face_Embedding, Email, CPF, Senha, Cargo, NivelAcesso) 
VALUES 
    ('Admin', 
     '[-0.1113639697432518,0.10407157242298126,0.0821601003408432,-0.03778335079550743,-0.017478158697485924,-0.012435294687747955,-0.03697196766734123,-0.07850737869739532,0.11629297584295273,-0.06623920798301697,0.32434919476509094,-0.027401376515626907,-0.22494639456272125,-0.12739020586013794,-0.03241981938481331,0.1244007870554924,-0.063170425593853,-0.15790560841560364,-0.018041417002677917,-0.03498942777514458,0.052228789776563644,0.002306461799889803,-0.02457866258919239,0.04698784649372101,-0.1530260443687439,-0.383049339056015,-0.10751692950725555,-0.07015059888362885,0.011273752897977829,-0.16408899426460266,-0.05121026560664177,0.03138323873281479,-0.1436075121164322,-0.04917122423648834,-0.005583605729043484,0.12308883666992188,-0.07254152745008469,-0.06933276355266571,0.16773882508277893,0.07921713590621948,-0.12026482075452805,0.019074061885476112,0.06858611851930618,0.378978431224823,0.18270796537399292,-0.0026314775459468365,0.009486294351518154,0.048941098153591156,0.025251656770706177,-0.24531659483909607,0.0896611362695694,0.10702615231275558,0.1553184539079666,0.0753287598490715,0.1709355115890503,-0.1158469170331955,-0.013294415548443794,0.12455062568187714,-0.2323654592037201,0.10669908672571182,-0.0006067822687327862,-0.011240808293223381,-0.007095707580447197,-0.08350199460983276,0.21749761700630188,0.13866190612316132,-0.1314532458782196,-0.06903008371591568,0.15176884829998016,-0.1575261652469635,-0.03818893805146217,0.011274331249296665,-0.09822002053260803,-0.20269742608070374,-0.25368162989616394,0.10563139617443085,0.34509333968162537,0.1933283656835556,-0.2221444696187973,0.057767391204833984,0.023055626079440117,-0.06899172812700272,0.0872054398059845,0.012696189805865288,-0.041703321039676666,0.03965400159358978,-0.1013348400592804,-0.043782684952020645,0.14590424299240112,0.09827325493097305,-0.03092542663216591,0.2452978789806366,-0.06419403851032257,-0.014497864060103893,0.1286371350288391,9.776465503819054e-7,-0.0949278473854065,-0.02403879538178444,-0.14812707901000977,-0.020399976521730423,-0.09372343868017197,-0.20714221894741058,-0.025072511285543442,0.0710616335272789,-0.1534503698348999,0.11324649304151535,0.0411091148853302,0.026542751118540764,-0.026134490966796875,0.11456891894340515,-0.17432697117328644,-0.0637151300907135,0.12667590379714966,-0.3246181011199951,0.15326879918575287,0.16597065329551697,0.04474276676774025,0.12074365466833115,0.11173810064792633,0.04460383206605911,0.0251382477581501,-0.008862623944878578,-0.09256502985954285,-0.06662991642951965,-0.029292676597833633,-0.07659976184368134,0.04016342759132385,0.062103889882564545]',
     'admin@barcoders.com', '99988877766', 'admin1234', 'Administrador', 'Total');

-- --- Inserindo dados básicos em Fornecedores ---
INSERT INTO Fornecedores (CNPJ, Nome, Telefone, Email) VALUES
('01.234.567/0001-88', 'Aços Votorantim', '(11) 98765-4321', 'contato@votorantim.com'),
('10.987.654/0001-22', 'Gerdau S.A.', '(51) 91234-5678', 'vendas@gerdau.com.br'),
('22.333.444/0001-55', 'Fornecedor de Parafusos ABC', '(19) 95555-1234', 'pedidos@parafusosabc.com');

-- --- Inserindo dados básicos em Tipos_MP ---
INSERT INTO Tipos_MP (TipoMP) VALUES
('Aço Carbono 1020'),
('Aço Inox 304'),
('Chapa de Alumínio 5052'),
('Parafuso Sextavado M12'),
('Aguardando Identificação'); -- ESSENCIAL para o novo fluxo

-- --- Inserindo dados básicos em Maquinas ---
INSERT INTO Maquinas (Modelo) VALUES
('Torno CNC Romi D800'),
('Centro de Usinagem Haas VF-2'),
('Máquina de Corte a Laser Trumpf 3030');

-- --- INSERINDO OS BERÇOS DE ARMAZENAMENTO ---
INSERT INTO Bercos (Nome) VALUES
('Berço 01'),
('Berço 02'),
('Berço 03');

-- --- Inserindo dados em Compativel (Associando Máquinas com Tipos de MP) ---
INSERT INTO Compativel (fk_Tipos_MP_TipoMP, fk_Maquina_Identificacao) VALUES
('Aço Carbono 1020', 1),
('Aço Inox 304', 1),
('Aço Inox 304', 2),
('Chapa de Alumínio 5052', 2),
('Aço Inox 304', 3),
('Chapa de Alumínio 5052', 3);

-- #################################################################
-- ### CONSULTAS E RELATÓRIOS (ATUALIZADOS)                        ###
-- #################################################################

-- 1. Consultas Simples (Consultando Catálogos)
SELECT * FROM Fornecedores;
SELECT * FROM Tipos_MP;
SELECT * FROM Maquinas;
SELECT * FROM Funcionarios;
SELECT * FROM Bercos;
SELECT * FROM Estoque_MP; -- Estará vazio inicialmente
SELECT * FROM Registro_Movimentacao; -- Estará vazio inicialmente

-- 2. RELATÓRIO DE ESTOQUE ATUAL (ATUALIZADO COM LOCALIZAÇÃO)
-- O que temos, de quem compramos, qual o tipo E ONDE ESTÁ GUARDADO
SELECT
    e.BarCode AS Codigo_Lote,
    t.TipoMP AS Tipo_Material,
    e.Quantidade,
    f.Nome AS Nome_Fornecedor,
    b.Nome AS Local_Armazenado,
    e.Prateleira_Ocupada AS Prateleira
FROM
    Estoque_MP AS e
LEFT JOIN
    Tipos_MP AS t ON e.fk_Tipos_MP_TipoMP = t.TipoMP
LEFT JOIN
    Fornecedores AS f ON e.fk_Fornecedores_CNPJ = f.CNPJ
LEFT JOIN
    Bercos as b ON e.fk_Berco_ID = b.ID
ORDER BY
    b.Nome, e.Prateleira_Ocupada;

-- 3. RELATÓRIO DE OCUPAÇÃO DOS BERÇOS
-- Permite ver rapidamente o que está em cada prateleira
SELECT
    Nome,
    Prateleira_A,
    Prateleira_B,
    Prateleira_C,
    Prateleira_D,
    Prateleira_E,
    Prateleira_F,
    Prateleira_G,
    Prateleira_H,
    Prateleira_I,
    Prateleira_J
FROM Bercos;


-- 4. RELATÓRIO DE COMPATIBILIDADE (Sem alterações)
SELECT
    m.Modelo AS Maquina,
    t.TipoMP AS Material_Compativel
FROM Maquinas AS m
JOIN Compativel AS c ON m.Identificacao = c.fk_Maquina_Identificacao
JOIN Tipos_MP AS t ON c.fk_Tipos_MP_TipoMP = t.TipoMP
ORDER BY m.Modelo;


-- 5. RELATÓRIO DE ENTRADAS FINALIZADAS (Quem registrou, qual material e quando?)
-- Mostra apenas os materiais que já passaram pela etapa de qualidade
SELECT
    r.DataHoraRegistro AS Data_Hora_Entrada,
    f.Nome AS Funcionario_Registrou,
    e.BarCode,
    t.TipoMP AS Tipo_Material,
    e.Quantidade
FROM Registro_Entrada_MP AS r
JOIN Funcionarios AS f ON r.fk_Funcionarios_IDFuncionario = f.IDFuncionario
JOIN Estoque_MP AS e ON r.fk_Estoque_MP_BarCode = e.BarCode
JOIN Tipos_MP AS t ON e.fk_Tipos_MP_TipoMP = t.TipoMP
WHERE t.TipoMP != 'Aguardando Identificação'
ORDER BY r.DataHoraRegistro DESC;


-- 6. RELATÓRIO DE INSPEÇÃO DE QUALIDADE (Quem inspecionou, o que e quando?)
SELECT
    ri.DataHoraIdentificacao AS Data_Hora,
    f.Nome AS Inspetor,
    ri.fk_Estoque_MP_BarCode AS BarCode_Inspecionado,
    t.TipoMP AS Tipo_Identificado
FROM Registro_Identificacao_MP AS ri
JOIN Funcionarios AS f ON ri.fk_Funcionarios_IDFuncionario = f.IDFuncionario
JOIN Tipos_MP AS t ON ri.fk_Tipos_MP_TipoMP = t.TipoMP
ORDER BY ri.DataHoraIdentificacao DESC;
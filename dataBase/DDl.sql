create database estoque;
use estoque;
#drop database estoque;

-- --- Tabela para os Fornecedores ---
CREATE TABLE Fornecedores (
    CNPJ VARCHAR(20) NOT NULL,
    Nome VARCHAR(255),
    Telefone VARCHAR(20),
    Email VARCHAR(255),
    PRIMARY KEY (CNPJ)
);

-- --- Tabela para os Tipos de Matéria-Prima (Catálogo) ---
CREATE TABLE Tipos_MP (
    TipoMP VARCHAR(255) NOT NULL,
    PRIMARY KEY (TipoMP)
);


-- --- Tabela para os Funcionários ---
CREATE TABLE Funcionarios ( 
    IDFuncionario BIGINT NOT NULL AUTO_INCREMENT,
    Nome VARCHAR(255) NOT NULL,
    Email VARCHAR(255) NOT NULL UNIQUE,
    CPF VARCHAR(11) NOT NULL UNIQUE,
    Senha VARCHAR(255) NOT NULL,
    Cargo VARCHAR(255),
    NivelAcesso VARCHAR(255),
    PRIMARY KEY (IDFuncionario)
);


-- --- Tabela para as Máquinas ---
CREATE TABLE Maquinas (
    Identificacao BIGINT NOT NULL AUTO_INCREMENT,
    Modelo VARCHAR(255),
    PRIMARY KEY (Identificacao)
);

-- --- Tabela para o controle de Estoque de Matéria-Prima (Lotes) ---
CREATE TABLE Estoque_MP (
    BarCode VARCHAR(255) NOT NULL,
    Quantidade INT,
    fk_Tipos_MP_TipoMP VARCHAR(255) NOT NULL,
    fk_Fornecedores_CNPJ VARCHAR(20) NOT NULL,
    PRIMARY KEY (BarCode),
    FOREIGN KEY (fk_Tipos_MP_TipoMP) REFERENCES Tipos_MP (TipoMP),
    FOREIGN KEY (fk_Fornecedores_CNPJ) REFERENCES Fornecedores (CNPJ)
);

-- --- Tabela Associativa para compatibilidade entre Máquinas e Matérias-Primas ---
CREATE TABLE Compativel (
    fk_Tipos_MP_TipoMP VARCHAR(255) NOT NULL,
    fk_Maquina_Identificacao BIGINT NOT NULL,
    PRIMARY KEY (fk_Tipos_MP_TipoMP, fk_Maquina_Identificacao),
    FOREIGN KEY (fk_Tipos_MP_TipoMP) REFERENCES Tipos_MP (TipoMP),
    FOREIGN KEY (fk_Maquina_Identificacao) REFERENCES Maquinas (Identificacao)
);

-- --- Tabela para o Registro de Entrada de Matéria-Prima ---
CREATE TABLE Registro_Entrada_MP (
    IDEntradaRegistro BIGINT NOT NULL AUTO_INCREMENT,
    DataHoraRegistro DATETIME,
    fk_Estoque_MP_BarCode VARCHAR(255) NOT NULL,
    fk_Funcionarios_IDFuncionario BIGINT NOT NULL,
    PRIMARY KEY (IDEntradaRegistro),
    FOREIGN KEY (fk_Estoque_MP_BarCode) REFERENCES Estoque_MP (BarCode),
    FOREIGN KEY (fk_Funcionarios_IDFuncionario) REFERENCES Funcionarios (IDFuncionario)
);

-- --- Tabela para o Registro de Movimentação (uso em produção) ---
CREATE TABLE Registro_Movimentacao (
    IDMovimento BIGINT NOT NULL AUTO_INCREMENT,
    DataHoraMovimento DATETIME,
    QuantidadeMovida INT NOT NULL,
    fk_Estoque_MP_BarCode VARCHAR(255) NOT NULL,
    fk_Maquina_Identificacao BIGINT NOT NULL,
    fk_Funcionarios_IDFuncionario BIGINT NOT NULL,
    PRIMARY KEY (IDMovimento),
    FOREIGN KEY (fk_Estoque_MP_BarCode) REFERENCES Estoque_MP (BarCode),
    FOREIGN KEY (fk_Maquina_Identificacao) REFERENCES Maquinas (Identificacao),
    FOREIGN KEY (fk_Funcionarios_IDFuncionario) REFERENCES Funcionarios (IDFuncionario)
);

-- --- Tabela para Identificação/Associação de Matéria-Prima ---
CREATE TABLE Registro_Identificacao_MP (
    IDIdentificacao BIGINT NOT NULL AUTO_INCREMENT,
    DataHoraIdentificacao DATETIME,
    fk_Funcionarios_IDFuncionario BIGINT NOT NULL,
    fk_Tipos_MP_TipoMP VARCHAR(255) NOT NULL,
    fk_Estoque_MP_BarCode VARCHAR(255) NOT NULL,
    PRIMARY KEY (IDIdentificacao),
    FOREIGN KEY (fk_Funcionarios_IDFuncionario) REFERENCES Funcionarios (IDFuncionario),
    FOREIGN KEY (fk_Tipos_MP_TipoMP) REFERENCES Tipos_MP (TipoMP),
    FOREIGN KEY (fk_Estoque_MP_BarCode) REFERENCES Estoque_MP (BarCode)
);
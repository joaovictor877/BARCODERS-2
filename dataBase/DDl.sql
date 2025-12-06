-- DDL.sql 

DROP DATABASE IF EXISTS estoque;
CREATE DATABASE IF NOT EXISTS estoque;
USE estoque;

-- --- ETAPA 1: DELETAR TABELAS NA ORDEM INVERSA DE DEPENDÊNCIA ---
DROP TABLE IF EXISTS Registro_Movimentacao;
DROP TABLE IF EXISTS Registro_Identificacao_MP;
DROP TABLE IF EXISTS Registro_Entrada_MP;
DROP TABLE IF EXISTS Compativel;
DROP TABLE IF EXISTS Estoque_MP;
DROP TABLE IF EXISTS Bercos;
DROP TABLE IF EXISTS Maquinas;
DROP TABLE IF EXISTS Funcionarios;
DROP TABLE IF EXISTS Tipos_MP;
DROP TABLE IF EXISTS Fornecedores;


-- --- ETAPA 2: CRIAR TABELAS NA ORDEM CORRETA DE DEPENDÊNCIA ---
-- Cria primeiro as tabelas que NÃO dependem de outras (as "pais")

CREATE TABLE Fornecedores (
    CNPJ VARCHAR(20) NOT NULL,
    Nome VARCHAR(255),
    Telefone VARCHAR(20),
    Email VARCHAR(255),
    PRIMARY KEY (CNPJ)
);

CREATE TABLE Tipos_MP (
    TipoMP VARCHAR(255) NOT NULL,
    PRIMARY KEY (TipoMP)
);

CREATE TABLE Funcionarios ( 
    IDFuncionario BIGINT NOT NULL AUTO_INCREMENT,
    Nome VARCHAR(255) NOT NULL,
    Foto LONGBLOB NULL,
    Face_Embedding TEXT NULL,
    Email VARCHAR(255) NOT NULL UNIQUE,
    CPF VARCHAR(11) NOT NULL UNIQUE,
    Senha VARCHAR(255) NOT NULL,
    Cargo VARCHAR(255),
    NivelAcesso VARCHAR(255),
    PRIMARY KEY (IDFuncionario)
);

CREATE TABLE Maquinas (
    Identificacao BIGINT NOT NULL AUTO_INCREMENT,
    Modelo VARCHAR(255),
    PRIMARY KEY (Identificacao)
);

CREATE TABLE Bercos (
    ID BIGINT NOT NULL AUTO_INCREMENT,
    Nome VARCHAR(255) NOT NULL UNIQUE,
    PRIMARY KEY (ID)
);

-- Agora, cria as tabelas que DEPENDEM das tabelas acima

CREATE TABLE Estoque_MP (
    BarCode VARCHAR(255) NOT NULL,
    Quantidade INT NULL,
    fk_Tipos_MP_TipoMP VARCHAR(255) NOT NULL DEFAULT 'Aguardando Identificação',
    fk_Fornecedores_CNPJ VARCHAR(20) NOT NULL,
    fk_Berco_ID BIGINT NULL,
    Prateleira_Ocupada CHAR(1) NULL,
    PRIMARY KEY (BarCode),
    FOREIGN KEY (fk_Tipos_MP_TipoMP) REFERENCES Tipos_MP (TipoMP),
    FOREIGN KEY (fk_Fornecedores_CNPJ) REFERENCES Fornecedores (CNPJ),
    FOREIGN KEY (fk_Berco_ID) REFERENCES Bercos (ID) ON DELETE SET NULL
);

-- Adiciona as colunas de prateleiras à tabela Bercos e suas FKs para Estoque_MP
ALTER TABLE Bercos
    ADD COLUMN Prateleira_A VARCHAR(255) NULL UNIQUE, ADD FOREIGN KEY (Prateleira_A) REFERENCES Estoque_MP(BarCode) ON DELETE SET NULL,
    ADD COLUMN Prateleira_B VARCHAR(255) NULL UNIQUE, ADD FOREIGN KEY (Prateleira_B) REFERENCES Estoque_MP(BarCode) ON DELETE SET NULL,
    ADD COLUMN Prateleira_C VARCHAR(255) NULL UNIQUE, ADD FOREIGN KEY (Prateleira_C) REFERENCES Estoque_MP(BarCode) ON DELETE SET NULL,
    ADD COLUMN Prateleira_D VARCHAR(255) NULL UNIQUE, ADD FOREIGN KEY (Prateleira_D) REFERENCES Estoque_MP(BarCode) ON DELETE SET NULL,
    ADD COLUMN Prateleira_E VARCHAR(255) NULL UNIQUE, ADD FOREIGN KEY (Prateleira_E) REFERENCES Estoque_MP(BarCode) ON DELETE SET NULL,
    ADD COLUMN Prateleira_F VARCHAR(255) NULL UNIQUE, ADD FOREIGN KEY (Prateleira_F) REFERENCES Estoque_MP(BarCode) ON DELETE SET NULL,
    ADD COLUMN Prateleira_G VARCHAR(255) NULL UNIQUE, ADD FOREIGN KEY (Prateleira_G) REFERENCES Estoque_MP(BarCode) ON DELETE SET NULL,
    ADD COLUMN Prateleira_H VARCHAR(255) NULL UNIQUE, ADD FOREIGN KEY (Prateleira_H) REFERENCES Estoque_MP(BarCode) ON DELETE SET NULL,
    ADD COLUMN Prateleira_I VARCHAR(255) NULL UNIQUE, ADD FOREIGN KEY (Prateleira_I) REFERENCES Estoque_MP(BarCode) ON DELETE SET NULL,
    ADD COLUMN Prateleira_J VARCHAR(255) NULL UNIQUE, ADD FOREIGN KEY (Prateleira_J) REFERENCES Estoque_MP(BarCode) ON DELETE SET NULL;

CREATE TABLE Compativel (
    fk_Tipos_MP_TipoMP VARCHAR(255) NOT NULL,
    fk_Maquina_Identificacao BIGINT NOT NULL,
    PRIMARY KEY (fk_Tipos_MP_TipoMP, fk_Maquina_Identificacao),
    FOREIGN KEY (fk_Tipos_MP_TipoMP) REFERENCES Tipos_MP (TipoMP) ON DELETE CASCADE,
    FOREIGN KEY (fk_Maquina_Identificacao) REFERENCES Maquinas (Identificacao) ON DELETE CASCADE
);

CREATE TABLE Registro_Entrada_MP (
    IDEntradaRegistro BIGINT NOT NULL AUTO_INCREMENT,
    DataHoraRegistro DATETIME,
    fk_Estoque_MP_BarCode VARCHAR(255) NOT NULL,
    fk_Funcionarios_IDFuncionario BIGINT NULL,
    fk_Berco_ID BIGINT NULL,
    Prateleira CHAR(1) NULL,
    PRIMARY KEY (IDEntradaRegistro),
    FOREIGN KEY (fk_Estoque_MP_BarCode) REFERENCES Estoque_MP (BarCode) ON DELETE CASCADE,
    FOREIGN KEY (fk_Funcionarios_IDFuncionario) REFERENCES Funcionarios (IDFuncionario) ON DELETE SET NULL,
    FOREIGN KEY (fk_Berco_ID) REFERENCES Bercos (ID) ON DELETE SET NULL
);

CREATE TABLE Registro_Identificacao_MP (
    IDIdentificacao BIGINT NOT NULL AUTO_INCREMENT,
    DataHoraIdentificacao DATETIME,
    fk_Funcionarios_IDFuncionario BIGINT NULL,
    fk_Tipos_MP_TipoMP VARCHAR(255) NOT NULL,
    fk_Estoque_MP_BarCode VARCHAR(255) NOT NULL,
    Tempo_Ate_Identificacao INT NULL, -- Tempo em segundos da entrada até a identificação
    PRIMARY KEY (IDIdentificacao),
    FOREIGN KEY (fk_Funcionarios_IDFuncionario) REFERENCES Funcionarios (IDFuncionario) ON DELETE SET NULL,
    FOREIGN KEY (fk_Tipos_MP_TipoMP) REFERENCES Tipos_MP (TipoMP),
    FOREIGN KEY (fk_Estoque_MP_BarCode) REFERENCES Estoque_MP (BarCode) ON DELETE CASCADE
);

CREATE TABLE Registro_Movimentacao (
    IDMovimento BIGINT NOT NULL AUTO_INCREMENT,
    DataHoraMovimento DATETIME,
    QuantidadeMovida INT NOT NULL,
    fk_Estoque_MP_BarCode VARCHAR(255) NULL, 
    BarcodeLido VARCHAR(255) NULL, 
    fk_Maquina_Identificacao BIGINT NOT NULL,
    fk_Funcionarios_IDFuncionario BIGINT NULL,
    OperacaoValida TINYINT(1) NOT NULL,
    TipoErro VARCHAR(50) NOT NULL,
    Tempo_Verificacao_Material INT NULL, -- Segundos
    Tempo_Verificacao_Maquina INT NULL, -- Segundos
    Tempo_Total_Operacao INT NULL, -- Segundos
    PRIMARY KEY (IDMovimento),
    FOREIGN KEY (fk_Estoque_MP_BarCode) REFERENCES Estoque_MP (BarCode) ON DELETE SET NULL, 
    FOREIGN KEY (fk_Maquina_Identificacao) REFERENCES Maquinas (Identificacao),
    FOREIGN KEY (fk_Funcionarios_IDFuncionario) REFERENCES Funcionarios (IDFuncionario) ON DELETE SET NULL
);
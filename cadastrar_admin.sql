-- Script para cadastrar você como Admin
-- Execute este script no MySQL Workbench ou Azure Data Studio

USE estoque;

-- Inserir você como funcionário admin
-- ALTERE os dados abaixo com suas informações
INSERT INTO Funcionarios (
    Nome, 
    Email, 
    CPF, 
    Senha, 
    Cargo, 
    NivelAcesso,
    Face_Embedding,
    Foto
) VALUES (
    'João Victor',                    -- SEU NOME
    'joao.victor@barcoders.com',      -- SEU EMAIL
    '44588397800',                     -- SEU CPF (11 dígitos)
    'admin123',  -- Senha temporária: 'admin123' (você pode trocar depois)
    'Administrador',                   -- SEU CARGO
    'Total',                           -- Nível de acesso ADMIN
    NULL,                              -- Face será cadastrada depois
    NULL                               -- Foto opcional
);

-- Verificar se foi criado
SELECT IDFuncionario, Nome, Email, Cargo, NivelAcesso 
FROM Funcionarios 
WHERE Email = 'joao.victor@barcoders.com';

-- Anote o IDFuncionario que aparecer (será usado para cadastrar a face)

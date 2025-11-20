-- Criação do Banco de Dados
CREATE DATABASE IF NOT EXISTS almoxarifado;
USE almoxarifado;

-- Tabela de Usuários (Login)
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    status ENUM('ativo', 'inativo') DEFAULT 'ativo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Produtos
CREATE TABLE IF NOT EXISTS almox_produtos (
    sku VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    quantity INT DEFAULT 0,
    minStock INT DEFAULT 10,
    fator_embalagem INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de Movimentações (Entradas e Saídas)
CREATE TABLE IF NOT EXISTS almox_movimentacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    productSku VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    type ENUM('entrada', 'saida') NOT NULL,
    responsible VARCHAR(255) NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    destination VARCHAR(255), -- Para onde foi (ex: RH, TI)
    collector VARCHAR(255),   -- Quem buscou
    withdrawnBy VARCHAR(255), -- Quem autorizou no sistema
    FOREIGN KEY (productSku) REFERENCES almox_produtos(sku) ON DELETE CASCADE
);

-- Tabela de Notas Fiscais (Cabeçalho)
CREATE TABLE IF NOT EXISTS almox_notas_fiscais (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoiceNumber VARCHAR(100) NOT NULL,
    supplier VARCHAR(255) NOT NULL,
    issueDate DATE NOT NULL,
    receivedDate DATE NOT NULL,
    totalValue DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Itens da Nota Fiscal
CREATE TABLE IF NOT EXISTS almox_itens_nota_fiscal (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoiceId INT NOT NULL,
    productSku VARCHAR(50) NOT NULL,
    quantity INT NOT NULL, -- Quantidade comprada (ex: caixas)
    unitPrice DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (invoiceId) REFERENCES almox_notas_fiscais(id) ON DELETE CASCADE,
    FOREIGN KEY (productSku) REFERENCES almox_produtos(sku)
);

-- Inserir um usuário ADMIN inicial (Senha: admin123)
-- OBS: A senha abaixo é um hash bcrypt de 'admin123'. 

INSERT INTO usuarios (nome, email, senha_hash, status) 
VALUES ('Administrador', 'admin@admin.com', '$2b$10$X/k...HashGeradoAqui...', 'ativo');
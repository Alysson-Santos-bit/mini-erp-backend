# ⚙️ Mini ERP - Backend API

Uma API RESTful robusta desenvolvida para servir como o "cérebro" de um Sistema de Gestão (Mini ERP). Este projeto gerencia o cadastro de clientes e suas respectivas tarefas, utilizando um banco de dados relacional para garantir a integridade das informações.

## 🚀 Tecnologias Utilizadas

* **Node.js** & **Express:** Estrutura base do servidor e gerenciamento de rotas.
* **MySQL 8.0:** Banco de dados relacional (relacionamento 1:N).
* **mysql2:** Driver de comunicação entre o Node.js e o banco de dados.
* **CORS:** Liberação de acesso para o Frontend.
* **Dotenv:** Gerenciamento seguro de variáveis de ambiente e credenciais.

## ✨ Funcionalidades

* **CRUD de Clientes:** Criação, leitura, atualização e exclusão de clientes.
* **CRUD de Tarefas:** Gerenciamento de tarefas vinculadas a clientes específicos.
* **Integridade Relacional:** Uso de Chaves Estrangeiras (Foreign Keys) e exclusão em cascata (`ON DELETE CASCADE`) — ao apagar um cliente, suas tarefas são removidas automaticamente.

## 🛠️ Como rodar o projeto localmente

1. Clone este repositório:
   ```bash
   git clone [https://github.com/SEU_USUARIO/mini-erp-backend.git](https://github.com/SEU_USUARIO/mini-erp-backend.git)
   Acesse a pasta do projeto e instale as dependências:

Bash
cd mini-erp-backend
npm install
Crie um arquivo .env na raiz do projeto e configure suas credenciais do MySQL:

Snippet de código
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha_aqui
DB_NAME=mini_erp
Execute os scripts SQL abaixo no seu MySQL para criar o banco e as tabelas:

SQL
CREATE DATABASE mini_erp;
USE mini_erp;

CREATE TABLE clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tarefas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    concluida BOOLEAN DEFAULT FALSE,
    cliente_id INT,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
);
Inicie o servidor:

Bash
npm run dev

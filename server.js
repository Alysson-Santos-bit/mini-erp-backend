// Importando as ferramentas
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config(); // Carrega as senhas do arquivo .env

// Inicializando o servidor
const app = express();

// Configurações de segurança e formato de dados (JSON)
app.use(cors());
app.use(express.json());

// 1. Criando a ponte de conexão com o MySQL
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// 2. Testando a conexão
db.connect((erro) => {
    if (erro) {
        console.error('❌ Erro ao conectar no MySQL:', erro.message);
        return;
    }
    console.log('✅ Conectado ao MySQL com sucesso!');
});
// --- NOSSAS ROTAS DA API ---

// 1. Rota para CRIAR um novo cliente (POST)
app.post('/clientes', (req, res) => {
    // req.body é o que o Frontend vai nos enviar (nome e email)
    const { nome, email } = req.body;

    // O comando SQL para inserir dados. 
    // Usamos os pontos de interrogação (?) para evitar ataques de hackers (SQL Injection)
    const sql = 'INSERT INTO clientes (nome, email) VALUES (?, ?)';

    // Pedimos para o banco executar o comando
    db.query(sql, [nome, email], (erro, resultado) => {
        if (erro) {
            console.error('❌ Erro ao inserir cliente:', erro.message);
            // Se der erro (ex: email duplicado), devolvemos um status 500 (Erro no Servidor)
            return res.status(500).json({ erro: 'Erro ao cadastrar cliente. Verifique os dados.' });
        }
        
        // Se der certo, devolvemos um status 201 (Criado) com o ID gerado pelo banco
        res.status(201).json({ 
            mensagem: '✅ Cliente criado com sucesso!', 
            id: resultado.insertId 
        });
    });
});
// 2. Rota para LER todos os clientes (GET)
app.get('/clientes', (req, res) => {
    // Comando SQL clássico para buscar tudo da tabela
    const sql = 'SELECT * FROM clientes';

    db.query(sql, (erro, resultados) => {
        if (erro) {
            console.error('❌ Erro ao buscar clientes:', erro.message);
            return res.status(500).json({ erro: 'Erro ao buscar clientes.' });
        }
        
        // Devolvemos a lista (array) de clientes em formato JSON
        res.status(200).json(resultados);
    });
});
// 3. Rota para ATUALIZAR um cliente (PUT)
app.put('/clientes/:id', (req, res) => {
    const { id } = req.params; // Pega o ID que vem na URL (aquele :id ali em cima)
    const { nome, email } = req.body; // Pega os novos dados que vieram no corpo da requisição

    const sql = 'UPDATE clientes SET nome = ?, email = ? WHERE id = ?';

    db.query(sql, [nome, email, id], (erro, resultado) => {
        if (erro) {
            console.error('❌ Erro ao atualizar cliente:', erro.message);
            return res.status(500).json({ erro: 'Erro ao atualizar cliente.' });
        }
        
        // Verifica se o cliente realmente existia no banco
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ erro: 'Cliente não encontrado.' });
        }

        res.status(200).json({ mensagem: '✅ Cliente atualizado com sucesso!' });
    });
});

// 4. Rota para DELETAR um cliente (DELETE)
app.delete('/clientes/:id', (req, res) => {
    const { id } = req.params;

    const sql = 'DELETE FROM clientes WHERE id = ?';

    db.query(sql, [id], (erro, resultado) => {
        if (erro) {
            console.error('❌ Erro ao deletar cliente:', erro.message);
            return res.status(500).json({ erro: 'Erro ao deletar cliente.' });
        }

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ erro: 'Cliente não encontrado.' });
        }

        res.status(200).json({ mensagem: '✅ Cliente deletado com sucesso!' });
    });
});
// ==========================================
// --- ROTAS DAS TAREFAS (RELACIONAMENTO) ---
// ==========================================

// 1. Rota para CRIAR uma tarefa para um cliente (POST)
app.post('/tarefas', (req, res) => {
    // Recebemos o título da tarefa e o ID do dono dela
    const { titulo, cliente_id } = req.body;

    const sql = 'INSERT INTO tarefas (titulo, cliente_id) VALUES (?, ?)';

    db.query(sql, [titulo, cliente_id], (erro, resultado) => {
        if (erro) {
            console.error('❌ Erro ao criar tarefa:', erro.message);
            return res.status(500).json({ erro: 'Erro ao criar tarefa. Verifique se o cliente_id existe.' });
        }
        res.status(201).json({ 
            mensagem: '✅ Tarefa vinculada ao cliente com sucesso!', 
            id: resultado.insertId 
        });
    });
});

// 2. Rota para LER as tarefas de UM cliente específico (GET)
// Note a URL semântica: /clientes/1/tarefas (Faz muito sentido ler assim, né?)
app.get('/clientes/:id/tarefas', (req, res) => {
    const cliente_id = req.params.id; // Pegamos o ID da URL

    // Buscamos apenas as tarefas onde a chave estrangeira bate com o ID
    const sql = 'SELECT * FROM tarefas WHERE cliente_id = ?';

    db.query(sql, [cliente_id], (erro, resultados) => {
        if (erro) {
            console.error('❌ Erro ao buscar tarefas:', erro.message);
            return res.status(500).json({ erro: 'Erro ao buscar tarefas.' });
        }
        res.status(200).json(resultados);
    });
});
// 3. Rota para ATUALIZAR uma tarefa (Marcar como concluída) (PUT)
app.put('/tarefas/:id', (req, res) => {
    const { id } = req.params;
    const { concluida } = req.body; // Esperamos receber 0 ou 1, true ou false

    const sql = 'UPDATE tarefas SET concluida = ? WHERE id = ?';

    // O MySQL é inteligente: se mandarmos 'true' (booleano do JS), ele converte para 1.
    db.query(sql, [concluida, id], (erro, resultado) => {
        if (erro) {
            console.error('❌ Erro ao atualizar tarefa:', erro.message);
            return res.status(500).json({ erro: 'Erro ao atualizar tarefa.' });
        }
        res.status(200).json({ mensagem: '✅ Status da tarefa atualizado!' });
    });
});

// 4. Rota para DELETAR uma tarefa (DELETE)
app.delete('/tarefas/:id', (req, res) => {
    const { id } = req.params;

    const sql = 'DELETE FROM tarefas WHERE id = ?';

    db.query(sql, [id], (erro, resultado) => {
        if (erro) {
            console.error('❌ Erro ao deletar tarefa:', erro.message);
            return res.status(500).json({ erro: 'Erro ao deletar tarefa.' });
        }
        res.status(200).json({ mensagem: '✅ Tarefa deletada com sucesso!' });
    });
});

// ... (Aqui embaixo deve estar o seu app.listen que já existia)

// 3. Ligando o motor do servidor
const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
    console.log(`🚀 Servidor backend rodando na porta ${PORTA}`);
});
// Importando as ferramentas
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Inicializando o servidor
const app = express();

// Configurações de segurança e formato de dados (JSON)
app.use(cors());
app.use(express.json());

// 1. Criando um POOL de conexões (Sem o .promise() no final)
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'W3fprovavel3x', 
  database: process.env.DB_NAME || 'mini_erp',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 2. Testando a conexão (Pool usa getConnection em vez de connect)
db.getConnection((erro, conexao) => {
    if (erro) {
        console.error('❌ Erro ao conectar no MySQL:', erro.message);
        return;
    }
    console.log('✅ Conectado ao MySQL com sucesso (Pool Ativado)!');
    conexao.release(); // Libera a conexão de teste de volta para o Pool
});

// ==========================================
// ROTAS DE AUTENTICAÇÃO (SEGURANÇA)
// ==========================================

// 1. CADASTRAR NOVO ADMINISTRADOR
app.post('/registrar', async (req, res) => {
  const { nome, email, senha } = req.body;

  try {
    const senhaCriptografada = await bcrypt.hash(senha, 10);
    const comandoSql = 'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)';
    
    // Usamos .promise().execute() apenas aqui!
    await db.promise().execute(comandoSql, [nome, email, senhaCriptografada]);

    res.status(201).json({ mensagem: '✅ Administrador cadastrado com sucesso!' });
  } catch (erro) {
    console.error("Erro ao registrar:", erro);
    res.status(500).json({ mensagem: 'Erro ao cadastrar administrador.' });
  }
});

// 2. FAZER LOGIN E GERAR O TOKEN (CRACHÁ VIP)
app.post('/login', async (req, res) => {
  console.log("➡️ Iniciando tentativa de login...");
  const { email, senha } = req.body;

  try {
    console.log("Passo 1: Buscando usuário no banco...");
    
    // Usamos .promise().execute() apenas aqui!
    const [usuarios] = await db.promise().execute('SELECT * FROM usuarios WHERE email = ?', [email]);
    
    if (usuarios.length === 0) {
      console.log("❌ Usuário não encontrado no banco.");
      return res.status(401).json({ mensagem: '❌ Usuário não encontrado!' });
    }

    const usuario = usuarios[0];
    console.log("Passo 2: Usuário encontrado! Comparando senhas...");

    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      console.log("❌ Senha incorreta.");
      return res.status(401).json({ mensagem: '❌ Senha incorreta!' });
    }

    console.log("Passo 3: Senha correta! Gerando Token...");

    const segredo = process.env.JWT_SECRET || 'minha_chave_reserva_de_emergencia';

    const token = jwt.sign(
      { id: usuario.id }, 
      segredo, 
      { expiresIn: '2h' }
    );

    console.log("✅ Passo 4: Token gerado com sucesso! Entregando ao Frontend...");

    res.status(200).json({ 
      mensagem: '✅ Login bem-sucedido!', 
      token: token,
      nome: usuario.nome 
    });

  } catch (erro) {
    console.error("🚨 ERRO GRAVE NO LOGIN:", erro);
    res.status(500).json({ mensagem: 'Erro ao fazer login.' });
  }
});
// ==========================================
// O SEGURANÇA DA PORTA (MIDDLEWARE)
// ==========================================
function verificarCracha(req, res, next) {
  // 1. O segurança pede para ver o crachá (ele vem no cabeçalho Authorization)
  const cabecalho = req.headers['authorization'];
  
  // 2. Se a pessoa veio sem crachá nenhum, é barrada na hora!
  if (!cabecalho) {
    return res.status(401).json({ mensagem: '❌ Acesso negado! Você precisa estar logado.' });
  }

  // 3. O crachá chega no formato "Bearer eyJhbG...". Nós cortamos a palavra "Bearer" e pegamos só o código.
  const token = cabecalho.split(' ')[1];

  try {
    // 4. A máquina de validação: O segurança confere a assinatura digital usando a sua senha do .env
    const segredo = process.env.JWT_SECRET || 'minha_chave_reserva_de_emergencia';
    const crachaValido = jwt.verify(token, segredo);
    
    // 5. O crachá é verdadeiro! O segurança anota o ID do usuário e abre a porta!
    req.usuario = crachaValido; // (Isso nos permite saber quem fez a requisição nas rotas)
    
    next(); // 🪄 A MÁGICA: O comando next() deixa a requisição continuar para a rota!
    
  } catch (erro) {
    // Se um hacker tentar inventar um token falso ou se o token estiver vencido
    return res.status(403).json({ mensagem: '❌ Crachá inválido ou expirado!' });
  }
}

// ⚠️ A BARREIRA INTRANSPONÍVEL ⚠️
// Ao colocar este comando aqui, TODAS as rotas que estiverem ESCRITAS ABAIXO desta linha
// vão obrigatoriamente passar pelo Segurança antes de funcionarem!
app.use(verificarCracha);



// ==========================================
// --- ROTAS DE CLIENTES ---
// ==========================================

// 1. Rota para CRIAR um novo cliente (POST)
app.post('/clientes', (req, res) => {
    const { nome, email } = req.body;
    const sql = 'INSERT INTO clientes (nome, email) VALUES (?, ?)';

    // Rotas antigas continuam usando db.query normalmente!
    db.query(sql, [nome, email], (erro, resultado) => {
        if (erro) {
            console.error('❌ Erro ao inserir cliente:', erro.message);
            return res.status(500).json({ erro: 'Erro ao cadastrar cliente. Verifique os dados.' });
        }
        res.status(201).json({ mensagem: '✅ Cliente criado com sucesso!', id: resultado.insertId });
    });
});

// 2. Rota para LER todos os clientes (GET)
app.get('/clientes', (req, res) => {
    const sql = 'SELECT * FROM clientes';
    db.query(sql, (erro, resultados) => {
        if (erro) {
            console.error('❌ Erro ao buscar clientes:', erro.message);
            return res.status(500).json({ erro: 'Erro ao buscar clientes.' });
        }
        res.status(200).json(resultados);
    });
});

// 3. Rota para ATUALIZAR um cliente (PUT)
app.put('/clientes/:id', (req, res) => {
    const { id } = req.params;
    const { nome, email } = req.body;
    const sql = 'UPDATE clientes SET nome = ?, email = ? WHERE id = ?';

    db.query(sql, [nome, email, id], (erro, resultado) => {
        if (erro) return res.status(500).json({ erro: 'Erro ao atualizar cliente.' });
        if (resultado.affectedRows === 0) return res.status(404).json({ erro: 'Cliente não encontrado.' });
        res.status(200).json({ mensagem: '✅ Cliente atualizado com sucesso!' });
    });
});

// 4. Rota para DELETAR um cliente (DELETE)
app.delete('/clientes/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM clientes WHERE id = ?';

    db.query(sql, [id], (erro, resultado) => {
        if (erro) return res.status(500).json({ erro: 'Erro ao deletar cliente.' });
        if (resultado.affectedRows === 0) return res.status(404).json({ erro: 'Cliente não encontrado.' });
        res.status(200).json({ mensagem: '✅ Cliente deletado com sucesso!' });
    });
});

// ==========================================
// --- ROTAS DAS TAREFAS (RELACIONAMENTO) ---
// ==========================================

// 1. Rota para CRIAR uma tarefa para um cliente (POST)
app.post('/tarefas', (req, res) => {
    const { titulo, cliente_id } = req.body;
    const sql = 'INSERT INTO tarefas (titulo, cliente_id) VALUES (?, ?)';

    db.query(sql, [titulo, cliente_id], (erro, resultado) => {
        if (erro) return res.status(500).json({ erro: 'Erro ao criar tarefa. Verifique se o cliente_id existe.' });
        res.status(201).json({ mensagem: '✅ Tarefa vinculada com sucesso!', id: resultado.insertId });
    });
});

// 2. Rota para LER as tarefas de UM cliente específico (GET)
app.get('/clientes/:id/tarefas', (req, res) => {
    const cliente_id = req.params.id;
    const sql = 'SELECT * FROM tarefas WHERE cliente_id = ?';

    db.query(sql, [cliente_id], (erro, resultados) => {
        if (erro) return res.status(500).json({ erro: 'Erro ao buscar tarefas.' });
        res.status(200).json(resultados);
    });
});

// 3. Rota para ATUALIZAR uma tarefa (Marcar como concluída) (PUT)
app.put('/tarefas/:id', (req, res) => {
    const { id } = req.params;
    const { concluida } = req.body; 
    const sql = 'UPDATE tarefas SET concluida = ? WHERE id = ?';

    db.query(sql, [concluida, id], (erro, resultado) => {
        if (erro) return res.status(500).json({ erro: 'Erro ao atualizar tarefa.' });
        res.status(200).json({ mensagem: '✅ Status da tarefa atualizado!' });
    });
});

// 3.5 Rota para EDITAR O TEXTO de uma tarefa (PUT)
app.put('/tarefas/:id/titulo', (req, res) => {
    const { id } = req.params;
    const { titulo } = req.body; 

    const sql = 'UPDATE tarefas SET titulo = ? WHERE id = ?';

    db.query(sql, [titulo, id], (erro, resultado) => {
        if (erro) {
            console.error('❌ Erro ao editar tarefa:', erro.message);
            return res.status(500).json({ erro: 'Erro ao editar a tarefa.' });
        }
        res.status(200).json({ mensagem: '✅ Tarefa editada com sucesso!' });
    });
});

// 4. Rota para DELETAR uma tarefa (DELETE)
app.delete('/tarefas/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM tarefas WHERE id = ?';

    db.query(sql, [id], (erro, resultado) => {
        if (erro) return res.status(500).json({ erro: 'Erro ao deletar tarefa.' });
        res.status(200).json({ mensagem: '✅ Tarefa deletada com sucesso!' });
    });
});
// ==========================================
// --- ROTAS DE PRODUTOS (MÓDULO ERP) ---
// ==========================================

// 1. Rota para CRIAR um produto (POST)
app.post('/produtos', (req, res) => {
    const { nome, preco, estoque } = req.body;
    const sql = 'INSERT INTO produtos (nome, preco, estoque) VALUES (?, ?, ?)';

    db.query(sql, [nome, preco, estoque], (erro, resultado) => {
        if (erro) {
            console.error('❌ Erro ao cadastrar produto:', erro.message);
            return res.status(500).json({ erro: 'Erro ao cadastrar produto.' });
        }
        res.status(201).json({ mensagem: '✅ Produto cadastrado com sucesso!', id: resultado.insertId });
    });
});

// 2. Rota para LER todos os produtos (GET)
app.get('/produtos', (req, res) => {
    const sql = 'SELECT * FROM produtos';
    db.query(sql, (erro, resultados) => {
        if (erro) return res.status(500).json({ erro: 'Erro ao buscar produtos.' });
        res.status(200).json(resultados);
    });
});

// 3. Rota para ATUALIZAR um produto (PUT)
app.put('/produtos/:id', (req, res) => {
    const { id } = req.params;
    const { nome, preco, estoque } = req.body;
    const sql = 'UPDATE produtos SET nome = ?, preco = ?, estoque = ? WHERE id = ?';

    db.query(sql, [nome, preco, estoque, id], (erro, resultado) => {
        if (erro) return res.status(500).json({ erro: 'Erro ao atualizar produto.' });
        res.status(200).json({ mensagem: '✅ Produto atualizado com sucesso!' });
    });
});

// 4. Rota para DELETAR um produto (DELETE)
app.delete('/produtos/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM produtos WHERE id = ?';

    db.query(sql, [id], (erro, resultado) => {
        if (erro) return res.status(500).json({ erro: 'Erro ao deletar produto.' });
        res.status(200).json({ mensagem: '✅ Produto deletado com sucesso!' });
    });
});
// ==========================================
// --- ROTA DE ESTATÍSTICAS (DASHBOARD) ---
// ==========================================
app.get('/estatisticas', (req, res) => {
    // Uma única consulta SQL poderosa que conta tudo usando sub-consultas!
    const sql = `
        SELECT 
            (SELECT COUNT(*) FROM clientes) as totalClientes,
            (SELECT COUNT(*) FROM tarefas) as totalTarefas,
            (SELECT COUNT(*) FROM tarefas WHERE concluida = 1) as tarefasConcluidas
    `;

    db.query(sql, (erro, resultados) => {
        if (erro) {
            console.error('❌ Erro ao buscar estatísticas:', erro.message);
            return res.status(500).json({ erro: 'Erro ao buscar estatísticas.' });
        }
        // O MySQL devolve um array. Queremos apenas o primeiro item (o objeto com as contagens)
        res.status(200).json(resultados[0]);
    });
});

// Ligando o motor do servidor
const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
    console.log(`🚀 Servidor backend rodando na porta ${PORTA}`);
});
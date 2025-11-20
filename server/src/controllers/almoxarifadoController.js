const db = require("../config/db");
const logError = (msg, err) => console.error(msg, err);


const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

// --- FUNÇÃO 1: Listar Produtos (Paginado) ---
async function getProdutos(req, res) {
  try {
   
    const page = parseInt(req.query.page || DEFAULT_PAGE, 10);
    const limit = parseInt(req.query.limit || DEFAULT_LIMIT, 10);
    const search = req.query.search || '';
    const lowStock = req.query.lowStock === 'true'; 

    // 2. Calcular offset
    const offset = (page - 1) * limit;

    // 3. Montar a consulta SQL
    let params = [];
    let whereClauses = [];

    if (search) {
      whereClauses.push(`(name LIKE ? OR sku LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`);
    }

    if (lowStock) {
      whereClauses.push(`(quantity <= minStock)`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    
    // 4. Consulta para contar o TOTAL de itens (para a paginação)
    const countSql = `SELECT COUNT(sku) as total FROM almox_produtos ${whereSql}`;
    const [countRows] = await db.execute(countSql, params);
    const totalItems = countRows[0].total || 0;
    const totalPages = Math.ceil(totalItems / limit);

    // 5. Consulta para buscar os ITENS DA PÁGINA
    let orderBySql = 'ORDER BY name ASC';
    if (lowStock) {
      orderBySql = 'ORDER BY quantity ASC, name ASC'; // Prioriza os mais baixos
    }

    const itemsSql = `
      SELECT sku, name, category, quantity, minStock, description, fator_embalagem 
      FROM almox_produtos 
      ${whereSql} 
      ${orderBySql}
      LIMIT ? OFFSET ?
    `;
    const [rows] = await db.execute(itemsSql, [...params, limit, offset]);

    // 6. Retornar o objeto paginado
    res.status(200).json({
      items: rows,
      totalPages: totalPages,
      currentPage: page,
      totalItems: totalItems,
    });
  } catch (err) {
    logError("Erro ao buscar produtos (paginado):", err);
    res.status(500).json({ error: "Erro interno ao buscar produtos." });
  }
}

// --- (NOVO) Função de Lista de Produtos (para dropdowns) ---
async function getProdutosLista(req, res) {
  try {
    // Retorna apenas o SKU e o Nome de TODOS os produtos
    const [rows] = await db.execute(
      "SELECT sku, name, quantity FROM almox_produtos ORDER BY name ASC"
    );
    res.status(200).json(rows);
  } catch (err) {
    logError("Erro ao buscar lista de produtos:", err);
    res.status(500).json({ error: "Erro interno ao buscar lista de produtos." });
  }
}


// --- FUNÇÃO 2: Obter Estatísticas (Inalterada) ---
async function getStats(req, res) {

  try {
    const [totalResult] = await db.execute(
      "SELECT COUNT(sku) as totalProducts FROM almox_produtos"
    );
    const [lowStockResult] = await db.execute(
      "SELECT COUNT(sku) as lowStock FROM almox_produtos WHERE quantity <= minStock AND quantity > 0"
    );
    const [outOfStockResult] = await db.execute(
      "SELECT COUNT(sku) as outOfStock FROM almox_produtos WHERE quantity = 0"
    );
    const stats = {
      totalProducts: totalResult[0].totalProducts || 0,
      lowStock: lowStockResult[0].lowStock || 0,
      outOfStock: outOfStockResult[0].outOfStock || 0,
    };
    res.status(200).json(stats);
  } catch (err) {
    logError("Erro ao buscar estatísticas do almoxarifado:", err);
    res.status(500).json({ error: "Erro interno ao buscar estatísticas." });
  }
}

// --- FUNÇÃO 3: addMovimentacao (Inalterada) ---
async function addMovimentacao(req, res) {
  const {
    productSku,
    quantity,
    type,
    responsible,
    destination,
    collector,
    withdrawnBy,
  } = req.body;
  const date = new Date();
  if (!productSku || !quantity || !type || !responsible) {
    return res
      .status(400)
      .json({ error: "Dados incompletos para movimentação." });
  }
  const q_saida = parseInt(quantity, 10);
  if (q_saida <= 0) {
    return res
      .status(400)
      .json({ error: "A quantidade deve ser maior que zero." });
  }
  let connection;
  try {
    connection = await db.getConnection();
    if (type === "saida") {
      const [rows] = await connection.execute(
        "SELECT quantity FROM almox_produtos WHERE sku = ? FOR UPDATE",
        [productSku]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: "Produto (SKU) não encontrado." });
      }
      const estoqueAtual = rows[0].quantity;
      if (q_saida > estoqueAtual) {
        return res.status(409).json({
          error: `Estoque insuficiente. Disponível: ${estoqueAtual}, Solicitado: ${q_saida}`,
        });
      }
    }
    await connection.beginTransaction();
    const sqlInsert = `
        INSERT INTO almox_movimentacoes 
        (productSku, quantity, type, responsible, date, destination, collector, withdrawnBy)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
    await connection.execute(sqlInsert, [
      productSku,
      q_saida,
      type,
      responsible,
      date,
      destination || null,
      collector || null,
      withdrawnBy || null,
    ]);
    const sqlUpdate =
      type === "entrada"
        ? "UPDATE almox_produtos SET quantity = quantity + ? WHERE sku = ?"
        : "UPDATE almox_produtos SET quantity = quantity - ? WHERE sku = ?";
    const [updateResult] = await connection.execute(sqlUpdate, [
      q_saida,
      productSku,
    ]);
    if (updateResult.affectedRows === 0) {
      throw new Error(
        `SKU do produto (${productSku}) não foi encontrado para atualizar.`
      );
    }
    await connection.commit();
    const [rows] = await connection.execute(
      "SELECT * FROM almox_produtos WHERE sku = ?",
      [productSku]
    );
    res.status(201).json({
      message: `Movimentação (${type}) registrada com sucesso!`,
      updatedProduct: rows[0],
    });
  } catch (err) {
    if (connection) await connection.rollback();
    logError("Erro ao registrar movimentação:", err);
    res.status(500).json({
      error: err.message || "Erro interno ao registrar movimentação.",
    });
  } finally {
    if (connection) connection.release();
  }
}

// --- FUNÇÃO 4: addProduto (Inalterada) ---
async function addProduto(req, res) {
  const { sku, name, category, description, minStock, fator_embalagem } = req.body;
  if (!sku || !name || !category) {
    return res
      .status(400)
      .json({ error: "SKU,nome e categoria sao obrigatorios" });
  }
  const skuSanitizado = sku.toUpperCase().replace(/\//g, '-');
  try {
    const sqlInsert = `
      INSERT INTO almox_produtos (sku, name, category, description, minStock, fator_embalagem)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await db.execute(sqlInsert, [
      skuSanitizado, 
      name,
      category,
      description || null,
      minStock || 10,
      fator_embalagem || 1
    ]);
    const [rows] = await db.execute("SELECT * FROM almox_produtos WHERE sku = ?", [skuSanitizado]);
    res.status(201).json({ message: "Produto cadastrado com sucesso!", newProduct: rows[0] });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: `O SKU '${skuSanitizado}' já existe no banco de dados.`,
      });
    }
    logError("Erro ao cadastrar produto", err);
    res
      .status(500)
      .json({ error: err.message || "Erro interno ao cadastrar produto" });
  }
}

// --- FUNÇÃO 5: getMovimentacoes (Paginado) ---
async function getMovimentacoes(req, res) {
  try {
 
    const page = parseInt(req.query.page || DEFAULT_PAGE, 10);
    const limit = parseInt(req.query.limit || DEFAULT_LIMIT, 10);
    const tipo = req.query.tipo || 'todos';
    const produto = req.query.produto || '';
    const responsavel = req.query.responsavel || '';
    const detalhes = req.query.detalhes || '';
  
    const offset = (page - 1) * limit;
    
    let params = [];
    let whereClauses = [];
    if (tipo !== 'todos') {
      whereClauses.push(`m.type = ?`);
      params.push(tipo);
    }
    if (produto) {
      whereClauses.push(`(p.name LIKE ? OR p.sku LIKE ?)`);
      params.push(`%${produto}%`, `%${produto}%`);
    }
    if (responsavel) {
      whereClauses.push(`m.responsible LIKE ?`);
      params.push(`%${responsavel}%`);
    }
    if (detalhes) {
      whereClauses.push(`(m.destination LIKE ? OR m.collector LIKE ? OR m.withdrawnBy LIKE ?)`);
      params.push(`%${detalhes}%`, `%${detalhes}%`, `%${detalhes}%`);
    }
    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    
    const countSql = `
      SELECT COUNT(m.id) as total 
      FROM almox_movimentacoes AS m
      JOIN almox_produtos AS p ON m.productSku = p.sku
      ${whereSql}
    `;
    const [countRows] = await db.execute(countSql, params);
    const totalItems = countRows[0].total || 0;
    const totalPages = Math.ceil(totalItems / limit);
    // 5. Consulta para buscar os ITENS DA PÁGINA
    const itemsSql = `
        SELECT 
          m.id, m.type, m.quantity, m.responsible, m.date, 
          m.destination, m.collector, m.withdrawnBy,
          p.sku, p.name as productName 
        FROM almox_movimentacoes AS m
        JOIN almox_produtos AS p ON m.productSku = p.sku
        ${whereSql}
        ORDER BY m.date DESC
        LIMIT ? OFFSET ?
      `;
    const [rows] = await db.execute(itemsSql, [...params, limit, offset]);
    // 6. Retornar o objeto paginado
    res.status(200).json({
      items: rows,
      totalPages: totalPages,
      currentPage: page,
      totalItems: totalItems,
    });
  } catch (err) {
    logError("Erro ao buscar histórico de movimentações (paginado):", err);
    res.status(500).json({ error: "Erro interno ao buscar histórico." });
  }
}


// --- Exportar Movimentações para CSV ---
async function exportMovimentacoes(req, res) {
  try {
    // 1. Pegar parâmetros (SEM PAGINAÇÃO)
    const tipo = req.query.tipo || 'todos';
    const produto = req.query.produto || '';
    const responsavel = req.query.responsavel || '';
    const detalhes = req.query.detalhes || '';
    // 2. Montar a consulta SQL (mesma lógica de getMovimentacoes)
    let params = [];
    let whereClauses = [];
    if (tipo !== 'todos') {
      whereClauses.push(`m.type = ?`);
      params.push(tipo);
    }
    if (produto) {
      whereClauses.push(`(p.name LIKE ? OR p.sku LIKE ?)`);
      params.push(`%${produto}%`, `%${produto}%`);
    }
    if (responsavel) {
      whereClauses.push(`m.responsible LIKE ?`);
      params.push(`%${responsavel}%`);
    }
    if (detalhes) {
      whereClauses.push(`(m.destination LIKE ? OR m.collector LIKE ? OR m.withdrawnBy LIKE ?)`);
      params.push(`%${detalhes}%`, `%${detalhes}%`, `%${detalhes}%`);
    }
    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    // 3. Consulta para buscar TODOS os itens (SEM LIMIT/OFFSET)
    const itemsSql = `
        SELECT 
          m.id, m.type, m.quantity, m.responsible, m.date, 
          m.destination, m.collector, m.withdrawnBy,
          p.sku, p.name as productName 
        FROM almox_movimentacoes AS m
        JOIN almox_produtos AS p ON m.productSku = p.sku
        ${whereSql}
        ORDER BY m.date DESC
      `;
    const [rows] = await db.execute(itemsSql, params);
    // 4. Retorna o JSON completo (o frontend vai gerar o CSV)
    res.status(200).json(rows); 
  } catch (err) {
    logError("Erro ao exportar movimentações:", err);
    res.status(500).json({ error: "Erro interno ao exportar dados." });
  }
}

// --- FUNÇÃO 6: getNotasFiscais (Inalterada) ---
async function getNotasFiscais(req, res) {
  // ... (código inalterado)
  try {
    const [notas] = await db.execute(
      "SELECT * FROM almox_notas_fiscais ORDER BY receivedDate DESC"
    );
    const notasComItens = [];
    for (const nota of notas) {
      const [itens] = await db.execute(
        `SELECT 
            i.*, 
            p.name as productName 
           FROM almox_itens_nota_fiscal AS i
           JOIN almox_produtos AS p ON i.productSku = p.sku
           WHERE i.invoiceId = ?`,
        [nota.id]
      );
      notasComItens.push({
        ...nota,
        items: itens,
      });
    }
    res.status(200).json(notasComItens);
  } catch (err) {
    logError("Erro ao buscar notas fiscais:", err);
    res.status(500).json({ error: "Erro interno ao buscar notas fiscais." });
  }
}

// --- FUNÇÃO 7: addNotaFiscal (Inalterada) ---
async function addNotaFiscal(req, res) {
  // ... (código inalterado)
  const { id: responsavelId, nome: responsavelNome } = req.usuario;
  const { invoiceNumber, supplier, issueDate, receivedDate, notes, items } = req.body;
  if (!invoiceNumber || !supplier || !issueDate || !receivedDate || !items || items.length === 0) {
    return res.status(400).json({ error: "Dados da NF ou lista de itens incompletos." });
  }
  let connection;
  try {
    connection = await db.getConnection();
    const skusDaNF = items.map(item => item.productSku);
    if (skusDaNF.length === 0) {
      return res.status(400).json({ error: "A NF não contém itens." });
    }
    const placeholders = skusDaNF.map(() => '?').join(','); 
    const sqlCheck = `SELECT sku, fator_embalagem FROM almox_produtos WHERE sku IN (${placeholders})`;
    const [produtosDoBanco] = await connection.execute(sqlCheck, skusDaNF);
    const fatorMap = new Map(
      produtosDoBanco.map(p => [p.sku, p.fator_embalagem])
    );
    const skusEncontrados = new Set(produtosDoBanco.map(p => p.sku));
    const skusFaltantes = skusDaNF.filter(sku => !skusEncontrados.has(sku));
    if (skusFaltantes.length > 0) {
      return res.status(409).json({
        error: `Os seguintes SKUs (já traduzidos) não foram encontrados: [${skusFaltantes.join(', ')}]. Tente reimportar o XML.`
      });
    }
    await connection.beginTransaction();
    const totalValueNF = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const sqlNota = `
      INSERT INTO almox_notas_fiscais (invoiceNumber, supplier, issueDate, receivedDate, totalValue, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [notaResult] = await connection.execute(sqlNota, [
      invoiceNumber, supplier, issueDate, receivedDate, totalValueNF, notes || null
    ]);
    const newInvoiceId = notaResult.insertId;
    const dataAgora = new Date();
    for (const item of items) {
      const fator = fatorMap.get(item.productSku) || 1;
      const quantidadeComprada = item.quantity;
      const quantidadeEmEstoque = quantidadeComprada * fator;
      const precoUnitarioReal = item.unitPrice / fator; 
      const sqlItem = `
        INSERT INTO almox_itens_nota_fiscal (invoiceId, productSku, quantity, unitPrice, total)
        VALUES (?, ?, ?, ?, ?)
      `;
      const itemTotal = quantidadeComprada * item.unitPrice; 
      await connection.execute(sqlItem, [ newInvoiceId, item.productSku, quantidadeComprada, precoUnitarioReal, itemTotal ]);
      const sqlUpdate = "UPDATE almox_produtos SET quantity = quantity + ? WHERE sku = ?";
      await connection.execute(sqlUpdate, [quantidadeEmEstoque, item.productSku]);
      const sqlMov = `
        INSERT INTO almox_movimentacoes 
        (productSku, quantity, type, responsible, date, destination)
        VALUES (?, ?, 'entrada', ?, ?, ?)
      `;
      await connection.execute(sqlMov, [ item.productSku, quantidadeEmEstoque, responsavelNome, dataAgora, `NF: ${invoiceNumber}` ]);
    }
    await connection.commit();
    res.status(201).json({ 
      message: "Nota Fiscal registrada e estoque (com fator) atualizado com sucesso!",
      invoiceId: newInvoiceId
    });
  } catch (err) {
    if (connection) await connection.rollback(); 
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: `A Nota Fiscal Nº ${invoiceNumber} já foi registrada.` });
    }
    logError("Erro ao registrar Nota Fiscal (com Fator):", err);
    res.status(500).json({ error: err.message || "Erro interno ao registrar a NF." });
  }
}

// --- FUNÇÃO 8: deleteProduto (Inalterada) ---
async function deleteProduto(req, res) {
  // ... (código inalterado)
  const { sku } = req.params;
  try {
    const sql = "DELETE FROM almox_produtos WHERE sku = ?";
    const [result] = await db.execute(sql, [sku]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Produto não encontrado." });
    }
    res.status(200).json({ message: "Produto excluído com sucesso." });
  } catch (err) {
    logError("Erro ao deletar produto:", err);
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        error:
          "Este produto não pode ser excluído pois possui histórico de movimentações ou está vinculado a uma Nota Fiscal.",
      });
    }
    res.status(500).json({ error: "Erro interno ao excluir o produto." });
  }
}

// --- FUNÇÃO 9: getProdutoPorSku (Inalterada) ---
async function getProdutoPorSku(req, res) {
  // ... (código inalterado)
  const { sku } = req.params;
  try {
    const [rows] = await db.execute(
      "SELECT sku, name, category, description FROM almox_produtos WHERE sku = ?",
      [sku]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Produto não encontrado." });
    }
    res.status(200).json(rows[0]);
  } catch (err) {
    logError("Erro ao buscar produto por SKU:", err);
    res.status(500).json({ error: "Erro interno ao buscar o produto." });
  }
}

// --- FUNÇÃO 10: updateProduto (Inalterada) ---
async function updateProduto(req, res) {
  // ... (código inalterado)
  const { sku } = req.params;
  const { name, category, description, minStock, fator_embalagem } = req.body;
  if (!name || !category || !minStock || !fator_embalagem) {
    return res.status(400).json({ error: "Nome, Categoria, Estoque Mínimo e Fator de Embalagem são obrigatórios." });
  }
  try {
    const sql = `
      UPDATE almox_produtos 
      SET name = ?, category = ?, description = ?, minStock = ?, fator_embalagem = ?
      WHERE sku = ?
    `;
    const [result] = await db.execute(sql, [
      name,
      category,
      description || null,
      parseInt(minStock, 10),
      parseInt(fator_embalagem, 10) || 1,
      sku
    ]);
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Produto não encontrado para atualizar." });
    }
    const [rows] = await db.execute(
      "SELECT * FROM almox_produtos WHERE sku = ?",
      [sku]
    );
    res.status(200).json({
      message: "Produto atualizado com sucesso!",
      updatedProduct: rows[0],
    });
  } catch (err) {
    logError("Erro ao atualizar produto:", err);
    res
      .status(500)
      .json({ error: err.message || "Erro interno ao atualizar produto." });
  }
}

// --- FUNÇÕES DE RELATÓRIO (Inalteradas) ---
async function getStatsDoDia(req, res) {

  try {
    const [entradas] = await db.execute(
      `SELECT SUM(quantity) as total 
       FROM almox_movimentacoes 
       WHERE type = 'entrada' AND DATE(date) = CURDATE()`
    );
    const [saidas] = await db.execute(
      `SELECT SUM(quantity) as total 
       FROM almox_movimentacoes 
       WHERE type = 'saida' AND DATE(date) = CURDATE()`
    );
    const [gastos] = await db.execute(
      `SELECT SUM(totalValue) as total 
       FROM almox_notas_fiscais 
       WHERE receivedDate = CURDATE()`
    );
    const statsDoDia = {
      entradasHoje: entradas[0].total || 0,
      saidasHoje: saidas[0].total || 0,
      gastosHoje: gastos[0].total || 0,
    };
    res.status(200).json(statsDoDia);
  } catch (err) {
    logError("Erro ao buscar estatísticas do dia:", err);
    res
      .status(500)
      .json({ error: "Erro interno ao buscar estatísticas do dia." });
  }
}

async function getGastosMensais(req, res) {

  const { dataInicio, dataFim, fornecedor } = req.query;
  if (!dataInicio || !dataFim) {
    return res.status(400).json({ error: 'Data de início e fim são obrigatórias.' });
  }
  try {
    let params = [dataInicio, dataFim];
    let sql = `
      SELECT id, invoiceNumber, supplier, receivedDate, totalValue
      FROM almox_notas_fiscais
      WHERE receivedDate BETWEEN ? AND ?
    `;
    if (fornecedor) {
      sql += " AND supplier = ?";
      params.push(fornecedor);
    }
    sql += " ORDER BY receivedDate DESC";
    const [rows] = await db.execute(sql, params);
    res.status(200).json(rows);
  } catch (err) {
    logError("Erro ao buscar relatório de gastos:", err);
    res.status(500).json({ error: "Erro interno ao buscar relatório." });
  }
}

async function getConsumoPorDestino(req, res) {

  const { dataInicio, dataFim, categoria } = req.query;
  if (!dataInicio || !dataFim) {
    return res.status(400).json({ error: 'Data de início e fim são obrigatórias.' });
  }
  try {
    let params = [dataInicio, dataFim];
    let sql = `
      SELECT 
        m.destination, 
        COUNT(m.id) as totalMovimentacoes,
        SUM(m.quantity) as totalUnidades
      FROM 
        almox_movimentacoes AS m
      LEFT JOIN 
        almox_produtos AS p ON m.productSku = p.sku
      WHERE 
        m.type = 'saida' 
        AND m.destination IS NOT NULL AND m.destination != ''
        AND DATE(m.date) BETWEEN ? AND ?
    `;
    if (categoria) {
      sql += " AND p.category = ?";
      params.push(categoria);
    }
    sql += " GROUP BY m.destination ORDER BY totalUnidades DESC";
    const [rows] = await db.execute(sql, params);
    res.status(200).json(rows);
  } catch (err) {
    logError("Erro ao buscar relatório de consumo:", err);
    res.status(500).json({ error: "Erro interno ao buscar relatório." });
  }
}

async function getCategorias(req, res) {
  // ... (código inalterado)
  try {
    const sql = `
      SELECT DISTINCT category 
      FROM almox_produtos 
      WHERE category IS NOT NULL AND category != '' 
      ORDER BY category ASC
    `;
    const [rows] = await db.execute(sql);
    res.status(200).json(rows.map(r => r.category));
  } catch (err) {
    logError("Erro ao buscar categorias:", err);
    res.status(500).json({ error: "Erro interno." });
  }
}

async function getFornecedores(req, res) {
 
  try {
    const sql = `
      SELECT DISTINCT supplier 
      FROM almox_notas_fiscais 
      WHERE supplier IS NOT NULL AND supplier != '' 
      ORDER BY supplier ASC
    `;
    const [rows] = await db.execute(sql);
    res.status(200).json(rows.map(r => r.supplier));
  } catch (err) {
    logError("Erro ao buscar fornecedores:", err);
    res.status(500).json({ error: "Erro interno." });
  }
}

async function getConsumoDetalhado(req, res) {
  
  const { dataInicio, dataFim, categoria, destination } = req.query;
  if (!dataInicio || !dataFim || !destination) {
    return res.status(400).json({ error: 'Data de início, fim e destino são obrigatórios.' });
  }
  try {
    let params = [dataInicio, dataFim, destination];
    let sql = `
      SELECT 
        m.date,
        p.sku,
        p.name,
        m.quantity,
        m.responsible
      FROM 
        almox_movimentacoes AS m
      JOIN 
        almox_produtos AS p ON m.productSku = p.sku
      WHERE 
        m.type = 'saida' 
        AND DATE(m.date) BETWEEN ? AND ?
        AND m.destination = ?
    `;
    if (categoria) {
      sql += " AND p.category = ?";
      params.push(categoria);
    }
    sql += " ORDER BY m.date DESC";
    const [rows] = await db.execute(sql, params);
    res.status(200).json(rows);
  } catch (err) {
    logError("Erro ao buscar relatório de consumo detalhado:", err);
    res.status(500).json({ error: "Erro interno ao buscar relatório detalhado." });
  }
}
async function getProvisionamento(req, res) {
  // Define o período de cálculo (em dias). Padrão: 30 dias
  const periodo = parseInt(req.query.periodo || 30, 10);

  if (periodo <= 0) {
    return res.status(400).json({ error: 'O período deve ser maior que zero.' });
  }

  try {
    const params = [periodo, periodo]; // Parâmetro usado duas vezes na subquery

    /*
     * Esta é a consulta principal. Vamos dissecar:
     * 1. Pega todos os produtos de 'almox_produtos'.
     * 2. Faz um LEFT JOIN numa subconsulta 'cons'.
     * 3. A subconsulta 'cons':
     * - Agrupa todas as saídas ('almox_movimentacoes') por SKU.
     * - Filtra apenas saídas dos últimos 'periodo' dias.
     * - Calcula SUM(quantity) / periodo para obter o 'consumo_medio_diario'.
     * 4. O CASE statement (Lógica de 'diasRestantes'):
     * - Se o stock já está abaixo ou igual ao mínimo -> 0 (Esgotado/Crítico)
     * - Se o consumo é 0 ou nulo -> NULL (representa "Infinito" ou N/A)
     * - Senão -> (Stock Atual - Stock Mínimo) / Consumo Médio Diário
     * 5. Filtramos por 'diasRestantes IS NOT NULL' (só queremos ver itens que são consumidos).
     * 6. Ordenamos pelos mais críticos primeiro.
     */
    const sql = `
      SELECT 
        p.sku,
        p.name,
        p.quantity,
        p.minStock,
        COALESCE(cons.consumo_medio_diario, 0) AS consumoMedioDiario,
        
        CASE
          WHEN p.quantity <= p.minStock THEN 0
          WHEN cons.consumo_medio_diario IS NULL OR cons.consumo_medio_diario <= 0 THEN NULL
          ELSE (p.quantity - p.minStock) / cons.consumo_medio_diario
        END AS diasRestantes
        
      FROM 
        almox_produtos AS p
      LEFT JOIN (
        SELECT 
          productSku, 
          (SUM(quantity) / ?) AS consumo_medio_diario
        FROM 
          almox_movimentacoes
        WHERE 
          type = 'saida' AND date >= (CURDATE() - INTERVAL ? DAY)
        GROUP BY 
          productSku
      ) AS cons ON p.sku = cons.productSku
      
      HAVING 
        diasRestantes IS NOT NULL
        
      ORDER BY 
        diasRestantes ASC;
    `;

    const [rows] = await db.execute(sql, params);
    res.status(200).json(rows);

  } catch (err) {
    logError("Erro ao buscar relatório de provisionamento:", err);
    res.status(500).json({ error: "Erro interno ao buscar provisionamento." });
  }
}


// --- EXPORTS ---
module.exports = {
  getProdutos,
  getProdutosLista, 
  getStats,
  addMovimentacao,
  addProduto,
  getMovimentacoes,
  exportMovimentacoes, 
  getNotasFiscais,
  addNotaFiscal,
  deleteProduto,
  getProdutoPorSku,
  updateProduto,
  getStatsDoDia,
  getGastosMensais,
  getConsumoPorDestino,
  getCategorias,    
  getFornecedores,
  getConsumoDetalhado,
  getProvisionamento 
};
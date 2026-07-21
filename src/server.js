const cors = require('cors');
const express = require('express');

const { configPath, readConfig } = require('./config');
const { createDatabaseRegistry, execute, executeTransaction, query, withDatabase, withTransaction } = require('./firebird');
const { findQuery, listQueries } = require('./queries');
const { startScheduler } = require('./scheduler');

const config = readConfig();
const databaseRegistry = createDatabaseRegistry(config);
const app = express();

app.use(cors({ origin: config.server.corsOrigin || '*' }));
app.use(express.json({ limit: '2mb' }));

function asyncHandler(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

async function runQuery(response, databaseAlias, sql) {
  const databaseConfig = databaseRegistry.getDatabaseConfig(databaseAlias);
  const rows = await withDatabase(databaseConfig, (database) => query(database, sql));
  response.json({
    database: databaseConfig.alias,
    count: rows.length,
    data: rows
  });
}

function getInsertData(data, table) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length === 0) {
    const error = new Error(`Informe os campos para inserir em ${table}`);
    error.statusCode = 400;
    throw error;
  }

  const entries = Object.entries(data);
  if (entries.some(([column]) => !/^[A-Za-z_][A-Za-z0-9_$]*$/.test(column))) {
    const error = new Error(`Nome de coluna invalido em ${table}`);
    error.statusCode = 400;
    throw error;
  }

  return {
    sql: `INSERT INTO ${table} (${entries.map(([column]) => column).join(', ')}) VALUES (${entries.map(() => '?').join(', ')})`,
    params: entries.map(([, value]) => value)
  };
}

async function insertPedido(response, databaseAlias, body) {
  if (!body || typeof body !== 'object') {
    response.status(400).json({ error: 'Informe um objeto JSON.' });
    return;
  }

  const itens = body.itens || [];
  const parcelas = body.parcelas || [];
  if (!Array.isArray(itens) || !Array.isArray(parcelas)) {
    response.status(400).json({ error: 'itens e parcelas devem ser arrays.' });
    return;
  }

  const databaseConfig = databaseRegistry.getDatabaseConfig(databaseAlias);
  const clienteDiversosObs = body.cliente_diversos ? formatClienteDiversosObs(body.cliente_diversos_data) : '';
  const obsPedido = [body.obs_pedido, clienteDiversosObs].filter(Boolean).join('\n').trim() || null;
  const result = await withTransaction(databaseConfig, async (transaction) => {
    const pedidoRows = await executeTransaction(
      transaction,
      'SELECT GEN_ID(GEN_PEDIDO_VENDA, 1) AS PEDIDO_ID FROM RDB$DATABASE'
    );
    const pedidoId = pedidoRows[0].PEDIDO_ID;

    await executeTransaction(transaction, `
      INSERT INTO PEDIDOS (
        PEDIDO_ID, NUM_PEDIDO, PARCEIRO, DATA_PEDIDO, DATA_DIGITACAO,
        DATA_PREV_ENTREGA, SITUACAO_PEDIDO, VENDEDOR, CODCONDREC, FORMA,
        OPERADOR, CODFILIAL, QTD_SUBSTITUIDO, OBS_PEDIDO, NUM_PEDIDO_CLIENTE
      ) VALUES (?, CAST(? AS VARCHAR(15)), ?, ?, CURRENT_DATE, CURRENT_DATE,
        'DIGITADO', ?, ?, ?, ?, ?, 0, ?, CAST(? AS VARCHAR(15)))
    `, [
      pedidoId, pedidoId, body.parceiro, body.data_pedido, body.vendedor,
      body.codcondrec, body.forma, body.operador, body.codfilial,
      obsPedido, pedidoId
    ]);

    for (const item of itens) {
      await executeTransaction(transaction, `
        INSERT INTO PEDIDOS_ITENS (
          PEDIDO_ID, ITEM, CODPRODUTO, CODPRODUTO_CLAS, QTD_PEDIDO,
          QTD_SUBSTITUIDO, PRECO, VALOR_BRUTO, VALOR_ACRESCIMO,
          VALOR_DESCONTO, VALOR_LIQUIDO, DESCRICAO_UNMED, UND_MEDIDA,
          QTD_UNMED, OBS
        ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, 1), ?)
      `, [
        pedidoId, item.item, item.codproduto, item.codproduto_clas,
        item.qtd_pedido, item.preco, item.valor_bruto, item.valor_acrescimo,
        item.valor_desconto, item.valor_liquido, item.descricao_unmed,
        item.und_medida, item.qtd_unmed, item.obs_item
      ]);
    }
    for (const parcela of parcelas) {
      await executeTransaction(transaction, `
        INSERT INTO PEDIDOS_PARCELAS (
          PEDIDO_ID, PARCELA, DATA_VENCIMENTO, VALOR,
          VALOR_JUROS_PREFIXADO, IDN_ENTRADA, FORMA
        ) VALUES (?, ?, ?, ?, 0, 'N', ?)
      `, [pedidoId, parcela.parcela, parcela.data_vencimento, parcela.valor, parcela.forma]);
    }
    return { pedido_id: pedidoId, itens: itens.length, parcelas: parcelas.length };
  });

  response.status(201).json({ message: 'Pedido gravado com sucesso.', ...result });
}

function formatClienteDiversosObs(cliente) {
  if (!cliente || typeof cliente !== 'object') return '';
  const fields = [
    ['Cliente diversos', cliente.nome],
    ['CPF/CNPJ', cliente.cpf || cliente.documento],
    ['Telefone', cliente.telefone],
    ['Endereço', [cliente.endereco, cliente.numero, cliente.complemento, cliente.bairro].filter(Boolean).join(', ')],
    ['Cidade', [cliente.municipio, cliente.uf].filter(Boolean).join('/')],
    ['CEP', cliente.cep],
    ['Referência', cliente.referencia],
  ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');
  return fields.map(([label, value]) => `${label}: ${String(value).trim()}`).join(' | ');
}

async function insertParceiro(response, databaseAlias, body) {
  const databaseConfig = databaseRegistry.getDatabaseConfig(databaseAlias);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    response.status(400).json({ error: 'Informe um objeto JSON com os dados do parceiro.' });
    return;
  }

  const generator = config.firebird.generators?.parceiro || 'GEN_PARCEIRO';
  if (!/^[A-Za-z_][A-Za-z0-9_$]*$/.test(generator)) {
    throw new Error('Generator de parceiro invalido na configuracao.');
  }

  const result = await withTransaction(databaseConfig, async (transaction) => {
    const documento = String(body.cnpj || body.cpf || body.documento || '').replace(/\D/g, '');
    if (documento && documento.length !== 11 && documento.length !== 14) {
      const error = new Error('CPF/CNPJ deve conter 11 ou 14 dígitos.');
      error.statusCode = 400;
      throw error;
    }
    if (documento) {
      const existentes = await executeTransaction(transaction, `
        SELECT FIRST 1 PARCEIRO FROM PARCEIROS
        WHERE CPF = ? OR CNPJ = ?
      `, [documento, documento]);
      if (existentes.length > 0) {
        const error = new Error(`Já existe parceiro cadastrado para este CPF/CNPJ (código ${existentes[0].PARCEIRO}).`);
        error.statusCode = 409;
        throw error;
      }
    }
    const generated = await executeTransaction(
      transaction,
      `SELECT GEN_ID(${generator}, 1) AS PARCEIRO FROM RDB$DATABASE`
    );
    const parceiro = generated[0].PARCEIRO;

    await executeTransaction(transaction, `
      INSERT INTO PARCEIROS (
        PARCEIRO, RAZAO_SOCIAL, FANTASIA, MUNICIPIO, CODFILIAL_CADASTRO,
        IDNSALDOSCC, IDN_PRECO_CUSTO_OUTRAS_SAIDAS, COD_EXIGIBILIDADEISS,
        ATIVO, DATA_CADASTRO, PESSOA_FJ, CNPJ, CPF, EMAIL, TELEFONE,
        CELULAR, ENDERECO, NUMERO, COMPLEMENTO, BAIRRO, UF, CEP, IDN_CLIENTE,
        IDN_FORNECEDOR
      ) VALUES (?, ?, ?, ?, ?, 'S', 'S', 1, 'S', CURRENT_DATE, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      parceiro, body.razao_social, body.fantasia, body.municipio,
      body.codfilial_cadastro, body.pessoa_fj, body.cnpj, body.cpf,
      body.email, body.telefone, body.celular, body.endereco, body.numero,
      body.complemento, body.bairro, body.uf, body.cep, body.idn_cliente, body.idn_fornecedor
    ]);

    return { parceiro };
  });

  response.status(201).json({ message: 'Parceiro gravado com sucesso.', ...result });
}

app.get('/health', (request, response) => {
  response.json({
    status: 'ok',
    config: configPath,
    defaultDatabase: config.firebird.defaultDatabase
  });
});

app.get('/api', (request, response) => {
  response.json({
    databases: databaseRegistry.listDatabases(),
    queries: listQueries()
  });
});

app.get('/api/databases', (request, response) => {
  response.json(databaseRegistry.listDatabases());
});

app.post('/api/pedidos', asyncHandler((request, response) => insertPedido(response, config.firebird.defaultDatabase, request.body)));
app.post('/api/:databaseAlias/pedidos', asyncHandler((request, response) => insertPedido(response, request.params.databaseAlias, request.body)));
app.post('/api/parceiros', asyncHandler((request, response) => insertParceiro(response, config.firebird.defaultDatabase, request.body)));
app.post('/api/:databaseAlias/parceiros', asyncHandler((request, response) => insertParceiro(response, request.params.databaseAlias, request.body)));

app.get('/api/:route', asyncHandler(async (request, response, next) => {
  const route = request.params.route;
  const queryDefinition = findQuery(route);

  if (!queryDefinition) {
    response.status(404).json({ error: `Consulta nao encontrada: ${route}` });
    return;
  }

  await runQuery(response, config.firebird.defaultDatabase, queryDefinition.sql);
}));

app.get('/api/:databaseAlias/:route', asyncHandler(async (request, response) => {
  const queryDefinition = findQuery(request.params.route);

  if (!queryDefinition) {
    response.status(404).json({ error: `Consulta nao encontrada: ${request.params.route}` });
    return;
  }

  await runQuery(response, request.params.databaseAlias, queryDefinition.sql);
}));

app.use((error, request, response, next) => {
  const statusCode = error.statusCode || 500;

  response.status(statusCode).json({
    error: error.message
  });
});

const port = Number(config.server.port || 3000);

app.listen(port, () => {
  console.log(`API Vendas Firebird rodando em http://localhost:${port}`);
  console.log(`Configuracao carregada de ${configPath}`);
});

startScheduler(config, databaseRegistry);

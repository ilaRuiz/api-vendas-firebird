const fs = require('fs');
const path = require('path');

const queriesDir = path.resolve(__dirname, '..', '..', 'SQL_Consultas');

const queryFiles = {
  estoque: {
    route: 'estoque',
    file: 'estoque.sql',
    description: 'Lista estoque, precos e dados de produtos.'
  },
  operadores: {
    route: 'operadores',
    file: 'operadores.sql',
    description: 'Lista operadores ativos e limite de desconto.'
  },
  parceiros: {
    route: 'parceiros',
    file: 'parceiros.sql',
    description: 'Lista parceiros ativos, clientes, vendedores e dados comerciais.'
  },
  parceirosPropriedade: {
    route: 'parceiros-propriedade',
    file: 'parceiros_propriedade.sql',
    description: 'Lista propriedades dos parceiros ativos.'
  },
  clienteDiversos: {
    route: 'cliente-diversos',
    file: 'ClienteDiversos.sql',
    description: 'Retorna o codigo do cliente diversos.'
  },
  formasPagamento: {
    route: 'formas-pagamento',
    file: 'FormasPagamento.sql',
    description: 'Lista formas de pagamento.'
  },
  condicoesRecebimento: {
    route: 'condicoes-recebimento',
    file: 'CondicaoRecebimento.sql',
    description: 'Lista condicoes de recebimento.'
  },
  operacoes: {
    route: 'operacoes',
    file: 'Operacoes.sql',
    description: 'Lista operacoes de venda permitidas.'
  },
  cidades: {
    route: 'cidades',
    file: 'cidades.sql',
    description: 'Lista cidades e respectivos estados.'
  }
};

function normalizeSql(sql) {
  return sql
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/;+\s*$/, '');
}

function readSqlFile(file) {
  const filePath = path.join(queriesDir, file);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo SQL nao encontrado: ${filePath}`);
  }

  return normalizeSql(fs.readFileSync(filePath, 'utf8'));
}

function buildQueryDefinition(key, metadata) {
  return {
    key,
    route: metadata.route,
    file: metadata.file,
    description: metadata.description,
    sql: readSqlFile(metadata.file)
  };
}

function getQueryDefinitions() {
  return Object.entries(queryFiles).map(([key, metadata]) => buildQueryDefinition(key, metadata));
}

function findQuery(route) {
  return getQueryDefinitions().find((queryDefinition) => queryDefinition.route === route);
}

function listQueries() {
  return getQueryDefinitions().map((queryDefinition) => ({
    route: queryDefinition.route,
    file: queryDefinition.file,
    description: queryDefinition.description
  }));
}

module.exports = {
  findQuery,
  listQueries
};

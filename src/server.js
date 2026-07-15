const cors = require('cors');
const express = require('express');

const { configPath, readConfig } = require('./config');
const { createDatabaseRegistry, query, withDatabase } = require('./firebird');
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

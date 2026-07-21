const Firebird = require('node-firebird');

function createDatabaseRegistry(config) {
  const databases = new Map(config.firebird.databases.map((database) => [database.alias, database]));

  function getDatabaseConfig(alias) {
    const selectedAlias = alias || config.firebird.defaultDatabase;
    const database = databases.get(selectedAlias);

    if (!database) {
      const available = [...databases.keys()].join(', ');
      const error = new Error(`Banco nao configurado: ${selectedAlias}. Disponiveis: ${available}`);
      error.statusCode = 404;
      throw error;
    }

    return database;
  }

  function listDatabases() {
    return [...databases.values()].map((database) => ({
      alias: database.alias,
      host: database.host,
      port: database.port,
      database: database.database
    }));
  }

  return {
    getDatabaseConfig,
    listDatabases
  };
}

function attach(databaseConfig) {
  const options = {
    host: databaseConfig.host,
    port: databaseConfig.port,
    database: databaseConfig.database,
    user: databaseConfig.user,
    password: databaseConfig.password,
    lowercase_keys: databaseConfig.lowercase_keys,
    role: databaseConfig.role,
    pageSize: databaseConfig.pageSize
  };

  return new Promise((resolve, reject) => {
    Firebird.attach(options, (error, database) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(database);
    });
  });
}

async function withDatabase(databaseConfig, callback) {
  const database = await attach(databaseConfig);

  try {
    return await callback(database);
  } finally {
    database.detach();
  }
}

async function withTransaction(databaseConfig, callback) {
  const database = await attach(databaseConfig);

  try {
    return await new Promise((resolve, reject) => {
      database.transaction(Firebird.ISOLATION_READ_COMMITTED, async (error, transaction) => {
        if (error) {
          reject(error);
          return;
        }

        try {
          const result = await callback(transaction);
          transaction.commit((commitError) => commitError ? reject(commitError) : resolve(result));
        } catch (callbackError) {
          transaction.rollback(() => reject(callbackError));
        }
      });
    });
  } finally {
    database.detach();
  }
}

function executeTransaction(transaction, sql, params = []) {
  return new Promise((resolve, reject) => {
    transaction.query(sql, params, (error, result) => error ? reject(error) : resolve(result));
  });
}

function query(database, sql, params = []) {
  return new Promise((resolve, reject) => {
    database.query(sql, params, (error, result) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(result);
    });
  });
}

function execute(database, sql, params = []) {
  return new Promise((resolve, reject) => {
    database.query(sql, params, (error, result) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(result);
    });
  });
}

module.exports = {
  createDatabaseRegistry,
  execute,
  executeTransaction,
  query,
  withTransaction,
  withDatabase
};

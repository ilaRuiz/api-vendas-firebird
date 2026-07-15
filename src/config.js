const fs = require('fs');
const path = require('path');

const configPath = path.resolve(__dirname, '..', 'config.json');

function readConfig() {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Arquivo de configuracao nao encontrado: ${configPath}`);
  }

  const rawConfig = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(rawConfig);

  if (!config.firebird?.databases?.length) {
    throw new Error('Configure ao menos um banco em firebird.databases.');
  }

  const aliases = new Set();
  for (const database of config.firebird.databases) {
    if (!database.alias) {
      throw new Error('Todos os bancos precisam de um alias.');
    }
    if (aliases.has(database.alias)) {
      throw new Error(`Alias de banco duplicado: ${database.alias}`);
    }
    aliases.add(database.alias);
  }

  if (!aliases.has(config.firebird.defaultDatabase)) {
    throw new Error(`Banco padrao nao existe: ${config.firebird.defaultDatabase}`);
  }

  return config;
}

module.exports = {
  configPath,
  readConfig
};

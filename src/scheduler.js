const { execute, withDatabase } = require('./firebird');

function startScheduler(config, databaseRegistry) {
  const scheduler = config.scheduler || {};

  if (!scheduler.enabled) {
    console.log('[scheduler] Desativado no config.json.');
    return null;
  }

  const intervalMs = Number(scheduler.intervalMs || 60000);
  const databaseAlias = scheduler.databaseAlias || config.firebird.defaultDatabase;
  const procedureSql = scheduler.procedureSql;
  const runOnStart = Boolean(scheduler.runOnStart);

  if (!procedureSql) {
    console.warn('[scheduler] procedureSql nao configurado. Timer nao iniciado.');
    return null;
  }

  let running = false;

  async function tick() {
    if (running) {
      console.warn('[scheduler] Execucao anterior ainda em andamento. Pulando ciclo.');
      return;
    }

    running = true;

    try {
      const databaseConfig = databaseRegistry.getDatabaseConfig(databaseAlias);
      await withDatabase(databaseConfig, (database) => execute(database, procedureSql));
      console.log(`[scheduler] Procedure executada em ${databaseAlias}: ${procedureSql}`);
    } catch (error) {
      console.error('[scheduler] Erro ao executar procedure:', error.message);
    } finally {
      running = false;
    }
  }

  const timer = setInterval(tick, intervalMs);
  if (runOnStart) {
    tick();
  }

  console.log(`[scheduler] Iniciado a cada ${intervalMs}ms no banco ${databaseAlias}.`);
  return timer;
}

module.exports = {
  startScheduler
};

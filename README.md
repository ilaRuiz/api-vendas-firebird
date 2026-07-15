# API Vendas Firebird

Middleware Node.js para disponibilizar consultas do banco Firebird em REST.

## Configuracao

Edite o arquivo `config.json`:

- `server.port`: porta da API.
- `firebird.defaultDatabase`: alias usado quando a rota nao informa banco.
- `firebird.databases`: lista de bancos Firebird disponiveis.
- `scheduler.intervalMs`: intervalo do processamento automatico.
- `scheduler.runOnStart`: executa tambem ao iniciar, antes do primeiro intervalo.
- `scheduler.procedureSql`: procedure executada pelo timer.

Exemplo para adicionar outro banco:

```json
{
  "alias": "filial2",
  "host": "127.0.0.1",
  "port": 3050,
  "database": "D:\\Dados\\Filial2.FDB",
  "user": "SYSDBA",
  "password": "masterkey",
  "lowercase_keys": false,
  "role": null,
  "pageSize": 4096
}
```

## Instalar e executar

```bash
npm install
npm start
```

No PowerShell desta maquina, se `npm` for bloqueado pela politica de scripts, use:

```powershell
npm.cmd install
npm.cmd start
```

## Rotas

- `GET /health`
- `GET /api`
- `GET /api/databases`
- `GET /api/estoque`
- `GET /api/operadores`
- `GET /api/parceiros`
- `GET /api/parceiros-propriedade`
- `GET /api/cliente-diversos`
- `GET /api/formas-pagamento`
- `GET /api/condicoes-recebimento`
- `GET /api/operacoes`

Para consultar um banco especifico configurado por alias:

- `GET /api/principal/estoque`
- `GET /api/principal/operadores`
- `GET /api/principal/parceiros`
- `GET /api/principal/parceiros-propriedade`
- `GET /api/principal/cliente-diversos`
- `GET /api/principal/formas-pagamento`
- `GET /api/principal/condicoes-recebimento`
- `GET /api/principal/operacoes`

As consultas sao lidas dos arquivos da pasta `SQL_Consultas` quando a API inicia. Ao alterar algum SQL, reinicie a aplicacao.

## Timer

Por padrao a aplicacao executa a cada 1 minuto:

```sql
EXECUTE PROCEDURE X_PROCESSA_ESTOQUE_PENDENTE(50)
```

Altere `scheduler.enabled` para `false` se quiser desligar temporariamente.

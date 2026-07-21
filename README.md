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
- `GET /api/cidades`

Gravacao:

- `POST /api/parceiros` gera o parceiro usando `GEN_PARCEIRO` e grava os campos da tabela `PARCEIROS`. O generator pode ser alterado em `firebird.generators.parceiro` no `config.json`.
- `POST /api/pedidos` gera o `PEDIDO_ID` com `GEN_PEDIDO_VENDA` e grava `itens` e `parcelas` em uma unica transacao nas tabelas `PEDIDOS`, `PEDIDOS_ITENS` e `PEDIDOS_PARCELAS`.

Exemplo de cadastro de parceiro:

```json
{
  "razao_social": "Empresa Exemplo LTDA",
  "fantasia": "Empresa Exemplo",
  "municipio": "Cuiaba",
  "codfilial_cadastro": 1,
  "pessoa_fj": "J",
  "cnpj": "00.000.000/0001-00",
  "cpf": null,
  "email": "cliente@exemplo.com.br",
  "telefone": "6533334444",
  "celular": "65999998888",
  "endereco": "Rua Exemplo",
  "numero": "100",
  "bairro": "Centro",
  "uf": "MT",
  "cep": "78000000",
  "idn_cliente": "S",
  "idn_fornecedor": "N"
}
```

O campo `parceiro` não deve ser enviado: ele é gerado pela API. A API também preenche automaticamente `IDNSALDOSCC`, `IDN_PRECO_CUSTO_OUTRAS_SAIDAS`, `COD_EXIGIBILIDADEISS`, `ATIVO` e `DATA_CADASTRO`.

Exemplo de pedido (os nomes devem corresponder as colunas do seu banco):

```json
{
  "parceiro": 25,
  "data_pedido": "2026-07-20",
  "vendedor": 1,
  "codcondrec": 1,
  "forma": 1,
  "operador": 1,
  "codfilial": 1,
  "obs_pedido": "Pedido via e-commerce",
  "itens": [{
    "item": 1, "codproduto": 8, "codproduto_clas": 1,
    "qtd_pedido": 2, "preco": 10.50, "valor_bruto": 21.00,
    "valor_acrescimo": 0, "valor_desconto": 0, "valor_liquido": 21.00,
    "descricao_unmed": "UN", "und_medida": "UN", "qtd_unmed": 1,
    "obs_item": ""
  }],
  "parcelas": [{
    "parcela": 1, "data_vencimento": "2026-08-20", "valor": 21.00, "forma": 1
  }]
}
```

As mesmas rotas aceitam o alias do banco, por exemplo `POST /api/principal/pedidos`.

Resposta de sucesso do cadastro de parceiro:

```json
{
  "message": "Parceiro gravado com sucesso.",
  "parceiro": 12345
}
```

Para consultar um banco especifico configurado por alias:

- `GET /api/principal/estoque`
- `GET /api/principal/operadores`
- `GET /api/principal/parceiros`
- `GET /api/principal/parceiros-propriedade`
- `GET /api/principal/cliente-diversos`
- `GET /api/principal/formas-pagamento`
- `GET /api/principal/condicoes-recebimento`
- `GET /api/principal/operacoes`
- `GET /api/principal/cidades`

As consultas sao lidas dos arquivos da pasta `SQL_Consultas` quando a API inicia. Ao alterar algum SQL, reinicie a aplicacao.

## Timer

Por padrao a aplicacao executa a cada 1 minuto:

```sql
EXECUTE PROCEDURE X_PROCESSA_ESTOQUE_PENDENTE(50)
```

Altere `scheduler.enabled` para `false` se quiser desligar temporariamente.

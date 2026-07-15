-- Consulta para listar os operadores do sistema e seus limites

SELECT
    o.operador as codOperador,
    trim(o.nome) as nomeOperador,
    COALESCE(
    spo.limite,
    CAST(cp.valor AS NUMERIC(10,2)),
    9999.99) AS limite_desconto
FROM operadores o

CROSS JOIN configuracao_parametros cp

LEFT JOIN solicitacoes_param_oper spo
    ON spo.operador = o.operador
   AND spo.codtipo_solicitacao = 71
   AND spo.idn_permissao = 'S'

WHERE cp.parametro = 'LIMITE_DESCONTO_VENDA' and o.data_baixa is null;

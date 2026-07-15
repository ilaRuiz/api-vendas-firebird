-- Busca para listar os dados de clientes / transportadora / funcion�rios / vendedores / forma padr�o / condi��o padr�o
SELECT
    p.parceiro,
    p.razao_social,
    p.nome,
    p.fantasia,
    p.endereco,
    p.numero,
    trim(p.complemento) as complemento,
    p.bairro,
    p.codcidade,
    p.municipio,
    p.uf,
    trim(p.cep) as cep,
    trim(p.celular) as celular,
    trim(p.telefone) as telefone,
    trim(p.email) as email,
    trim(p.pessoa_fj) as pessoa_fj,
    p.idn_sexo,
    p.cpf,
    p.rg,
    p.cnpj,
    p.ie,
    p.data_cadastro,
    p.senha,
    p.diavencto,
    p.idn_cliente,
    p.idn_transportadora,
    p.idn_funcionario,
    p.idn_vendedor,
    p.nascimento,
    p.vendedor_do_parceiro,
    trim(pp.nome) as nome_vendedor,
    p.codcondrec,
    trim(cr.dsccondrec) as dsccondrec,
    p.forma,
    trim(fpr.dscforma) as dscforma
FROM parceiros p
left JOIN formas_pagar_receber fpr ON p.forma = fpr.forma
left JOIN condicoes_recebimento cr ON p.codcondrec = cr.codcondrec
left JOIN parceiros pp on p.vendedor_do_parceiro = pp.parceiro

where p.ativo = 'S'

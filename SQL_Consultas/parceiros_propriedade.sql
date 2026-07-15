-- Select para listar as propriedades dos cliente, quando existirem
select
pp.parceiro, pp.seq, pp.ie, pp.endereco, pp.numero, trim(pp.bairro) as bairro, pp.municipio, c.cidade, c.estado, pp.cep

from parceiros_propriedades pp
left join cidades c on pp.municipio = c.codigo
left join parceiros p on pp.parceiro = p.parceiro

where p.ativo = 'S'
order by 1,2


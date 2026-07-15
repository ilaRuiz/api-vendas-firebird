-- Trazer as Operações que podem ser usadas
select
o.codoper, o.dscoper, o.vendas
from operacoes o
where o.vendas = 'S' and o.idn_nor_dev = 'N'

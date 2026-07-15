-- Trazer todas as formas de pagamentos
select
f.forma, trim(f.dscforma) as dscforma
from formas_pagar_receber f

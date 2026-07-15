-- Trazer todas as condi��es de recebimentos
select
cr.codcondrec,
trim(cr.dsccondrec) as dsccondrec,
cr.parcelas,
trim(cr.entrada) as entrada,
cr.intdias_fixo,
trim(cr.vencto_mesmodia) as vencto_mesmodia
from condicoes_recebimento cr

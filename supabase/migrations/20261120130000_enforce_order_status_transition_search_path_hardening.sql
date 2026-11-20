-- ==============================================================================
-- Migráció: search_path hardening az enforce_order_status_transition trigger-
-- fuggvenyen (audit b3387cba 1/6)
-- Dátum: 2026-11-20
--
-- Ez a migracio korabban kozvetlenul (MCP-vel, git-tracking nelkul) kerult a
-- dev-sandboxra -- itt potoljuk a repo-fajlt es visszuk at a tartalmat PROD-ra
-- is. A fuggveny LOGIKAJA NEM valtozik (ellenorizve: pg_get_functiondef
-- szoveg-egyezes dev-sandbox vs. PROD a SET search_path soron kivul) -- csak
-- egy `SET search_path TO 'public', 'pg_temp'` zarolas kerul a fuggvenyre,
-- hogy SECURITY DEFINER/trigger-kontextusban se legyen search_path-eltereles
-- lehetseges.
-- ==============================================================================

begin;

CREATE OR REPLACE FUNCTION public.enforce_order_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if new.status = old.status then
    return new;
  end if;
  if old.status = 'cancelled' then
    raise exception 'invalid order status transition: % -> % (order already cancelled)', old.status, new.status;
  end if;
  if new.status = 'confirmed' and old.status <> 'pending' then
    raise exception 'invalid order status transition: % -> % (confirm only allowed from pending)', old.status, new.status;
  end if;
  if new.status = 'pending' then
    raise exception 'invalid order status transition: % -> % (cannot move back to pending)', old.status, new.status;
  end if;
  return new;
end;
$function$;

commit;

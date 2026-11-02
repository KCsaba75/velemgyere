-- Kanban 6f9ad755 (Csaba bovites, msg 3189): az admin "Uzenetek" panel kell
-- hogy tudjon valaszolni egy kapcsolati uzenetre (lasd send-contact-reply
-- Edge Function) -- ez a valasz-szoveg es -idopont tarolasara kell, plusz a
-- status mar harom allapotot hordoz: 'new' (olvasatlan, badge-szamolja),
-- 'read' (admin kinyitotta, meg nem valaszolt), 'resolved' (valaszolt).

alter table public.contact_messages add column if not exists admin_reply text;
alter table public.contact_messages add column if not exists replied_at timestamp with time zone;

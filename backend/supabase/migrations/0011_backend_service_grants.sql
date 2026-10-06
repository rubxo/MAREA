-- Local API auto-exposure is disabled. Explicit administrative grants enable
-- trusted seed/cleanup tools; service_role is never shipped to the mobile app.
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

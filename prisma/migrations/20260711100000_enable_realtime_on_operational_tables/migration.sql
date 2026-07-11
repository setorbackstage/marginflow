-- Enable Supabase Realtime (logical replication) for key operational tables.
-- Without this, postgres_changes subscriptions in the browser receive no events
-- even if the WebSocket connection is established successfully.
-- Applied directly to the Supabase project; tracked here for git history.
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table kitchen_tickets;
alter publication supabase_realtime add table payments;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table deliveries;
alter publication supabase_realtime add table stock_movements;

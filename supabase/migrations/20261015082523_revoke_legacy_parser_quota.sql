-- All active parser requests use the IP-aware v2 quota. Keep the old function
-- for compatibility, but remove browser roles' ability to call the stale RPC.
revoke all on function public.consume_spending_parse_quota()
  from public, anon, authenticated;

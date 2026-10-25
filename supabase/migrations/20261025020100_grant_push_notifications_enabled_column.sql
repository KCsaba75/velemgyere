-- profiles.push_notifications_enabled (20261025020000) was missing from the
-- authenticated role's column-level UPDATE grant, so the account-settings
-- toggle would have silently failed to persist for logged-in users (same
-- class of gap as the column-grant fix in 20261016030000) -- caught before
-- building the toggle UI, not after.
grant update (push_notifications_enabled) on public.profiles to authenticated;

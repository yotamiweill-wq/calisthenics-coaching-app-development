-- Make yotamiweill@gmail.com the coach. Safe to run more than once.
--
-- Sign-up is invite-only (the handle_new_user trigger rejects any sign-up without a valid
-- invite), so the very first coach cannot register through the normal trainee flow.
--   * If the account already has a profile, promote it to coach and re-enable it.
--   * Otherwise, create a single-use COACH invite bound to this email. The statement at the
--     end returns the one-time token; open  /auth/register?token=<token>  to create the account.
--     Only the SHA-256 hash is stored, so the token cannot be recovered later: re-run this
--     script to issue a new one.

-- 1. Account already exists: promote it.
update public.profiles
   set role = 'coach',
       disabled_at = null
 where lower(email) = 'yotamiweill@gmail.com';

-- 2. No account yet: drop any stale unused invite for this email.
delete from public.invites i
 where i.email = 'yotamiweill@gmail.com'
   and i.accepted_at is null
   and not exists (select 1 from public.profiles p where lower(p.email) = 'yotamiweill@gmail.com');

-- 3. No account yet: issue a fresh 7-day coach invite and return its token once.
with t as (
  select replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '') as token
),
ins as (
  insert into public.invites (email, full_name, role, token_hash, expires_at)
  select 'yotamiweill@gmail.com',
         '',
         'coach',
         encode(sha256(convert_to(t.token, 'UTF8')), 'hex'),
         now() + interval '7 days'
    from t
   where not exists (select 1 from public.profiles p where lower(p.email) = 'yotamiweill@gmail.com')
  returning id
)
select case when exists (select 1 from ins) then t.token else null end as register_token,
       exists (select 1 from public.profiles p where lower(p.email) = 'yotamiweill@gmail.com' and p.role = 'coach') as already_coach
  from t;

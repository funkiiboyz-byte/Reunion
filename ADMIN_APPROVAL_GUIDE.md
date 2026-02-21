# Admin Email Approval Guide (Supabase)

এই setup-এর পর admin panel login করার জন্য দুইটা জিনিস লাগবে:
1. Supabase Auth user (email + password)
2. সেই email `admin_approved_emails` table-এ approved থাকতে হবে

## Step 1: SQL run করো
Supabase Dashboard → SQL Editor এ `supabase_setup.sql` পুরোটা run করো.

## Step 2: Admin auth user create করো
Supabase Dashboard → Authentication → Users → Add user
- Email: example `admin@reunion.com`
- Password: strong password
- Email Confirmed: true (if needed)

## Step 3: Email approve করো
SQL Editor এ run:

```sql
insert into public.admin_approved_emails (email, is_active, approved_by)
values ('admin@reunion.com', true, 'owner')
on conflict (email)
do update set is_active = true, approved_at = now();
```

## Step 4: Website admin login
Admin button → email + password দিয়ে login.

Login only success হবে যখন:
- auth login success
- `is_admin_email_approved(email)` function true return করবে

## Admin revoke (block)
```sql
update public.admin_approved_emails
set is_active = false
where lower(email)=lower('admin@reunion.com');
```

## Important Security Note
বর্তমান project prototype mode এ `site_settings` ও `registrations` table-এ anon policies permissive রাখা আছে।
Production এ অবশ্যই:
- admin actions server-side validate করা
- stricter RLS policies ব্যবহার করা
- anon key exposure limited রাখা

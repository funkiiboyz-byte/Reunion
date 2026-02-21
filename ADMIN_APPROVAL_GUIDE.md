# Admin Email Approval Guide (Supabase)

এখন admin login flow stable করার জন্য rule:
1) Supabase Auth user থাকতে হবে (email+password)
2) ওই email `admin_approved_emails` table-এ `is_active=true` থাকতে হবে

## 1) SQL run করো
Supabase Dashboard → SQL Editor → `supabase_setup.sql` পুরোটা run করো.

## 2) Auth user create করো
Authentication → Users → Add user
- Email: যেমন `admin@reunion.com`
- Password: strong password
- Email confirmed: true (if needed)

## 3) Email approve করো (database)
```sql
insert into public.admin_approved_emails (email, is_active, approved_by)
values ('admin@reunion.com', true, 'owner')
on conflict (email)
do update set is_active = true, approved_at = now();
```

## 4) Login flow
Website → Admin button → email + password submit করলে:
- প্রথমে Supabase Auth login হবে
- তারপর `admin_approved_emails` table থেকে same email + `is_active=true` row check হবে
- row থাকলে admin panel open হবে

## 5) Admin revoke (block)
```sql
update public.admin_approved_emails
set is_active = false
where lower(email)=lower('admin@reunion.com');
```

## Bug-fix note
আগে RPC/function dependency-র কারণে login fail হতে পারতো। এখন direct table-check flow করা হয়েছে, RLS এমনভাবে দেয়া যে authenticated user শুধু নিজের active row-টাই read করতে পারে.

## Security note
এই প্রজেক্ট এখনো prototype mode:
- `site_settings` এবং `registrations` এ permissive anon policy আছে.
- production এ admin operations backend/API route দিয়ে করা best.

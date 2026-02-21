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


## Registration save fix (important)
যদি আগে registration save না হয়, updated `supabase_setup.sql` আবার run করো।
এখন `registrations` table insert/select policy `anon, authenticated` দুই role-ই allow করে, তাই admin login অবস্থায়ও registration save হবে।

## Admin change save না হলে
`supabase_setup.sql` re-run করো। latest policy-তে `site_settings` upsert `anon, authenticated` দুই role-এর জন্য allow করা আছে, তাই admin login অবস্থায়ও save কাজ করবে।


## Latest fix notes
- Page load এ যদি আগে `#join` hash থেকে registration section এ auto jump হতো, এখন সেটা clear করা হয়েছে।
- Registration save fail হলে data local backup এ save হয়, পরে export CSV তে include হবে।


## Chrome LockManager timeout fix
Latest update-এ Supabase client auth persistence memory mode এ নেওয়া হয়েছে (`persistSession: false`) যাতে Chrome এর `lock:sb-...auth-token` timeout issue কমে। যদি পুরানো tab/cache থেকে error আসে, hard refresh করে আবার login/register try করো।


## Fake registration remove from Admin Panel
এখন Admin Panel থেকে registration list দেখা যাবে এবং `Remove` button দিয়ে delete করা যাবে।
এটার জন্য updated `supabase_setup.sql` re-run করো, কারণ নতুন `registrations_delete_admin_only` policy দরকার।
এই delete permission শুধু approved active authenticated admin email এর জন্য কাজ করবে।


## Remove button click UX
`Remove` click করলে row temporary mark (faded) হয়ে `Removing...` দেখাবে, তারপর success হলে realtime list/count/ticker auto update হবে।


## Remove না হলে (important)
`Remove` button reliable করার জন্য এখন `delete_registration_admin(reg_id)` RPC ব্যবহার করা হয়। তাই updated `supabase_setup.sql` অবশ্যই re-run করো।
এই RPC শুধুমাত্র approved active authenticated admin email হলে delete করবে।

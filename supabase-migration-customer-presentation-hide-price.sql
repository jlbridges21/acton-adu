-- Remember whether a shared catalogue was generated without base prices

alter table public.customer_presentations
  add column if not exists hide_price boolean not null default false;

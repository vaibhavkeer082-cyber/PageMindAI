create table if not exists users (
  id uuid primary key,
  email text not null unique,
  password_hash text not null,
  plan text not null default 'free' check (plan in ('free', 'paid')),
  created_at timestamptz not null default now()
);

create table if not exists uploads (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  file_path text not null,
  status text not null default 'uploaded' check (status in ('uploaded', 'analyzed', 'failed')),
  ocr jsonb not null,
  subject_detected text not null default 'General Studies',
  processing_ms integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists results (
  id uuid primary key,
  upload_id uuid not null references uploads(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists usage (
  user_id uuid not null references users(id) on delete cascade,
  date date not null,
  count integer not null default 0,
  last_upload_at timestamptz,
  primary key (user_id, date)
);

create table if not exists logs (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  upload_id uuid references uploads(id) on delete set null,
  event text not null,
  subject text,
  success boolean not null default true,
  processing_ms integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists uploads_user_created_idx on uploads(user_id, created_at desc);
create index if not exists results_user_created_idx on results(user_id, created_at desc);
create index if not exists logs_user_created_idx on logs(user_id, created_at desc);

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

update storage.buckets
set public = true
where id = 'uploads';

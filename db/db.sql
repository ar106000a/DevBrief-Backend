

create table public.users (
  id uuid not null default extensions.uuid_generate_v4 (),
  email text not null,
  password_hash text not null,
  username text not null,
  first_name text null,
  last_name text null,
  is_verified boolean null default false,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  avatar_url text null,
  is_test_user boolean null default false,
  constraint users_pkey primary key (id),
  constraint users_email_key unique (email),
  constraint users_username_key unique (username)
) TABLESPACE pg_default;

create unique INDEX IF not exists users_username_idx on public.users using btree (lower(username)) TABLESPACE pg_default;

create table public.otps (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid null,
  otp_code text not null,
  created_at timestamp with time zone null default now(),
  expires_at timestamp with time zone not null default (now() + '00:10:00'::interval),
  purpose text not null default 'email_verification'::text,
  used boolean null default false,
  constraint otps_pkey primary key (id),
  constraint otps_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_otps_user_id on public.otps using btree (user_id) TABLESPACE pg_default;



-- Create the function that updates the 'updated_at' column
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

create trigger trg_update_users_updated_at BEFORE
update on users for EACH row
execute FUNCTION update_users_updated_at ();
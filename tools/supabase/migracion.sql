-- Amazona Verse: récords públicos de los minijuegos (aplicada el 26-oct-2026 como «amazona_verse_records»).
create schema if not exists amazona;
revoke all on schema amazona from public, anon, authenticated;
create table if not exists amazona.records (
  id bigint generated always as identity primary key,
  reto text not null check (reto in ('carrera','rio','tormenta','banquete','flight')),
  valor integer not null check (valor >= 0),
  dur_ms integer not null check (dur_ms >= 0),
  alias text not null check (char_length(alias) between 3 and 40),
  dispositivo text not null check (char_length(dispositivo) = 64),
  ip text not null check (char_length(ip) = 64),
  oculto boolean not null default false,
  creado timestamptz not null default now()
);
alter table amazona.records enable row level security;
revoke all on all tables in schema amazona from public, anon, authenticated;
create index if not exists records_reto_valor on amazona.records (reto, valor) where not oculto;
create index if not exists records_dispositivo on amazona.records (dispositivo, creado);
create index if not exists records_ip on amazona.records (ip, creado);

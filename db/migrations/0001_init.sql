-- EduVerse initial schema (Phase 1). PostgreSQL / Supabase.
-- Authoritative progress and unlock state live here, never only in the UI.

create type user_role as enum ('student','teacher','guardian','admin');
create type topic_status as enum ('locked','available','in_progress','mastered');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'student',
  display_name text not null check (char_length(display_name) between 1 and 40),
  created_at timestamptz not null default now()
);

create table subjects (
  id text primary key,
  title text not null
);

create table topics (
  id text primary key,
  subject_id text not null references subjects(id),
  title text not null,
  summary text not null default '',
  sort_order int not null check (sort_order >= 0),
  default_mastery_percent int not null default 80 check (default_mastery_percent between 1 and 100)
);
create index topics_subject_idx on topics(subject_id, sort_order);

create table topic_prerequisites (
  topic_id text not null references topics(id) on delete cascade,
  prerequisite_id text not null references topics(id) on delete cascade,
  primary key (topic_id, prerequisite_id),
  check (topic_id <> prerequisite_id)
);

create table classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles(id),
  name text not null
);

create table enrollments (
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  primary key (class_id, student_id)
);

-- Teacher-configurable mastery threshold per class and topic.
create table class_topic_settings (
  class_id uuid not null references classes(id) on delete cascade,
  topic_id text not null references topics(id) on delete cascade,
  mastery_percent int not null check (mastery_percent between 1 and 100),
  primary key (class_id, topic_id)
);

create table guardian_consents (
  guardian_id uuid not null references profiles(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (guardian_id, student_id)
);

-- One row per student and topic. Written only by server-side code.
create table topic_progress (
  student_id uuid not null references profiles(id) on delete cascade,
  topic_id text not null references topics(id) on delete cascade,
  status topic_status not null default 'locked',
  best_score_percent int check (best_score_percent between 0 and 100),
  version int not null default 0, -- optimistic concurrency
  updated_at timestamptz not null default now(),
  primary key (student_id, topic_id)
);

-- Star rating is feedback and is stored apart from assessment results.
create table topic_ratings (
  student_id uuid not null references profiles(id) on delete cascade,
  topic_id text not null references topics(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  primary key (student_id, topic_id)
);

create table audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references profiles(id),
  action text not null,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Row level security: clients can read their own rows; writes go through the server.
alter table profiles enable row level security;
alter table topic_progress enable row level security;
alter table topic_ratings enable row level security;
alter table audit_logs enable row level security;

create policy "own profile" on profiles for select using (id = auth.uid());
create policy "own progress" on topic_progress for select using (student_id = auth.uid());
create policy "own ratings" on topic_ratings for select using (student_id = auth.uid());
-- No insert/update policies on progress: only the service role (server) may write it.
-- audit_logs has no client policies at all.

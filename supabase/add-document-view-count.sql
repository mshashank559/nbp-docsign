alter table documents
add column if not exists view_count integer not null default 0;

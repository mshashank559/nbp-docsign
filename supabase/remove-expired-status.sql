update documents
set status = case
  when signed_at is not null then 'signed'
  when sent_at is not null then 'viewed'
  else 'draft'
end
where status = 'expired';

alter table documents
  drop constraint if exists documents_status_check;

alter table documents
  add constraint documents_status_check
  check (status in ('draft', 'sent', 'viewed', 'signed'));

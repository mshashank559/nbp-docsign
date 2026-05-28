-- Alter the documents table type constraint to allow 'final-onboarding'
-- Run this query once in: Supabase Dashboard -> SQL Editor -> New Query

alter table documents drop constraint if exists documents_type_check;

alter table documents add constraint documents_type_check check (type in (
  'agreement',
  'review-agreement',
  'pre-invoice',
  'slot-invoice-receipt',
  'final-invoice-receipt',
  'appointment',
  'offer',
  'confirmation',
  'final-onboarding'
));

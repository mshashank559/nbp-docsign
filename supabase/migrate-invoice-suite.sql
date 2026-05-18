-- Replace deprecated performa document types with the invoice suite.
-- Run once in Supabase SQL Editor before creating new invoice documents.

update documents
set type = 'pre-invoice'
where type in ('PRE_PROFORMA', 'pre_proforma', 'pre-performa', 'PRE_INVOICE', 'pre_invoice');

update documents
set type = 'final-invoice-receipt'
where type in ('POST_PROFORMA', 'post_proforma', 'post-performa', 'FINAL_INVOICE_RECEIPT', 'final_invoice_receipt');

update documents
set type = 'slot-invoice-receipt'
where type in ('SLOT_INVOICE_RECEIPT', 'slot_invoice_receipt');

alter table documents
  drop constraint if exists documents_type_check;

alter table documents
  add constraint documents_type_check
  check (type in (
    'agreement',
    'review-agreement',
    'pre-invoice',
    'slot-invoice-receipt',
    'final-invoice-receipt',
    'appointment',
    'offer',
    'confirmation'
  ));

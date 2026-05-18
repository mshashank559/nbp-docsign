-- Run this once on an existing Supabase project to allow the document
-- type values used by the app UI and API routes.
--
update documents
set type = 'agreement'
where type in ('NDA', 'MSA', 'SLA', 'SOW', 'LOE');

update documents
set type = 'review-agreement'
where type in ('REVIEW_AGREEMENT', 'review_agreement');

update documents
set type = 'pre-invoice'
where type in ('PRE_PROFORMA', 'pre_proforma', 'pre-performa', 'PRE_INVOICE', 'pre_invoice');

update documents
set type = 'slot-invoice-receipt'
where type in ('SLOT_INVOICE_RECEIPT', 'slot_invoice_receipt');

update documents
set type = 'final-invoice-receipt'
where type in ('POST_PROFORMA', 'post_proforma', 'post-performa', 'FINAL_INVOICE_RECEIPT', 'final_invoice_receipt');

update documents
set type = 'offer'
where type in ('OFFER_LETTER', 'offer_letter');

update documents
set type = 'appointment'
where type in ('APPOINTMENT_LETTER', 'appointment_letter');

update documents
set type = 'confirmation'
where type in ('CONFIRMATION_LETTER', 'confirmation_letter');

alter table documents
  drop constraint if exists documents_type_check;

alter table documents
  add constraint documents_type_check
  check (type in ('agreement', 'review-agreement', 'pre-invoice', 'slot-invoice-receipt', 'final-invoice-receipt', 'appointment', 'offer', 'confirmation'));

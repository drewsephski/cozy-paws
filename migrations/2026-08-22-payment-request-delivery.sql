alter table payment_request add column if not exists customer_notified_at timestamptz;
alter table payment_request add column if not exists customer_notification_id text;

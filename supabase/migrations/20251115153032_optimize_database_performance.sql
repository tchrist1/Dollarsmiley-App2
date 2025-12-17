/*
  # Database Performance Optimization

  Adds critical indexes for improved query performance.
*/

-- BOOKINGS
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_date ON bookings(scheduled_date);

-- MESSAGES
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

-- TRANSACTIONS
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_booking_id ON transactions(booking_id);

-- NOTIFICATIONS
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- UPDATE STATISTICS
ANALYZE bookings;
ANALYZE messages;
ANALYZE transactions;
ANALYZE notifications;

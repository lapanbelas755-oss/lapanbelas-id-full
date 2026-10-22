-- Table: push_subscriptions
-- Description: Stores Web Push (VAPID) subscriptions for Admin, Crew, Clients, and Guests.

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_type TEXT NOT NULL DEFAULT 'guest', -- 'admin', 'crew', 'client', 'guest'
    user_id TEXT, -- crew_id, order_id, or email
    device_info JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for speedy lookups by user type and user id
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions (user_type, user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_endpoint ON push_subscriptions (endpoint);

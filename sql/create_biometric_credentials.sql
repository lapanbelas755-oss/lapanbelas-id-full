-- Table: biometric_credentials
-- Description: Stores WebAuthn / Passkeys credentials for Admin and Crew biometric login (Face ID, Touch ID, Fingerprint).

CREATE TABLE IF NOT EXISTS biometric_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id TEXT NOT NULL UNIQUE,
    raw_id TEXT,
    user_type TEXT NOT NULL, -- 'admin' or 'crew'
    user_identifier TEXT NOT NULL, -- admin email or crew phone number
    user_name TEXT,
    device_name TEXT DEFAULT 'Perangkat Biometrik',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for fast login lookups
CREATE INDEX IF NOT EXISTS idx_bio_cred_id ON biometric_credentials (credential_id);
CREATE INDEX IF NOT EXISTS idx_bio_user ON biometric_credentials (user_type, user_identifier);

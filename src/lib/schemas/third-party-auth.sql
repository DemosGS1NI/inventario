-- Third-party application and user authorization tables
-- This schema adds the capability for users to grant access to third-party applications

-- Table to store registered third-party applications
CREATE TABLE third_party_applications (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    client_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    client_secret VARCHAR(255) NOT NULL,
    redirect_uri TEXT NOT NULL,
    website_url TEXT,
    logo_url TEXT,
    scopes TEXT[] DEFAULT ARRAY['read:profile'], -- Array of permissions/scopes
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by SMALLINT REFERENCES usuarios(id)
);

-- Table to store user authorizations to third-party applications
CREATE TABLE user_authorizations (
    id SERIAL PRIMARY KEY,
    user_id SMALLINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    application_id INTEGER NOT NULL REFERENCES third_party_applications(id) ON DELETE CASCADE,
    scopes TEXT[] NOT NULL, -- Granted scopes/permissions
    access_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    refresh_token UUID UNIQUE DEFAULT gen_random_uuid(),
    expires_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 hour'),
    refresh_expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
    is_active BOOLEAN DEFAULT true,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP,
    UNIQUE(user_id, application_id) -- One authorization per user per app
);

-- Index for performance
CREATE INDEX idx_user_authorizations_user_id ON user_authorizations(user_id);
CREATE INDEX idx_user_authorizations_application_id ON user_authorizations(application_id);
CREATE INDEX idx_user_authorizations_access_token ON user_authorizations(access_token);
CREATE INDEX idx_third_party_applications_client_id ON third_party_applications(client_id);

-- Sample third-party applications for demonstration
INSERT INTO third_party_applications (name, description, redirect_uri, website_url, scopes, created_by) VALUES
('Inventory Mobile App', 'Mobile application for inventory management', 'https://mobile-app.example.com/auth/callback', 'https://mobile-app.example.com', ARRAY['read:profile', 'read:inventory'], 1),
('Analytics Dashboard', 'Business intelligence and analytics platform', 'https://analytics.example.com/oauth/callback', 'https://analytics.example.com', ARRAY['read:profile', 'read:inventory', 'read:reports'], 1),
('Third-Party Scanner', 'Barcode scanning integration service', 'https://scanner-service.example.com/callback', 'https://scanner-service.example.com', ARRAY['read:profile', 'write:inventory'], 1);
#!/usr/bin/env bash
# ==============================================================================
# Supabase Local Manager - Cryptographic Key & Token Generator
# Generates JWT Secret, Anon Key, Service Role Key, and Secure Passwords
# ==============================================================================

set -euo pipefail

# Convert base64 to base64url (RFC 7515)
base64url_encode() {
  local input="${1:-$(cat)}"
  echo -n "$input" | base64 | tr '/+' '_-' | tr -d '=\n'
}

# Generate HMAC-SHA256 signature and return base64url encoded
jwt_sign() {
  local data="$1"
  local secret="$2"
  echo -n "$data" | openssl dgst -sha256 -mac HMAC -macopt "key:$secret" -binary | base64url_encode
}

# Create a signed JWT token
create_jwt() {
  local payload="$1"
  local secret="$2"

  local header='{"alg":"HS256","typ":"JWT"}'
  local header_b64
  local payload_b64
  local signature_b64

  header_b64=$(base64url_encode "$header")
  payload_b64=$(base64url_encode "$payload")
  signature_b64=$(jwt_sign "${header_b64}.${payload_b64}" "$secret")

  echo "${header_b64}.${payload_b64}.${signature_b64}"
}

# Generate random secure string (alphanumeric + safe symbols)
generate_password() {
  local length="${1:-24}"
  openssl rand -base64 48 | tr -dc 'a-zA-Z0-9_-' | head -c "$length"
}

# Generate 40-character hex secret
generate_secret_hex() {
  local length="${1:-32}"
  openssl rand -hex "$length"
}

# Generate all credentials for a Supabase instance
generate_supabase_credentials() {
  local now
  local exp
  now=$(date +%s)
  # Valid for 10 years (315360000 seconds)
  exp=$((now + 315360000))

  local jwt_secret
  jwt_secret=$(generate_secret_hex 32)

  local db_password
  db_password="${CUSTOM_DB_PASSWORD:-$(generate_password 20)}"

  local studio_password
  studio_password="${CUSTOM_STUDIO_PASSWORD:-$(generate_password 16)}"

  local secret_key_base
  secret_key_base=$(generate_secret_hex 32)

  local vault_enc_key
  vault_enc_key=$(generate_secret_hex 16)

  local anon_payload
  anon_payload=$(printf '{"role":"anon","iss":"supabase","iat":%d,"exp":%d}' "$now" "$exp")
  local anon_key
  anon_key=$(create_jwt "$anon_payload" "$jwt_secret")

  local service_payload
  service_payload=$(printf '{"role":"service_role","iss":"supabase","iat":%d,"exp":%d}' "$now" "$exp")
  local service_role_key
  service_role_key=$(create_jwt "$service_payload" "$jwt_secret")

  cat <<EOF
JWT_SECRET=${jwt_secret}
ANON_KEY=${anon_key}
SERVICE_ROLE_KEY=${service_role_key}
POSTGRES_PASSWORD=${db_password}
DASHBOARD_PASSWORD=${studio_password}
SECRET_KEY_BASE=${secret_key_base}
VAULT_ENC_KEY=${vault_enc_key}
EOF
}

# If executed directly, output the generated variables
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  generate_supabase_credentials
fi

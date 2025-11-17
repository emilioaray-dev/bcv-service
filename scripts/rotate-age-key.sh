#!/bin/bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SECRETS_DIR="$PROJECT_ROOT/secrets"

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_step() {
    echo -e "${BLUE}→${NC} $1"
}

# Check if age is installed
if ! command -v age &> /dev/null; then
    print_error "age is not installed. Please install it first:"
    echo ""
    echo "  macOS:    brew install age"
    echo "  Ubuntu:   sudo apt-get install age"
    echo ""
    exit 1
fi

# Check if SOPS is installed
if ! command -v sops &> /dev/null; then
    print_error "SOPS is not installed. Please install it first:"
    echo ""
    echo "  macOS:    brew install sops"
    echo "  Ubuntu:   wget https://github.com/mozilla/sops/releases/download/v3.8.1/sops-v3.8.1.linux.amd64 -O /usr/local/bin/sops && chmod +x /usr/local/bin/sops"
    echo ""
    exit 1
fi

echo "═══════════════════════════════════════════════════════════════"
echo "  age Key Rotation Script"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Warning
print_warning "This script will rotate the age encryption key and re-encrypt all secrets."
print_warning "Make sure you have backups before proceeding!"
echo ""

read -p "Do you want to continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    print_info "Aborted by user"
    exit 0
fi

echo ""

# Backup old key
if [ -f "$SECRETS_DIR/.age-key.txt" ]; then
    print_step "Backing up old key..."
    backup_file="$SECRETS_DIR/.age-key.txt.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$SECRETS_DIR/.age-key.txt" "$backup_file"
    print_success "Old key backed up to: $backup_file"
    echo ""

    # Decrypt all secrets with old key
    print_step "Decrypting all secrets with old key..."
    export SOPS_AGE_KEY_FILE="$SECRETS_DIR/.age-key.txt"

    decrypted_files=()
    for env in dev staging production; do
        encrypted_file="$SECRETS_DIR/${env}.env.enc"
        if [ -f "$encrypted_file" ]; then
            temp_file="$SECRETS_DIR/${env}.env.temp"
            if sops -d "$encrypted_file" > "$temp_file"; then
                decrypted_files+=("$env")
                print_success "Decrypted $env"
            else
                print_error "Failed to decrypt $env"
                rm -f "$backup_file"
                exit 1
            fi
        fi
    done
    echo ""
else
    print_info "No existing key found, will generate new one"
    decrypted_files=()
fi

# Generate new key
print_step "Generating new age key..."
age-keygen -o "$SECRETS_DIR/.age-key.txt" 2>&1 | tee "$SECRETS_DIR/.age-key.txt.output"
chmod 600 "$SECRETS_DIR/.age-key.txt"
print_success "New key generated"
echo ""

# Extract public key
print_step "Extracting public key..."
new_public_key=$(grep "# public key:" "$SECRETS_DIR/.age-key.txt.output" | cut -d: -f2 | tr -d ' ')
echo "$new_public_key" > "$SECRETS_DIR/.age-public-key.txt"
rm "$SECRETS_DIR/.age-key.txt.output"
print_success "Public key: $new_public_key"
echo ""

# Update .sops.yaml
print_step "Updating .sops.yaml with new public key..."
sops_file="$PROJECT_ROOT/.sops.yaml"
if [ -f "$sops_file" ]; then
    # Backup .sops.yaml
    cp "$sops_file" "${sops_file}.backup.$(date +%Y%m%d_%H%M%S)"

    # Replace public key in .sops.yaml (simple sed replacement)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|age: >-|age: >-|g" "$sops_file"
        sed -i '' "s|age1[a-z0-9]*|$new_public_key|g" "$sops_file"
    else
        # Linux
        sed -i "s|age1[a-z0-9]*|$new_public_key|g" "$sops_file"
    fi

    print_success "Updated .sops.yaml"
else
    print_warning ".sops.yaml not found, skipping update"
fi
echo ""

# Re-encrypt all secrets with new key
if [ ${#decrypted_files[@]} -gt 0 ]; then
    print_step "Re-encrypting all secrets with new key..."
    export SOPS_AGE_KEY_FILE="$SECRETS_DIR/.age-key.txt"

    for env in "${decrypted_files[@]}"; do
        temp_file="$SECRETS_DIR/${env}.env.temp"
        encrypted_file="$SECRETS_DIR/${env}.env.enc"

        if sops -e "$temp_file" > "$encrypted_file"; then
            print_success "Re-encrypted $env"
            rm "$temp_file"
        else
            print_error "Failed to re-encrypt $env"
            print_warning "Temp file preserved: $temp_file"
        fi
    done
    echo ""
fi

echo "═══════════════════════════════════════════════════════════════"
print_success "Key rotation completed successfully!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
print_info "Next steps:"
echo "  1. Update GitHub Secret SOPS_AGE_KEY with the new private key:"
echo "     cat $SECRETS_DIR/.age-key.txt"
echo ""
echo "  2. Share the new public key with your team:"
echo "     cat $SECRETS_DIR/.age-public-key.txt"
echo ""
echo "  3. Commit the updated files:"
echo "     git add .sops.yaml secrets/*.env.enc"
echo "     git commit -m 'chore: rotate age encryption key'"
echo ""
echo "  4. Securely backup the new private key:"
echo "     - Store in password manager (1Password, Bitwarden, etc.)"
echo "     - Store in secure vault"
echo ""
echo "  5. Delete the backup after confirming everything works:"
echo "     rm $backup_file"
echo ""

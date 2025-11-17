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

print_step() {
    echo -e "${BLUE}→${NC} $1"
}

echo "═══════════════════════════════════════════════════════════════"
echo "  SOPS + age Setup Script"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check if age is installed
print_step "Checking for age..."
if command -v age &> /dev/null; then
    age_version=$(age --version 2>&1 | head -n1)
    print_success "age is installed: $age_version"
else
    print_error "age is not installed"
    echo ""
    echo "Install age:"
    echo "  macOS:    brew install age"
    echo "  Ubuntu:   sudo apt-get install age"
    echo ""
    exit 1
fi

# Check if SOPS is installed
print_step "Checking for SOPS..."
if command -v sops &> /dev/null; then
    sops_version=$(sops --version 2>&1 | head -n1)
    print_success "SOPS is installed: $sops_version"
else
    print_error "SOPS is not installed"
    echo ""
    echo "Install SOPS:"
    echo "  macOS:    brew install sops"
    echo "  Ubuntu:   wget https://github.com/mozilla/sops/releases/download/v3.8.1/sops-v3.8.1.linux.amd64 -O /usr/local/bin/sops && chmod +x /usr/local/bin/sops"
    echo ""
    exit 1
fi

echo ""

# Check if key already exists
if [ -f "$SECRETS_DIR/.age-key.txt" ]; then
    print_info "age key already exists at $SECRETS_DIR/.age-key.txt"
    echo ""
    read -p "Do you want to regenerate it? This will require re-encrypting all secrets. (yes/no): " regenerate
    if [ "$regenerate" != "yes" ]; then
        print_info "Using existing key"
        existing_key=true
    else
        print_step "Backing up existing key..."
        backup_file="$SECRETS_DIR/.age-key.txt.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$SECRETS_DIR/.age-key.txt" "$backup_file"
        print_success "Backed up to $backup_file"
        existing_key=false
    fi
else
    existing_key=false
fi

echo ""

# Generate new key if needed
if [ "$existing_key" = false ]; then
    print_step "Generating new age key pair..."
    age-keygen -o "$SECRETS_DIR/.age-key.txt" 2>&1 | tee "$SECRETS_DIR/.age-key.txt.output"
    chmod 600 "$SECRETS_DIR/.age-key.txt"
    print_success "Key generated successfully"
    echo ""

    # Extract public key
    print_step "Extracting public key..."
    public_key=$(grep "# public key:" "$SECRETS_DIR/.age-key.txt.output" | cut -d: -f2 | tr -d ' ')
    echo "$public_key" > "$SECRETS_DIR/.age-public-key.txt"
    rm "$SECRETS_DIR/.age-key.txt.output"
    print_success "Public key saved to $SECRETS_DIR/.age-public-key.txt"
else
    # Read existing public key
    if [ -f "$SECRETS_DIR/.age-public-key.txt" ]; then
        public_key=$(cat "$SECRETS_DIR/.age-public-key.txt")
    else
        # Extract from private key
        print_step "Extracting public key from existing private key..."
        public_key=$(grep "# public key:" "$SECRETS_DIR/.age-key.txt" | cut -d: -f2 | tr -d ' ')
        echo "$public_key" > "$SECRETS_DIR/.age-public-key.txt"
        print_success "Public key extracted"
    fi
fi

echo ""
print_info "Your public key:"
echo "  $public_key"
echo ""

# Update .sops.yaml if needed
print_step "Checking .sops.yaml..."
if [ -f "$PROJECT_ROOT/.sops.yaml" ]; then
    current_key=$(grep -E "age1[a-z0-9]+" "$PROJECT_ROOT/.sops.yaml" | head -1 | grep -oE "age1[a-z0-9]+")

    if [ "$current_key" != "$public_key" ]; then
        print_info "Updating .sops.yaml with correct public key..."

        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|$current_key|$public_key|g" "$PROJECT_ROOT/.sops.yaml"
        else
            # Linux
            sed -i "s|$current_key|$public_key|g" "$PROJECT_ROOT/.sops.yaml"
        fi

        print_success ".sops.yaml updated"
    else
        print_success ".sops.yaml already has correct key"
    fi
else
    print_error ".sops.yaml not found"
    exit 1
fi

echo ""

# Create template files if they don't exist
print_step "Checking environment templates..."
for env in dev staging production; do
    template_file="$SECRETS_DIR/${env}.env.template"
    env_file="$SECRETS_DIR/${env}.env"

    if [ ! -f "$env_file" ]; then
        if [ -f "$template_file" ]; then
            print_info "Creating $env_file from template..."
            cp "$template_file" "$env_file"
            chmod 600 "$env_file"
            print_success "Created $env_file (edit this file with your actual secrets)"
        else
            print_info "No template found for $env"
        fi
    else
        print_success "$env_file already exists"
    fi
done

echo ""
echo "═══════════════════════════════════════════════════════════════"
print_success "SOPS setup completed!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
print_info "Next steps:"
echo ""
echo "1. Edit your environment files with actual secrets:"
echo "   nano secrets/dev.env"
echo "   nano secrets/staging.env"
echo "   nano secrets/production.env"
echo ""
echo "2. Encrypt your secrets:"
echo "   ./scripts/encrypt-secrets.sh dev"
echo "   ./scripts/encrypt-secrets.sh staging"
echo "   ./scripts/encrypt-secrets.sh production"
echo "   # Or encrypt all at once:"
echo "   ./scripts/encrypt-secrets.sh all"
echo ""
echo "3. Commit the encrypted files:"
echo "   git add secrets/*.env.enc .sops.yaml"
echo "   git commit -m 'feat: add encrypted secrets with SOPS'"
echo ""
echo "4. Add SOPS_AGE_KEY to GitHub Secrets:"
echo "   GitHub → Settings → Secrets and variables → Actions → New secret"
echo "   Name: SOPS_AGE_KEY"
echo "   Value:"
cat "$SECRETS_DIR/.age-key.txt"
echo ""
echo "5. Share the public key with your team:"
echo "   $public_key"
echo ""
echo "6. Backup the private key securely:"
echo "   - Password manager (1Password, Bitwarden)"
echo "   - Secure vault"
echo "   - NEVER commit it to Git!"
echo ""

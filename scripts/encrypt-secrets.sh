#!/bin/bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if SOPS is installed
if ! command -v sops &> /dev/null; then
    print_error "SOPS is not installed. Please install it first:"
    echo ""
    echo "  macOS:    brew install sops"
    echo "  Ubuntu:   wget https://github.com/mozilla/sops/releases/download/v3.8.1/sops-v3.8.1.linux.amd64 -O /usr/local/bin/sops && chmod +x /usr/local/bin/sops"
    echo ""
    exit 1
fi

# Check if age key exists
if [ ! -f "$SECRETS_DIR/.age-key.txt" ]; then
    print_error "age private key not found at $SECRETS_DIR/.age-key.txt"
    echo ""
    print_info "Generate it with:"
    echo "  age-keygen -o secrets/.age-key.txt"
    echo ""
    exit 1
fi

# Export age key file for SOPS
export SOPS_AGE_KEY_FILE="$SECRETS_DIR/.age-key.txt"

# Usage function
usage() {
    echo "Usage: $0 [ENVIRONMENT]"
    echo ""
    echo "Encrypts plain environment files to .enc files using SOPS and age."
    echo ""
    echo "Environments:"
    echo "  dev         - Encrypt secrets/dev.env → secrets/dev.env.enc"
    echo "  staging     - Encrypt secrets/staging.env → secrets/staging.env.enc"
    echo "  production  - Encrypt secrets/production.env → secrets/production.env.enc"
    echo "  all         - Encrypt all environments"
    echo ""
    echo "Examples:"
    echo "  $0 dev"
    echo "  $0 production"
    echo "  $0 all"
    exit 1
}

# Encrypt function
encrypt_env() {
    local env=$1
    local source_file="$SECRETS_DIR/${env}.env"
    local encrypted_file="$SECRETS_DIR/${env}.env.enc"

    if [ ! -f "$source_file" ]; then
        print_error "Source file not found: $source_file"
        return 1
    fi

    print_info "Encrypting $source_file..."

    if sops -e "$source_file" > "$encrypted_file"; then
        print_success "Encrypted to $encrypted_file"

        # Show file sizes
        local source_size=$(wc -c < "$source_file" | tr -d ' ')
        local encrypted_size=$(wc -c < "$encrypted_file" | tr -d ' ')
        print_info "Size: ${source_size} bytes → ${encrypted_size} bytes"

        return 0
    else
        print_error "Failed to encrypt $source_file"
        return 1
    fi
}

# Main logic
main() {
    if [ $# -eq 0 ]; then
        usage
    fi

    local env=$1

    case "$env" in
        dev|staging|production)
            encrypt_env "$env"
            ;;
        all)
            print_info "Encrypting all environments..."
            echo ""

            failed=0
            for e in dev staging production; do
                if ! encrypt_env "$e"; then
                    failed=$((failed + 1))
                fi
                echo ""
            done

            if [ $failed -eq 0 ]; then
                print_success "All environments encrypted successfully!"
            else
                print_error "$failed environment(s) failed to encrypt"
                exit 1
            fi
            ;;
        *)
            print_error "Unknown environment: $env"
            usage
            ;;
    esac

    echo ""
    print_info "Remember to:"
    echo "  1. Review the encrypted file: cat $SECRETS_DIR/${env}.env.enc"
    echo "  2. Commit the encrypted file: git add $SECRETS_DIR/${env}.env.enc"
    echo "  3. DO NOT commit the plain file: $SECRETS_DIR/${env}.env is in .gitignore"
}

main "$@"

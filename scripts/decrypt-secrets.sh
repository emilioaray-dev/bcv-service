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

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
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
    echo "Usage: $0 [ENVIRONMENT] [OPTIONS]"
    echo ""
    echo "Decrypts encrypted environment files using SOPS and age."
    echo ""
    echo "Environments:"
    echo "  dev         - Decrypt secrets/dev.env.enc → secrets/dev.env"
    echo "  staging     - Decrypt secrets/staging.env.enc → secrets/staging.env"
    echo "  production  - Decrypt secrets/production.env.enc → secrets/production.env"
    echo "  all         - Decrypt all environments"
    echo ""
    echo "Options:"
    echo "  --stdout    - Print decrypted content to stdout instead of writing to file"
    echo "  --dotenv    - Decrypt to .env in project root (default: secrets/ENV.env)"
    echo ""
    echo "Examples:"
    echo "  $0 dev"
    echo "  $0 production --stdout"
    echo "  $0 staging --dotenv"
    echo "  $0 all"
    exit 1
}

# Decrypt function
decrypt_env() {
    local env=$1
    local to_stdout=${2:-false}
    local to_dotenv=${3:-false}
    local encrypted_file="$SECRETS_DIR/${env}.env.enc"

    if [ ! -f "$encrypted_file" ]; then
        print_error "Encrypted file not found: $encrypted_file"
        return 1
    fi

    if [ "$to_stdout" = true ]; then
        # Decrypt to stdout
        print_info "Decrypting $encrypted_file to stdout..."
        sops -d "$encrypted_file"
        return 0
    fi

    # Decrypt to file
    local output_file
    if [ "$to_dotenv" = true ]; then
        output_file="$PROJECT_ROOT/.env"
        print_info "Decrypting $encrypted_file to .env..."
    else
        output_file="$SECRETS_DIR/${env}.env"
        print_info "Decrypting $encrypted_file..."
    fi

    if sops -d "$encrypted_file" > "$output_file"; then
        print_success "Decrypted to $output_file"

        # Set secure permissions
        chmod 600 "$output_file"
        print_info "Set permissions to 600 (read/write for owner only)"

        # Show file size
        local file_size=$(wc -c < "$output_file" | tr -d ' ')
        print_info "Size: ${file_size} bytes"

        return 0
    else
        print_error "Failed to decrypt $encrypted_file"
        return 1
    fi
}

# Main logic
main() {
    if [ $# -eq 0 ]; then
        usage
    fi

    local env=$1
    local to_stdout=false
    local to_dotenv=false

    # Parse options
    shift
    while [ $# -gt 0 ]; do
        case "$1" in
            --stdout)
                to_stdout=true
                shift
                ;;
            --dotenv)
                to_dotenv=true
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                usage
                ;;
        esac
    done

    case "$env" in
        dev|staging|production)
            decrypt_env "$env" "$to_stdout" "$to_dotenv"
            ;;
        all)
            if [ "$to_stdout" = true ]; then
                print_error "Cannot use --stdout with 'all' environments"
                exit 1
            fi

            print_info "Decrypting all environments..."
            echo ""

            failed=0
            for e in dev staging production; do
                if ! decrypt_env "$e" false "$to_dotenv"; then
                    failed=$((failed + 1))
                fi
                echo ""
            done

            if [ $failed -eq 0 ]; then
                print_success "All environments decrypted successfully!"
            else
                print_error "$failed environment(s) failed to decrypt"
                exit 1
            fi
            ;;
        *)
            print_error "Unknown environment: $env"
            usage
            ;;
    esac

    if [ "$env" != "all" ] && [ "$to_stdout" = false ]; then
        echo ""
        print_warning "Remember:"
        echo "  - The decrypted file contains sensitive data"
        echo "  - DO NOT commit it to Git (it's in .gitignore)"
        echo "  - Delete it when done: rm $SECRETS_DIR/${env}.env"
    fi
}

main "$@"

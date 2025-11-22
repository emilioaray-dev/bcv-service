# Contributing to BCV Service

Thank you for your interest in contributing to BCV Service! This document provides guidelines and best practices for contributing to the project.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Commit Guidelines](#commit-guidelines)
5. [Pull Request Process](#pull-request-process)
6. [Coding Standards](#coding-standards)
7. [Testing Requirements](#testing-requirements)
8. [Documentation](#documentation)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. Please be respectful and constructive in your interactions.

### Expected Behavior

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Trolling, insulting/derogatory comments
- Public or private harassment
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

---

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- Node.js 24 LTS installed
- pnpm installed (`npm install -g pnpm`)
- MongoDB running locally (optional, set `SAVE_TO_DATABASE=false` for development without DB)
- Git configured with your name and email

### Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/bcv-service.git
cd bcv-service

# Add upstream remote
git remote add upstream https://github.com/original/bcv-service.git

# Verify remotes
git remote -v
```

### Install Dependencies

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Edit .env as needed
vim .env
```

### Run Development Server

```bash
# Start in development mode
pnpm run dev

# Or build and run
pnpm run build
pnpm start

# Run tests
pnpm test

# Run tests with coverage
pnpm run test:coverage
```

---

## Development Workflow

### Branch Naming Convention

Use descriptive branch names following this pattern:

```
<type>/<description>

Examples:
feat/add-user-authentication
fix/mongodb-connection-error
docs/update-readme
refactor/extract-bcv-service
test/add-websocket-tests
chore/update-dependencies
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes

### Development Process

1. **Create a feature branch**:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes**:
   - Write code following our [coding standards](#coding-standards)
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**:
   ```bash
   # Run tests
   pnpm test

   # Check coverage
   pnpm run test:coverage

   # Run linter
   pnpm run lint

   # Format code
   pnpm run format
   ```

4. **Commit your changes**:
   ```bash
   # Stage changes
   git add .

   # Commit with semantic message
   git commit -m "feat: add user authentication endpoint"
   ```

5. **Keep your branch up to date**:
   ```bash
   # Fetch upstream changes
   git fetch upstream

   # Rebase on upstream/main
   git rebase upstream/main

   # Resolve conflicts if any
   # Then continue rebase
   git rebase --continue
   ```

6. **Push your branch**:
   ```bash
   git push origin feat/your-feature-name
   ```

---

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that don't affect code meaning (formatting, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `build`: Changes to build system or dependencies
- `ci`: Changes to CI configuration
- `chore`: Other changes that don't modify src or test files
- `revert`: Reverts a previous commit

### Scope (Optional)

The scope should specify the place of the commit change:

- `api`: REST API changes
- `websocket`: WebSocket changes
- `services`: Service layer changes
- `config`: Configuration changes
- `docs`: Documentation
- `deps`: Dependencies
- `tests`: Test-related changes

### Examples

```bash
# Feature
feat(api): add rate limiting to API endpoints

Implement express-rate-limit middleware to prevent abuse.
Configured to allow 100 requests per 15 minutes per IP.

Closes #123

# Bug fix
fix(websocket): prevent memory leak on client disconnect

Properly cleanup event listeners when WebSocket client disconnects.

Fixes #456

# Documentation
docs: update deployment guide with Kubernetes instructions

Add comprehensive Kubernetes deployment section including:
- Deployment manifests
- Service configuration
- Ingress setup
- Secrets management

# Breaking change
feat(api)!: change response format for /api/rate endpoint

BREAKING CHANGE: The response format has changed from array to object.
Migration guide available in MIGRATION.md

Before:
{
  "rates": [{currency: "USD", value: 36.5}]
}

After:
{
  "data": {
    "USD": 36.5
  }
}
```

### Commit Message Rules

- Use imperative mood ("add" not "added" or "adds")
- Don't capitalize first letter
- No period at the end of subject line
- Limit subject line to 50 characters
- Wrap body at 72 characters
- Separate subject from body with blank line
- Use body to explain what and why, not how

---

## Pull Request Process

### Before Creating PR

- [ ] Code follows project coding standards
- [ ] All tests pass (`pnpm test`)
- [ ] Code is properly formatted (`pnpm run format`)
- [ ] Linter passes (`pnpm run lint`)
- [ ] New tests added for new functionality
- [ ] Documentation updated if needed
- [ ] Commit messages follow conventional commits
- [ ] Branch is up to date with main

### Creating PR

1. **Push your branch** to your fork
2. **Create Pull Request** on GitHub
3. **Fill out PR template** completely
4. **Link related issues** (Closes #123, Fixes #456)
5. **Request review** from maintainers

### PR Title Format

Use the same format as commit messages:

```
feat(api): add rate limiting to API endpoints
fix(websocket): prevent memory leak on client disconnect
docs: update deployment guide
```

### PR Description Template

```markdown
## Description

Brief description of changes and motivation.

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement
- [ ] Test update

## Changes Made

- Change 1
- Change 2
- Change 3

## Testing

Describe tests added/updated and how to test the changes.

## Screenshots (if applicable)

Add screenshots for UI changes.

## Checklist

- [ ] My code follows the project's coding standards
- [ ] I have performed a self-review of my code
- [ ] I have commented my code in hard-to-understand areas
- [ ] I have updated the documentation accordingly
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or my feature works
- [ ] New and existing unit tests pass locally
- [ ] Any dependent changes have been merged and published

## Related Issues

Closes #123
Fixes #456
```

### Review Process

1. **Automated Checks**: CI/CD runs tests, linting, and build
2. **Code Review**: At least one maintainer must approve
3. **Address Feedback**: Make requested changes
4. **Re-request Review**: After addressing feedback
5. **Merge**: Maintainer will merge once approved

### After Merge

- Delete your feature branch (local and remote)
- Update your local main branch
- Close related issues if not auto-closed

```bash
# Delete local branch
git branch -d feat/your-feature-name

# Delete remote branch
git push origin --delete feat/your-feature-name

# Update local main
git checkout main
git pull upstream main
```

---

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Define interfaces for all data structures
- Avoid `any` type, use `unknown` if necessary
- Use type inference when obvious

```typescript
// Good
interface RateData {
  date: Date;
  rates: CurrencyRate[];
}

function processRate(data: RateData): void {
  // Implementation
}

// Bad
function processRate(data: any) {
  // Implementation
}
```

### SOLID Principles

All code must follow SOLID principles:

- **S**ingle Responsibility
- **O**pen/Closed
- **L**iskov Substitution
- **I**nterface Segregation
- **D**ependency Inversion

### Dependency Injection

Use Inversify for dependency injection:

```typescript
@injectable()
export class MyService {
  constructor(
    @inject(TYPES.Logger) private logger: ILogger,
    @inject(TYPES.Config) private config: IConfig
  ) {}
}
```

### Code Style

We use **Biome** for linting and formatting:

```bash
# Check code
pnpm run lint

# Format code
pnpm run format
```

See [CODE_STYLE.md](./CODE_STYLE.md) for detailed style guidelines.

---

## Testing Requirements

### Coverage Requirements

- Minimum 50% line coverage
- Minimum 45% function coverage
- All new features must have tests
- All bug fixes must have regression tests

### Writing Tests

Use Vitest for testing:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('BCVService', () => {
  let service: BCVService;

  beforeEach(() => {
    service = new BCVService();
  });

  it('should fetch rates successfully', async () => {
    const rates = await service.getRates();
    expect(rates).toBeDefined();
    expect(Array.isArray(rates)).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    // Mock failure
    vi.spyOn(axios, 'get').mockRejectedValue(new Error('Network error'));

    await expect(service.getRates()).rejects.toThrow('Network error');
  });
});
```

### Test Organization

```
test/
├── unit/           # Unit tests
│   ├── services/
│   ├── controllers/
│   └── utils/
├── integration/    # Integration tests (future)
└── e2e/            # End-to-end tests (future)
```

See [TESTING.md](./TESTING.md) for detailed testing guidelines.

---

## Documentation

### Code Documentation

- Add JSDoc comments for public APIs
- Document complex logic
- Keep comments up to date

```typescript
/**
 * Fetches exchange rates from BCV website
 *
 * @returns Promise resolving to array of currency rates
 * @throws {Error} If scraping fails after all retries
 */
async getRates(): Promise<CurrencyRate[]> {
  // Implementation
}
```

### README Updates

Update README.md when:
- Adding new features
- Changing API endpoints
- Modifying configuration
- Updating dependencies

### Architecture Documentation

Update architecture docs (`docs/architecture/`) when:
- Making architectural decisions
- Changing system design
- Adding new services
- Modifying integrations

Create ADR (Architectural Decision Record) for significant decisions.

---

## Questions or Issues?

- **Issues**: Open an issue on GitHub
- **Discussions**: Use GitHub Discussions
- **Security**: Email security@project.com

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

## Recognition

Contributors will be recognized in:
- GitHub contributors page
- CONTRIBUTORS.md file
- Release notes

Thank you for contributing! 🎉

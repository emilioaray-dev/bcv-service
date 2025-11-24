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
9. [Architecture Guidelines](#architecture-guidelines)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. Please be respectful and constructive in your interactions while contributing to this project.

### Expected Behavior

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members
- Follow SOLID principles and clean code practices
- Use dependency injection with Inversify
- Maintain security-first mindset

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Trolling, insulting/derogatory comments
- Public or private harassment
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate
- Introducing security vulnerabilities
- Hard-coding dependencies instead of using DI
- Violating architectural principles (SOLID)

---

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- Node.js 24 LTS installed
- pnpm installed (`npm install -g pnpm`)
- MongoDB running locally (optional, set `SAVE_TO_DATABASE=false` for development without DB)
- Redis running locally (optional, for dual-layer notification state system)
- Git configured with your name and email
- Docker and Docker Compose for containerized development (recommended)

### Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/bcv-service.git
cd bcv-service

# Add upstream remote
git remote add upstream https://github.com/emilioaray-dev/bcv-service.git

# Verify remotes
git remote -v
```

### Install Dependencies

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Edit .env as needed for development
vim .env
```

### Run Development Server

```bash
# Start in development mode (with watch)
pnpm run dev

# Or build and run
pnpm run build
pnpm start

# Run tests
pnpm test

# Run tests with coverage
pnpm run test:coverage

# Run benchmark tests
pnpm run benchmark

# Run load tests
pnpm run load-test:light
```

### Development with Docker

```bash
# Start all services with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f bcv-service

# Stop services
docker-compose down
```

---

## Development Workflow

### Branch Naming Convention

Use descriptive branch names following this pattern:

```
<type>/<description>

Examples:
feat/add-notification-state-persistence
feat/implement-discord-notifications  
feat/upgrade-to-solid-architecture
fix/ssl-certificate-error
docs/update-architecture-documentation
refactor/extract-bcv-service
test/add-integration-tests-for-websocket
chore/update-dependencies
perf/add-redis-cache-layer
```

Types:
- `feat`: New feature or functionality
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring without functional changes
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes
- `build`: Build system changes

### Development Process

1. **Create a feature branch**:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes**:
   - Write code following our [coding standards](#coding-standards)
   - Implement with SOLID principles and Inversify DI
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**:
   ```bash
   # Run all tests
   pnpm test

   # Check coverage (should be >66%)
   pnpm run test:coverage

   # Run linter
   pnpm run lint

   # Format code
   pnpm run format

   # Build project
   pnpm run build
   ```

4. **Commit your changes**:
   ```bash
   # Stage changes
   git add .

   # Commit with conventional commit message
   git commit -m "feat(notification-service): implement persistent notification state system

   - Add dual-layer architecture with MongoDB (primary) + Redis (cache)
   - Prevent duplicate notifications when service restarts
   - Implement significant change detection (threshold ≥0.01)
   - Support multi-currency notifications (USD, EUR, CNY, etc.)

   Closes #8"
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

6. **Run final checks**:
   ```bash
   # Ensure all tests pass
   pnpm test

   # Ensure build succeeds
   pnpm build

   # Format code one final time
   pnpm run format
   ```

7. **Push your branch**:
   ```bash
   git push origin feat/your-feature-name
   ```

---

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification with automated semantic versioning.

### Commit Message Format

```
<type>(<scope>): <short summary>

<optional body>

<optional footer>
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
- `merge`: Merging branches (rarely used)
- `release`: Version releases (auto-generated)

### Scope (Optional)

The scope should specify the place of the commit change:

- `bcv`: BCV service scraping
- `notification-state`: Notification state persistence
- `discord`: Discord notifications
- `webhook`: Webhook notifications
- `websocket`: WebSocket service
- `health`: Health checks
- `metrics`: Prometheus metrics
- `auth`: Authentication
- `security`: Security features
- `config`: Configuration changes
- `deps`: Dependencies
- `tests`: Test-related changes
- `redis`: Redis cache/service
- `mongo`: MongoDB service
- `inversify`: Dependency injection
- `architecture`: Architectural changes (SOLID, etc.)

### Examples

```bash
# Feature with breaking change (use ! for breaking changes)
feat(api)!: change response format for rate endpoints

BREAKING CHANGE: API responses now return data in 'data' field instead of root level

Before:
{
  "rate": 36.5,
  "date": "2025-11-24"
}

After:
{
  "success": true,
  "data": {
    "rate": 36.5,
    "date": "2025-11-24"
  }
}

Closes #15

# Regular feature
feat(notification-state): implement dual-layer notification state system

- Add MongoDB as primary persistent storage
- Add Redis as fast cache layer
- Use read-through pattern with MongoDB fallback
- Implement automatic synchronization between layers
- Prevent duplicate notifications after service restart

Closes #8

# Bug fix
fix(bcv): resolve SSL certificate validation error

Fixed issue where BCV scraping was failing due to SSL cert chain problems.
Now using custom HTTPS agent with rejectUnauthorized=false for BCV domain only.

Fixes #1

# Documentation
docs: update architecture documentation with SOLID implementation

Add detailed explanation of SOLID principles implementation:
- Single Responsibility in BCVService
- Open/Closed principle with interfaces
- Liskov Substitution with Inversify
- Interface Segregation in service contracts
- Dependency Inversion with IoC container

Refs #12

# Refactoring
refactor(architecture): implement SOLID principles with Inversify

- Apply Single Responsibility to all services
- Use Inversify for Dependency Injection
- Create interfaces for all core services
- Implement factories for service creation
- Add container configuration for IoC

Closes #3
```

### Commit Message Rules

- Use imperative mood ("add", "fix", "update" not "added", "fixed", "updated")
- Don't capitalize first letter of subject line
- No period at the end of subject line
- Limit subject line to 72 characters (configured in biome)
- Wrap body at 100 characters
- Separate subject from body with blank line
- Use body to explain what and why, not how
- Include issue references (Closes #123, Fixes #456)

---

## Pull Request Process

### Before Creating PR

- [ ] Code follows project coding standards and SOLID principles
- [ ] All tests pass (`pnpm test`)
- [ ] Code coverage maintained (≥66%)
- [ ] Code is properly formatted (`pnpm run format`)
- [ ] Linter passes (`pnpm run lint`)
- [ ] New tests added for new functionality
- [ ] Documentation updated if needed
- [ ] Commit messages follow conventional commits
- [ ] Branch is up to date with main
- [ ] Security considerations addressed
- [ ] Dependency injection properly implemented
- [ ] Architecture patterns followed (SOLID, Inversify)

### Creating PR

1. **Push your branch** to your fork
2. **Create Pull Request** on GitHub
3. **Fill out PR template** completely
4. **Link related issues** (Closes #123, Fixes #456)
5. **Request review** from maintainers

### PR Title Format

Use the same format as commit messages:

```
feat(notification-state): implement dual-layer notification state system
fix(bcv): resolve SSL certificate validation error
docs: update architecture documentation with SOLID implementation
refactor(architecture): apply SOLID principles with Inversify
```

### PR Description Template

```markdown
## Description

Brief description of changes and motivation. Include information about SOLID principles applied, architecture patterns used, and any breaking changes.

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes but improves architecture)
- [ ] Performance improvement
- [ ] Test update
- [ ] Security enhancement
- [ ] SOLID architecture implementation

## Changes Made

- Change 1: Applied SOLID principles to BCVService
- Change 2: Implemented Inversify DI for dependency injection
- Change 3: Added dual-layer notification state system (MongoDB + Redis)
- Change 4: Enhanced security with Helmet and rate limiting

## Architectural Impact

- SOLID principles applied to improve maintainability
- Dependency inversion with Inversify container
- Dual-layer persistence for notification state
- Multi-channel notification system implemented

## Security Considerations

- [ ] No hardcoded credentials
- [ ] Dependency injection prevents tight coupling
- [ ] Input validation with Zod schemas
- [ ] Rate limiting implemented
- [ ] Authentication with API keys

## Testing

Describe tests added/updated and how to test the changes. Include information about unit tests, integration tests, and any specific test scenarios.

## Screenshots (if applicable)

Add screenshots for UI changes or API responses.

## Checklist

- [ ] My code follows the project's coding standards and SOLID principles
- [ ] I have performed a self-review of my code
- [ ] I have commented my code in hard-to-understand areas
- [ ] I have updated the documentation accordingly
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or my feature works
- [ ] New and existing unit tests pass locally
- [ ] Any dependent changes have been merged and published
- [ ] Dependency injection properly implemented with Inversify
- [ ] SOLID principles correctly applied
- [ ] Security considerations addressed
- [ ] Architecture patterns followed (SOLID, etc.)

## Related Issues

Closes #8  # Notification state persistence
Fixes #1   # SSL certificate error
Relates to #3  # SOLID architecture implementation
```

### Review Process

1. **Automated Checks**: CI/CD runs tests, linting, build, and security scans
2. **Architecture Review**: Check SOLID principles, DI usage, and architectural decisions
3. **Code Quality**: Review code style, performance, and maintainability
4. **Security Review**: Check for vulnerabilities and security best practices
5. **Code Review**: At least one maintainer must approve
6. **Address Feedback**: Make requested changes
7. **Re-request Review**: After addressing feedback
8. **Merge**: Maintainer will merge once approved (semantic release handles versioning)

### After Merge

- Delete your feature branch (local and remote)
- Update your local main branch
- Close related issues if not auto-closed

```bash
# Delete local branch
git branch -d feat/your-feature-name

# Delete remote branch
git push origin --delete feat/your-feature-name

# Update local main and run semantic release
git checkout main
git pull upstream main
```

---

## Coding Standards

### TypeScript

- Use TypeScript strict mode (`"strict": true` in tsconfig.json)
- Define interfaces for all data structures and service contracts
- Never use `any` type, use `unknown` if necessary
- Use type inference when obvious
- Implement SOLID principles throughout the codebase
- Use Inversify for dependency injection

```typescript
// ✅ Good: SOLID and DI implementation
import { injectable, inject } from 'inversify';
import { TYPES } from '@/config/types';
import type { IBCVService } from '@/interfaces/IBCVService';
import type { INotificationStateService } from '@/interfaces/INotificationStateService';

@injectable()
export class RateService {
  constructor(
    @inject(TYPES.BCVService) private bcvService: IBCVService,
    @inject(TYPES.NotificationStateService) 
    private notificationStateService: INotificationStateService
  ) {}

  async processRates(): Promise<void> {
    const rates = await this.bcvService.getRates();
    if (rates) {
      const hasChange = 
        await this.notificationStateService.hasSignificantChangeAndNotify(rates);
      if (hasChange) {
        // Handle notifications through configured channels
      }
    }
  }
}

// ❌ Bad: Tight coupling and no SOLID principles
class RateService {
  private bcvService = new BCVService(); // Hard-coded dependency!
  
  async processRates(): Promise<void> {
    // Implementation without proper separation of concerns
  }
}
```

### SOLID Principles

All code must follow SOLID principles:

- **S**ingle Responsibility: Each class/method has ONE reason to change
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Derived classes must be substitutable for base classes
- **I**nterface Segregation: Clients shouldn't be forced to depend on interfaces they don't use
- **D**ependency Inversion: Depend on abstractions, not concretions

### Dependency Injection with Inversify

Use Inversify for dependency injection:

```typescript
// ✅ Good: Using Inversify with interfaces
@injectable()
export class NotificationStateService implements INotificationStateService {
  constructor(
    @inject(TYPES.CacheService) private cacheService: ICacheService,
    @inject(TYPES.RedisService) private redisService: IRedisService
  ) {}

  async hasSignificantChangeAndNotify(rateData: RateData): Promise<boolean> {
    // Implementation using injected dependencies
  }
}

// Container configuration
container.bind<INotificationStateService>(TYPES.NotificationStateService)
  .to(NotificationStateService)
  .inSingletonScope();
```

### Code Style

We use **Biome** for linting and formatting:

```bash
# Check code
pnpm run lint

# Format code
pnpm run format

# Check formatting
pnpm run check
```

See [CODE_STYLE.md](./CODE_STYLE.md) for detailed style guidelines.

---

## Testing Requirements

### Coverage Requirements

- Minimum 66% line coverage (current target based on project)
- Minimum 60% function coverage
- All new features must have tests
- All bug fixes must have regression tests
- Critical paths should have 100% coverage

### Writing Tests

Use Vitest for testing:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationStateService } from '@/services/notification-state.service';
import type { ICacheService } from '@/interfaces/ICacheService';

describe('NotificationStateService', () => {
  let notificationStateService: NotificationStateService;
  let mockCacheService: ICacheService;

  beforeEach(() => {
    mockCacheService = {
      getLatestRate: vi.fn(),
      saveRate: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    
    notificationStateService = new NotificationStateService(mockCacheService);
  });

  it('should detect significant changes correctly', async () => {
    const previousRate = { rate: 36.0, date: '2025-11-24', rates: [] };
    const currentRate = { rate: 36.01, date: '2025-11-24', rates: [] }; // +0.01 difference
    
    const hasChange = await notificationStateService.hasSignificantChange(previousRate, currentRate);
    expect(hasChange).toBe(true);
  });

  it('should not detect insignificant changes', async () => {
    const previousRate = { rate: 36.0, date: '2025-11-24', rates: [] };
    const currentRate = { rate: 36.005, date: '2025-11-24', rates: [] }; // +0.005 difference
    
    const hasChange = await notificationStateService.hasSignificantChange(previousRate, currentRate);
    expect(hasChange).toBe(false);
  });
});
```

### Test Organization

```
test/
├── unit/                 # Unit tests for individual services/components
│   ├── services/
│   │   ├── bcv.service.test.ts
│   │   ├── mongo.service.test.ts
│   │   ├── redis.service.test.ts
│   │   ├── notification-state.service.test.ts
│   │   └── ...
│   ├── controllers/
│   │   ├── rate.controller.test.ts
│   │   ├── health.controller.test.ts
│   │   └── ...
│   └── utils/
│       ├── logger.test.ts
│       └── ...
├── integration/          # Integration tests (future expansion)
│   ├── api/
│   ├── services/
│   └── ...
└── performance/          # Performance and load tests
    ├── benchmark.test.ts
    └── ...
```

See [TESTING.md](./TESTING.md) for detailed testing guidelines.

---

## Documentation

### Code Documentation

- Add JSDoc comments for public APIs
- Document complex logic
- Keep comments up to date
- Document SOLID principles application and architectural decisions

```typescript
/**
 * Implements persistent notification state system with dual-layer architecture
 *
 * This service uses MongoDB as primary persistent storage and Redis as a cache layer
 * for fast read/write operations with automatic fallback to MongoDB if Redis is unavailable.
 * The service prevents duplicate notifications when the service restarts by maintaining
 * the last notified rate state in persistent storage. Only sends notifications when
 * there's a significant absolute difference (≥0.01) in any currency.
 *
 * @implements {INotificationStateService}
 * @dependency {ICacheService} For persistent storage in MongoDB
 * @dependency {IRedisService} For fast cache operations
 * 
 * @example
 * const hasChange = await notificationStateService.hasSignificantChangeAndNotify(rateData);
 * if (hasChange) {
 *   // Send notifications through configured channels
 * }
 */
@injectable()
export class NotificationStateService implements INotificationStateService {
  // Implementation
}
```

### README Updates

Update README.md when:
- Adding new features or architectural changes
- Changing API endpoints or response formats
- Modifying configuration requirements
- Updating dependencies or system requirements
- Adding new notification channels or architectural patterns
- Implementing SOLID principles or major refactoring

### Architecture Documentation

Update architecture docs (`docs/architecture/`) when:
- Making architectural decisions (create ADR)
- Changing system design or patterns
- Adding new services or architectural components
- Implementing SOLID principles or design patterns
- Modifying integrations or architectural layers

Create ADR (Architectural Decision Record) for significant decisions.

---

## Architecture Guidelines

### SOLID Implementation

All contributions must follow SOLID principles:

1. **Single Responsibility Principle (SRP)**: Each class should have only one reason to change
2. **Open/Closed Principle (OCP)**: Entities should be open for extension, closed for modification
3. **Liskov Substitution Principle (LSP)**: Objects should be replaceable with instances of their subtypes
4. **Interface Segregation Principle (ISP)**: Clients should not be forced to depend on interfaces they don't use
5. **Dependency Inversion Principle (DIP)**: Depend on abstractions, not concretions

### Inversify Integration

All services should use Inversify for dependency injection:

- Define interfaces in `src/interfaces/`
- Implement services with `@injectable()`
- Inject dependencies with `@inject(TYPES.Dependency)`
- Configure bindings in `src/config/inversify.config.ts`

### Security Considerations

- Never commit credentials directly to code
- Use environment variables or Docker secrets for sensitive data
- Validate all inputs with Zod schemas
- Implement proper error handling without exposing internal details
- Use Helmet.js for security headers
- Apply rate limiting to prevent abuse

### Performance Guidelines

- Use Redis cache for frequently accessed data
- Implement efficient database queries with proper indexing
- Use dual-layer architecture for critical state persistence
- Optimize WebSocket message broadcasting
- Monitor and profile performance with Prometheus metrics
- Implement efficient retry mechanisms with exponential backoff

---

## Questions or Issues?

- **Issues**: Open an issue on GitHub for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Architecture**: For architectural discussions, create an ADR in `docs/architecture/ADRs.md`

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

## Recognition

Contributors will be recognized in:
- GitHub contributors page
- Contributors section in README
- Release notes for significant contributions
- Architecture decision records for architectural contributions

Thank you for contributing to make BCV Service better! 🎉

## Additional Resources

- [Architecture Decision Records](./architecture/ADRs.md) - Decisions affecting architecture
- [Code Style Guide](./development/CODE_STYLE.md) - Coding standards and conventions
- [Testing Guidelines](./development/TESTING.md) - Comprehensive testing strategy
- [Security Guidelines](./security/SECURITY.md) - Security best practices
- [Architecture Documentation](./architecture/ARCHITECTURE.md) - System architecture overview

---

**Last Updated**: 2025-11-24  
**Project Version**: 2.1.0  
**Status**: Active Development with SOLID Architecture & Dual-Layer Notification System
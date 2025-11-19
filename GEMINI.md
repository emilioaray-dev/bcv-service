# GEMINI.md

## Project Overview

This is a TypeScript microservice that scrapes the official website of the Central Bank of Venezuela (BCV) to obtain the official exchange rates. The service stores the data in a MongoDB database and provides real-time updates through WebSockets and notifications to Discord channels.

The project follows SOLID principles and uses Inversify for Dependency Injection, promoting a modular and testable architecture.

**Main Technologies:**

*   **Backend:** Node.js, Express.js, TypeScript
*   **Database:** MongoDB
*   **Real-time:** WebSockets
*   **Notifications:** Discord
*   **Testing:** Vitest
*   **Linting & Formatting:** Biome
*   **Containerization:** Docker
*   **Observability:** Prometheus, Grafana

## Building and Running

The project uses `pnpm` as the package manager.

**Prerequisites:**

*   Node.js >=18
*   pnpm >=8
*   Docker (optional)
*   MongoDB (optional)

**Installation:**

1.  Clone the repository:
    ```bash
    git clone https://github.com/emilioaray-dev/bcv-service.git
    ```
2.  Install dependencies:
    ```bash
    pnpm install
    ```

**Running the application:**

*   **Development mode:**
    ```bash
    pnpm dev
    ```
    This will start the server in development mode with hot-reloading.

*   **Production mode:**
    ```bash
    pnpm build
    pnpm start
    ```
    This will build the project and start the server in production mode.

*   **With Docker:**
    ```bash
    docker-compose up -d
    ```
    This will start the application and a MongoDB instance using Docker Compose.

**Testing:**

*   Run all tests:
    ```bash
    pnpm test
    ```
*   Run tests with coverage:
    ```bash
    pnpm test:coverage
    ```

**Linting and Formatting:**

*   Check for linting errors:
    ```bash
    pnpm lint
    ```
*   Fix linting errors:
    ```bash
    pnpm lint:fix
    ```
*   Format the code:
    ```bash
    pnpm format
    ```

## Development Conventions

*   **Dependency Injection:** The project uses Inversify for dependency injection. All services and controllers are bound to interfaces in the `src/config/inversify.config.ts` file.
*   **SOLID Principles:** The project is designed to follow the SOLID principles of object-oriented design.
*   **Testing:** The project uses Vitest for testing. All new features should be accompanied by unit tests.
*   **Code Style:** The project uses Biome for linting and formatting. Please ensure that your code adheres to the project's code style.
*   **Conventional Commits:** The project uses the Conventional Commits specification for commit messages.

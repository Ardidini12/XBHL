# XBHL Local Setup Guide

This guide provides step-by-step instructions to set up and run the XBHL project locally using Docker and an external Supabase database.

## Prerequisites

Before starting, ensure you have the following installed on your machine:

1.  **Docker & Docker Compose**: [Install Docker Desktop](https://www.docker.com/products/docker-desktop/)
2.  **Git**: [Install Git](https://git-scm.com/downloads)
3.  **uv** (Python Package Manager):
    ```bash
    # Windows (PowerShell)
    powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
    ```
4.  **Bun** (JavaScript Runtime):
    ```bash
    # Windows (PowerShell)
    powershell -c "irm bun.sh/install.ps1 | iex"
    ```

## 1. Environment Configuration

The project uses a `.env` file to store configuration secrets. This file has already been configured to use your external Supabase database.

**Critical Check:**
Ensure your `.env` file contains the correct `DATABASE_URL` with the `postgresql+psycopg` scheme:
```dotenv
DATABASE_URL=postgresql+psycopg://postgres.vtcwupvroymwzeegifat:YOUR_PASSWORD@aws-1-us-east-1.pooler.supabase.com:6543/postgres
```

## 2. Backend Setup (Local)

While Docker will handle the running of the backend, it's useful to have a local environment for development and tool support (like linting).

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```

2.  Create a virtual environment and install dependencies using `uv`:
    ```bash
    uv sync
    ```
    This command creates a `.venv` directory and installs all dependencies specified in `pyproject.toml`.

3.  Activate the virtual environment:
    ```bash
    # Windows
    .venv\Scripts\activate
    ```

## 3. Frontend Setup (Local)

Similarly for the frontend, you may want to run it locally or just install dependencies for IDE support.

1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```

2.  Install dependencies using `bun`:
    ```bash
    bun install
    ```

## 4. Running the Project with Docker Compose

Now you can start the entire stack (Frontend, Backend, Proxy, Mailcatcher) using Docker Compose.

1.  Return to the project root directory (where `compose.yml` is located).

2.  Start the services:
    ```bash
    docker compose watch
    ```
    The `watch` command enables hot-reloading for development.

    **Note:** The first time you run this, it will build the Docker images, which may take a few minutes.

3.  **Access the Application:**

    -   **Frontend (Dashboard):** [http://localhost:5173](http://localhost:5173)
    -   **Backend API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
    -   **Traefik Dashboard:** [http://localhost:8090](http://localhost:8090)
    -   **Mailcatcher:** [http://localhost:1080](http://localhost:1080)

## 5. Troubleshooting

-   **Database Connection:** If the backend fails to start, check the logs:
    ```bash
    docker compose logs backend
    ```
    Ensure your `DATABASE_URL` in `.env` is correct and your computer has internet access to reach Supabase.

-   **Rebuilding:** If you add new dependencies, you may need to rebuild the images:
    ```bash
    docker compose watch --build
    ```

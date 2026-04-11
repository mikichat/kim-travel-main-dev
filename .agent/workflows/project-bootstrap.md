---
description: Scaffolds a new project or agent team structure.
---
# Project Bootstrap Workflow

This workflow helps you set up a new project or an agent team structure.

1.  **Analyze Request**
    I will check if you have specified a tech stack (e.g., "FastAPI + React").
    -   If **YES**: I will verify if I need more details (DB, Auth, etc.).
    -   If **NO**: I will recommend running `/socrates` first to define your requirements.

2.  **Determine Scope**
    I will ask you:
    -   **Database**: PostgreSQL, MySQL, SQLite, MongoDB?
    -   **Auth**: Need login/signup?
    -   **Extra**: Vector DB, Redis, 3D Engine?
    -   **Setup Type**: Full environment (Code + Agents) or Agents only?

3.  **Execution (Script Trigger)**
    Based on your choices, I will execute the bootstrap scripts located in `c:\Users\kgj12\Root\main\skills\project-bootstrap\scripts\`.

    *   **MCP Setup**: `python c:\Users\kgj12\Root\main\skills\project-bootstrap\scripts\setup_mcp.py`
    *   **Docker**: `python c:\Users\kgj12\Root\main\skills\project-bootstrap\scripts\setup_docker.py`
    *   **Backend**: `python c:\Users\kgj12\Root\main\skills\project-bootstrap\scripts\setup_backend.py`
    *   **Frontend**: `python c:\Users\kgj12\Root\main\skills\project-bootstrap\scripts\setup_frontend.py`
    *   **Git Init**: `python c:\Users\kgj12\Root\main\skills\project-bootstrap\scripts\git_init.py`

4.  **Finalization**
    I will ask if you want to install dependencies and run migrations immediately.

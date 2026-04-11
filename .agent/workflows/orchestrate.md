---
description: Orchestrates complex tasks by breaking them down and managing execution.
---
# Orchestration Workflow

Use this workflow to handle complex, multi-step development tasks.

1.  **Task Analysis**
    Provide a task description (e.g., "Implement Login Feature" or "T1.2").
    I will:
    -   Analyze the request against `tasks.md`.
    -   Identify necessary files and dependencies.
    -   Determine the "Phase" of the project (to decide on Git Worktree usage if applicable).

2.  **Delegation (Simulation)**
    I will act as the Orchestrator and "assign" work to specialized roles (Backend, Frontend, etc.) by executing the steps myself in a structured manner.
    -   **Backend Specialist**: API, DB, Logic.
    -   **Frontend Specialist**: UI, Integration.
    -   **Test Specialist**: Verification.

3.  **Execution Loop**
    For each sub-task:
    -   **Plan**: Check what needs to be done.
    -   **Test (TDD)**: Create/Run verification step (expect failure).
    -   **Implement**: Write the code.
    -   **Verify**: Run verification step (expect success).

4.  **Completion**
    Update `tasks.md` and report progress.

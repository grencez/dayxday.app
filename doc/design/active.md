# Active Development

## Near-Term (Next 1-3 Months)

- **Milestone 1.1:** Improve Test Coverage
  - **Goal:** Achieve at least 80% test coverage for all components and composables.
  - **Tasks:**
    - Write unit tests for `useActivityDatabase` (post-Pinia refactor).
    - Write unit tests for `DayView` component.
    - Set up a CI/CD pipeline to automatically run tests on each commit.
- **Milestone 1.2:** Implement Undo Functionality
  - **Goal:** Allow users to undo the most recent activity edits.
  - **Tasks:**
    - Design the undo/redo mechanism (e.g., using a command pattern or a history stack).
    - Implement undo/redo in the `activityStore`.
    - Add UI elements for undo/redo actions.

# Phase 2 Implementation Prompt

Use this prompt to start a new Claude Code session for implementing Phase 2 (SRP Submission).

---

## Prompt

```
I'm continuing development on the FAERS (FDA Adverse Event Reporting System) Submission Application. Phase 1 is complete, and I need to implement Phase 2: Safety Reporting Portal (SRP) Submission.

## Context Documents

Please read these documents first to understand the current state:

1. **Implementation Status**: `docs/architecture/04_Implementation_Status.md`
   - Current project structure
   - Completed features
   - Key type definitions
   - Service layer details
   - IPC communication patterns

2. **Phase 2 Requirements**: `docs/requirements/02_Phase2_SRP_Submission.md`
   - Full requirements specification
   - Acceptance criteria
   - UI requirements

3. **Architecture Design**: `docs/architecture/03_Architecture_Design.md`
   - C4 diagrams
   - Design patterns in use
   - Data flow diagrams

## Quick Start

```bash
cd faers-app
npm install
npm run dev
```

## What Phase 1 Provides

Phase 1 is complete with:
- Case CRUD operations (CaseRepository, DrugRepository, ReactionRepository, ReporterRepository)
- 7 form sections (Report, Reporter, Sender, Patient, Reactions, Drugs, Narrative)
- E2B(R3) validation (ValidationService with 25+ rules)
- E2B(R3) XML generation (XMLGeneratorService)
- Form 3500A PDF import
- Case list with search, filter, pagination
- Navigation with section status indicators

## Phase 2 Goals

Implement SRP submission workflow:

### Must Have
1. **Extended Case Status** - Add new statuses: "Ready for Export", "Submitted", "Acknowledged", "Rejected"
2. **FDA Filename Convention** - Pattern: `{SenderID}_{Date}_{SequenceNumber}.xml`
3. **Pre-Export Validation** - Block export on errors, allow with warnings
4. **Record Submission** - Dialog to mark case as submitted with SRP confirmation number
5. **Record Acknowledgment** - Dialog to record FDA accept/reject response
6. **Submission History** - Append-only log of all status changes and events per case

### Should Have
1. **Submission Dashboard** - Status counts, needs-attention list, activity feed
2. **Settings UI** - Sender ID configuration, export preferences
3. **Case List Enhancements** - New columns for submission dates, filter by submission status

## Implementation Order Suggestion

1. Extend `CaseStatus` enum in types
2. Add submission history table and repository
3. Add settings table entries for sender configuration
4. Create Settings page component
5. Create submission recording dialogs (Submitted, Acknowledgment)
6. Update case status transitions in store and handlers
7. Add submission history panel to case view
8. Create Dashboard component
9. Enhance CaseList with new columns and filters

## Key Files to Modify

- `src/shared/types/case.types.ts` - Add new status values, SubmissionHistory type
- `src/main/database/connection.ts` - Add submission_history table migration
- `src/main/database/repositories/` - Add SubmissionHistoryRepository
- `src/main/ipc/case.handlers.ts` - Add new handlers for status changes
- `src/preload/index.ts` - Expose new APIs
- `src/renderer/App.tsx` - Add Dashboard navigation
- `src/renderer/components/` - New components for dialogs, dashboard, settings

## Architecture Reminders

- Follow Repository Pattern for database access
- Use `wrapHandler()` for IPC handlers
- Standard `IPCResponse<T>` format for all responses
- Zustand for frontend state
- Ant Design for UI components

Please start by reading the context documents, then create a plan for implementing Phase 2 features.
```

---

## Alternative Shorter Prompt

```
Continue FAERS application development. Phase 1 (Core ICSR MVP) is complete.

Read these docs first:
- docs/architecture/04_Implementation_Status.md (current state)
- docs/requirements/02_Phase2_SRP_Submission.md (Phase 2 requirements)

Implement Phase 2: SRP Submission - extended case statuses, submission tracking, acknowledgment recording, and dashboard.

Start by reading the docs and creating an implementation plan.
```

---

## Notes for the Session

- The project uses TypeScript strict mode - run `npm run typecheck` frequently
- Test the app with `npm run dev` after changes
- Follow existing patterns in the codebase
- Phase 2 builds on Phase 1 - don't modify working Phase 1 functionality
- All new database tables need migrations in `connection.ts`

# FAERS Application - Claude Code Initial Prompt

Copy and paste the following prompt into Claude Code to begin implementation:

---

## PROMPT START

I need you to help me build a FAERS (FDA Adverse Event Reporting System) Submission Application. This is a phased project, and we're starting with **Phase 1: Core ICSR Submission (MVP)**.

### Requirements Documents

I have two requirements documents that contain all the details you need:

1. **`docs/requirements/00_FAERS_Application_Overview.md`** - High-level system overview including:

   - Business context and regulatory requirements
   - Technical architecture and recommended stack
   - All 12 development phases with dependencies
   - E2B(R3) data structure
   - Project conventions and quality standards
2. **docs/requirements/`01_Phase1_Core_ICSR_MVP.md `** - Detailed Phase 1 requirements including:

   - All functional requirements with acceptance criteria
   - Complete E2B(R3) data fields to capture
   - Full SQLite database schema
   - UI specifications and layouts
   - Validation rules
   - XML generation requirements
   - Technical implementation guide with code patterns

Please read both documents carefully before starting implementation.

### What I Need You To Do

Implement Phase 1 following the requirements in the documents. Start with the **First Milestone (M1: Foundation)** deliverables:

1. **Initialize the project** using the technology stack specified in the overview document
2. **Set up the database** using the complete schema from the Phase 1 requirements (Section REQ-DB-002)
3. **Create the project structure** as defined in Section 4.2 of the Phase 1 requirements
4. **Build the basic UI shell** following the layout in REQ-UI-001
5. **Implement IPC communication** between Electron main and renderer processes
6. **Create the case list view** as specified in REQ-UI-005

### Implementation Approach

- Follow the repository pattern shown in Section 4.3 of the Phase 1 requirements
- Use TypeScript strict mode throughout
- Implement proper error handling and logging
- Make the app cross-platform (Windows, macOS, Linux)

### Let's Start

Please begin by:

1. Reading the requirements documents I'll provide
2. Creating the project with all dependencies from the specified tech stack
3. Setting up the Electron + Vite + React configuration
4. Creating the database connection and full schema
5. Building the basic application shell

After each major component, let me know what to test and what comes next.

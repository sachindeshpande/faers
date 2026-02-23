# FAERS Submission Application - Architecture & Design Document

**Version:** 3.0
**Phase:** 4 (Non-Expedited Reports) + Phase 2B (ESG NextGen API Integration)
**Last Updated:** January 2026
**Status:** Implemented

---

## Table of Contents

1. [Document Purpose](#1-document-purpose)
2. [Architecture Overview](#2-architecture-overview)
3. [C4 Model Diagrams](#3-c4-model-diagrams)
4. [Technology Stack](#4-technology-stack)
5. [Data Architecture](#5-data-architecture)
6. [Component Design](#6-component-design)
7. [Data Flow](#7-data-flow)
8. [Security Architecture](#8-security-architecture)
9. [Design Patterns](#9-design-patterns)
10. [Cross-Cutting Concerns](#10-cross-cutting-concerns)
11. [Phase 4 Architecture Extensions](#11-phase-4-architecture-extensions)
12. [Phase 2B Architecture Extensions](#12-phase-2b-architecture-extensions-esg-nextgen-api)
13. [Future Architecture Considerations](#13-future-architecture-considerations)

---

## 1. Document Purpose

This document describes the software architecture and design of the FAERS Submission Application. It is intended for:

- **Developers** implementing or maintaining the application
- **Architects** evaluating design decisions
- **QA Engineers** understanding system boundaries for testing
- **Technical Leads** onboarding new team members

### 1.1 Scope

This document covers the architecture through Phase 4, which includes:
- Multi-user desktop application with authentication and RBAC
- Local SQLite database with comprehensive schema
- E2B(R3) XML generation (single and batch)
- Report type classification (Expedited/Non-Expedited)
- Follow-up and nullification report support
- Batch submission functionality
- Product management and PSR scheduling
- Periodic Safety Report (PSR) management
- Offline-first operation with audit trails

### 1.2 Architecture Principles

| Principle | Description |
|-----------|-------------|
| **Modularity** | Components are loosely coupled and independently testable |
| **Security by Design** | Context isolation between processes, no direct Node access in renderer |
| **Offline First** | Core functionality works without network connectivity |
| **Compliance Ready** | Architecture supports future 21 CFR Part 11 requirements |
| **Extensibility** | Plugin-ready architecture for future integrations |

---

## 2. Architecture Overview

### 2.1 High-Level Architecture

The FAERS application follows a **multi-process Electron architecture** with clear separation between the main process (Node.js/system access) and renderer process (UI):

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FAERS Desktop Application                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     RENDERER PROCESS                              │   │
│  │                     (Chromium Browser)                            │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │   │
│  │  │   React    │  │   Zustand  │  │  Ant Design│  │React Hook  │  │   │
│  │  │    UI      │  │   Store    │  │    UI      │  │   Form     │  │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │   │
│  │                          │                                        │   │
│  │                    contextBridge                                  │   │
│  │                     (Secure IPC)                                  │   │
│  └──────────────────────────┬───────────────────────────────────────┘   │
│                              │                                           │
│  ┌──────────────────────────┴───────────────────────────────────────┐   │
│  │                      PRELOAD SCRIPT                               │   │
│  │              (Exposes safe API to renderer)                       │   │
│  └──────────────────────────┬───────────────────────────────────────┘   │
│                              │                                           │
│  ┌──────────────────────────┴───────────────────────────────────────┐   │
│  │                      MAIN PROCESS                                 │   │
│  │                      (Node.js Runtime)                            │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │   │
│  │  │    IPC     │  │ Repositories│  │   E2B XML  │  │ Validation │  │   │
│  │  │  Handlers  │  │   (DAL)    │  │  Generator │  │  Service   │  │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │   │
│  │                          │                                        │   │
│  │  ┌──────────────────────────────────────────────────────────────┐│   │
│  │  │                  SQLite Database                              ││   │
│  │  │                 (better-sqlite3)                              ││   │
│  │  └──────────────────────────────────────────────────────────────┘│   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                         FILE SYSTEM                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐         │
│  │ faers.db   │  │  Backups   │  │ Exported   │  │  Resources │         │
│  │ (Database) │  │   (.db)    │  │  XML Files │  │   (JSON)   │         │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Process Model

| Process | Role | Access |
|---------|------|--------|
| **Main Process** | Application lifecycle, native APIs, database access | Full Node.js, file system, OS APIs |
| **Renderer Process** | User interface, React components | Sandboxed, no direct Node access |
| **Preload Script** | Bridge between processes | Limited, exposes specific APIs via contextBridge |

---

## 3. C4 Model Diagrams

### 3.1 Level 1: System Context Diagram

Shows the FAERS application in the context of its users and external systems.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEM CONTEXT                                  │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │                     │
                    │   Safety Officer    │
                    │      [Person]       │
                    │                     │
                    │  Creates and manages│
                    │  ICSR cases for FDA │
                    │     submission      │
                    │                     │
                    └──────────┬──────────┘
                               │
                               │ Uses
                               ▼
                    ┌─────────────────────┐
                    │                     │
                    │   FAERS Submission  │
                    │     Application     │
                    │  [Software System]  │
                    │                     │
                    │  Desktop app for    │
                    │  creating ICSRs and │
                    │  generating E2B XML │
                    │                     │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│                 │  │                 │  │                 │
│   FDA FAERS     │  │    MedDRA       │  │  File System    │
│  [External Sys] │  │  [External Sys] │  │  [External Sys] │
│                 │  │                 │  │                 │
│  Receives E2B   │  │  Medical coding │  │  Stores local   │
│  XML submissions│  │  terminology    │  │  database and   │
│  (Phase 2+)     │  │  (Phase 5)      │  │  exported files │
│                 │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘

Legend:
┌─────────┐          ┌─────────┐
│ Person  │          │ System  │
│[Person] │          │[Soft Sys]│
└─────────┘          └─────────┘
```

### 3.2 Level 2: Container Diagram

Shows the major containers (deployable units) that make up the application.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CONTAINER DIAGRAM                                │
│                         FAERS Submission Application                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           Electron Application                               │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │                        Renderer Process                               │  │
│  │                     [Container: Chromium]                             │  │
│  │                                                                       │  │
│  │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │  │
│  │   │                 │  │                 │  │                 │      │  │
│  │   │  React App      │  │  Zustand Store  │  │  UI Components  │      │  │
│  │   │  [Component]    │  │  [Component]    │  │  [Component]    │      │  │
│  │   │                 │  │                 │  │                 │      │  │
│  │   │  Entry point,   │  │  Application    │  │  Ant Design     │      │  │
│  │   │  routing,       │  │  state mgmt    │  │  components     │      │  │
│  │   │  lifecycle      │  │  for cases      │  │  for forms      │      │  │
│  │   │                 │  │                 │  │                 │      │  │
│  │   └────────┬────────┘  └────────┬────────┘  └────────┬────────┘      │  │
│  │            │                    │                    │               │  │
│  │            └────────────────────┴────────────────────┘               │  │
│  │                                 │                                     │  │
│  │                    Uses electronAPI                                   │  │
│  │                                 │                                     │  │
│  └─────────────────────────────────┼─────────────────────────────────────┘  │
│                                    │                                        │
│  ┌─────────────────────────────────┼─────────────────────────────────────┐  │
│  │                                 │                                     │  │
│  │            Preload Script [Container: Node.js]                        │  │
│  │                                 │                                     │  │
│  │            Exposes safe IPC API via contextBridge                     │  │
│  │                                 │                                     │  │
│  └─────────────────────────────────┼─────────────────────────────────────┘  │
│                                    │                                        │
│                           IPC Channels                                      │
│                                    │                                        │
│  ┌─────────────────────────────────┼─────────────────────────────────────┐  │
│  │                                 ▼                                     │  │
│  │                        Main Process                                   │  │
│  │                    [Container: Node.js]                               │  │
│  │                                                                       │  │
│  │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │  │
│  │   │                 │  │                 │  │                 │      │  │
│  │   │  IPC Handlers   │  │  Repositories   │  │  E2B Generator  │      │  │
│  │   │  [Component]    │  │  [Component]    │  │  [Component]    │      │  │
│  │   │                 │  │                 │  │                 │      │  │
│  │   │  Routes IPC     │  │  Database       │  │  Creates E2B    │      │  │
│  │   │  calls to       │  │  access layer   │  │  XML from       │      │  │
│  │   │  services       │  │  (Repository    │  │  case data      │      │  │
│  │   │                 │  │  Pattern)       │  │                 │      │  │
│  │   └─────────────────┘  └────────┬────────┘  └─────────────────┘      │  │
│  │                                 │                                     │  │
│  └─────────────────────────────────┼─────────────────────────────────────┘  │
│                                    │                                        │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
                                     │ SQL Queries
                                     ▼
                    ┌─────────────────────────────┐
                    │                             │
                    │       SQLite Database       │
                    │    [Container: SQLite]      │
                    │                             │
                    │    Single file database     │
                    │    storing all case data    │
                    │    and lookup tables        │
                    │                             │
                    │    Location:                │
                    │    {userData}/faers.db      │
                    │                             │
                    └─────────────────────────────┘
```

### 3.3 Level 3: Component Diagram - Main Process

Detailed view of the main process components.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMPONENT DIAGRAM: MAIN PROCESS                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                             Main Process                                     │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                          IPC Layer                                     │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                     IPC Handlers                                 │  │  │
│  │  │                   [case.handlers.ts]                             │  │  │
│  │  │                                                                  │  │  │
│  │  │  • Receives IPC calls from renderer                              │  │  │
│  │  │  • Routes to appropriate service/repository                      │  │  │
│  │  │  • Wraps responses in standard format                            │  │  │
│  │  │  • Handles errors consistently                                   │  │  │
│  │  │                                                                  │  │  │
│  │  │  Channels: case:list, case:get, case:create, case:update,       │  │  │
│  │  │            case:delete, case:validate, case:duplicate,           │  │  │
│  │  │            reaction:*, drug:*, reporter:*,                       │  │  │
│  │  │            xml:generate, xml:export, import:form3500,            │  │  │
│  │  │            db:backup, db:restore, dialog:save, dialog:open       │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Repository Layer                                  │  │
│  │                                                                        │  │
│  │  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────┐  │  │
│  │  │               │ │               │ │               │ │           │  │  │
│  │  │ CaseRepository│ │ReactionRepo   │ │ DrugRepository│ │ReporterRepo│  │  │
│  │  │               │ │               │ │               │ │           │  │  │
│  │  │ • findAll()   │ │ • findByCaseId│ │ • findByCaseId│ │• findBy   │  │  │
│  │  │ • findById()  │ │ • create()    │ │ • create()    │ │  CaseId() │  │  │
│  │  │ • create()    │ │ • update()    │ │ • update()    │ │• save()   │  │  │
│  │  │ • update()    │ │ • delete()    │ │ • delete()    │ │• delete() │  │  │
│  │  │ • delete()    │ │ • save()      │ │ • save()      │ │           │  │  │
│  │  │ • duplicate() │ │               │ │               │ │           │  │  │
│  │  │ • count()     │ │               │ │               │ │           │  │  │
│  │  │               │ │               │ │               │ │           │  │  │
│  │  └───────┬───────┘ └───────┬───────┘ └───────┬───────┘ └─────┬─────┘  │  │
│  │          │                 │                 │               │        │  │
│  └──────────┼─────────────────┼─────────────────┼───────────────┼────────┘  │
│             │                 │                 │               │           │
│             └─────────────────┴────────┬────────┴───────────────┘           │
│                                        │                                    │
│                                        ▼                                    │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Database Layer                                    │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    connection.ts                                 │  │  │
│  │  │                                                                  │  │  │
│  │  │  • initDatabase() - Initialize and migrate                       │  │  │
│  │  │  • getDatabase() - Get connection instance                       │  │  │
│  │  │  • closeDatabase() - Close on app quit                           │  │  │
│  │  │  • backupDatabase() - Create backup                              │  │  │
│  │  │  • restoreDatabase() - Restore from backup                       │  │  │
│  │  │  • runMigrations() - Apply schema changes                        │  │  │
│  │  │  • seedCountries() - Load lookup data                            │  │  │
│  │  │                                                                  │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Service Layer                                  │  │
│  │  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐    │  │
│  │  │                   │ │                   │ │                   │    │  │
│  │  │ValidationService  │ │XMLGeneratorService│ │Form3500ImportSvc  │    │  │
│  │  │                   │ │                   │ │                   │    │  │
│  │  │ • validate()      │ │ • generate()      │ │ • import()        │    │  │
│  │  │ • validateReport  │ │ • exportToFile()  │ │ • parser.parse()  │    │  │
│  │  │   Information()   │ │ • buildXML()      │ │ • mapper.map()    │    │  │
│  │  │ • validatePatient │ │ • escapeXml()     │ │                   │    │  │
│  │  │   Information()   │ │                   │ │                   │    │  │
│  │  │ • validateDrugs() │ └───────────────────┘ └───────────────────┘    │  │
│  │  │ • validateReact   │                                                │  │
│  │  │   ions()          │ ┌───────────────────┐ ┌───────────────────┐    │  │
│  │  │ • validateCross   │ │                   │ │                   │    │  │
│  │  │   FieldRules()    │ │ Form3500AParser   │ │ Form3500AMapper   │    │  │
│  │  │                   │ │                   │ │                   │    │  │
│  │  └───────────────────┘ │ • parse()         │ │ • map()           │    │  │
│  │                        │ • extractPatient  │ │ • mapCaseData()   │    │  │
│  │                        │   Info()          │ │ • mapDrugs()      │    │  │
│  │                        │ • extractEvent    │ │ • mapReactions()  │    │  │
│  │                        │   Info()          │ │ • mapReporters()  │    │  │
│  │                        │ • extractProducts │ │ • parseDate()     │    │  │
│  │                        │                   │ │                   │    │  │
│  │                        └───────────────────┘ └───────────────────┘    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.4 Level 3: Component Diagram - Renderer Process

Detailed view of the renderer process components.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   COMPONENT DIAGRAM: RENDERER PROCESS                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            Renderer Process                                  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         React Application                              │  │
│  │                            [App.tsx]                                   │  │
│  │                                                                        │  │
│  │  • Application shell and layout                                        │  │
│  │  • Toolbar and navigation                                              │  │
│  │  • Routes content based on active section                              │  │
│  │                                                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│           ┌────────────────────────┼────────────────────────┐               │
│           ▼                        ▼                        ▼               │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │                 │    │                 │    │                 │         │
│  │   Case List     │    │   Case Form     │    │ Common Components│        │
│  │   [Component]   │    │   [Component]   │    │   [Component]   │         │
│  │                 │    │                 │    │                 │         │
│  │  • CaseList.tsx │    │  • CaseForm.tsx │    │  • DatePicker   │         │
│  │  • Table view   │    │  • Section nav  │    │  • Dropdown     │         │
│  │  • Filters      │    │  • Form sections│    │  • RepeatingGrp │         │
│  │  • Pagination   │    │                 │    │  • Validation   │         │
│  │                 │    │                 │    │                 │         │
│  └────────┬────────┘    └────────┬────────┘    └─────────────────┘         │
│           │                      │                                          │
│           │              ┌───────┴───────┐                                  │
│           │              ▼               ▼                                  │
│           │    ┌─────────────┐ ┌─────────────┐                             │
│           │    │ReportSection│ │PatientSection│  ... (7 sections)          │
│           │    │ReporterSect │ │ReactionSect │                             │
│           │    │SenderSection│ │DrugSection  │                             │
│           │    │             │ │NarrativeSect│                             │
│           │    └─────────────┘ └─────────────┘                             │
│           │                                                                 │
│  ┌────────┴──────────────────────────────────────────────────────────────┐ │
│  │                          State Layer                                   │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │ │
│  │  │                        Zustand Store                              │ │ │
│  │  │                       [caseStore.ts]                              │ │ │
│  │  │                                                                   │ │ │
│  │  │  State:                        Actions:                           │ │ │
│  │  │  • cases: CaseListItem[]       • fetchCases()                     │ │ │
│  │  │  • currentCase: Case | null    • fetchCase()                      │ │ │
│  │  │  • isLoading: boolean          • createCase()                     │ │ │
│  │  │  • isDirty: boolean            • updateCase()                     │ │ │
│  │  │  • activeSection: string       • deleteCase()                     │ │ │
│  │  │  • filters: FilterOptions      • duplicateCase()                  │ │ │
│  │  │                                • setActiveSection()               │ │ │
│  │  │                                                                   │ │ │
│  │  │  Selectors:                                                       │ │ │
│  │  │  • useCaseList() - List view state                                │ │ │
│  │  │  • useCurrentCase() - Current case state                          │ │ │
│  │  │  • useCaseActions() - Action functions                            │ │ │
│  │  │                                                                   │ │ │
│  │  └──────────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                                    ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                          API Layer                                     │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │  │
│  │  │                     window.electronAPI                            │ │  │
│  │  │                                                                   │ │  │
│  │  │  Exposed by preload script via contextBridge                      │ │  │
│  │  │                                                                   │ │  │
│  │  │  Case Operations:        Drug Operations:                         │ │  │
│  │  │  • getCases()            • getDrugs()                             │ │  │
│  │  │  • getCase()             • saveDrug()                             │ │  │
│  │  │  • createCase()          • deleteDrug()                           │ │  │
│  │  │  • updateCase()                                                   │ │  │
│  │  │  • deleteCase()          Validation & Export:                     │ │  │
│  │  │  • duplicateCase()       • validateCase()                         │ │  │
│  │  │                          • generateXML()                          │ │  │
│  │  │  Reaction Operations:    • exportXML()                            │ │  │
│  │  │  • getReactions()                                                 │ │  │
│  │  │  • saveReaction()        Import Operations:                       │ │  │
│  │  │  • deleteReaction()      • importForm3500()                       │ │  │
│  │  │                                                                   │ │  │
│  │  │  Reporter Operations:    Utilities:                               │ │  │
│  │  │  • getReporters()        • showSaveDialog()                       │ │  │
│  │  │  • saveReporter()        • showOpenDialog()                       │ │  │
│  │  │  • deleteReporter()      • backupDatabase()                       │ │  │
│  │  │                          • restoreDatabase()                      │ │  │
│  │  │                          • getCountries()                         │ │  │
│  │  │                                                                   │ │  │
│  │  └──────────────────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.5 Level 4: Code Diagram - Repository Pattern

Detailed class structure for the repository layer.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CODE DIAGRAM: REPOSITORY PATTERN                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    «interface» Repository<T>                         │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  + findById(id: string | number): T | null                          │    │
│  │  + create(data: Omit<T, 'id'>): T                                   │    │
│  │  + update(id: string | number, data: Partial<T>): T | null          │    │
│  │  + delete(id: string | number): boolean                             │    │
│  │  + save(entity: T): T                                               │    │
│  └──────────────────────────────┬──────────────────────────────────────┘    │
│                                 │                                           │
│                                 │ implements                                │
│         ┌───────────────────────┼───────────────────────┐                   │
│         │                       │                       │                   │
│         ▼                       ▼                       ▼                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ CaseRepository  │  │ReactionRepository│  │ DrugRepository │             │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤             │
│  │ - db: Database  │  │ - db: Database  │  │ - db: Database  │             │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤             │
│  │ + findAll()     │  │ + findByCaseId()│  │ + findByCaseId()│             │
│  │ + findById()    │  │ + findById()    │  │ + findById()    │             │
│  │ + create()      │  │ + create()      │  │ + create()      │             │
│  │ + update()      │  │ + update()      │  │ + update()      │             │
│  │ + delete()      │  │ + delete()      │  │ + delete()      │             │
│  │ + duplicate()   │  │ + save()        │  │ + save()        │             │
│  │ + count()       │  │ + reorder()     │  │ - getSubstances()│            │
│  │ - generateId()  │  │ - mapRow()      │  │ - getDosages()  │             │
│  │ - mapRow()      │  │                 │  │ - mapRow()      │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                              │
│                              uses                                            │
│                               │                                              │
│                               ▼                                              │
│                    ┌─────────────────────┐                                  │
│                    │  Database (SQLite)  │                                  │
│                    ├─────────────────────┤                                  │
│                    │ better-sqlite3      │                                  │
│                    │                     │                                  │
│                    │ • Synchronous API   │                                  │
│                    │ • Prepared stmts    │                                  │
│                    │ • Transactions      │                                  │
│                    └─────────────────────┘                                  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Technology Stack

### 4.1 Stack Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TECHNOLOGY STACK                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER                                                          │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐│
│  │   React    │ │ Ant Design │ │   Zustand  │ │ React Hook │ │    Zod     ││
│  │   18.2     │ │    5.x     │ │    4.x     │ │    Form    │ │   3.22     ││
│  │            │ │            │ │            │ │    7.x     │ │            ││
│  │ UI Library │ │ Component  │ │   State    │ │   Form     │ │ Validation ││
│  │            │ │  Library   │ │ Management │ │ Management │ │   Schema   ││
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  APPLICATION LAYER                                                           │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│  │  Electron  │ │   Vite     │ │ TypeScript │ │ xmlbuilder2│               │
│  │    28.x    │ │   5.x      │ │    5.3     │ │    3.x     │               │
│  │            │ │            │ │            │ │            │               │
│  │  Desktop   │ │  Bundler   │ │  Language  │ │    XML     │               │
│  │ Framework  │ │  Dev Server│ │            │ │ Generation │               │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  DATA LAYER                                                                  │
│  ┌────────────┐ ┌────────────┐                                              │
│  │better-sqlite│ │   dayjs    │                                              │
│  │     9.x    │ │   1.11     │                                              │
│  │            │ │            │                                              │
│  │  Database  │ │ Date/Time  │                                              │
│  │   Driver   │ │  Handling  │                                              │
│  └────────────┘ └────────────┘                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  DEVELOPMENT & BUILD                                                         │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│  │electron-vite│ │  ESLint   │ │  Vitest    │ │ Playwright │               │
│  │    2.x     │ │   8.x      │ │    1.x     │ │    1.x     │               │
│  │            │ │            │ │            │ │            │               │
│  │   Build    │ │  Linting   │ │   Unit     │ │    E2E     │               │
│  │  Tooling   │ │            │ │  Testing   │ │  Testing   │               │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Technology Decisions

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Framework** | Electron | Cross-platform desktop, native APIs, offline support |
| **UI** | React + Ant Design | Component-rich, enterprise-ready, form handling |
| **State** | Zustand | Simpler than Redux, TypeScript-friendly, small bundle |
| **Database** | SQLite (better-sqlite3) | Embedded, single-file, no server needed |
| **Build** | Vite (electron-vite) | Fast HMR, ESM support, Electron integration |
| **Language** | TypeScript (strict) | Type safety, IDE support, maintainability |

---

## 5. Data Architecture

### 5.1 Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ENTITY RELATIONSHIP DIAGRAM                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                               │
│   ┌─────────────────┐         ┌─────────────────┐         ┌──────────────┐  │
│   │  lookup_countries│         │    settings     │         │  migrations  │  │
│   ├─────────────────┤         ├─────────────────┤         ├──────────────┤  │
│   │ PK code         │         │ PK key          │         │ PK id        │  │
│   │    name         │         │    value        │         │    name      │  │
│   └─────────────────┘         │    updated_at   │         │    applied_at│  │
│                               └─────────────────┘         └──────────────┘  │
│                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                              cases                                   │   │
│   ├─────────────────────────────────────────────────────────────────────┤   │
│   │ PK id (TEXT: CASE-YYYYMMDD-XXXX)                                    │   │
│   │    status, created_at, updated_at, deleted_at                       │   │
│   │    safety_report_id, report_type, initial_or_followup               │   │
│   │    receipt_date, receive_date, additional_docs, expedited_report    │   │
│   │    sender_type, sender_organization, sender_given_name, ...         │   │
│   │    patient_initials, patient_age, patient_sex, patient_weight, ...  │   │
│   │    patient_death, death_date, autopsy_performed                     │   │
│   │    case_narrative, reporter_comments, sender_comments               │   │
│   │    version, exported_at, exported_xml_path                          │   │
│   └─────────────────────────────┬───────────────────────────────────────┘   │
│                                 │                                            │
│       ┌─────────────────────────┼─────────────────────────┐                 │
│       │            │            │            │            │                 │
│       ▼            ▼            ▼            ▼            ▼                 │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │reporters│ │identifiers│ │ medical  │ │drug_hist │ │death_    │           │
│  │         │ │          │ │ _history │ │ ory      │ │causes    │           │
│  ├─────────┤ ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤           │
│  │PK id    │ │PK id     │ │PK id     │ │PK id     │ │PK id     │           │
│  │FK case_id│ │FK case_id│ │FK case_id│ │FK case_id│ │FK case_id│           │
│  │is_primary│ │source    │ │condition │ │drug_name │ │cause_type│           │
│  │title    │ │identifier│ │meddra_   │ │start_date│ │cause     │           │
│  │given_   │ │          │ │  code    │ │end_date  │ │meddra_   │           │
│  │  name   │ └──────────┘ │continuing│ │indication│ │  code    │           │
│  │family_  │              │family_   │ │reaction  │ │          │           │
│  │  name   │              │  history │ │          │ │          │           │
│  │qualifi- │              └──────────┘ └──────────┘ └──────────┘           │
│  │  cation │                                                                │
│  │country  │                                                                │
│  │email    │                                                                │
│  └─────────┘                                                                │
│                                 │                                            │
│       ┌─────────────────────────┼─────────────────────────┐                 │
│       ▼                                                   ▼                 │
│  ┌──────────────────┐                           ┌──────────────────┐        │
│  │   case_reactions │                           │    case_drugs    │        │
│  ├──────────────────┤                           ├──────────────────┤        │
│  │ PK id            │                           │ PK id            │        │
│  │ FK case_id       │◄─────────────────────────►│ FK case_id       │        │
│  │    reaction_term │       drug_reaction       │    product_name  │        │
│  │    meddra_code   │          _matrix          │    characterization│      │
│  │    start_date    │                           │    indication    │        │
│  │    end_date      │                           │    start_date    │        │
│  │    serious_*     │                           │    action_taken  │        │
│  │    outcome       │                           │    dechallenge   │        │
│  │                  │                           │    rechallenge   │        │
│  └──────────────────┘                           └────────┬─────────┘        │
│                                                          │                  │
│                                           ┌──────────────┴──────────────┐   │
│                                           ▼                             ▼   │
│                                   ┌──────────────┐              ┌──────────┐│
│                                   │drug_substances│              │drug_     ││
│                                   │              │              │ dosages  ││
│                                   ├──────────────┤              ├──────────┤│
│                                   │PK id         │              │PK id     ││
│                                   │FK drug_id    │              │FK drug_id││
│                                   │substance_name│              │dose      ││
│                                   │strength      │              │dose_unit ││
│                                   │strength_unit │              │route     ││
│                                   └──────────────┘              │pharma_   ││
│                                                                 │  form    ││
│                                                                 └──────────┘│
└──────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Data Storage Strategy

| Data Type | Storage Location | Lifecycle |
|-----------|------------------|-----------|
| **Case Data** | SQLite database (`faers.db`) | Persisted until explicit delete |
| **Attachments** | File system (future) | Linked from database |
| **Settings** | SQLite `settings` table | Application-wide preferences |
| **Backups** | User documents folder | User-managed |
| **Exported XML** | User-chosen location | User-managed files |
| **Lookup Data** | SQLite lookup tables | Seeded on first run |

---

## 6. Component Design

### 6.1 Main Process Components

#### 6.1.1 Database Connection (`connection.ts`)

**Responsibilities:**
- Initialize SQLite database on app startup
- Manage connection lifecycle
- Apply migrations for schema updates
- Seed lookup data (countries)
- Handle backup and restore

**Key Functions:**
```typescript
initDatabase(): Database.Database    // Initialize and return connection
getDatabase(): Database.Database     // Get existing connection
closeDatabase(): void                // Close on app quit
backupDatabase(): string             // Create timestamped backup
restoreDatabase(path: string): void  // Restore from backup file
```

#### 6.1.2 Repositories

Each repository encapsulates database operations for a specific entity:

| Repository | Entity | Key Operations |
|------------|--------|----------------|
| `CaseRepository` | ICSR Case | CRUD, duplicate, filter, count |
| `ReactionRepository` | Adverse Event | CRUD by case, reorder |
| `DrugRepository` | Medications | CRUD with substances/dosages |
| `ReporterRepository` | Primary Source | CRUD, set primary |

#### 6.1.3 Services Layer

The service layer contains business logic that orchestrates repositories and performs complex operations.

| Service | File | Purpose |
|---------|------|---------|
| `ValidationService` | `validationService.ts` | E2B(R3) compliance validation |
| `XMLGeneratorService` | `xmlGeneratorService.ts` | E2B(R3) XML generation |
| `Form3500ImportService` | `form3500ImportService.ts` | PDF import orchestration |
| `Form3500AParser` | `form3500Parser.ts` | PDF field extraction |
| `Form3500AMapper` | `form3500Mapper.ts` | Form 3500A to E2B mapping |

**ValidationService Key Methods:**
```typescript
validate(caseId: string): ValidationResult
  // Runs all validation checks:
  // - validateReportInformation()
  // - validateReporterInformation()
  // - validateSenderInformation()
  // - validatePatientInformation()
  // - validateReactions()
  // - validateDrugs()
  // - validateNarrative()
  // - validateCrossFieldRules()
```

**XMLGeneratorService Key Methods:**
```typescript
generate(caseId: string): Promise<XMLGenerationResult>
exportToFile(caseId: string, filePath: string): Promise<XMLExportResult>
```

**Form3500ImportService Key Methods:**
```typescript
import(filePath: string): Promise<Form3500AImportResult>
  // Orchestrates: parse → map → create case → create entities
```

#### 6.1.4 IPC Handlers (`case.handlers.ts`)

**Responsibilities:**
- Register ipcMain handlers for all channels
- Route requests to appropriate repository
- Wrap responses in standard `IPCResponse<T>` format
- Handle and log errors consistently

**Pattern:**
```typescript
ipcMain.handle(IPC_CHANNELS.CASE_LIST,
  wrapHandler((filters) => caseRepo.findAll(filters))
);
```

### 6.2 Renderer Process Components

#### 6.2.1 Application Shell (`App.tsx`)

**Responsibilities:**
- Define main layout (header, sidebar, content, footer)
- Render toolbar with action buttons (New, Save, Validate, Export, Import)
- Handle navigation between sections with dynamic indicators
- Display status bar with case info (ID, status, dirty state)
- Coordinate validation and show results

**Navigation Indicators:**
- Green checkmark: Section has data
- Red X: Section has validation errors
- No indicator: Section is empty with no errors

```typescript
// Dynamic navigation generation
const getNavItems = (): MenuItem[] => [
  { key: 'report', label: createNavLabel('Report Info',
      getSectionHasData('report'), getSectionErrors('report')) },
  // ... other sections
];
```

#### 6.2.2 Case List (`CaseList.tsx`)

**Responsibilities:**
- Display paginated, sortable table of cases
- Provide search and status filter controls
- Handle row selection for bulk operations
- Single-click to open case, checkbox for selection
- Context menu for case actions (Open, Duplicate, Export, Delete)
- Bulk delete of selected Draft cases

#### 6.2.3 Case Store (`caseStore.ts`)

**Responsibilities:**
- Manage application state with Zustand
- Provide actions for case operations
- Track loading states, dirty state, and errors
- Store related entities (drugs, reactions, reporters)
- Expose selectors for component access

**State:**
```typescript
interface CaseState {
  cases: CaseListItem[];
  currentCase: Case | null;
  drugs: CaseDrug[];
  reactions: CaseReaction[];
  reporters: CaseReporter[];
  isLoading: boolean;
  isDirty: boolean;
  isSaving: boolean;
  activeSection: string;
  filters: CaseFilterOptions;
}
```

---

## 7. Data Flow

### 7.1 Case Creation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CASE CREATION DATA FLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

   User                  Renderer               Preload             Main Process
    │                       │                      │                      │
    │ Click "New Case"      │                      │                      │
    │──────────────────────►│                      │                      │
    │                       │                      │                      │
    │                       │ createCase()         │                      │
    │                       │─────────────────────►│                      │
    │                       │                      │                      │
    │                       │                      │ ipcRenderer.invoke   │
    │                       │                      │ ('case:create')      │
    │                       │                      │─────────────────────►│
    │                       │                      │                      │
    │                       │                      │                      │ CaseRepository
    │                       │                      │                      │ .create()
    │                       │                      │                      │     │
    │                       │                      │                      │     │ Generate ID
    │                       │                      │                      │     │ INSERT INTO
    │                       │                      │                      │     │ cases...
    │                       │                      │                      │◄────┘
    │                       │                      │                      │
    │                       │                      │  IPCResponse<Case>   │
    │                       │                      │◄─────────────────────│
    │                       │                      │                      │
    │                       │  IPCResponse<Case>   │                      │
    │                       │◄─────────────────────│                      │
    │                       │                      │                      │
    │                       │ Update Zustand Store │                      │
    │                       │ (currentCase = data) │                      │
    │                       │                      │                      │
    │ Show Case Form        │                      │                      │
    │◄──────────────────────│                      │                      │
    │                       │                      │                      │
```

### 7.2 Case Save Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CASE SAVE DATA FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

   User                  Form Component           Store                Main Process
    │                         │                     │                       │
    │ Edit field              │                     │                       │
    │────────────────────────►│                     │                       │
    │                         │                     │                       │
    │                         │ updateCurrentCase   │                       │
    │                         │ Field(field, value) │                       │
    │                         │────────────────────►│                       │
    │                         │                     │                       │
    │                         │                     │ Set isDirty = true    │
    │                         │                     │                       │
    │ Click "Save"            │                     │                       │
    │────────────────────────►│                     │                       │
    │                         │                     │                       │
    │                         │ handleSave()        │                       │
    │                         │────────────────────►│                       │
    │                         │                     │                       │
    │                         │                     │ updateCase(id, data)  │
    │                         │                     │──────────────────────►│
    │                         │                     │                       │
    │                         │                     │                       │ UPDATE cases
    │                         │                     │                       │ SET ...
    │                         │                     │                       │ WHERE id = ?
    │                         │                     │                       │
    │                         │                     │ IPCResponse<Case>     │
    │                         │                     │◄──────────────────────│
    │                         │                     │                       │
    │                         │                     │ Set isDirty = false   │
    │                         │                     │ Update currentCase    │
    │                         │                     │                       │
    │ Show success message    │                     │                       │
    │◄────────────────────────│                     │                       │
    │                         │                     │                       │
```

### 7.3 XML Export Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          XML EXPORT DATA FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

   User              Renderer              Main Process           File System
    │                    │                      │                      │
    │ Click "Export XML" │                      │                      │
    │───────────────────►│                      │                      │
    │                    │                      │                      │
    │                    │ showSaveDialog()     │                      │
    │                    │─────────────────────►│                      │
    │                    │                      │                      │
    │ Select file path   │                      │                      │
    │───────────────────►│                      │                      │
    │                    │                      │                      │
    │                    │ exportXML(id, path)  │                      │
    │                    │─────────────────────►│                      │
    │                    │                      │                      │
    │                    │                      │ ValidationService    │
    │                    │                      │ .validate(caseId)    │
    │                    │                      │         │            │
    │                    │                      │◄────────┘            │
    │                    │                      │                      │
    │                    │                      │ If !valid, return    │
    │                    │                      │ error with details   │
    │                    │                      │                      │
    │                    │                      │ XMLGeneratorService  │
    │                    │                      │ .generate(caseId)    │
    │                    │                      │         │            │
    │                    │                      │         │ Build E2B  │
    │                    │                      │         │ XML from   │
    │                    │                      │         │ case data  │
    │                    │                      │◄────────┘            │
    │                    │                      │                      │
    │                    │                      │ fs.writeFileSync     │
    │                    │                      │ (filePath, xml)      │
    │                    │                      │─────────────────────►│
    │                    │                      │                      │
    │                    │                      │ CaseRepository       │
    │                    │                      │ .update(id,          │
    │                    │                      │   {status:'Exported',│
    │                    │                      │    exportedAt, ...}) │
    │                    │                      │                      │
    │                    │ IPCResponse<void>    │                      │
    │                    │◄─────────────────────│                      │
    │                    │                      │                      │
    │ Show success msg   │                      │                      │
    │◄───────────────────│                      │                      │
    │                    │                      │                      │
```

### 7.4 PDF Import Flow (Form 3500A)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PDF IMPORT DATA FLOW (FORM 3500A)                      │
└─────────────────────────────────────────────────────────────────────────────┘

   User              Renderer              Main Process           File System
    │                    │                      │                      │
    │ Click "Import 3500"│                      │                      │
    │───────────────────►│                      │                      │
    │                    │                      │                      │
    │                    │ showOpenDialog()     │                      │
    │                    │ (filter: *.pdf)      │                      │
    │                    │─────────────────────►│                      │
    │                    │                      │                      │
    │ Select PDF file    │                      │                      │
    │───────────────────►│                      │                      │
    │                    │                      │                      │
    │                    │ importForm3500(path) │                      │
    │                    │─────────────────────►│                      │
    │                    │                      │                      │
    │                    │                      │ Form3500AParser      │
    │                    │                      │ .parse(filePath)     │
    │                    │                      │         │            │
    │                    │                      │         │ Read PDF   │
    │                    │                      │         │◄──────────│
    │                    │                      │         │            │
    │                    │                      │         │ Extract    │
    │                    │                      │         │ AcroForm   │
    │                    │                      │         │ fields     │
    │                    │                      │◄────────┘            │
    │                    │                      │                      │
    │                    │                      │ Form3500AMapper      │
    │                    │                      │ .map(formData)       │
    │                    │                      │         │            │
    │                    │                      │         │ Transform  │
    │                    │                      │         │ to E2B     │
    │                    │                      │         │ entities   │
    │                    │                      │◄────────┘            │
    │                    │                      │                      │
    │                    │                      │ CaseRepository       │
    │                    │                      │ .create() + .update()│
    │                    │                      │                      │
    │                    │                      │ DrugRepository       │
    │                    │                      │ .create() for each   │
    │                    │                      │                      │
    │                    │                      │ ReactionRepository   │
    │                    │                      │ .create() for each   │
    │                    │                      │                      │
    │                    │                      │ ReporterRepository   │
    │                    │                      │ .create() for each   │
    │                    │                      │                      │
    │                    │ ImportResult         │                      │
    │                    │ {caseId, warnings}   │                      │
    │                    │◄─────────────────────│                      │
    │                    │                      │                      │
    │                    │ Navigate to case     │                      │
    │ Show imported case │ form                 │                      │
    │◄───────────────────│                      │                      │
    │                    │                      │                      │
```

---

## 8. Security Architecture

### 8.1 Process Isolation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SECURITY ARCHITECTURE                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   RENDERER PROCESS (Sandboxed)                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                                                                     │   │
│   │   ✗ No require('electron')                                          │   │
│   │   ✗ No require('fs')                                                │   │
│   │   ✗ No require('child_process')                                     │   │
│   │   ✗ No direct Node.js access                                        │   │
│   │                                                                     │   │
│   │   ✓ Access to window.electronAPI only                               │   │
│   │   ✓ Standard browser APIs                                           │   │
│   │   ✓ React, Ant Design, etc.                                         │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                       contextBridge.exposeInMainWorld                       │
│                          (Type-safe, limited API)                           │
│                                    │                                        │
│   ┌────────────────────────────────┼────────────────────────────────────┐   │
│   │                   PRELOAD SCRIPT                                    │   │
│   │                                                                     │   │
│   │   Exposes ONLY these functions:                                     │   │
│   │   • getCases, getCase, createCase, updateCase, deleteCase          │   │
│   │   • getReactions, saveReaction, deleteReaction                      │   │
│   │   • getDrugs, saveDrug, deleteDrug                                  │   │
│   │   • showSaveDialog, showOpenDialog (controlled dialogs)             │   │
│   │   • backupDatabase, restoreDatabase                                 │   │
│   │   • getCountries, searchMedDRA                                      │   │
│   │                                                                     │   │
│   └────────────────────────────────┼────────────────────────────────────┘   │
│                                    │                                        │
│                             ipcRenderer.invoke                              │
│                           (Async, channel-based)                            │
│                                    │                                        │
│   ┌────────────────────────────────┼────────────────────────────────────┐   │
│   │                   MAIN PROCESS (Trusted)                            │   │
│   │                                                                     │   │
│   │   ✓ Full Node.js access                                             │   │
│   │   ✓ File system operations                                          │   │
│   │   ✓ Database access                                                 │   │
│   │   ✓ Native OS integration                                           │   │
│   │                                                                     │   │
│   │   Security measures:                                                │   │
│   │   • Input validation on all IPC handlers                            │   │
│   │   • Parameterized SQL queries (no injection)                        │   │
│   │   • Controlled file dialogs (no arbitrary paths)                    │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Security Controls

| Threat | Mitigation |
|--------|------------|
| **XSS** | React escaping, CSP headers, no `dangerouslySetInnerHTML` |
| **SQL Injection** | Parameterized queries in all repositories |
| **Path Traversal** | Native file dialogs, no raw path input |
| **Code Injection** | Context isolation, no `eval()`, no `nodeIntegration` |
| **Data Leakage** | Local storage only, no network in Phase 1 |

### 8.3 Electron Security Settings

```typescript
// BrowserWindow configuration
webPreferences: {
  preload: join(__dirname, '../preload/index.js'),
  sandbox: false,           // Required for better-sqlite3
  nodeIntegration: false,   // CRITICAL: No Node in renderer
  contextIsolation: true    // CRITICAL: Isolate contexts
}
```

---

## 9. Design Patterns

### 9.1 Repository Pattern

**Purpose:** Abstract database access behind a clean interface.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REPOSITORY PATTERN                                   │
└─────────────────────────────────────────────────────────────────────────────┘

   IPC Handler              Repository                   Database
       │                        │                            │
       │ findAll(filters)       │                            │
       │───────────────────────►│                            │
       │                        │                            │
       │                        │ SELECT * FROM cases        │
       │                        │ WHERE status = ?           │
       │                        │ ORDER BY updated_at        │
       │                        │───────────────────────────►│
       │                        │                            │
       │                        │ Raw rows                   │
       │                        │◄───────────────────────────│
       │                        │                            │
       │                        │ Map to domain objects      │
       │                        │                            │
       │ CaseListItem[]         │                            │
       │◄───────────────────────│                            │
       │                        │                            │

Benefits:
• Testable (mock repository for unit tests)
• Encapsulated SQL (easy to change queries)
• Type-safe (mapped to TypeScript interfaces)
• Single responsibility (one class per entity)
```

### 9.2 Observer Pattern (Zustand)

**Purpose:** React components subscribe to store changes.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    OBSERVER PATTERN (ZUSTAND STORE)                          │
└─────────────────────────────────────────────────────────────────────────────┘

                           ┌─────────────────┐
                           │   Zustand Store │
                           │                 │
                           │  cases: []      │
                           │  currentCase    │
                           │  isLoading      │
                           │  isDirty        │
                           │                 │
                           └────────┬────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
            ▼                       ▼                       ▼
   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
   │   CaseList      │    │    App.tsx      │    │   StatusBar     │
   │   Component     │    │   Component     │    │   Component     │
   │                 │    │                 │    │                 │
   │ useCaseList()   │    │ useCurrentCase()│    │ useCurrentCase()│
   │ Re-renders when │    │ Re-renders when │    │ Re-renders when │
   │ cases[] changes │    │ currentCase     │    │ isDirty changes │
   │                 │    │ changes         │    │                 │
   └─────────────────┘    └─────────────────┘    └─────────────────┘

Benefits:
• Automatic re-renders on state change
• Selective subscriptions (only relevant state)
• Centralized state management
• DevTools support for debugging
```

### 9.3 Facade Pattern (electronAPI)

**Purpose:** Simplify IPC complexity behind a clean API.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FACADE PATTERN (ELECTRON API)                             │
└─────────────────────────────────────────────────────────────────────────────┘

   Renderer Component
          │
          │ Simple function call
          ▼
   ┌─────────────────────────────────────────────────────────────────────┐
   │                     window.electronAPI                               │
   │                        (Facade)                                      │
   │                                                                      │
   │   getCases(filters) ─────────► Hides:                               │
   │   createCase(data)             • ipcRenderer.invoke                 │
   │   updateCase(id, data)         • Channel names                      │
   │   deleteCase(id)               • Request/response format            │
   │   ...                          • Error handling                     │
   │                                • Type conversions                   │
   └─────────────────────────────────────────────────────────────────────┘
          │
          │ IPC call with channel and data
          ▼
   Main Process IPC Handlers

Benefits:
• Renderer code is simple and type-safe
• IPC details are abstracted away
• Easy to mock for testing
• Single place to change IPC implementation
```

---

## 10. Cross-Cutting Concerns

### 10.1 Error Handling

```typescript
// Standard IPC response format
interface IPCResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Error handling in IPC handlers
function wrapHandler<T, R>(handler: (arg: T) => R) {
  return async (_, arg: T): Promise<IPCResponse<R>> => {
    try {
      const data = handler(arg);
      return { success: true, data };
    } catch (error) {
      console.error('IPC Handler Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };
}
```

### 10.2 Logging

| Level | Usage | Example |
|-------|-------|---------|
| `console.log` | Informational | "Database initialized" |
| `console.warn` | Potential issues | "Backup file not found" |
| `console.error` | Errors | "Failed to save case: ..." |

**Future Enhancement:** Structured logging with Winston/Pino.

### 10.3 Configuration

```typescript
// Database location (platform-specific)
getDatabasePath(): string {
  return join(app.getPath('userData'), 'faers.db');
}

// Backup location
getBackupPath(): string {
  return join(app.getPath('documents'), 'FAERSApp', 'Backups');
}

// User settings (stored in database)
getSetting(key: string): string | null
setSetting(key: string, value: string): void
```

---

## 11. Phase 4 Architecture Extensions

Phase 4 introduces significant architectural additions to support non-expedited reporting, follow-ups, batch submissions, and periodic safety reports.

### 11.1 New Service Layer Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 4: SERVICE LAYER ADDITIONS                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                               │
│   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                │
│   │                 │ │                 │ │                 │                │
│   │ ProductService  │ │  BatchService   │ │   PSRService    │                │
│   │                 │ │                 │ │                 │                │
│   │ • create()      │ │ • create()      │ │ • create()      │                │
│   │ • update()      │ │ • validate()    │ │ • transition()  │                │
│   │ • delete()      │ │ • export()      │ │ • addCases()    │                │
│   │ • getSchedules()│ │ • submit()      │ │ • excludeCases()│                │
│   │ • setSchedule() │ │ • acknowledge() │ │ • getDashboard()│                │
│   │                 │ │                 │ │ • getPeriod()   │                │
│   └─────────────────┘ └─────────────────┘ └─────────────────┘                │
│                                                                               │
│   ┌─────────────────┐ ┌─────────────────┐                                    │
│   │                 │ │                 │                                    │
│   │ FollowupService │ │ReportTypeService│                                    │
│   │                 │ │                 │                                    │
│   │ • create()      │ │ • classify()    │                                    │
│   │ • getChain()    │ │ • suggest()     │                                    │
│   │ • compare()     │ │ • getSeriousness│                                    │
│   │ • nullify()     │ │ • setExpected() │                                    │
│   │                 │ │                 │                                    │
│   └─────────────────┘ └─────────────────┘                                    │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 New Repository Layer Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   PHASE 4: REPOSITORY LAYER ADDITIONS                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                               │
│   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                │
│   │                 │ │                 │ │                 │                │
│   │ProductRepository│ │ BatchRepository │ │  PSRRepository  │                │
│   │                 │ │                 │ │                 │                │
│   │ • findAll()     │ │ • findAll()     │ │ • findAll()     │                │
│   │ • findById()    │ │ • findById()    │ │ • findById()    │                │
│   │ • create()      │ │ • create()      │ │ • create()      │                │
│   │ • update()      │ │ • addCase()     │ │ • addCase()     │                │
│   │ • delete()      │ │ • removeCase()  │ │ • excludeCase() │                │
│   │ • getSchedules()│ │ • getCases()    │ │ • getCases()    │                │
│   │                 │ │                 │ │ • getEligible() │                │
│   └─────────────────┘ └─────────────────┘ └─────────────────┘                │
│                                                                               │
│   ┌───────────────────────────────────┐ ┌─────────────────────────────────┐  │
│   │                                   │ │                                 │  │
│   │  SeriousnessRepository            │ │  PSRScheduleRepository          │  │
│   │                                   │ │                                 │  │
│   │ • findByCaseId()                  │ │ • findByProductId()             │  │
│   │ • setCriteria()                   │ │ • create()                      │  │
│   │ • getCriteria()                   │ │ • update()                      │  │
│   │ • clearCriteria()                 │ │ • delete()                      │  │
│   │                                   │ │ • getNextPeriod()               │  │
│   └───────────────────────────────────┘ └─────────────────────────────────┘  │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 11.3 Extended Database Schema

**New Tables (Migrations 007-012):**

```sql
-- Migration 007: Case classification fields
ALTER TABLE cases ADD COLUMN report_type_classification TEXT;
ALTER TABLE cases ADD COLUMN is_serious INTEGER DEFAULT 0;
ALTER TABLE cases ADD COLUMN expectedness TEXT;
ALTER TABLE cases ADD COLUMN expectedness_justification TEXT;

CREATE TABLE case_seriousness (
    id INTEGER PRIMARY KEY,
    case_id TEXT REFERENCES cases(id),
    criterion TEXT NOT NULL,
    is_checked INTEGER DEFAULT 0,
    notes TEXT,
    UNIQUE(case_id, criterion)
);

-- Migration 008: Follow-up/nullification fields
ALTER TABLE cases ADD COLUMN parent_case_id TEXT REFERENCES cases(id);
ALTER TABLE cases ADD COLUMN case_version INTEGER DEFAULT 1;
ALTER TABLE cases ADD COLUMN followup_type TEXT;
ALTER TABLE cases ADD COLUMN followup_info_date TEXT;
ALTER TABLE cases ADD COLUMN is_nullified INTEGER DEFAULT 0;
ALTER TABLE cases ADD COLUMN nullification_reason TEXT;

-- Migration 009: Products table
CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    product_name TEXT NOT NULL,
    active_ingredient TEXT,
    application_type TEXT,
    application_number TEXT,
    us_approval_date TEXT,
    marketing_status TEXT DEFAULT 'approved',
    company_name TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);

-- Migration 010: PSR schedules
CREATE TABLE psr_schedules (
    id INTEGER PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    psr_format TEXT NOT NULL,
    frequency TEXT NOT NULL,
    dlp_offset_days INTEGER DEFAULT 0,
    due_offset_days INTEGER DEFAULT 30,
    start_date TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);

-- Migration 011: Submission batches
CREATE TABLE submission_batches (
    id INTEGER PRIMARY KEY,
    batch_number TEXT UNIQUE NOT NULL,
    batch_type TEXT NOT NULL,
    case_count INTEGER DEFAULT 0,
    xml_filename TEXT,
    status TEXT DEFAULT 'created',
    created_by TEXT,
    submitted_at DATETIME,
    acknowledged_at DATETIME,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);

CREATE TABLE batch_cases (
    batch_id INTEGER REFERENCES submission_batches(id),
    case_id TEXT REFERENCES cases(id),
    validation_status TEXT,
    PRIMARY KEY (batch_id, case_id)
);

-- Migration 012: PSRs
CREATE TABLE psrs (
    id INTEGER PRIMARY KEY,
    psr_number TEXT UNIQUE NOT NULL,
    product_id INTEGER REFERENCES products(id),
    psr_format TEXT NOT NULL,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    data_lock_point TEXT NOT NULL,
    due_date TEXT NOT NULL,
    status TEXT DEFAULT 'scheduled',
    icsr_batch_id INTEGER REFERENCES submission_batches(id),
    created_by TEXT,
    approved_by TEXT,
    approved_at DATETIME,
    submitted_at DATETIME,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);

CREATE TABLE psr_cases (
    psr_id INTEGER REFERENCES psrs(id),
    case_id TEXT REFERENCES cases(id),
    included INTEGER DEFAULT 1,
    exclusion_reason TEXT,
    added_at DATETIME NOT NULL,
    added_by TEXT,
    PRIMARY KEY (psr_id, case_id)
);
```

### 11.4 Extended Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 4: EXTENDED ER DIAGRAM                              │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────┐                    ┌─────────────┐
  │  products   │                    │    cases    │
  ├─────────────┤                    ├─────────────┤
  │ PK id       │───────────────────►│ FK product_id│
  │    name     │                    │ FK parent_case_id (self-ref)
  │    approval │                    │    case_version│
  │    ...      │                    │    followup_type│
  └──────┬──────┘                    │    is_nullified│
         │                           │    is_serious  │
         │                           │    expectedness│
         │                           └───────┬───────┘
         │                                   │
         ▼                                   │
  ┌─────────────────┐                        │
  │  psr_schedules  │                        │
  ├─────────────────┤                        │
  │ PK id           │                        │
  │ FK product_id   │                        │
  │    psr_format   │                        │
  │    frequency    │                        │
  │    dlp_offset   │                        │
  │    due_offset   │                        │
  └────────┬────────┘                        │
           │                                 │
           ▼                                 │
  ┌─────────────────┐          ┌─────────────┴───────────┐
  │      psrs       │          │    case_seriousness     │
  ├─────────────────┤          ├─────────────────────────┤
  │ PK id           │          │ PK id                   │
  │ FK product_id   │          │ FK case_id              │
  │    psr_number   │          │    criterion            │
  │    period_start │          │    is_checked           │
  │    period_end   │          └─────────────────────────┘
  │    status       │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐          ┌─────────────────────────┐
  │    psr_cases    │          │   submission_batches    │
  ├─────────────────┤          ├─────────────────────────┤
  │ PK psr_id       │◄─────────│ FK icsr_batch_id        │
  │ PK case_id      │          │ PK id                   │
  │    included     │          │    batch_number         │
  │    exclusion_   │          │    batch_type           │
  │      reason     │          │    status               │
  └─────────────────┘          └───────────┬─────────────┘
                                           │
                                           ▼
                               ┌─────────────────────────┐
                               │     batch_cases         │
                               ├─────────────────────────┤
                               │ PK batch_id             │
                               │ PK case_id              │
                               │    validation_status    │
                               └─────────────────────────┘
```

### 11.5 New IPC Channels

**Product Management:**
```typescript
PRODUCT_LIST: 'product:list',
PRODUCT_GET: 'product:get',
PRODUCT_CREATE: 'product:create',
PRODUCT_UPDATE: 'product:update',
PRODUCT_DELETE: 'product:delete',
```

**Report Type Classification:**
```typescript
REPORT_TYPE_SUGGEST: 'reportType:suggest',
SERIOUSNESS_GET: 'seriousness:get',
SERIOUSNESS_SET: 'seriousness:set',
```

**Follow-up/Nullification:**
```typescript
FOLLOWUP_CREATE: 'followup:create',
FOLLOWUP_GET_CHAIN: 'followup:getChain',
NULLIFICATION_CREATE: 'nullification:create',
```

**Batch Submission:**
```typescript
BATCH_CREATE: 'batch:create',
BATCH_LIST: 'batch:list',
BATCH_VALIDATE: 'batch:validate',
BATCH_EXPORT: 'batch:export',
```

**PSR Management:**
```typescript
PSR_SCHEDULE_GET: 'psr:getSchedule',
PSR_SCHEDULE_SET: 'psr:setSchedule',
PSR_CREATE: 'psr:create',
PSR_LIST: 'psr:list',
PSR_UPDATE_CASES: 'psr:updateCases',
PSR_GET_ELIGIBLE_CASES: 'psr:getEligibleCases',
PSR_TRANSITION: 'psr:transition',
PSR_DASHBOARD: 'psr:dashboard',
```

### 11.6 New Zustand Stores

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 4: NEW STATE STORES                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │                         psrStore.ts                                  │    │
│   ├─────────────────────────────────────────────────────────────────────┤    │
│   │                                                                      │    │
│   │   State:                              Actions:                       │    │
│   │   • psrs: PSRListItem[]               • loadPSRs(filter)            │    │
│   │   • currentPSR: PSR | null            • loadPSR(id)                 │    │
│   │   • psrCases: PSRCase[]               • createPSR(data)             │    │
│   │   • eligibleCases: PSRCase[]          • transitionPSR(id, status)   │    │
│   │   • schedules: PSRSchedule[]          • loadSchedules(productId)    │    │
│   │   • dashboard: PSRDashboard           • loadDashboard()             │    │
│   │   • loading: boolean                  • addCases(psrId, caseIds)    │    │
│   │   • error: string | null              • excludeCases(psrId, cases)  │    │
│   │                                                                      │    │
│   │   Selectors:                                                         │    │
│   │   • usePSRList() - PSR list with filtering                          │    │
│   │   • useCurrentPSR() - Current PSR details                           │    │
│   │   • usePSRCases() - Cases in current PSR                            │    │
│   │   • usePSRDashboard() - Dashboard data                              │    │
│   │   • usePSRSchedules() - Schedules for product                       │    │
│   │   • usePSRWizard() - Wizard state                                   │    │
│   │                                                                      │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │                         batchStore.ts                                │    │
│   ├─────────────────────────────────────────────────────────────────────┤    │
│   │                                                                      │    │
│   │   State:                              Actions:                       │    │
│   │   • batches: BatchListItem[]          • loadBatches(filter)         │    │
│   │   • currentBatch: Batch | null        • createBatch(data)           │    │
│   │   • batchCases: BatchCase[]           • validateBatch(id)           │    │
│   │   • validation: ValidationResult      • exportBatch(id)             │    │
│   │                                                                      │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │                        productStore.ts                               │    │
│   ├─────────────────────────────────────────────────────────────────────┤    │
│   │                                                                      │    │
│   │   State:                              Actions:                       │    │
│   │   • products: Product[]               • loadProducts()              │    │
│   │   • currentProduct: Product           • createProduct(data)         │    │
│   │   • schedules: PSRSchedule[]          • updateProduct(id, data)     │    │
│   │                                       • configureSchedule()         │    │
│   │                                                                      │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 11.7 New React Components

```
src/renderer/components/
├── psr/
│   ├── PSRDashboard.tsx        # Dashboard with stats and deadlines
│   ├── PSRList.tsx             # Table of all PSRs with filtering
│   ├── PSRDetail.tsx           # View/manage PSR with case tabs
│   ├── CreatePSRWizard.tsx     # 4-step wizard for PSR creation
│   ├── PSRScheduleConfig.tsx   # Configure PSR schedules
│   └── index.ts                # Component exports
├── batch/
│   ├── BatchList.tsx           # Table of submission batches
│   ├── BatchDetail.tsx         # Batch details and cases
│   ├── BatchSubmissionWizard.tsx
│   ├── BatchCaseSelector.tsx
│   └── BatchValidationResults.tsx
├── products/
│   ├── ProductList.tsx         # Product management table
│   ├── ProductForm.tsx         # Create/edit product
│   └── ProductSelector.tsx     # Product dropdown selector
├── followup/
│   ├── CreateFollowupDialog.tsx
│   ├── CaseVersionTimeline.tsx
│   └── VersionCompareView.tsx
├── nullification/
│   └── NullifyDialog.tsx
└── case-form/
    ├── ReportClassificationSection.tsx  # Expedited/Non-Expedited
    └── SeriousnessCheckboxGroup.tsx     # Seriousness criteria
```

### 11.8 PSR Status Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PSR STATUS WORKFLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌───────────┐     ┌───────────┐     ┌───────────────┐     ┌──────────┐
    │ Scheduled │────►│   Draft   │────►│ Under Review  │────►│ Approved │
    └───────────┘     └───────────┘     └───────┬───────┘     └────┬─────┘
                                                │                   │
                                                │ (reject)          │
                                                ▼                   ▼
                                        ┌───────────────┐   ┌───────────┐
                                        │    Draft      │   │ Submitted │
                                        │  (returned)   │   └─────┬─────┘
                                        └───────────────┘         │
                                                                  ▼
                                                          ┌──────────────┐
                                                          │ Acknowledged │
                                                          └──────┬───────┘
                                                                 │
                                                                 ▼
                                                          ┌───────────┐
                                                          │  Closed   │
                                                          └───────────┘

Valid Transitions:
• scheduled → draft
• draft → under_review
• under_review → draft (reject) | approved
• approved → under_review (revert) | submitted
• submitted → acknowledged
• acknowledged → closed
```

### 11.9 Batch XML Generation

The XMLGeneratorService was extended to support batch generation:

```typescript
// Extended XML structure for batches
<MCCI_IN200100UV01>
  <id root="batch-uuid"/>
  <creationTime value="timestamp"/>
  <interactionId extension="MCCI_IN200100UV01"/>
  <processingCode code="P"/>
  <processingModeCode code="T"/>
  <acceptAckCode code="AL"/>
  <receiver>...</receiver>
  <sender>...</sender>

  <!-- Multiple subjects, one per case -->
  <subject typeCode="SUBJ">
    <investigationEvent>
      <!-- Case 1 ICSR data -->
    </investigationEvent>
  </subject>
  <subject typeCode="SUBJ">
    <investigationEvent>
      <!-- Case 2 ICSR data -->
    </investigationEvent>
  </subject>
  <!-- ... more cases ... -->
</MCCI_IN200100UV01>
```

---

## 12. Phase 2B Architecture Extensions: ESG NextGen API

Phase 2B adds automated FDA ESG NextGen API submission, replacing the manual USP upload workflow with direct REST API integration.

### 12.1 New Service Layer Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 2B: ESG API SERVICE LAYER                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                               │
│   ┌───────────────────────┐ ┌───────────────────────┐                        │
│   │                       │ │                       │                        │
│   │CredentialStorageService│ │    EsgAuthService    │                        │
│   │                       │ │                       │                        │
│   │ • saveCredentials()   │ │ • getAccessToken()    │                        │
│   │ • getCredentials()    │ │ • refreshToken()      │                        │
│   │ • hasCredentials()    │ │ • isTokenValid()      │                        │
│   │ • clearCredentials()  │ │ • testConnection()    │                        │
│   │                       │ │ • clearTokenCache()   │                        │
│   │ Uses Electron         │ │                       │                        │
│   │ safeStorage API       │ │ OAuth 2.0 Client      │                        │
│   │ + AES-256 fallback    │ │ Credentials flow      │                        │
│   │                       │ │                       │                        │
│   └───────────────────────┘ └───────────────────────┘                        │
│                                                                               │
│   ┌───────────────────────┐ ┌───────────────────────┐                        │
│   │                       │ │                       │                        │
│   │    EsgApiService      │ │ EsgSubmissionService  │                        │
│   │                       │ │                       │                        │
│   │ • createSubmission()  │ │ • submitCase()        │                        │
│   │ • uploadXml()         │ │ • retryFailed()       │                        │
│   │ • finalize()          │ │ • cancelSubmission()  │                        │
│   │ • getStatus()         │ │ • getProgress()       │                        │
│   │ • checkAck()          │ │ • getPreSummary()     │                        │
│   │                       │ │                       │                        │
│   │ HTTPS client with     │ │ Orchestrates:         │                        │
│   │ 30s timeout per req   │ │ validate → XML →      │                        │
│   │ Error categorization  │ │ auth → submit →       │                        │
│   │                       │ │ finalize              │                        │
│   └───────────────────────┘ └───────────────────────┘                        │
│                                                                               │
│   ┌───────────────────────┐ ┌───────────────────────┐                        │
│   │                       │ │                       │                        │
│   │  EsgPollingService    │ │StatusTransitionService│                        │
│   │                       │ │     (extended)        │                        │
│   │ • startPolling()      │ │                       │                        │
│   │ • stopPolling()       │ │ • markSubmitting()    │                        │
│   │ • isPolling()         │ │ • markSubmitFailed()  │                        │
│   │ • getStatus()         │ │ • markSubmitted()     │                        │
│   │ • checkAckForCase()   │ │ • markAcknowledged()  │                        │
│   │                       │ │                       │                        │
│   │ Recursive setTimeout  │ │ New statuses:         │                        │
│   │ Configurable interval │ │ - Submitting          │                        │
│   │ (default 5 min)       │ │ - Submission Failed   │                        │
│   │                       │ │                       │                        │
│   └───────────────────────┘ └───────────────────────┘                        │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 12.2 Credential Storage Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SECURE CREDENTIAL STORAGE                                  │
└─────────────────────────────────────────────────────────────────────────────┘

  CredentialStorageService
          │
          ▼
  ┌───────────────────┐
  │ safeStorage       │ Primary: Electron's safeStorage API
  │ available?        │ Uses OS keychain (macOS Keychain, Windows DPAPI)
  └─────────┬─────────┘
            │
    ┌───────┴───────┐
    │ Yes           │ No
    ▼               ▼
┌───────────┐   ┌───────────────┐
│ encrypt   │   │ AES-256-GCM   │ Fallback: AES-256 encryption
│ String()  │   │ with machine- │ with machine-derived key
│           │   │ derived key   │
└───────────┘   └───────────────┘
    │               │
    ▼               ▼
  Store encrypted data to:
  {userData}/esg-credentials.enc

Security measures:
• Credentials never stored in plain text
• Secret key buffer zeroed after use
• File permissions restricted to user only
```

### 12.3 API Submission Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ESG API SUBMISSION DATA FLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

   User           Renderer            Main Process              FDA ESG API
    │                │                      │                        │
    │ Click          │                      │                        │
    │ "Submit to FDA"│                      │                        │
    │───────────────►│                      │                        │
    │                │                      │                        │
    │                │ esgSubmitCase(id)    │                        │
    │                │─────────────────────►│                        │
    │                │                      │                        │
    │                │◄─ progress event ────│ Step: Authenticating  │
    │                │                      │                        │
    │                │                      │ EsgAuthService         │
    │                │                      │ .getAccessToken()      │
    │                │                      │─────────────────────────►
    │                │                      │◄── OAuth token ─────────│
    │                │                      │                        │
    │                │◄─ progress event ────│ Step: Creating         │
    │                │                      │       Submission       │
    │                │                      │                        │
    │                │                      │ POST /submissions      │
    │                │                      │─────────────────────────►
    │                │                      │◄── submission_id ───────│
    │                │                      │                        │
    │                │◄─ progress event ────│ Step: Uploading XML   │
    │                │                      │                        │
    │                │                      │ PUT /submissions/{id}  │
    │                │                      │     /content           │
    │                │                      │─────────────────────────►
    │                │                      │◄── 200 OK ──────────────│
    │                │                      │                        │
    │                │◄─ progress event ────│ Step: Finalizing      │
    │                │                      │                        │
    │                │                      │ POST /submissions/{id} │
    │                │                      │       /finalize        │
    │                │                      │─────────────────────────►
    │                │                      │◄── esg_core_id ─────────│
    │                │                      │                        │
    │                │◄─ progress event ────│ Step: Complete        │
    │                │   (ESG Core ID)      │                        │
    │                │                      │                        │
    │ Show success   │                      │                        │
    │◄───────────────│                      │                        │
    │                │                      │                        │
```

### 12.4 Acknowledgment Polling Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ACKNOWLEDGMENT POLLING FLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

  App Start
      │
      ▼
  EsgPollingService.startPolling()
      │
      ▼
  ┌─────────────────────────────────┐
  │                                 │
  │  Get cases awaiting ACK         │◄───────────────────────┐
  │  (status = 'Submitted')         │                        │
  │                                 │                        │
  └──────────────┬──────────────────┘                        │
                 │                                           │
                 ▼                                           │
  ┌─────────────────────────────────┐                        │
  │                                 │                        │
  │  For each case:                 │                        │
  │  GET /submissions/{id}/ack      │──► FDA ESG API         │
  │                                 │                        │
  └──────────────┬──────────────────┘                        │
                 │                                           │
         ┌───────┴───────┐                                   │
         │               │                                   │
    ACK received    No ACK yet                               │
         │               │                                   │
         ▼               ▼                                   │
  ┌─────────────┐  ┌─────────────┐                          │
  │ Update case │  │ Check if    │                          │
  │ status to   │  │ timeout     │                          │
  │ Acknowledged│  │ exceeded    │                          │
  │             │  │             │                          │
  │ Store ACK   │  │ If yes:     │                          │
  │ details:    │  │ mark for    │                          │
  │ - ACK type  │  │ attention   │                          │
  │ - FDA Core  │  │             │                          │
  │   ID        │  └──────┬──────┘                          │
  │ - Timestamp │         │                                  │
  └─────────────┘         │                                  │
                          │                                  │
                          ▼                                  │
               setTimeout(poll, interval)────────────────────┘
               (recursive, prevents overlap)

ACK Types:
• ACK1 - Received by gateway
• ACK2 - Syntactically valid
• ACK3 - Semantically valid (accepted by FDA)
• NACK - Rejected (errors in ack_errors JSON)
```

### 12.5 Retry Logic with Exponential Backoff

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RETRY LOGIC WITH EXPONENTIAL BACKOFF                      │
└─────────────────────────────────────────────────────────────────────────────┘

  Submission Attempt
        │
        ▼
  ┌─────────────────────────────────┐
  │ Error occurred?                 │
  └──────────────┬──────────────────┘
                 │
         ┌───────┴───────┐
         │ Yes           │ No
         ▼               ▼
  ┌─────────────┐   ┌─────────────┐
  │ Categorize  │   │ Success     │
  │ error       │   │ (complete)  │
  └──────┬──────┘   └─────────────┘
         │
         ▼
  ┌─────────────────────────────────┐
  │ Is error retryable?             │
  │                                 │
  │ Retryable:                      │
  │ • network (connection errors)   │
  │ • rate_limit (429)              │
  │ • server_error (5xx)            │
  │                                 │
  │ Non-retryable:                  │
  │ • authentication (401)          │
  │ • validation (400)              │
  │ • unknown                       │
  └──────────────┬──────────────────┘
                 │
         ┌───────┴───────┐
         │ Yes           │ No
         ▼               ▼
  ┌─────────────┐   ┌─────────────┐
  │ Retry?      │   │ Mark as     │
  │ (< max)     │   │ Failed      │
  └──────┬──────┘   └─────────────┘
         │
         ▼
  Calculate delay with jitter:
  delay = min(30s, 1s * 2^attempt) + random(0-500ms)

  Example progression:
  Attempt 1: 1.0s - 1.5s
  Attempt 2: 2.0s - 2.5s
  Attempt 3: 4.0s - 4.5s
  Attempt 4: 8.0s - 8.5s
  ...
  Max: 30.0s - 30.5s
```

### 12.6 New Database Schema (Migration 020)

```sql
-- API submission attempts tracking
CREATE TABLE IF NOT EXISTS api_submission_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    esg_submission_id TEXT,
    esg_core_id TEXT,
    environment TEXT NOT NULL,           -- 'Test' or 'Production'
    status TEXT NOT NULL DEFAULT 'in_progress',
    started_at DATETIME NOT NULL,
    completed_at DATETIME,
    error TEXT,
    error_category TEXT,                 -- network, auth, rate_limit, etc.
    http_status_code INTEGER,
    ack_type TEXT,                       -- ACK1, ACK2, ACK3, NACK
    ack_timestamp DATETIME,
    ack_fda_core_id TEXT,
    ack_errors TEXT,                     -- JSON array of errors
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);

-- Indexes for efficient queries
CREATE INDEX idx_api_attempts_case_id ON api_submission_attempts(case_id);
CREATE INDEX idx_api_attempts_status ON api_submission_attempts(status);
CREATE INDEX idx_api_attempts_esg_submission_id ON api_submission_attempts(esg_submission_id);

-- Case table extensions
ALTER TABLE cases ADD COLUMN esg_submission_id TEXT;
ALTER TABLE cases ADD COLUMN esg_core_id TEXT;
ALTER TABLE cases ADD COLUMN api_submission_started_at DATETIME;
ALTER TABLE cases ADD COLUMN api_last_error TEXT;
ALTER TABLE cases ADD COLUMN api_attempt_count INTEGER DEFAULT 0;
```

### 12.7 New IPC Channels

```typescript
// Credential management
ESG_SAVE_CREDENTIALS:     'esg:saveCredentials',
ESG_HAS_CREDENTIALS:      'esg:hasCredentials',
ESG_CLEAR_CREDENTIALS:    'esg:clearCredentials',

// Settings management
ESG_GET_SETTINGS:         'esg:getSettings',
ESG_SAVE_SETTINGS:        'esg:saveSettings',
ESG_TEST_CONNECTION:      'esg:testConnection',

// Submission operations
ESG_SUBMIT_CASE:          'esg:submitCase',
ESG_RETRY_SUBMISSION:     'esg:retrySubmission',
ESG_CANCEL_SUBMISSION:    'esg:cancelSubmission',
ESG_GET_PROGRESS:         'esg:getProgress',
ESG_GET_PRE_SUMMARY:      'esg:getPreSubmissionSummary',
ESG_GET_ATTEMPTS:         'esg:getAttempts',

// Acknowledgment polling
ESG_CHECK_ACK:            'esg:checkAcknowledgment',
ESG_POLLING_START:        'esg:pollingStart',
ESG_POLLING_STOP:         'esg:pollingStop',
ESG_POLLING_STATUS:       'esg:pollingStatus',

// Event channel (main → renderer push via webContents.send)
ESG_SUBMISSION_PROGRESS:  'esg:submission-progress',
```

### 12.8 New React Components

```
src/renderer/components/submission/
├── EsgApiSettingsTab.tsx       # API credentials & configuration
├── SubmitToFdaDialog.tsx       # Pre-submission confirmation dialog
├── SubmissionProgressDialog.tsx # Real-time progress with Steps
├── AcknowledgmentDisplay.tsx   # ACK/NACK display with details
└── PollingStatusIndicator.tsx  # Status badge for dashboard
```

### 12.9 Extended Workflow Status

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EXTENDED CASE WORKFLOW WITH API SUBMISSION                 │
└─────────────────────────────────────────────────────────────────────────────┘

                                    (existing workflow)
Draft → Data Entry Complete → In Medical Review → Medical Review Complete
      → In QC Review → QC Complete → Approved
                                        │
                                        │ (Phase 2B additions)
                                        ▼
                               ┌─────────────────┐
                               │   Submitting    │◄──── Submit via API
                               └────────┬────────┘
                                        │
                        ┌───────────────┴───────────────┐
                        │                               │
                        ▼                               ▼
               ┌─────────────────┐             ┌─────────────────┐
               │    Submitted    │             │Submission Failed│
               └────────┬────────┘             └────────┬────────┘
                        │                               │
                        │ (ACK received)                │ (Retry or)
                        ▼                               │ (Return to Draft)
               ┌─────────────────┐                      │
               │  Acknowledged   │◄─────────────────────┘
               └─────────────────┘

New Status Transitions:
• 'Ready for Export' → 'Submitting' (API submission started)
• 'Exported' → 'Submitting' (API submission started)
• 'Submitting' → 'Submitted' (API success)
• 'Submitting' → 'Submission Failed' (API error)
• 'Submission Failed' → 'Submitting' (Retry)
• 'Submission Failed' → 'Draft' (Return for correction)
```

### 12.10 Security Considerations

| Threat | Mitigation |
|--------|------------|
| **Credential Theft** | Electron safeStorage (OS keychain) + AES-256 fallback |
| **Token Exposure** | Tokens cached in memory only, never persisted |
| **MitM Attack** | HTTPS only, TLS 1.2+ required |
| **Secret Leakage** | Secret buffer zeroed after use |
| **Log Exposure** | Secrets redacted in all log output |

---

## 13. Future Architecture Considerations

### 13.1 Phase 5: Data Management & MedDRA Integration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 5: DATA MANAGEMENT (Future)                         │
└─────────────────────────────────────────────────────────────────────────────┘

   Current Architecture                 Phase 5 Additions
   ┌──────────────────┐                ┌──────────────────┐
   │                  │                │                  │
   │   Main Process   │───────────────►│  MedDRA Service  │
   │                  │                │                  │
   │   • Current      │                │  • Term lookup   │
   │     Services     │                │  • Auto-complete │
   │                  │                │  • Code mapping  │
   └──────────────────┘                └──────────────────┘
                                                │
                                                ▼
                                       ┌──────────────────┐
                                       │                  │
                                       │   MedDRA DB      │
                                       │   (Local/Remote) │
                                       │                  │
                                       └──────────────────┘

Additional Phase 5 features:
• Import/Export case data (CSV, Excel)
• Data archival and retention policies
• Advanced reporting and analytics
• Regulatory terminology management (WHO Drug Dictionary)
```

### 13.2 Extension Points

The architecture is designed with these extension points:

| Extension Point | Purpose | Location |
|----------------|---------|----------|
| **Services Layer** | Business logic services | `src/main/services/` |
| **Validation Rules** | E2B validation | `src/shared/constants/` |
| **IPC Channels** | New operations | `src/shared/types/ipc.types.ts` |
| **Form Sections** | Additional data | `src/renderer/components/case-form/` |
| **Lookup Tables** | Terminology | `lookup_*` tables |
| **Stores** | State management | `src/renderer/stores/` |
| **Repositories** | Data access | `src/main/database/repositories/` |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | Claude Code | Initial architecture document |
| 1.1 | January 2026 | Claude Code | Updated with implemented services (ValidationService, XMLGeneratorService, Form3500ImportService), PDF import flow, navigation indicators |
| 2.0 | January 2026 | Claude Code | Phase 4: Added architecture for products, report classification, follow-ups, nullification, batch submission, PSR management; new services, repositories, stores, and component diagrams |
| 3.0 | January 2026 | Claude Code | Phase 2B: ESG NextGen API integration - credential storage (safeStorage + AES-256), OAuth 2.0 authentication, API submission service with retry logic, acknowledgment polling, real-time progress events, new workflow statuses (Submitting, Submission Failed) |

---

## References

- [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)
- [C4 Model](https://c4model.com/)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [ICH E2B(R3) Implementation Guide](https://www.ich.org/page/electronic-submission-individual-case-safety-reports-icsrs)

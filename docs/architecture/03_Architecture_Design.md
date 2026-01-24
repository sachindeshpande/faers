# FAERS Submission Application - Architecture & Design Document

**Version:** 1.0
**Phase:** 1 (Core ICSR Submission MVP)
**Last Updated:** January 2026
**Status:** Approved for Implementation

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
11. [Future Architecture Considerations](#11-future-architecture-considerations)

---

## 1. Document Purpose

This document describes the software architecture and design of the FAERS Submission Application. It is intended for:

- **Developers** implementing or maintaining the application
- **Architects** evaluating design decisions
- **QA Engineers** understanding system boundaries for testing
- **Technical Leads** onboarding new team members

### 1.1 Scope

This document covers the Phase 1 (MVP) architecture, which includes:
- Single-user desktop application
- Local SQLite database
- E2B(R3) XML generation
- Offline-first operation

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
│  │  │            case:delete, reaction:*, drug:*, reporter:*,          │  │  │
│  │  │            xml:generate, db:backup, settings:*                   │  │  │
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
│  │                      Service Layer (Future)                            │  │
│  │  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐    │  │
│  │  │                   │ │                   │ │                   │    │  │
│  │  │ValidationService  │ │  E2B Generator    │ │  Export Service   │    │  │
│  │  │    (M3)           │ │     (M4)          │ │     (M4)          │    │  │
│  │  │                   │ │                   │ │                   │    │  │
│  │  │ • validateCase()  │ │ • generateICSR()  │ │ • exportToFile()  │    │  │
│  │  │ • validateField() │ │ • validateXML()   │ │ • saveXML()       │    │  │
│  │  │ • checkE2B()      │ │ • formatDate()    │ │                   │    │  │
│  │  │                   │ │                   │ │                   │    │  │
│  │  └───────────────────┘ └───────────────────┘ └───────────────────┘    │  │
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
│  │  │  • deleteCase()          Utilities:                               │ │  │
│  │  │  • duplicateCase()       • showSaveDialog()                       │ │  │
│  │  │                          • showOpenDialog()                       │ │  │
│  │  │  Reaction Operations:    • backupDatabase()                       │ │  │
│  │  │  • getReactions()        • getCountries()                         │ │  │
│  │  │  • saveReaction()        • getSetting()                           │ │  │
│  │  │  • deleteReaction()      • setSetting()                           │ │  │
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

#### 6.1.3 IPC Handlers (`case.handlers.ts`)

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
- Render toolbar with action buttons
- Handle navigation between sections
- Display status bar information

#### 6.2.2 Case List (`CaseList.tsx`)

**Responsibilities:**
- Display paginated table of cases
- Provide search and filter controls
- Handle row selection and actions
- Context menu for case operations

#### 6.2.3 Case Store (`caseStore.ts`)

**Responsibilities:**
- Manage application state with Zustand
- Provide actions for case operations
- Track loading states and errors
- Expose selectors for component access

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

### 7.3 XML Export Flow (Future - M4)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          XML EXPORT DATA FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

   User              Renderer              Main Process           File System
    │                    │                      │                      │
    │ Click "Export"     │                      │                      │
    │───────────────────►│                      │                      │
    │                    │                      │                      │
    │                    │ validateCase(id)     │                      │
    │                    │─────────────────────►│                      │
    │                    │                      │                      │
    │                    │ ValidationResult     │                      │
    │                    │◄─────────────────────│                      │
    │                    │                      │                      │
    │                    │ If errors, show UI   │                      │
    │◄───────────────────│                      │                      │
    │                    │                      │                      │
    │                    │ showSaveDialog()     │                      │
    │                    │─────────────────────►│                      │
    │                    │                      │                      │
    │ Select path        │                      │                      │
    │───────────────────►│                      │                      │
    │                    │                      │                      │
    │                    │ exportXML(id, path)  │                      │
    │                    │─────────────────────►│                      │
    │                    │                      │                      │
    │                    │                      │ E2BGenerator         │
    │                    │                      │ .generateICSR()      │
    │                    │                      │         │            │
    │                    │                      │         │ Build XML  │
    │                    │                      │◄────────┘            │
    │                    │                      │                      │
    │                    │                      │ writeFileSync(xml)   │
    │                    │                      │─────────────────────►│
    │                    │                      │                      │
    │                    │                      │ Update case status   │
    │                    │                      │ = 'Exported'         │
    │                    │                      │                      │
    │                    │ Success              │                      │
    │                    │◄─────────────────────│                      │
    │                    │                      │                      │
    │ Show confirmation  │                      │                      │
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

## 11. Future Architecture Considerations

### 11.1 Phase 2: ESG Integration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 2: ESG INTEGRATION (Future)                         │
└─────────────────────────────────────────────────────────────────────────────┘

   Current Architecture                 Phase 2 Addition
   ┌──────────────────┐                ┌──────────────────┐
   │                  │                │                  │
   │   Main Process   │───────────────►│  ESG Service     │
   │                  │                │                  │
   │   • Repositories │                │  • Authentication│
   │   • E2B Generator│                │  • Submission    │
   │   • File Export  │                │  • ACK Processing│
   │                  │                │                  │
   └──────────────────┘                └────────┬─────────┘
                                                │
                                                │ HTTPS
                                                ▼
                                       ┌──────────────────┐
                                       │                  │
                                       │   FDA ESG        │
                                       │   Gateway        │
                                       │                  │
                                       └──────────────────┘
```

### 11.2 Phase 3: Multi-User Support

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 3: MULTI-USER (Future)                              │
└─────────────────────────────────────────────────────────────────────────────┘

   Current: SQLite                      Future: PostgreSQL + Auth
   ┌──────────────────┐                ┌──────────────────┐
   │                  │                │                  │
   │   Single-file DB │───────────────►│  PostgreSQL      │
   │   (Local)        │                │  (Server)        │
   │                  │                │                  │
   │   No auth        │                │  + Auth Service  │
   │                  │                │  + RBAC          │
   │                  │                │  + Audit Trail   │
   │                  │                │                  │
   └──────────────────┘                └──────────────────┘
```

### 11.3 Extension Points

The architecture is designed with these extension points:

| Extension Point | Purpose | Location |
|----------------|---------|----------|
| **Services Layer** | Business logic services | `src/main/services/` |
| **Validation Rules** | E2B validation | `src/shared/constants/` |
| **IPC Channels** | New operations | `src/shared/types/ipc.types.ts` |
| **Form Sections** | Additional data | `src/renderer/components/case-form/` |
| **Lookup Tables** | Terminology | `lookup_*` tables |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | Claude Code | Initial architecture document |

---

## References

- [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)
- [C4 Model](https://c4model.com/)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [ICH E2B(R3) Implementation Guide](https://www.ich.org/page/electronic-submission-individual-case-safety-reports-icsrs)

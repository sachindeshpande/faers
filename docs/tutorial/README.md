# TypeScript for OOP Developers

A practical guide to TypeScript for developers coming from C#, Java, or Python OOP backgrounds.

## Table of Contents

1. [TypeScript Basics](./01-basics.md) - Syntax, types, and fundamentals
2. [Classes and Interfaces](./02-classes-interfaces.md) - OOP patterns in TypeScript
3. [Project Patterns](./03-project-patterns.md) - Architecture patterns used in this codebase
4. [Common Tasks](./04-common-tasks.md) - Step-by-step guides for typical development work
5. [Quick Reference](./05-quick-reference.md) - Cheat sheet for common syntax
6. [Advanced Features](./06-advanced-features.md) - Walkthrough of validation, XML export, PDF import, and React patterns

## Why TypeScript?

TypeScript is JavaScript with static types. If you're familiar with C# or Java, you'll find many concepts directly transferable:

| Your Background | TypeScript Similarity |
|-----------------|----------------------|
| C# | Very high - same designer (Anders Hejlsberg) |
| Java | High - similar class/interface model |
| Python (typed) | Medium - structural typing, type hints |

## Project Structure Overview

```
faers-app/
├── src/
│   ├── main/                 # Electron main process (backend)
│   │   ├── database/         # SQLite repositories
│   │   ├── services/         # Business logic
│   │   ├── pdf/              # PDF parsing
│   │   └── ipc/              # IPC handlers (API endpoints)
│   │
│   ├── renderer/             # React frontend
│   │   ├── components/       # UI components
│   │   └── stores/           # State management
│   │
│   ├── shared/               # Shared types (used by both)
│   │   └── types/            # Type definitions
│   │
│   └── preload/              # Electron preload (IPC bridge)
```

## Quick Start

### 1. Understanding a Repository Class

```typescript
// src/main/database/repositories/drug.repository.ts
export class DrugRepository {
  private db: DatabaseInstance;  // Private field

  constructor(db: DatabaseInstance) {  // Constructor injection
    this.db = db;
  }

  findById(id: number): CaseDrug | null {  // Return type annotation
    // Implementation
  }
}
```

**C# equivalent:**
```csharp
public class DrugRepository {
    private readonly DatabaseInstance _db;

    public DrugRepository(DatabaseInstance db) {
        _db = db;
    }

    public CaseDrug? FindById(int id) { }
}
```

### 2. Understanding an Interface

```typescript
// src/shared/types/case.types.ts
export interface CaseDrug {
  id?: number;           // Optional property
  productName: string;   // Required property
  dosages?: CaseDrugDosage[];  // Optional array
}
```

**C# equivalent:**
```csharp
public class CaseDrug {
    public int? Id { get; set; }
    public string ProductName { get; set; }
    public List<CaseDrugDosage>? Dosages { get; set; }
}
```

### 3. Running the Project

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Type check (like compiling)
npm run typecheck

# Build for production
npm run build
```

## Key Concepts to Learn First

1. **Type annotations** - How to declare types
2. **Interfaces vs Types** - When to use which
3. **Null handling** - `null`, `undefined`, and optional chaining
4. **Async/await** - Identical to C#
5. **Import/export** - Module system (like `using`/namespaces)

## Getting Help

- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/
- This project's type definitions: `src/shared/types/`
- Run `npm run typecheck` to find type errors

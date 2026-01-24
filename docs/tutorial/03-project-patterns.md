# Project Patterns

This guide explains the architectural patterns used in the FAERS application.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Electron App                              │
│                                                                  │
│  ┌─────────────────────────┐      ┌───────────────────────────┐ │
│  │    Main Process         │      │    Renderer Process       │ │
│  │    (Node.js/TS)         │      │    (React/TS)             │ │
│  │                         │      │                           │ │
│  │  ┌─────────────────┐    │ IPC  │  ┌─────────────────────┐  │ │
│  │  │  IPC Handlers   │◄───┼──────┼──►│  Store (Zustand)    │  │ │
│  │  └────────┬────────┘    │      │  └──────────┬──────────┘  │ │
│  │           │             │      │             │             │ │
│  │  ┌────────▼────────┐    │      │  ┌──────────▼──────────┐  │ │
│  │  │   Services      │    │      │  │  React Components   │  │ │
│  │  └────────┬────────┘    │      │  └─────────────────────┘  │ │
│  │           │             │      │                           │ │
│  │  ┌────────▼────────┐    │      │                           │ │
│  │  │  Repositories   │    │      │                           │ │
│  │  └────────┬────────┘    │      │                           │ │
│  │           │             │      │                           │ │
│  │  ┌────────▼────────┐    │      │                           │ │
│  │  │    SQLite DB    │    │      │                           │ │
│  │  └─────────────────┘    │      │                           │ │
│  └─────────────────────────┘      └───────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Layer-by-Layer Breakdown

### 1. Shared Types (`src/shared/types/`)

Types shared between main and renderer processes. This is the "contract" between frontend and backend.

```typescript
// src/shared/types/case.types.ts
export interface CaseDrug {
  id?: number;
  caseId?: string;
  characterization: DrugCharacterization;
  productName: string;
  indication?: string;
  startDate?: string;
  endDate?: string;
  dosages?: CaseDrugDosage[];
}

export enum DrugCharacterization {
  Suspect = 1,
  Concomitant = 2,
  Interacting = 3
}
```

**Pattern**: Data Transfer Objects (DTOs) and Enums defined once, used everywhere.

### 2. Repository Layer (`src/main/database/repositories/`)

Handles all database operations. One repository per entity.

```typescript
// Pattern: Repository Pattern
export class DrugRepository {
  private db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  // CRUD operations
  findByCaseId(caseId: string): CaseDrug[] { }
  findById(id: number): CaseDrug | null { }
  create(drug: Omit<CaseDrug, 'id'>): CaseDrug { }
  update(id: number, drug: Partial<CaseDrug>): CaseDrug | null { }
  delete(id: number): boolean { }

  // Private helper methods
  private mapRowToDrug(row: Record<string, unknown>): CaseDrug { }
  private getSubstances(drugId: number): CaseDrugSubstance[] { }
}
```

**Key Patterns**:
- **Constructor Injection**: Database passed in constructor
- **Single Responsibility**: Each repository handles one entity
- **Type Safety**: Return types clearly defined
- **Null Safety**: Methods return `null` when not found

### 3. Service Layer (`src/main/services/`)

Business logic that orchestrates repositories and other services.

```typescript
// Pattern: Service Layer
export class Form3500ImportService {
  private caseRepo: CaseRepository;
  private drugRepo: DrugRepository;
  private reactionRepo: ReactionRepository;
  private reporterRepo: ReporterRepository;
  private parser: Form3500AParser;
  private mapper: Form3500AMapper;

  constructor(db: DatabaseInstance) {
    // Instantiate dependencies
    this.caseRepo = new CaseRepository(db);
    this.drugRepo = new DrugRepository(db);
    this.reactionRepo = new ReactionRepository(db);
    this.reporterRepo = new ReporterRepository(db);
    this.parser = new Form3500AParser();
    this.mapper = new Form3500AMapper();
  }

  async import(filePath: string): Promise<Form3500AImportResult> {
    // 1. Parse PDF
    const formData = await this.parser.parse(filePath);

    // 2. Map to entities
    const mapped = this.mapper.map(formData);

    // 3. Save to database
    const newCase = this.caseRepo.create({});
    this.caseRepo.update(newCase.id, mapped.caseData);

    for (const drug of mapped.drugs) {
      this.drugRepo.create({ ...drug, caseId: newCase.id });
    }

    // 4. Return result
    return {
      success: true,
      caseId: newCase.id,
      warnings: mapped.warnings,
      errors: []
    };
  }
}
```

**Key Patterns**:
- **Facade Pattern**: Service hides complexity of multiple repositories
- **Orchestration**: Coordinates multiple operations
- **Transaction-like**: Operations grouped logically

### 4. IPC Handlers (`src/main/ipc/`)

API layer that exposes services to the renderer process.

```typescript
// Pattern: Request Handler / Controller
export function registerIpcHandlers(): void {
  const db = getDatabase();
  const caseRepo = new CaseRepository(db);
  const drugRepo = new DrugRepository(db);

  // GET /cases
  ipcMain.handle(
    IPC_CHANNELS.CASE_LIST,
    wrapHandler((filters?: CaseFilterOptions) => caseRepo.findAll(filters || {}))
  );

  // GET /cases/:id
  ipcMain.handle(
    IPC_CHANNELS.CASE_GET,
    wrapHandler(({ id, includeRelated }: { id: string; includeRelated?: boolean }) => {
      const caseData = caseRepo.findById(id);
      if (!caseData) {
        throw new Error(`Case not found: ${id}`);
      }
      if (includeRelated) {
        caseData.drugs = drugRepo.findByCaseId(id);
      }
      return caseData;
    })
  );

  // POST /cases
  ipcMain.handle(
    IPC_CHANNELS.CASE_CREATE,
    wrapHandler((data?: CreateCaseDTO) => caseRepo.create(data))
  );

  // PUT /cases/:id
  ipcMain.handle(
    IPC_CHANNELS.CASE_UPDATE,
    wrapHandler(({ id, data }: { id: string; data: UpdateCaseDTO }) => {
      const result = caseRepo.update(id, data);
      if (!result) {
        throw new Error(`Case not found: ${id}`);
      }
      return result;
    })
  );

  // DELETE /cases/:id
  ipcMain.handle(
    IPC_CHANNELS.CASE_DELETE,
    wrapHandler((id: string) => {
      caseRepo.delete(id);
      return undefined;
    })
  );
}

// Error handling wrapper
function wrapHandler<T, R>(
  handler: (arg: T) => R
): (event: Electron.IpcMainInvokeEvent, arg: T) => Promise<IPCResponse<R>> {
  return async (_, arg) => {
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

**Key Patterns**:
- **Controller Pattern**: Routes requests to appropriate handlers
- **Wrapper/Decorator**: `wrapHandler` adds error handling
- **Consistent Response**: All handlers return `IPCResponse<T>`

### 5. Preload Bridge (`src/preload/`)

Exposes safe IPC methods to renderer.

```typescript
// Pattern: Adapter / Bridge
const electronAPI: ElectronAPI = {
  // Case operations
  getCases: (filters?: CaseFilterOptions): Promise<IPCResponse<CaseListResponse>> =>
    ipcRenderer.invoke(IPC_CHANNELS.CASE_LIST, filters),

  getCase: (id: string, includeRelated?: boolean): Promise<IPCResponse<Case>> =>
    ipcRenderer.invoke(IPC_CHANNELS.CASE_GET, { id, includeRelated }),

  createCase: (data?: CreateCaseDTO): Promise<IPCResponse<Case>> =>
    ipcRenderer.invoke(IPC_CHANNELS.CASE_CREATE, data),

  updateCase: (id: string, data: UpdateCaseDTO): Promise<IPCResponse<Case>> =>
    ipcRenderer.invoke(IPC_CHANNELS.CASE_UPDATE, { id, data }),

  deleteCase: (id: string): Promise<IPCResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.CASE_DELETE, id),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
```

**Key Pattern**: Type-safe API exposed to renderer via `window.electronAPI`.

### 6. State Management (`src/renderer/stores/`)

Zustand store for frontend state (alternative to Redux).

```typescript
// Pattern: State Store
interface CaseState {
  cases: CaseListItem[];
  totalCases: number;
  isLoading: boolean;
  filters: CaseFilterOptions;
  error: string | null;
}

interface CaseActions {
  fetchCases: (filters?: CaseFilterOptions) => Promise<void>;
  createCase: (data?: CreateCaseDTO) => Promise<Case | null>;
  deleteCase: (id: string) => Promise<boolean>;
}

export const useCaseStore = create<CaseState & CaseActions>((set, get) => ({
  // Initial state
  cases: [],
  totalCases: 0,
  isLoading: false,
  filters: { limit: 50, offset: 0 },
  error: null,

  // Actions
  fetchCases: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await window.electronAPI.getCases({
        ...get().filters,
        ...filters
      });
      if (response.success && response.data) {
        set({
          cases: response.data.cases,
          totalCases: response.data.total,
          filters: { ...get().filters, ...filters }
        });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch cases' });
    } finally {
      set({ isLoading: false });
    }
  },

  createCase: async (data) => {
    const response = await window.electronAPI.createCase(data);
    if (response.success && response.data) {
      get().fetchCases();  // Refresh list
      return response.data;
    }
    return null;
  },

  deleteCase: async (id) => {
    const response = await window.electronAPI.deleteCase(id);
    if (response.success) {
      get().fetchCases();  // Refresh list
      return true;
    }
    return false;
  }
}));

// Selectors for components
export const useCaseList = () => useCaseStore(state => ({
  cases: state.cases,
  totalCases: state.totalCases,
  isLoading: state.isLoading,
  filters: state.filters
}));

export const useCaseActions = () => useCaseStore(state => ({
  fetchCases: state.fetchCases,
  createCase: state.createCase,
  deleteCase: state.deleteCase
}));
```

**Key Patterns**:
- **State + Actions**: Combined in single store
- **Selectors**: Extract specific parts of state
- **Immutable Updates**: `set()` creates new state

### 7. React Components (`src/renderer/components/`)

UI components that use the store and call the API.

```typescript
// Pattern: Container Component
const CaseList: React.FC<CaseListProps> = ({ onSelectCase }) => {
  // Get state and actions from store
  const { cases, totalCases, isLoading, filters } = useCaseList();
  const { fetchCases, createCase, deleteCase } = useCaseActions();

  // Local UI state
  const [searchText, setSearchText] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<string | null>(null);

  // Fetch on mount
  useEffect(() => {
    fetchCases();
  }, []);

  // Event handlers
  const handleNewCase = async () => {
    const newCase = await createCase();
    if (newCase) {
      onSelectCase(newCase.id);
    }
  };

  const handleDeleteConfirm = async () => {
    if (caseToDelete) {
      await deleteCase(caseToDelete);
      setDeleteModalOpen(false);
      setCaseToDelete(null);
    }
  };

  // Render
  return (
    <div className="case-list-container">
      <Table
        dataSource={cases}
        loading={isLoading}
        // ...
      />

      <Modal
        open={deleteModalOpen}
        onOk={handleDeleteConfirm}
        onCancel={() => setDeleteModalOpen(false)}
      >
        Are you sure you want to delete case {caseToDelete}?
      </Modal>
    </div>
  );
};
```

## Data Flow Example

Let's trace a "Create Drug" operation through all layers:

```
1. USER: Clicks "Add Drug" button

2. COMPONENT (DrugsSection.tsx):
   const handleSave = () => {
     onAdd(editingDrug);  // Calls parent handler
   };

3. PARENT COMPONENT (CaseForm.tsx):
   const handleAddDrug = async (drug: Partial<CaseDrug>) => {
     await saveDrug({ ...drug, caseId: currentCase.id });
   };

4. STORE (caseStore.ts):
   saveDrug: async (drug) => {
     const response = await window.electronAPI.saveDrug(drug);
     return response.data;
   };

5. PRELOAD (index.ts):
   saveDrug: (drug: CaseDrug): Promise<IPCResponse<CaseDrug>> =>
     ipcRenderer.invoke(IPC_CHANNELS.DRUG_SAVE, drug),

6. IPC HANDLER (case.handlers.ts):
   ipcMain.handle(
     IPC_CHANNELS.DRUG_SAVE,
     wrapHandler((drug: CaseDrug) => drugRepo.save(drug))
   );

7. REPOSITORY (drug.repository.ts):
   save(drug: CaseDrug): CaseDrug {
     if (drug.id) {
       return this.update(drug.id, drug) ?? this.create(drug);
     }
     return this.create(drug);
   }

   create(drug: Omit<CaseDrug, 'id'>): CaseDrug {
     const stmt = this.db.prepare(`INSERT INTO case_drugs (...) VALUES (...)`);
     const result = stmt.run(...);
     return this.findById(Number(result.lastInsertRowid))!;
   }

8. DATABASE: SQLite INSERT

9. RESPONSE flows back up through all layers
```

## Key Takeaways

1. **Separation of Concerns**: Each layer has a single responsibility
2. **Type Safety**: Types flow from shared types through all layers
3. **Dependency Injection**: Database and dependencies passed via constructors
4. **Error Handling**: Centralized in `wrapHandler`
5. **Consistent Patterns**: Same patterns used throughout

## Next Steps

- [Common Tasks](./04-common-tasks.md) - Step-by-step guides for typical development work

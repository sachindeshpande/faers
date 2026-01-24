# Common Development Tasks

Step-by-step guides for typical development work in this codebase.

## Task 1: Add a New Field to an Entity

**Example**: Add `batchNumber` field to `CaseDrug`.

### Step 1: Update Shared Types

```typescript
// src/shared/types/case.types.ts
export interface CaseDrug {
  // ... existing fields ...
  lotNumber?: string;
  batchNumber?: string;  // ADD THIS
  expirationDate?: string;
}
```

### Step 2: Update Database Schema

```typescript
// src/main/database/connection.ts

// In the CREATE TABLE statement (for new databases):
CREATE TABLE IF NOT EXISTS case_drugs (
  -- existing columns --
  lot_number TEXT,
  batch_number TEXT,  -- ADD THIS
  expiration_date TEXT,
  -- ...
);

// Add a migration for existing databases:
const migration003Exists = database.prepare(
  'SELECT 1 FROM migrations WHERE name = ?'
).get('003_drug_batch_number');

if (!migration003Exists) {
  const columnInfo = database.prepare("PRAGMA table_info(case_drugs)").all() as Array<{ name: string }>;
  const columnNames = columnInfo.map(c => c.name);

  if (!columnNames.includes('batch_number')) {
    database.exec('ALTER TABLE case_drugs ADD COLUMN batch_number TEXT');
  }

  database.prepare(
    'INSERT INTO migrations (name, applied_at) VALUES (?, ?)'
  ).run('003_drug_batch_number', new Date().toISOString());
  console.log('Applied migration: 003_drug_batch_number');
}
```

### Step 3: Update Repository

```typescript
// src/main/database/repositories/drug.repository.ts

// In create() - add to INSERT statement:
create(drug: Omit<CaseDrug, 'id'>): CaseDrug {
  const stmt = this.db.prepare(`
    INSERT INTO case_drugs (
      -- existing columns --
      lot_number, batch_number, expiration_date,  -- ADD batch_number
      sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    // ... existing values ...
    drug.lotNumber ?? null,
    drug.batchNumber ?? null,  // ADD THIS
    drug.expirationDate ?? null,
    drug.sortOrder
  );
}

// In update() - add to UPDATE statement:
update(id: number, drug: Partial<CaseDrug>): CaseDrug | null {
  const stmt = this.db.prepare(`
    UPDATE case_drugs SET
      -- existing columns --
      lot_number = ?,
      batch_number = ?,  -- ADD THIS
      expiration_date = ?,
      sort_order = ?
    WHERE id = ?
  `);

  stmt.run(
    // ... existing values ...
    drug.lotNumber ?? existing.lotNumber ?? null,
    drug.batchNumber ?? existing.batchNumber ?? null,  // ADD THIS
    drug.expirationDate ?? existing.expirationDate ?? null,
    drug.sortOrder ?? existing.sortOrder,
    id
  );
}

// In mapRowToDrug() - add mapping:
private mapRowToDrug(row: Record<string, unknown>): CaseDrug {
  return {
    // ... existing mappings ...
    lotNumber: row.lot_number as string | undefined,
    batchNumber: row.batch_number as string | undefined,  // ADD THIS
    expirationDate: row.expiration_date as string | undefined,
    sortOrder: row.sort_order as number
  };
}
```

### Step 4: Update UI Component

```typescript
// src/renderer/components/case-form/DrugsSection.tsx

// In the form, add the new field:
<Row gutter={24}>
  <Col span={8}>
    <Form.Item label="Lot Number">
      <Input
        value={editingDrug.lotNumber || ''}
        onChange={(e) => updateField('lotNumber', e.target.value)}
        placeholder="Product lot number"
      />
    </Form.Item>
  </Col>
  <Col span={8}>
    <Form.Item label="Batch Number">  {/* ADD THIS */}
      <Input
        value={editingDrug.batchNumber || ''}
        onChange={(e) => updateField('batchNumber', e.target.value)}
        placeholder="Product batch number"
      />
    </Form.Item>
  </Col>
  <Col span={8}>
    <Form.Item label="Expiration Date">
      {/* ... */}
    </Form.Item>
  </Col>
</Row>
```

### Step 5: Test

```bash
npm run typecheck  # Should pass with no errors
npm run dev        # Test in the app
```

---

## Task 2: Add a New API Endpoint

**Example**: Add endpoint to get case statistics.

### Step 1: Define Types

```typescript
// src/shared/types/case.types.ts
export interface CaseStatistics {
  totalCases: number;
  draftCases: number;
  readyCases: number;
  exportedCases: number;
  casesThisMonth: number;
}
```

### Step 2: Add IPC Channel

```typescript
// src/shared/types/ipc.types.ts

export const IPC_CHANNELS = {
  // ... existing channels ...
  CASE_STATISTICS: 'case:statistics',  // ADD THIS
} as const;

// In ElectronAPI interface:
export interface ElectronAPI {
  // ... existing methods ...
  getCaseStatistics: () => Promise<IPCResponse<CaseStatistics>>;  // ADD THIS
}
```

### Step 3: Implement Repository Method

```typescript
// src/main/database/repositories/case.repository.ts

getStatistics(): CaseStatistics {
  const total = this.db.prepare(
    'SELECT COUNT(*) as count FROM cases WHERE deleted_at IS NULL'
  ).get() as { count: number };

  const byStatus = this.db.prepare(`
    SELECT status, COUNT(*) as count
    FROM cases
    WHERE deleted_at IS NULL
    GROUP BY status
  `).all() as { status: string; count: number }[];

  const thisMonth = this.db.prepare(`
    SELECT COUNT(*) as count FROM cases
    WHERE deleted_at IS NULL
    AND created_at >= date('now', 'start of month')
  `).get() as { count: number };

  const statusCounts = Object.fromEntries(
    byStatus.map(row => [row.status, row.count])
  );

  return {
    totalCases: total.count,
    draftCases: statusCounts['Draft'] || 0,
    readyCases: statusCounts['Ready'] || 0,
    exportedCases: statusCounts['Exported'] || 0,
    casesThisMonth: thisMonth.count
  };
}
```

### Step 4: Add IPC Handler

```typescript
// src/main/ipc/case.handlers.ts

ipcMain.handle(
  IPC_CHANNELS.CASE_STATISTICS,
  wrapHandler(() => caseRepo.getStatistics())
);
```

### Step 5: Expose in Preload

```typescript
// src/preload/index.ts
import type { CaseStatistics } from '../shared/types/case.types';

const electronAPI: ElectronAPI = {
  // ... existing methods ...
  getCaseStatistics: (): Promise<IPCResponse<CaseStatistics>> =>
    ipcRenderer.invoke(IPC_CHANNELS.CASE_STATISTICS),
};
```

### Step 6: Use in Component

```typescript
// src/renderer/components/Dashboard.tsx
import { useState, useEffect } from 'react';
import type { CaseStatistics } from '../../shared/types/case.types';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<CaseStatistics | null>(null);

  useEffect(() => {
    async function loadStats() {
      const response = await window.electronAPI.getCaseStatistics();
      if (response.success && response.data) {
        setStats(response.data);
      }
    }
    loadStats();
  }, []);

  if (!stats) return <div>Loading...</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Total Cases: {stats.totalCases}</p>
      <p>Draft: {stats.draftCases}</p>
      <p>Ready: {stats.readyCases}</p>
      <p>Exported: {stats.exportedCases}</p>
      <p>This Month: {stats.casesThisMonth}</p>
    </div>
  );
};
```

---

## Task 3: Add a New Service

**Example**: Add XML export service.

### Step 1: Create Service Class

```typescript
// src/main/services/xmlExportService.ts
import { CaseRepository, DrugRepository, ReactionRepository, ReporterRepository } from '../database/repositories';
import type { DatabaseInstance } from '../database/types';
import type { Case, CaseDrug, CaseReaction, CaseReporter } from '../../shared/types/case.types';

export interface XMLExportResult {
  success: boolean;
  xml?: string;
  filePath?: string;
  errors: string[];
}

export class XMLExportService {
  private caseRepo: CaseRepository;
  private drugRepo: DrugRepository;
  private reactionRepo: ReactionRepository;
  private reporterRepo: ReporterRepository;

  constructor(db: DatabaseInstance) {
    this.caseRepo = new CaseRepository(db);
    this.drugRepo = new DrugRepository(db);
    this.reactionRepo = new ReactionRepository(db);
    this.reporterRepo = new ReporterRepository(db);
  }

  /**
   * Export a case to E2B(R3) XML format
   */
  async export(caseId: string): Promise<XMLExportResult> {
    const errors: string[] = [];

    // Load case with related data
    const caseData = this.caseRepo.findById(caseId);
    if (!caseData) {
      return { success: false, errors: [`Case not found: ${caseId}`] };
    }

    const drugs = this.drugRepo.findByCaseId(caseId);
    const reactions = this.reactionRepo.findByCaseId(caseId);
    const reporters = this.reporterRepo.findByCaseId(caseId);

    // Validate required fields
    if (reactions.length === 0) {
      errors.push('At least one reaction is required');
    }
    if (drugs.length === 0) {
      errors.push('At least one drug is required');
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    // Generate XML
    const xml = this.generateXML(caseData, drugs, reactions, reporters);

    return { success: true, xml, errors: [] };
  }

  /**
   * Export and save to file
   */
  async exportToFile(caseId: string, filePath: string): Promise<XMLExportResult> {
    const result = await this.export(caseId);
    if (!result.success || !result.xml) {
      return result;
    }

    const fs = await import('fs');
    fs.writeFileSync(filePath, result.xml, 'utf-8');

    return { ...result, filePath };
  }

  private generateXML(
    caseData: Case,
    drugs: CaseDrug[],
    reactions: CaseReaction[],
    reporters: CaseReporter[]
  ): string {
    // Build XML using template
    return `<?xml version="1.0" encoding="UTF-8"?>
<ichicsr>
  <safetyreport>
    <safetyreportid>${caseData.safetyReportId || ''}</safetyreportid>
    <!-- ... more XML generation ... -->
  </safetyreport>
</ichicsr>`;
  }
}

export default XMLExportService;
```

### Step 2: Add IPC Handler

```typescript
// src/main/ipc/case.handlers.ts
import { XMLExportService } from '../services/xmlExportService';

// In registerIpcHandlers():
const xmlService = new XMLExportService(db);

ipcMain.handle(
  IPC_CHANNELS.XML_GENERATE,
  async (_, caseId: string) => {
    try {
      const result = await xmlService.export(caseId);
      return {
        success: result.success,
        data: result.xml,
        error: result.errors.join('; ')
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export error'
      };
    }
  }
);

ipcMain.handle(
  IPC_CHANNELS.XML_EXPORT,
  async (_, { caseId, filePath }: { caseId: string; filePath: string }) => {
    try {
      const result = await xmlService.exportToFile(caseId, filePath);
      return {
        success: result.success,
        error: result.errors.join('; ')
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export error'
      };
    }
  }
);
```

---

## Task 4: Add a New React Component

**Example**: Add a statistics card component.

### Step 1: Create Component File

```typescript
// src/renderer/components/common/StatCard.tsx
import React from 'react';
import { Card, Statistic } from 'antd';
import type { StatisticProps } from 'antd';

interface StatCardProps {
  title: string;
  value: number | string;
  prefix?: React.ReactNode;
  suffix?: string;
  precision?: number;
  valueStyle?: React.CSSProperties;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  prefix,
  suffix,
  precision,
  valueStyle,
  loading = false
}) => {
  return (
    <Card loading={loading}>
      <Statistic
        title={title}
        value={value}
        prefix={prefix}
        suffix={suffix}
        precision={precision}
        valueStyle={valueStyle}
      />
    </Card>
  );
};

export default StatCard;
```

### Step 2: Export from Index

```typescript
// src/renderer/components/common/index.ts
export { default as StatCard } from './StatCard';
```

### Step 3: Use in Another Component

```typescript
// src/renderer/components/Dashboard.tsx
import { StatCard } from './common';
import { FileOutlined, CheckOutlined } from '@ant-design/icons';

const Dashboard: React.FC = () => {
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <StatCard
        title="Total Cases"
        value={150}
        prefix={<FileOutlined />}
      />
      <StatCard
        title="Ready for Export"
        value={42}
        prefix={<CheckOutlined />}
        valueStyle={{ color: '#3f8600' }}
      />
    </div>
  );
};
```

---

## Task 5: Debug a TypeScript Error

### Common Error: "Property does not exist"

```typescript
// ERROR: Property 'batchNumber' does not exist on type 'CaseDrug'
const batch = drug.batchNumber;
```

**Solution**: Add the property to the interface:

```typescript
// src/shared/types/case.types.ts
interface CaseDrug {
  // ... add the property
  batchNumber?: string;
}
```

### Common Error: "Type 'X' is not assignable to type 'Y'"

```typescript
// ERROR: Type 'string | undefined' is not assignable to type 'string'
const name: string = drug.productName;  // productName might be undefined
```

**Solutions**:

```typescript
// Option 1: Use optional chaining with default
const name: string = drug.productName ?? 'Unknown';

// Option 2: Check for undefined
if (drug.productName) {
  const name: string = drug.productName;  // TS knows it's defined here
}

// Option 3: Non-null assertion (use carefully)
const name: string = drug.productName!;  // "Trust me, it's defined"
```

### Common Error: "Object is possibly 'undefined'"

```typescript
// ERROR: Object is possibly 'undefined'
const length = user.name.length;
```

**Solution**: Use optional chaining:

```typescript
const length = user?.name?.length ?? 0;
```

---

## Task 6: Run Type Check and Fix Errors

```bash
# Run type checker
npm run typecheck

# Common output:
# src/main/database/repositories/drug.repository.ts:45:5 - error TS2345:
# Argument of type 'string' is not assignable to parameter of type 'number'.

# The error shows:
# - File path and line number
# - Error code (TS2345)
# - Description of the issue
```

### Fixing Type Errors Systematically

1. **Read the error message** - It tells you exactly what's wrong
2. **Go to the line** - The file:line format is clickable in most editors
3. **Check the types** - Hover over variables to see their inferred types
4. **Fix the mismatch** - Either change the value or update the type

---

## Task 7: Add Store Action

**Example**: Add action to duplicate a case.

```typescript
// src/renderer/stores/caseStore.ts

interface CaseActions {
  // ... existing actions ...
  duplicateCase: (id: string) => Promise<Case | null>;
}

export const useCaseStore = create<CaseState & CaseActions>((set, get) => ({
  // ... existing state and actions ...

  duplicateCase: async (id: string) => {
    try {
      const response = await window.electronAPI.duplicateCase(id);
      if (response.success && response.data) {
        // Refresh the list after duplication
        await get().fetchCases();
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to duplicate case:', error);
      return null;
    }
  }
}));

// Update the selector
export const useCaseActions = () => useCaseStore(state => ({
  fetchCases: state.fetchCases,
  createCase: state.createCase,
  deleteCase: state.deleteCase,
  duplicateCase: state.duplicateCase  // ADD THIS
}));
```

---

## Quick Reference: File Locations

| Task | Files to Modify |
|------|-----------------|
| Add entity field | `shared/types`, `connection.ts`, `repository`, `component` |
| Add API endpoint | `ipc.types.ts`, `handlers.ts`, `preload`, (optionally) `store` |
| Add service | `services/`, `handlers.ts` |
| Add component | `components/`, parent component |
| Add store action | `stores/` |
| Add migration | `connection.ts` |

## Next Steps

- [Quick Reference](./05-quick-reference.md) - Cheat sheet for common syntax

# Advanced Features Walkthrough

This section walks through recently implemented features, teaching TypeScript concepts through real code.

## 1. Validation Service - E2B(R3) Compliance Checking

The `ValidationService` demonstrates several TypeScript patterns: class-based services, interface-driven validation, and method organization.

### File: `src/main/services/validationService.ts`

```typescript
import type { DatabaseInstance } from '../database/types';
import {
  CaseRepository,
  ReactionRepository,
  DrugRepository,
  ReporterRepository
} from '../database/repositories';
import type {
  Case,
  CaseReaction,
  CaseDrug,
  CaseReporter,
  ValidationError,
  ValidationResult
} from '../../shared/types/case.types';
```

**TypeScript Concepts:**
- `import type` - Imports only type information (removed at runtime)
- Multiple named imports from same module
- Types from shared module used across processes

### Service Class Structure

```typescript
export class ValidationService {
  // Private fields - encapsulation
  private caseRepo: CaseRepository;
  private reactionRepo: ReactionRepository;
  private drugRepo: DrugRepository;
  private reporterRepo: ReporterRepository;

  // Constructor dependency injection
  constructor(db: DatabaseInstance) {
    this.caseRepo = new CaseRepository(db);
    this.reactionRepo = new ReactionRepository(db);
    this.drugRepo = new DrugRepository(db);
    this.reporterRepo = new ReporterRepository(db);
  }
```

**Pattern: Dependency Injection**
- Database instance passed to constructor
- Repositories created internally (could also be injected)
- Each repository handles one entity type

### Main Validation Method

```typescript
validate(caseId: string): ValidationResult {
  const errors: ValidationError[] = [];

  // Load case with all related data
  const caseData = this.caseRepo.findById(caseId);
  if (!caseData) {
    return {
      valid: false,
      errors: [{ field: 'case', message: `Case not found: ${caseId}`, severity: 'error' }]
    };
  }

  const reporters = this.reporterRepo.findByCaseId(caseId);
  const reactions = this.reactionRepo.findByCaseId(caseId);
  const drugs = this.drugRepo.findByCaseId(caseId);

  // Run all validation checks
  this.validateReportInformation(caseData, errors);
  this.validateReporterInformation(reporters, errors);
  this.validateSenderInformation(caseData, errors);
  this.validatePatientInformation(caseData, errors);
  this.validateReactions(reactions, caseData, errors);
  this.validateDrugs(drugs, errors);
  this.validateNarrative(caseData, errors);
  this.validateCrossFieldRules(caseData, reactions, errors);

  // Determine overall validity
  const hasErrors = errors.some(e => e.severity === 'error');

  return {
    valid: !hasErrors,
    errors
  };
}
```

**TypeScript Concepts:**
- Return type annotation: `ValidationResult`
- Array method: `.some()` with arrow function
- Object literal return with inferred types
- Early return pattern for error cases

### Validation Error Interface

```typescript
// From src/shared/types/case.types.ts
export interface ValidationError {
  field: string;           // Which field has the error
  message: string;         // Human-readable message
  severity: 'error' | 'warning' | 'info';  // Literal union type
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
```

**TypeScript Concept: Literal Union Types**
- `'error' | 'warning' | 'info'` - only these exact strings allowed
- Provides autocomplete and compile-time checking
- Similar to C# enums but more flexible

### Private Validation Methods

```typescript
private validatePatientInformation(caseData: Case, errors: ValidationError[]): void {
  // B.1.5 - Patient Sex (required)
  if (caseData.patientSex === undefined || caseData.patientSex === null) {
    errors.push({
      field: 'patientSex',
      message: 'Patient Sex is required (B.1.5)',
      severity: 'error'
    });
  }

  // B.1.2 - Either Birth Date OR Age is required
  const hasAge = caseData.patientAge !== undefined && caseData.patientAge !== null;
  const hasBirthdate = !!caseData.patientBirthdate;  // !! converts to boolean
  const hasAgeGroup = caseData.patientAgeGroup !== undefined;

  if (!hasAge && !hasBirthdate && !hasAgeGroup) {
    errors.push({
      field: 'patientAge',
      message: 'Either Patient Birth Date, Age, or Age Group is required (B.1.2)',
      severity: 'error'
    });
  }
}
```

**TypeScript Concepts:**
- `void` return type - method modifies array in place
- `!!` double negation - converts any value to boolean
- Checking for both `undefined` and `null`

### Cross-Field Validation

```typescript
private validateCrossFieldRules(
  caseData: Case,
  reactions: CaseReaction[],
  errors: ValidationError[]
): void {
  // If patient death is indicated
  if (caseData.patientDeath) {
    // At least one reaction should have "Results in Death" seriousness
    const hasDeathReaction = reactions.some(r => r.seriousDeath);
    if (!hasDeathReaction) {
      errors.push({
        field: 'reactions',
        message: 'At least one reaction should have "Results in Death" when patient death is indicated',
        severity: 'warning'
      });
    }
  }

  // Reverse check: if any reaction causes death, patient death should be indicated
  const hasDeathReaction = reactions.some(r => r.seriousDeath);
  if (hasDeathReaction && !caseData.patientDeath) {
    errors.push({
      field: 'patientDeath',
      message: 'Patient Death should be indicated when a reaction "Results in Death"',
      severity: 'warning'
    });
  }
}
```

**Pattern: Cross-Field Validation**
- Validates relationships between different data entities
- Uses array methods (`.some()`) to check conditions
- Distinguishes between errors and warnings

---

## 2. XML Generator Service - Template-Based Generation

The `XMLGeneratorService` demonstrates string template patterns, data transformation, and structured output generation.

### File: `src/main/services/xmlGeneratorService.ts`

```typescript
export class XMLGeneratorService {
  private caseRepo: CaseRepository;
  private drugRepo: DrugRepository;
  private reactionRepo: ReactionRepository;
  private reporterRepo: ReporterRepository;

  constructor(db: DatabaseInstance) {
    // Same pattern as ValidationService
  }

  async generate(caseId: string): Promise<XMLGenerationResult> {
    // Load all case data
    const caseData = this.caseRepo.findById(caseId);
    if (!caseData) {
      return { success: false, errors: ['Case not found'] };
    }

    const drugs = this.drugRepo.findByCaseId(caseId);
    const reactions = this.reactionRepo.findByCaseId(caseId);
    const reporters = this.reporterRepo.findByCaseId(caseId);

    // Build XML sections
    const xml = this.buildXML(caseData, drugs, reactions, reporters);

    return { success: true, xml, errors: [] };
  }
}
```

### XML Building with Template Literals

```typescript
private buildXML(
  caseData: Case,
  drugs: CaseDrug[],
  reactions: CaseReaction[],
  reporters: CaseReporter[]
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ichicsr lang="en" xmlns="urn:hl7-org:v3">
  <messagenumb>${this.escapeXml(caseData.safetyReportId || '')}</messagenumb>
  <messagesenderidentifier>${this.escapeXml(caseData.senderOrganization || '')}</messagesenderidentifier>
  <safetyreport>
    ${this.buildReportSection(caseData)}
    ${this.buildPatientSection(caseData, reactions, drugs)}
  </safetyreport>
</ichicsr>`;
}
```

**TypeScript Concept: Template Literals**
- Backticks `` ` `` for multi-line strings
- `${expression}` for embedded values
- Methods called inline within template

### Array Mapping for Repeated Elements

```typescript
private buildDrugsSection(drugs: CaseDrug[]): string {
  return drugs.map((drug, index) => `
    <drug>
      <drugcharacterization>${drug.characterization || ''}</drugcharacterization>
      <medicinalproduct>${this.escapeXml(drug.productName || '')}</medicinalproduct>
      ${drug.dosages?.map(d => this.buildDosageElement(d)).join('') || ''}
    </drug>
  `).join('');
}
```

**TypeScript Concepts:**
- `.map()` with arrow function and index
- Optional chaining: `drug.dosages?.map()`
- Nullish coalescing: `|| ''` for default values
- `.join('')` to combine array into string

### XML Escaping Helper

```typescript
private escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
```

**Pattern: Method Chaining**
- Each `.replace()` returns string, allowing chaining
- Regular expressions with `/g` for global replace

---

## 3. Form 3500 Import Service - PDF Parsing Workflow

The `Form3500ImportService` orchestrates PDF parsing, data mapping, and database operations.

### File: `src/main/services/form3500ImportService.ts`

```typescript
export interface Form3500AImportResult {
  success: boolean;
  caseId?: string;
  warnings: string[];
  errors: string[];
}

export class Form3500ImportService {
  private caseRepo: CaseRepository;
  private drugRepo: DrugRepository;
  private reactionRepo: ReactionRepository;
  private reporterRepo: ReporterRepository;
  private parser: Form3500AParser;
  private mapper: Form3500AMapper;

  constructor(db: DatabaseInstance) {
    this.caseRepo = new CaseRepository(db);
    this.drugRepo = new DrugRepository(db);
    this.reactionRepo = new ReactionRepository(db);
    this.reporterRepo = new ReporterRepository(db);
    this.parser = new Form3500AParser();
    this.mapper = new Form3500AMapper();
  }
```

**Pattern: Composition**
- Service combines Parser + Mapper + Repositories
- Each component has single responsibility
- Service orchestrates the workflow

### Async Import Method

```typescript
async import(filePath: string): Promise<Form3500AImportResult> {
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    // Step 1: Parse PDF
    const formData = await this.parser.parse(filePath);

    // Step 2: Map to entities
    const mapped = this.mapper.map(formData);
    warnings.push(...mapped.warnings);

    // Step 3: Create case
    const newCase = this.caseRepo.create({});

    // Step 4: Update with mapped data
    this.caseRepo.update(newCase.id, mapped.caseData);

    // Step 5: Create related entities
    for (const drug of mapped.drugs) {
      this.drugRepo.create({ ...drug, caseId: newCase.id });
    }

    for (const reaction of mapped.reactions) {
      this.reactionRepo.create({ ...reaction, caseId: newCase.id });
    }

    for (const reporter of mapped.reporters) {
      this.reporterRepo.create({ ...reporter, caseId: newCase.id });
    }

    return {
      success: true,
      caseId: newCase.id,
      warnings,
      errors: []
    };

  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Import failed'],
      warnings
    };
  }
}
```

**TypeScript Concepts:**
- `async/await` for asynchronous operations
- `Promise<T>` return type
- Spread operator: `warnings.push(...mapped.warnings)`
- `for...of` loop for arrays
- `instanceof` type guard for error handling

### Data Mapper Pattern

```typescript
// From src/main/services/form3500Mapper.ts
export class Form3500AMapper {
  map(formData: Form3500AData): Form3500AMappedData {
    const warnings: string[] = [];

    return {
      caseData: this.mapCaseData(formData, warnings),
      drugs: this.mapDrugs(formData, warnings),
      reactions: this.mapReactions(formData, warnings),
      reporters: this.mapReporters(formData, warnings),
      warnings
    };
  }

  private mapCaseData(formData: Form3500AData, warnings: string[]): UpdateCaseDTO {
    const { patient, event, manufacturer } = formData;  // Destructuring

    // Parse sender name from manufacturer contact
    const senderNames = this.parseSenderName(manufacturer.contactName);

    const caseData: UpdateCaseDTO = {
      reportType: ReportType.Spontaneous,
      initialOrFollowup: ReportCategory.Initial,
      receiptDate: this.parseDate(event.dateOfReport, warnings),
      senderGivenName: senderNames.givenName,
      senderFamilyName: senderNames.familyName,
      // ... more fields
    };

    return caseData;
  }
}
```

**Pattern: Mapper with Warnings**
- Collects warnings during mapping (non-fatal issues)
- Returns structured data with warnings
- Private helper methods for specific transformations

### Date Parsing with Multiple Formats

```typescript
private parseDate(dateStr: string | undefined, warnings: string[]): string | undefined {
  if (!dateStr) return undefined;

  // Try different date formats
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/,                    // 2024-01-15
    /^(\d{2})\/(\d{2})\/(\d{4})$/,                  // 01/15/2024
    /^(\d{2})-([A-Za-z]{3})-(\d{4})$/               // 15-Jan-2024
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      // Parse and convert to ISO format
      return this.convertToISODate(match, format, warnings);
    }
  }

  warnings.push(`Could not parse date: ${dateStr}`);
  return undefined;
}
```

**TypeScript Concepts:**
- Union return type: `string | undefined`
- Regular expression patterns
- Array iteration with `for...of`
- Guard clause: early return for undefined input

---

## 4. Dynamic Navigation Indicators - React Patterns

The navigation indicators in `App.tsx` demonstrate React component patterns with TypeScript.

### File: `src/renderer/App.tsx`

```typescript
import {
  CheckCircleFilled,
  CloseCircleFilled
} from '@ant-design/icons';

// Functional component with typed props
const SectionIndicator: React.FC<{ hasData: boolean; hasError: boolean }> = ({
  hasData,
  hasError
}) => {
  if (hasError) {
    return <CloseCircleFilled style={{ color: '#ff4d4f', fontSize: 10, marginLeft: 8 }} />;
  }
  if (hasData) {
    return <CheckCircleFilled style={{ color: '#52c41a', fontSize: 10, marginLeft: 8 }} />;
  }
  return null;
};
```

**TypeScript Concepts:**
- `React.FC<Props>` - Functional Component with typed props
- Inline prop type definition: `{ hasData: boolean; hasError: boolean }`
- Destructuring in function parameters
- Returning `null` for "render nothing"

### Helper Function for Nav Labels

```typescript
const createNavLabel = (label: string, hasData: boolean, hasError: boolean) => (
  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
    {label}
    <SectionIndicator hasData={hasData} hasError={hasError} />
  </span>
);
```

**Pattern: Render Helper**
- Returns JSX fragment
- Composes smaller components
- Implicit return with parentheses (no `return` keyword)

### Section Error Detection

```typescript
const getSectionErrors = (sectionKey: string): boolean => {
  if (!validationResult) return false;

  // Map section keys to field names
  const sectionFieldMap: Record<string, string[]> = {
    report: ['reportType', 'initialOrFollowup', 'receiptDate', 'receiveDate'],
    reporter: ['reporters', 'qualification'],
    sender: ['senderType', 'senderOrganization', 'senderGivenName', 'senderFamilyName'],
    patient: ['patientSex', 'patientAge', 'patientWeight', 'patientHeight'],
    reactions: ['reactions', 'reactionTerm', 'seriousness'],
    drugs: ['drugs', 'characterization', 'productName'],
    narrative: ['caseNarrative', 'narrative']
  };

  const fields = sectionFieldMap[sectionKey] || [];

  return validationResult.errors.some(e =>
    e.severity === 'error' &&
    fields.some(f => e.field.toLowerCase().includes(f.toLowerCase()))
  );
};
```

**TypeScript Concepts:**
- `Record<string, string[]>` - Object type with string keys and string array values
- Array methods: `.some()` with nested condition
- Case-insensitive matching with `.toLowerCase()`
- Nullish coalescing: `|| []` for default empty array

### Section Data Detection

```typescript
const getSectionHasData = (sectionKey: string): boolean => {
  if (!currentCase) return false;

  switch (sectionKey) {
    case 'report':
      return !!(currentCase.reportType || currentCase.receiptDate || currentCase.receiveDate);
    case 'reporter':
      return reporters.length > 0;
    case 'sender':
      return !!(currentCase.senderOrganization || currentCase.senderGivenName);
    case 'patient':
      return !!(currentCase.patientSex !== undefined || currentCase.patientAge);
    case 'reactions':
      return reactions.length > 0;
    case 'drugs':
      return drugs.length > 0;
    case 'narrative':
      return !!(currentCase.caseNarrative && currentCase.caseNarrative.trim().length > 0);
    default:
      return false;
  }
};
```

**TypeScript Concepts:**
- Switch statement with string cases
- `!!` to convert to boolean
- Array `.length` check
- String method: `.trim().length`

### Dynamic Menu Generation

```typescript
type MenuItem = Required<MenuProps>['items'][number];

const getNavItems = (): MenuItem[] => [
  {
    key: 'cases',
    icon: <UnorderedListOutlined />,
    label: 'Case List'
  },
  { type: 'divider' },
  {
    key: 'report',
    icon: <FileTextOutlined />,
    label: createNavLabel('Report Info', getSectionHasData('report'), getSectionErrors('report'))
  },
  // ... more items
];
```

**TypeScript Concepts:**
- `Required<T>` utility type - makes all properties required
- Index access: `['items'][number]` - gets array element type
- Array literal with object elements
- Calling functions within object literals

---

## 5. IPC Export Handler - Coordinating Services

The export handler shows how IPC handlers coordinate multiple services.

### File: `src/main/ipc/case.handlers.ts`

```typescript
import { XMLGeneratorService } from '../services/xmlGeneratorService';
import { ValidationService } from '../services/validationService';

export function registerExportHandlers(db: DatabaseInstance): void {
  const xmlService = new XMLGeneratorService(db);
  const validationService = new ValidationService(db);
  const caseRepo = new CaseRepository(db);

  ipcMain.handle(
    IPC_CHANNELS.XML_EXPORT,
    wrapHandler(async ({ caseId, filePath }: { caseId: string; filePath: string }) => {
      // Step 1: Validate first
      const validation = validationService.validate(caseId);
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.length} error(s)`
        };
      }

      // Step 2: Generate XML
      const result = await xmlService.generate(caseId);
      if (!result.success || !result.xml) {
        return { success: false, error: result.errors.join('; ') };
      }

      // Step 3: Write to file
      const fs = await import('fs/promises');
      await fs.writeFile(filePath, result.xml, 'utf-8');

      // Step 4: Update case status
      caseRepo.update(caseId, { status: 'Exported' });

      return { success: true };
    })
  );
}
```

**Patterns:**
- **Orchestration**: Handler coordinates validation → generation → file write → status update
- **Dynamic import**: `await import('fs/promises')` for async module loading
- **Early return**: Exit on validation failure
- **Error aggregation**: `errors.join('; ')` to combine error messages

---

## Key Takeaways

1. **Service Layer Pattern**: Business logic in service classes, not in handlers or components
2. **Validation as a Service**: Reusable validation across different entry points
3. **Mapper Pattern**: Transform external data formats to internal types
4. **Template Literals for XML**: Clean, readable XML generation
5. **React Functional Components**: Typed props with `React.FC<Props>`
6. **Record Type**: `Record<K, V>` for typed object dictionaries
7. **Array Methods**: `.map()`, `.some()`, `.filter()` for data transformation
8. **Error Handling**: Try/catch with `instanceof Error` type guard

## Next Steps

- [Quick Reference](./05-quick-reference.md) - Syntax cheat sheet
- Try modifying the validation rules in `validationService.ts`
- Add a new field mapping in `form3500Mapper.ts`

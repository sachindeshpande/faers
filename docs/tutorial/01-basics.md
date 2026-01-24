# TypeScript Basics for OOP Developers

## Variables and Constants

### Declaration

```typescript
// Constants (like C# readonly or Java final)
const name: string = "John";
const count: number = 42;
const isActive: boolean = true;

// Variables (can be reassigned)
let age: number = 30;
age = 31;  // OK

// Type inference (TypeScript figures out the type)
const inferredString = "Hello";  // TypeScript knows this is string
let inferredNumber = 100;        // TypeScript knows this is number
```

### Comparison with Other Languages

| TypeScript | C# | Java | Python |
|------------|-----|------|--------|
| `const x: string = "hi"` | `readonly string x = "hi"` | `final String x = "hi"` | `x: str = "hi"` |
| `let x: number = 5` | `int x = 5` | `int x = 5` | `x: int = 5` |
| `let x = 5` | `var x = 5` | `var x = 5` | `x = 5` |

## Basic Types

```typescript
// Primitive types
const str: string = "hello";
const num: number = 42;          // No int/float distinction
const bool: boolean = true;
const nul: null = null;
const undef: undefined = undefined;

// Arrays
const numbers: number[] = [1, 2, 3];
const strings: Array<string> = ["a", "b", "c"];  // Generic syntax

// Objects (inline type)
const person: { name: string; age: number } = {
  name: "John",
  age: 30
};

// Any type (escape hatch - avoid when possible)
let anything: any = "hello";
anything = 42;  // No error, but loses type safety
```

## Functions

### Basic Functions

```typescript
// Named function with types
function add(a: number, b: number): number {
  return a + b;
}

// Arrow function (lambda)
const multiply = (a: number, b: number): number => {
  return a * b;
};

// Arrow function - short form (implicit return)
const divide = (a: number, b: number): number => a / b;

// Optional parameters (use ?)
function greet(name: string, greeting?: string): string {
  return `${greeting || "Hello"}, ${name}!`;
}

// Default parameters
function greetWithDefault(name: string, greeting: string = "Hello"): string {
  return `${greeting}, ${name}!`;
}
```

### Comparison Table

| TypeScript | C# | Java |
|------------|-----|------|
| `(a: number) => a * 2` | `a => a * 2` | `a -> a * 2` |
| `function foo(): void` | `void Foo()` | `void foo()` |
| `param?: string` | `string? param = null` | `@Nullable String param` |

## Null and Undefined

TypeScript has TWO null-like values:

```typescript
let a: string | null = null;       // Explicitly null
let b: string | undefined;          // Not yet assigned
let c: string | null | undefined;   // Could be either

// Optional chaining (like C# ?.)
const length = user?.name?.length;  // undefined if any part is null/undefined

// Nullish coalescing (like C# ??)
const name = user?.name ?? "Unknown";  // "Unknown" if name is null/undefined

// Non-null assertion (use carefully!)
const definitelyExists = maybeNull!;  // Tell TS "trust me, it's not null"
```

### Practical Example from Codebase

```typescript
// From drug.repository.ts
findById(id: number): CaseDrug | null {
  const row = this.db.prepare(
    'SELECT * FROM case_drugs WHERE id = ?'
  ).get(id) as Record<string, unknown> | undefined;

  if (!row) {
    return null;  // Not found
  }

  return this.mapRowToDrug(row);
}
```

## Union Types

Union types allow a value to be one of several types:

```typescript
// A variable that can be string OR number
let id: string | number;
id = "abc";  // OK
id = 123;    // Also OK

// Function parameter with union type
function printId(id: string | number): void {
  // Type narrowing - TypeScript tracks the type inside the if
  if (typeof id === "string") {
    console.log(id.toUpperCase());  // TS knows id is string here
  } else {
    console.log(id.toFixed(2));     // TS knows id is number here
  }
}

// Literal types (specific values)
type Status = "Draft" | "Ready" | "Exported";
let caseStatus: Status = "Draft";  // Only these 3 values allowed
```

## Enums

```typescript
// Numeric enum (like C#/Java)
enum Direction {
  Up,      // 0
  Down,    // 1
  Left,    // 2
  Right    // 3
}

// Enum with explicit values
enum DrugCharacterization {
  Suspect = 1,
  Concomitant = 2,
  Interacting = 3
}

// Usage
const char: DrugCharacterization = DrugCharacterization.Suspect;
if (char === DrugCharacterization.Suspect) {
  console.log("This is a suspect drug");
}

// String enum
enum SenderType {
  PharmaceuticalCompany = "pharmaceutical_company",
  RegulatoryAuthority = "regulatory_authority"
}
```

### Enums from Codebase

```typescript
// From src/shared/types/case.types.ts
export enum PatientSex {
  Male = 1,
  Female = 2
}

export enum AgeUnit {
  Year = 801,
  Month = 802,
  Week = 803,
  Day = 804
}

// Usage
const patient = {
  sex: PatientSex.Male,
  ageUnit: AgeUnit.Year
};
```

## Async/Await

Identical to C# - if you know C# async/await, you already know this:

```typescript
// Async function returns a Promise
async function fetchUser(id: number): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  const data = await response.json();
  return data as User;
}

// Usage
async function main() {
  try {
    const user = await fetchUser(123);
    console.log(user.name);
  } catch (error) {
    console.error("Failed to fetch user:", error);
  }
}

// Promise type annotation
function getNumber(): Promise<number> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(42), 1000);
  });
}
```

### Async Example from Codebase

```typescript
// From form3500Parser.ts
async parse(filePath: string): Promise<Form3500AData> {
  const pdfBytes = fs.readFileSync(filePath);
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

  // ... processing ...

  return {
    patient: this.extractPatientInfo(),
    event: this.extractEventInfo(),
    products: this.extractProducts(),
    reporter: this.extractReporterInfo(),
    manufacturer: this.extractManufacturerInfo()
  };
}
```

## Import and Export

### Exporting

```typescript
// Named exports (can have multiple per file)
export class DrugRepository { }
export interface CaseDrug { }
export function parseDate(s: string): Date { }
export const DEFAULT_LIMIT = 50;

// Default export (one per file)
export default class Form3500AParser { }
```

### Importing

```typescript
// Named imports
import { DrugRepository, CaseDrug } from './drug.repository';

// Import with alias
import { DrugRepository as DrugRepo } from './drug.repository';

// Import default
import Form3500AParser from './form3500Parser';

// Import everything as namespace
import * as Types from './case.types';
const drug: Types.CaseDrug = { };

// Import types only (erased at runtime)
import type { CaseDrug, CaseReaction } from './case.types';
```

### Comparison with Other Languages

| TypeScript | C# | Java | Python |
|------------|-----|------|--------|
| `import { X } from './file'` | `using X;` | `import pkg.X;` | `from file import X` |
| `export class X` | `public class X` | `public class X` | `class X:` |
| `export default X` | N/A | N/A | N/A |

## Type Assertions (Casting)

```typescript
// "as" syntax (preferred)
const input = document.getElementById("myInput") as HTMLInputElement;
input.value = "Hello";

// Angle bracket syntax (doesn't work in JSX/React)
const input2 = <HTMLInputElement>document.getElementById("myInput");

// Double assertion (when TS doesn't believe you)
const weird = someValue as unknown as TargetType;
```

### From Codebase

```typescript
// From drug.repository.ts
const row = this.db.prepare(
  'SELECT * FROM case_drugs WHERE id = ?'
).get(id) as Record<string, unknown> | undefined;

// Mapping to typed object
return {
  id: row.id as number,
  productName: row.product_name as string,
  // ...
};
```

## Destructuring

Extract values from objects and arrays:

```typescript
// Object destructuring
const user = { name: "John", age: 30, city: "NYC" };
const { name, age } = user;  // name = "John", age = 30

// With renaming
const { name: userName } = user;  // userName = "John"

// With default values
const { country = "USA" } = user;  // country = "USA" (not in original)

// Array destructuring
const [first, second] = [1, 2, 3];  // first = 1, second = 2

// In function parameters
function greet({ name, age }: { name: string; age: number }) {
  console.log(`${name} is ${age}`);
}
```

### From Codebase

```typescript
// From form3500Mapper.ts
private mapCaseData(formData: Form3500AData, warnings: string[]): UpdateCaseDTO {
  const { patient, event, manufacturer } = formData;  // Destructuring

  // Use extracted values
  const caseData: UpdateCaseDTO = {
    patientAge: patient.age,
    // ...
  };
}
```

## Spread Operator

Copy and merge objects/arrays:

```typescript
// Spread array
const arr1 = [1, 2, 3];
const arr2 = [...arr1, 4, 5];  // [1, 2, 3, 4, 5]

// Spread object (shallow copy)
const obj1 = { a: 1, b: 2 };
const obj2 = { ...obj1, c: 3 };  // { a: 1, b: 2, c: 3 }

// Override properties
const updated = { ...obj1, b: 99 };  // { a: 1, b: 99 }
```

### From Codebase

```typescript
// From DrugsSection.tsx
const handleEdit = (drug: CaseDrug) => {
  setEditingDrug({ ...drug });  // Create a copy
  setEditingId(drug.id ?? null);
  setModalVisible(true);
};

const updateField = (field: string, value: unknown) => {
  if (editingDrug) {
    setEditingDrug({ ...editingDrug, [field]: value });  // Update one field
  }
};
```

## Template Literals

String interpolation (like C# $"" strings):

```typescript
const name = "John";
const age = 30;

// Template literal (backticks, not quotes)
const message = `Hello, ${name}! You are ${age} years old.`;

// Multi-line strings
const html = `
  <div>
    <h1>${name}</h1>
    <p>Age: ${age}</p>
  </div>
`;

// Expressions inside ${}
const result = `Total: ${price * quantity}`;
```

## Next Steps

Now that you understand the basics, move on to:
- [Classes and Interfaces](./02-classes-interfaces.md) - OOP patterns in TypeScript

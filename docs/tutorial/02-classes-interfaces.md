# Classes and Interfaces in TypeScript

This guide shows how OOP concepts map from C#/Java to TypeScript.

## Interfaces

Interfaces define the shape of objects. They're compile-time only (erased at runtime).

### Basic Interface

```typescript
// TypeScript
interface User {
  id: number;
  name: string;
  email?: string;  // Optional property
}

// Usage
const user: User = {
  id: 1,
  name: "John"
  // email is optional, so we can omit it
};
```

**C# Equivalent:**
```csharp
public class User {
    public int Id { get; set; }
    public string Name { get; set; }
    public string? Email { get; set; }
}
```

### Interface from Codebase

```typescript
// From src/shared/types/case.types.ts
export interface CaseDrug {
  id?: number;
  caseId?: string;
  characterization: DrugCharacterization;
  productName: string;
  mpid?: string;
  indication?: string;
  startDate?: string;
  endDate?: string;
  dosages?: CaseDrugDosage[];
  // ... more properties
}
```

### Interfaces with Methods

```typescript
interface Calculator {
  add(a: number, b: number): number;
  subtract(a: number, b: number): number;
}

// Implementation
const calc: Calculator = {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b
};
```

### Extending Interfaces

```typescript
interface Animal {
  name: string;
}

interface Dog extends Animal {
  breed: string;
  bark(): void;
}

// Dog must have both name (from Animal) and breed
const myDog: Dog = {
  name: "Rex",
  breed: "German Shepherd",
  bark: () => console.log("Woof!")
};
```

## Classes

### Basic Class

```typescript
class Person {
  // Properties
  name: string;
  age: number;

  // Constructor
  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }

  // Method
  greet(): string {
    return `Hello, I'm ${this.name}`;
  }
}

// Usage
const person = new Person("John", 30);
console.log(person.greet());
```

### Shorthand Constructor (Parameter Properties)

TypeScript has a shortcut for declaring and initializing properties:

```typescript
// Long form
class Person {
  name: string;
  age: number;

  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }
}

// Short form (equivalent)
class Person {
  constructor(
    public name: string,
    public age: number
  ) { }
}
```

### Access Modifiers

```typescript
class BankAccount {
  public accountNumber: string;     // Accessible everywhere (default)
  private balance: number;          // Only in this class
  protected owner: string;          // This class and subclasses
  readonly createdAt: Date;         // Can only be set in constructor

  constructor(accountNumber: string, owner: string, initialBalance: number) {
    this.accountNumber = accountNumber;
    this.owner = owner;
    this.balance = initialBalance;
    this.createdAt = new Date();
  }

  // Public method
  public deposit(amount: number): void {
    this.balance += amount;
  }

  // Private method
  private validateAmount(amount: number): boolean {
    return amount > 0;
  }

  // Getter (property-like access)
  get currentBalance(): number {
    return this.balance;
  }

  // Setter
  set currentBalance(value: number) {
    if (value >= 0) {
      this.balance = value;
    }
  }
}

// Usage
const account = new BankAccount("123", "John", 1000);
account.deposit(500);
console.log(account.currentBalance);  // 1500 (using getter)
// account.balance = 0;  // ERROR: private
```

### Comparison with C#

| TypeScript | C# |
|------------|-----|
| `public name: string` | `public string Name { get; set; }` |
| `private balance: number` | `private decimal _balance` |
| `protected owner: string` | `protected string Owner` |
| `readonly createdAt: Date` | `public DateTime CreatedAt { get; }` |
| `get balance()` | `public decimal Balance { get }` |

## Classes from Codebase

### Repository Pattern

```typescript
// From src/main/database/repositories/drug.repository.ts
export class DrugRepository {
  private db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  /**
   * Get all drugs for a case
   */
  findByCaseId(caseId: string): CaseDrug[] {
    const rows = this.db.prepare(`
      SELECT * FROM case_drugs
      WHERE case_id = ?
      ORDER BY sort_order ASC
    `).all(caseId) as Record<string, unknown>[];

    return rows.map(row => {
      const drug = this.mapRowToDrug(row);
      drug.substances = this.getSubstances(drug.id!);
      drug.dosages = this.getDosages(drug.id!);
      return drug;
    });
  }

  /**
   * Get a single drug by ID
   */
  findById(id: number): CaseDrug | null {
    const row = this.db.prepare(
      'SELECT * FROM case_drugs WHERE id = ?'
    ).get(id) as Record<string, unknown> | undefined;

    if (!row) {
      return null;
    }

    const drug = this.mapRowToDrug(row);
    drug.substances = this.getSubstances(id);
    drug.dosages = this.getDosages(id);
    return drug;
  }

  /**
   * Create a new drug
   */
  create(drug: Omit<CaseDrug, 'id'>): CaseDrug {
    // ... implementation
  }

  /**
   * Map database row to CaseDrug object
   */
  private mapRowToDrug(row: Record<string, unknown>): CaseDrug {
    return {
      id: row.id as number,
      caseId: row.case_id as string,
      characterization: row.characterization as DrugCharacterization,
      productName: row.product_name as string,
      // ... more mappings
    };
  }
}
```

### Service Class

```typescript
// From src/main/services/form3500Mapper.ts
export class Form3500AMapper {
  /**
   * Map Form 3500A data to case entities
   */
  map(formData: Form3500AData): MappedCaseData {
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
    const { patient, event, manufacturer } = formData;

    const caseData: UpdateCaseDTO = {
      reportType: ReportType.Spontaneous,
      patientAge: patient.age,
      patientSex: this.mapSex(patient.sex),
      // ...
    };

    return this.removeUndefined(caseData);
  }

  private mapSex(sex?: string): PatientSex | undefined {
    if (!sex) return undefined;
    if (sex === 'Male') return PatientSex.Male;
    if (sex === 'Female') return PatientSex.Female;
    return undefined;
  }

  private removeUndefined<T extends object>(obj: T): T {
    return Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== undefined)
    ) as T;
  }
}
```

## Implementing Interfaces

```typescript
interface Repository<T> {
  findById(id: number): T | null;
  findAll(): T[];
  create(item: Omit<T, 'id'>): T;
  update(id: number, item: Partial<T>): T | null;
  delete(id: number): boolean;
}

// Class implementing interface
class DrugRepository implements Repository<CaseDrug> {
  private db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  findById(id: number): CaseDrug | null {
    // Must implement this
  }

  findAll(): CaseDrug[] {
    // Must implement this
  }

  create(drug: Omit<CaseDrug, 'id'>): CaseDrug {
    // Must implement this
  }

  update(id: number, drug: Partial<CaseDrug>): CaseDrug | null {
    // Must implement this
  }

  delete(id: number): boolean {
    // Must implement this
  }
}
```

## Inheritance

```typescript
// Base class
class Animal {
  constructor(public name: string) { }

  speak(): void {
    console.log(`${this.name} makes a sound`);
  }
}

// Derived class
class Dog extends Animal {
  constructor(name: string, public breed: string) {
    super(name);  // Call parent constructor
  }

  // Override method
  speak(): void {
    console.log(`${this.name} barks!`);
  }

  // New method
  fetch(): void {
    console.log(`${this.name} fetches the ball`);
  }
}

// Usage
const dog = new Dog("Rex", "German Shepherd");
dog.speak();  // "Rex barks!"
dog.fetch();  // "Rex fetches the ball"
```

## Abstract Classes

```typescript
abstract class Shape {
  constructor(public color: string) { }

  // Abstract method (must be implemented by subclasses)
  abstract area(): number;

  // Concrete method (inherited as-is)
  describe(): string {
    return `A ${this.color} shape with area ${this.area()}`;
  }
}

class Rectangle extends Shape {
  constructor(
    color: string,
    public width: number,
    public height: number
  ) {
    super(color);
  }

  // Must implement abstract method
  area(): number {
    return this.width * this.height;
  }
}

class Circle extends Shape {
  constructor(color: string, public radius: number) {
    super(color);
  }

  area(): number {
    return Math.PI * this.radius ** 2;
  }
}
```

## Static Members

```typescript
class MathUtils {
  static PI = 3.14159;

  static add(a: number, b: number): number {
    return a + b;
  }

  static factorial(n: number): number {
    if (n <= 1) return 1;
    return n * MathUtils.factorial(n - 1);
  }
}

// Usage - no instance needed
console.log(MathUtils.PI);           // 3.14159
console.log(MathUtils.add(2, 3));    // 5
console.log(MathUtils.factorial(5)); // 120
```

## Generics

### Generic Functions

```typescript
// Generic function
function identity<T>(value: T): T {
  return value;
}

// Usage - type is inferred
const str = identity("hello");  // T is string
const num = identity(42);       // T is number

// Explicit type
const explicit = identity<string>("hello");
```

### Generic Classes

```typescript
class Stack<T> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }
}

// Usage
const numberStack = new Stack<number>();
numberStack.push(1);
numberStack.push(2);
console.log(numberStack.pop());  // 2

const stringStack = new Stack<string>();
stringStack.push("hello");
```

### Generic Constraints

```typescript
// T must have a 'length' property
function logLength<T extends { length: number }>(item: T): void {
  console.log(item.length);
}

logLength("hello");     // 5
logLength([1, 2, 3]);   // 3
// logLength(42);       // ERROR: number doesn't have length

// T must be a key of U
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const person = { name: "John", age: 30 };
const name = getProperty(person, "name");  // OK
// const invalid = getProperty(person, "invalid");  // ERROR
```

## Type Aliases vs Interfaces

Both can define object shapes, but have different use cases:

```typescript
// Interface - best for objects, can be extended
interface User {
  name: string;
  age: number;
}

interface Employee extends User {
  employeeId: string;
}

// Type alias - best for unions, primitives, tuples
type Status = "pending" | "approved" | "rejected";
type StringOrNumber = string | number;
type Point = [number, number];

// Type alias for object (works but interface preferred)
type UserType = {
  name: string;
  age: number;
};
```

### When to Use Which

| Use Interface | Use Type Alias |
|---------------|----------------|
| Object shapes | Union types |
| Class contracts | Primitive aliases |
| Extendable definitions | Tuples |
| API contracts | Computed types |

## Utility Types

TypeScript provides built-in utility types for common transformations:

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
}

// Partial<T> - all properties optional
type PartialUser = Partial<User>;
// { id?: number; name?: string; email?: string; age?: number; }

// Required<T> - all properties required
type RequiredUser = Required<Partial<User>>;

// Pick<T, K> - select specific properties
type UserName = Pick<User, "id" | "name">;
// { id: number; name: string; }

// Omit<T, K> - exclude specific properties
type UserWithoutEmail = Omit<User, "email">;
// { id: number; name: string; age: number; }

// Readonly<T> - all properties readonly
type ReadonlyUser = Readonly<User>;

// Record<K, V> - object with keys K and values V
type UserRoles = Record<string, User>;
// { [key: string]: User }
```

### Usage in Codebase

```typescript
// From drug.repository.ts
create(drug: Omit<CaseDrug, 'id'>): CaseDrug {
  // drug doesn't have id (it will be auto-generated)
}

update(id: number, drug: Partial<CaseDrug>): CaseDrug | null {
  // drug has all properties optional (only update what's provided)
}
```

## Next Steps

Now that you understand classes and interfaces, move on to:
- [Project Patterns](./03-project-patterns.md) - Architecture patterns used in this codebase

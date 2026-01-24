# TypeScript Quick Reference

A cheat sheet for common TypeScript syntax, mapped to C#/Java equivalents.

## Variable Declaration

| TypeScript | C# | Java |
|------------|-----|------|
| `const x = 5` | `const int x = 5` | `final int x = 5` |
| `let x = 5` | `var x = 5` | `var x = 5` |
| `let x: number` | `int x` | `int x` |
| `let x: string \| null = null` | `string? x = null` | `@Nullable String x = null` |

## Types

| TypeScript | C# | Java | Notes |
|------------|-----|------|-------|
| `string` | `string` | `String` | Always lowercase in TS |
| `number` | `int`/`double` | `int`/`double` | No int/float distinction |
| `boolean` | `bool` | `boolean` | |
| `null` | `null` | `null` | |
| `undefined` | N/A | N/A | TS has two null types |
| `any` | `dynamic` | `Object` | Escape hatch, avoid |
| `unknown` | `object` | `Object` | Safer than any |
| `void` | `void` | `void` | |
| `never` | N/A | N/A | Function never returns |

## Arrays

```typescript
// Declaration
const nums: number[] = [1, 2, 3];
const strs: Array<string> = ["a", "b"];

// Common methods
nums.push(4);                    // Add to end
nums.pop();                      // Remove from end
nums.length;                     // Get length
nums[0];                         // Access by index
nums.includes(2);                // Check if contains
nums.indexOf(2);                 // Find index
nums.slice(1, 3);                // Get subarray [1, 3)
nums.concat([4, 5]);             // Combine arrays
```

## Array Methods (Functional)

```typescript
const users = [{ name: "John", age: 30 }, { name: "Jane", age: 25 }];

// map - transform each item
const names = users.map(u => u.name);
// ["John", "Jane"]

// filter - keep items matching condition
const adults = users.filter(u => u.age >= 30);
// [{ name: "John", age: 30 }]

// find - get first match
const john = users.find(u => u.name === "John");
// { name: "John", age: 30 }

// some - check if any match
const hasJohn = users.some(u => u.name === "John");
// true

// every - check if all match
const allAdults = users.every(u => u.age >= 18);
// true

// reduce - aggregate to single value
const totalAge = users.reduce((sum, u) => sum + u.age, 0);
// 55

// forEach - iterate (no return)
users.forEach(u => console.log(u.name));
```

## Objects

```typescript
// Declaration
const user: { name: string; age: number } = { name: "John", age: 30 };

// Access
user.name;          // Dot notation
user["name"];       // Bracket notation

// Spread (copy)
const copy = { ...user };
const updated = { ...user, age: 31 };

// Destructuring
const { name, age } = user;

// Optional chaining
const city = user?.address?.city;  // undefined if any part is null

// Nullish coalescing
const name = user?.name ?? "Unknown";
```

## Functions

```typescript
// Named function
function add(a: number, b: number): number {
  return a + b;
}

// Arrow function
const add = (a: number, b: number): number => {
  return a + b;
};

// Arrow function (short)
const add = (a: number, b: number): number => a + b;

// Optional parameter
function greet(name: string, greeting?: string): string {
  return `${greeting || "Hello"}, ${name}!`;
}

// Default parameter
function greet(name: string, greeting: string = "Hello"): string {
  return `${greeting}, ${name}!`;
}

// Rest parameters
function sum(...numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0);
}
```

## Classes

```typescript
class Person {
  // Properties
  public name: string;
  private age: number;
  protected id: number;
  readonly createdAt: Date;

  // Constructor
  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
    this.id = Math.random();
    this.createdAt = new Date();
  }

  // Method
  greet(): string {
    return `Hello, I'm ${this.name}`;
  }

  // Getter
  get currentAge(): number {
    return this.age;
  }

  // Setter
  set currentAge(value: number) {
    this.age = value;
  }

  // Static method
  static create(name: string): Person {
    return new Person(name, 0);
  }
}

// Shorthand constructor
class Person {
  constructor(
    public name: string,
    private age: number
  ) { }
}

// Inheritance
class Employee extends Person {
  constructor(name: string, age: number, public department: string) {
    super(name, age);
  }

  greet(): string {
    return `${super.greet()}, I work in ${this.department}`;
  }
}
```

## Interfaces

```typescript
// Basic interface
interface User {
  id: number;
  name: string;
  email?: string;  // Optional
  readonly createdAt: Date;  // Read-only
}

// Interface with methods
interface Calculator {
  add(a: number, b: number): number;
  subtract(a: number, b: number): number;
}

// Extending interfaces
interface Employee extends User {
  department: string;
  managerId?: number;
}

// Implementing interface
class UserService implements Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
  subtract(a: number, b: number): number {
    return a - b;
  }
}
```

## Type Aliases

```typescript
// Simple alias
type ID = string | number;

// Object type
type User = {
  id: ID;
  name: string;
};

// Union type
type Status = "pending" | "approved" | "rejected";

// Intersection type
type Employee = User & {
  department: string;
};

// Utility types
type PartialUser = Partial<User>;       // All optional
type RequiredUser = Required<User>;     // All required
type ReadonlyUser = Readonly<User>;     // All readonly
type NameOnly = Pick<User, "name">;     // Only name
type NoId = Omit<User, "id">;           // Without id
```

## Generics

```typescript
// Generic function
function identity<T>(value: T): T {
  return value;
}
identity<string>("hello");
identity(42);  // Type inferred

// Generic class
class Stack<T> {
  private items: T[] = [];
  push(item: T): void { this.items.push(item); }
  pop(): T | undefined { return this.items.pop(); }
}

// Generic interface
interface Repository<T> {
  findById(id: number): T | null;
  findAll(): T[];
  create(item: T): T;
}

// Generic constraints
function getLength<T extends { length: number }>(item: T): number {
  return item.length;
}
```

## Async/Await

```typescript
// Async function
async function fetchUser(id: number): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  const data = await response.json();
  return data as User;
}

// Try/catch
async function safeGetUser(id: number): Promise<User | null> {
  try {
    return await fetchUser(id);
  } catch (error) {
    console.error("Failed:", error);
    return null;
  }
}

// Parallel execution
const [user, posts] = await Promise.all([
  fetchUser(1),
  fetchPosts(1)
]);
```

## Imports/Exports

```typescript
// Named exports
export const PI = 3.14159;
export function add(a: number, b: number): number { return a + b; }
export class Calculator { }
export interface User { }
export type Status = "active" | "inactive";

// Default export
export default class MainService { }

// Named imports
import { add, Calculator, User } from './utils';

// Default import
import MainService from './MainService';

// Import all
import * as Utils from './utils';

// Import types only
import type { User, Status } from './types';

// Re-export
export { User, Status } from './types';
export * from './utils';
```

## Common Patterns

### Null Handling

```typescript
// Optional chaining
const name = user?.profile?.name;

// Nullish coalescing
const name = user?.name ?? "Unknown";

// Type guard
if (user !== null && user !== undefined) {
  // user is defined here
}

// Short-circuit
const name = user && user.name;
```

### Type Guards

```typescript
// typeof
if (typeof value === "string") {
  // value is string
}

// instanceof
if (error instanceof Error) {
  // error is Error
}

// in operator
if ("name" in obj) {
  // obj has name property
}

// Custom type guard
function isUser(obj: unknown): obj is User {
  return typeof obj === "object" && obj !== null && "name" in obj;
}

if (isUser(data)) {
  // data is User
}
```

### Object Manipulation

```typescript
// Keys and values
const keys = Object.keys(obj);       // string[]
const values = Object.values(obj);   // unknown[]
const entries = Object.entries(obj); // [string, unknown][]

// From entries
const obj = Object.fromEntries([["a", 1], ["b", 2]]);
// { a: 1, b: 2 }

// Assign/merge
const merged = Object.assign({}, obj1, obj2);
const merged = { ...obj1, ...obj2 };
```

## Comparison with C#

| TypeScript | C# |
|------------|-----|
| `interface User { }` | `public class User { }` or `interface IUser { }` |
| `type Status = "a" \| "b"` | `enum Status { A, B }` |
| `user?.name ?? ""` | `user?.Name ?? ""` |
| `async/await` | `async/await` |
| `import { X } from './x'` | `using Namespace;` |
| `export class X { }` | `public class X { }` |
| `const x = { a: 1 }` | `var x = new { a = 1 };` |
| `arr.map(x => x * 2)` | `arr.Select(x => x * 2)` |
| `arr.filter(x => x > 0)` | `arr.Where(x => x > 0)` |
| `arr.find(x => x.id === 1)` | `arr.FirstOrDefault(x => x.Id == 1)` |
| `arr.some(x => x > 0)` | `arr.Any(x => x > 0)` |
| `arr.every(x => x > 0)` | `arr.All(x => x > 0)` |

## NPM Commands

```bash
# Install dependencies
npm install

# Add a package
npm install package-name
npm install -D package-name  # Dev dependency

# Run scripts
npm run dev          # Development mode
npm run build        # Production build
npm run typecheck    # Type checking
npm run lint         # Linting

# Update packages
npm update
npm outdated         # Check for updates
```

## VS Code Tips

1. **Hover** over any variable to see its type
2. **Ctrl/Cmd+Click** on a type to go to its definition
3. **F2** to rename a symbol across all files
4. **Ctrl/Cmd+Space** for autocomplete
5. **Ctrl/Cmd+.** for quick fixes (auto-import, etc.)
6. **Ctrl/Cmd+Shift+O** to find symbols in file

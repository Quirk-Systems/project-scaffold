// Shared type definitions for the project.
// Add application-wide types here.

export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

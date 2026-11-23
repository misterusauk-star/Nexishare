// Pure API key access rules (no DB). A read-only key can look but not change anything.
const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const methodAllowed = (readOnly: boolean, method: string): boolean => !readOnly || READ_METHODS.has(method.toUpperCase());
export const READ_ONLY_MESSAGE = "This key is read-only. Use a key with full access to create, change or delete.";

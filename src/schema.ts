export interface JsonOneOf {
  readonly kind: "oneOf";
  readonly possibilities: readonly JsonSchema[];
}

export const JsonOneOf = (possibilities: readonly JsonSchema[]): JsonOneOf => ({
  kind: "oneOf",
  possibilities: [...possibilities],
});

export interface JsonString {
  readonly kind: "string";
}

export const JsonString = (): JsonString => ({
  kind: "string",
});

export interface JsonStringHardcoded {
  readonly kind: "stringHardcoded";
  readonly value: string;
}

export const JsonStringHardcoded = (value: string): JsonStringHardcoded => ({
  kind: "stringHardcoded",
  value,
});

export interface JsonBoolean {
  readonly kind: "boolean";
}

export const JsonBoolean = (): JsonBoolean => ({
  kind: "boolean",
});

export interface JsonNull {
  readonly kind: "null";
}

export const JsonNull = (): JsonNull => ({
  kind: "null",
});

export interface JsonArray {
  readonly kind: "array";
  readonly of: JsonSchema;
}

export const JsonArray = (of: JsonSchema): JsonArray => ({
  kind: "array",
  of,
});

export interface JsonObject {
  readonly kind: "object";
  readonly fields: readonly JsonObjectField[];
}

export const JsonObject = (fields: readonly JsonObjectField[]): JsonObject => ({
  kind: "object",
  fields: [...fields],
});

export interface JsonObjectField {
  readonly key: string;
  readonly value: JsonSchema;
}

export const JsonObjectField = (
  key: string,
  value: JsonSchema,
): JsonObjectField => ({
  key,
  value,
});

export type JsonSchema =
  | JsonOneOf
  | JsonString
  | JsonStringHardcoded
  | JsonBoolean
  | JsonNull
  | JsonArray
  | JsonObject;

export interface CompatibilityIssue {
  readonly message: string;
}

export const CompatibilityIssue = (message: string): CompatibilityIssue => ({
  message,
});

export const prettyPrint = (jsonSchema: JsonSchema): string => {
  switch (jsonSchema.kind) {
    case "string":
      return "string";
    case "boolean":
      return "boolean";
    case "null":
      return "null";
    case "array":
      return `array<${prettyPrint(jsonSchema.of)}>`;
    case "object":
      return `{${jsonSchema.fields
        .map((field) => `${field.key}: ${prettyPrint(field.value)}`)
        .join(", ")}}`;
    case "stringHardcoded":
      return JSON.stringify(jsonSchema.value);
    case "oneOf":
      return jsonSchema.possibilities.map(prettyPrint).join(" | ");
  }
};

export const canRead = (
  newSchema: JsonSchema,
  oldSchema: JsonSchema,
): CompatibilityIssue[] => {
  const incompatible = (): CompatibilityIssue[] => [
    CompatibilityIssue(
      `new schema: ${prettyPrint(newSchema)} is incompatible with old schema: ${prettyPrint(oldSchema)}`,
    ),
  ];

  const anyMatch = (
    old: JsonSchema,
    newPossibilities: readonly JsonSchema[],
  ): CompatibilityIssue[] =>
    newPossibilities.some(
      (newPossibility) => canRead(newPossibility, old).length === 0,
    )
      ? []
      : incompatible();

  const normalizedOldSchema = clearOneOfsWithSingleElement(oldSchema);
  const normalizedNewSchema = clearOneOfsWithSingleElement(newSchema);

  switch (normalizedOldSchema.kind) {
    case "string":
      switch (normalizedNewSchema.kind) {
        case "string":
          return [];
        case "oneOf":
          return anyMatch(normalizedOldSchema, normalizedNewSchema.possibilities);
        default:
          return incompatible();
      }
    case "boolean":
      switch (normalizedNewSchema.kind) {
        case "boolean":
          return [];
        case "oneOf":
          return anyMatch(normalizedOldSchema, normalizedNewSchema.possibilities);
        default:
          return incompatible();
      }
    case "null":
      switch (normalizedNewSchema.kind) {
        case "null":
          return [];
        case "oneOf":
          return anyMatch(normalizedOldSchema, normalizedNewSchema.possibilities);
        default:
          return incompatible();
      }
    case "array":
      switch (normalizedNewSchema.kind) {
        case "array":
          return [];
        case "oneOf":
          return anyMatch(normalizedOldSchema, normalizedNewSchema.possibilities);
        default:
          return incompatible();
      }
    case "object":
      switch (normalizedNewSchema.kind) {
        case "object":
          return normalizedNewSchema.fields.flatMap((newField) => {
            const oldField = normalizedOldSchema.fields.find(
              (candidate) => candidate.key === newField.key,
            );

            if (oldField === undefined) {
              return canBeNull(newField.value) ? [] : incompatible();
            }

            return canRead(newField.value, oldField.value);
          });
        case "oneOf":
          return anyMatch(normalizedOldSchema, normalizedNewSchema.possibilities);
        default:
          return incompatible();
      }
    case "stringHardcoded":
      switch (normalizedNewSchema.kind) {
        case "stringHardcoded":
          return normalizedOldSchema.value === normalizedNewSchema.value
            ? []
            : incompatible();
        case "string":
          return [];
        case "oneOf":
          return anyMatch(normalizedOldSchema, normalizedNewSchema.possibilities);
        default:
          return incompatible();
      }
    case "oneOf":
      switch (normalizedNewSchema.kind) {
        case "oneOf":
          return normalizedOldSchema.possibilities.flatMap((oldPossibility) =>
            anyMatch(oldPossibility, normalizedNewSchema.possibilities),
          );
        default:
          return normalizedOldSchema.possibilities.flatMap((oldPossibility) =>
            canRead(newSchema, oldPossibility),
          );
      }
  }
};

export const canBeNull = (jsonSchema: JsonSchema): boolean => {
  switch (jsonSchema.kind) {
    case "oneOf":
      return jsonSchema.possibilities.some((possibility) => canBeNull(possibility));
    case "null":
      return true;
    default:
      return false;
  }
};

export const clearOneOfsWithSingleElement = (
  jsonSchema: JsonSchema,
): JsonSchema => {
  switch (jsonSchema.kind) {
    case "string":
    case "boolean":
    case "null":
    case "stringHardcoded":
      return jsonSchema;
    case "array":
      return JsonArray(clearOneOfsWithSingleElement(jsonSchema.of));
    case "object":
      return JsonObject(
        jsonSchema.fields.map((field) =>
          JsonObjectField(
            field.key,
            clearOneOfsWithSingleElement(field.value),
          ),
        ),
      );
    case "oneOf": {
      const clearedPossibilities = jsonSchema.possibilities.map(
        clearOneOfsWithSingleElement,
      );

      if (clearedPossibilities.length === 1) {
        return clearedPossibilities[0]!;
      }

      return JsonOneOf(clearedPossibilities);
    }
  }
};

import { JsonBoolean, JsonString, type JsonSchema } from "./schema.js";

export class JsonConversionError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "JsonConversionError";
  }
}

export type DecodeResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: JsonConversionError };

export interface JsonConverter<T> {
  readonly fromJson: (json: string) => DecodeResult<T>;
  readonly toJson: (value: T) => string;
}

export interface JsonDescriptor<T> {
  readonly schema: JsonSchema;
  readonly converter: JsonConverter<T>;
  readonly humanDoc: () => string;
}

export const JsonDescriptor = <T>(
  schema: JsonSchema,
  converter: JsonConverter<T>,
  humanDoc: () => string,
): JsonDescriptor<T> => ({
  schema,
  converter,
  humanDoc,
});

export const toJson = <T>(descriptor: JsonDescriptor<T>, value: T): string =>
  descriptor.converter.toJson(value);

export const fromJson = <T>(
  descriptor: JsonDescriptor<T>,
  json: string,
): DecodeResult<T> => descriptor.converter.fromJson(json);

export const imap = <T, Underlying>(
  underlying: JsonDescriptor<Underlying>,
  from: (value: Underlying) => T,
  to: (value: T) => Underlying,
): JsonDescriptor<T> =>
  JsonDescriptor<T>(
    underlying.schema,
    {
      fromJson: (json) => {
        const result = underlying.converter.fromJson(json);

        if (!result.ok) {
          return result;
        }

        return valid(from(result.value));
      },
      toJson: (value) => underlying.converter.toJson(to(value)),
    },
    underlying.humanDoc,
  );

const valid = <T>(value: T): DecodeResult<T> => ({
  ok: true,
  value,
});

const invalid = (error: JsonConversionError): DecodeResult<never> => ({
  ok: false,
  error,
});

const parseJson = (json: string): DecodeResult<unknown> => {
  try {
    return valid(JSON.parse(json) as unknown);
  } catch (error) {
    return invalid(new JsonConversionError("Invalid JSON.", { cause: error }));
  }
};

const describeJsonValue = (value: unknown): string => {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return "an array";
  }

  switch (typeof value) {
    case "string":
      return "a string";
    case "boolean":
      return "a boolean";
    case "number":
      return "a number";
    case "object":
      return "an object";
    default:
      return typeof value;
  }
};

const validateJsonType = <T>(
  value: unknown,
  expected: string,
  matches: (value: unknown) => value is T,
): DecodeResult<T> => {
  if (matches(value)) {
    return valid(value);
  }

  return invalid(
    new JsonConversionError(
      `Expected JSON ${expected}, received ${describeJsonValue(value)}.`,
    ),
  );
};

const decodeJson = <T>(
  json: string,
  expected: string,
  matches: (value: unknown) => value is T,
): DecodeResult<T> => {
  const parsed = parseJson(json);

  if (!parsed.ok) {
    return parsed;
  }

  const validated = validateJsonType(parsed.value, expected, matches);

  return validated;
};

const primitiveDescriptor = <T>(
  schema: JsonSchema,
  humanDocText: string,
  matches: (value: unknown) => value is T,
): JsonDescriptor<T> =>
  JsonDescriptor<T>(
    schema,
    {
      fromJson: (json) => decodeJson(json, humanDocText, matches),
      toJson: (value) => JSON.stringify(value),
    },
    () => humanDocText,
  );

export const jsonString = (): JsonDescriptor<string> =>
  primitiveDescriptor(JsonString(), "string", (value): value is string =>
    typeof value === "string",
  );

export const jsonBoolean = (): JsonDescriptor<boolean> =>
  primitiveDescriptor(JsonBoolean(), "boolean", (value): value is boolean =>
    typeof value === "boolean",
  );

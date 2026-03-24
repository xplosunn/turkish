import { JsonBoolean, JsonString, type JsonSchema } from "./schema.js";

export class JsonConversionError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "JsonConversionError";
  }
}

export const isJsonConversionError = (
  value: unknown,
): value is JsonConversionError => value instanceof JsonConversionError;

export interface JsonConverter<T> {
  readonly fromJson: (json: string) => T | JsonConversionError;
  readonly toJson: (value: T) => string;
}

export const JsonConverter = <T>(
  converter: JsonConverter<T>,
): JsonConverter<T> => converter;

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
): T | JsonConversionError => descriptor.converter.fromJson(json);

export const imap = <T, Underlying>(
  underlying: JsonDescriptor<Underlying>,
  from: (value: Underlying) => T,
  to: (value: T) => Underlying,
): JsonDescriptor<T> =>
  JsonDescriptor<T>(
    underlying.schema,
    JsonConverter<T>({
      fromJson: (json) => {
        const value = underlying.converter.fromJson(json);

        if (isJsonConversionError(value)) {
          return value;
        }

        try {
          return from(value);
        } catch (error) {
          return new JsonConversionError("Unable to map JSON value.", {
            cause: error,
          });
        }
      },
      toJson: (value) => underlying.converter.toJson(to(value)),
    }),
    underlying.humanDoc,
  );

const parseJson = (json: string): unknown | JsonConversionError => {
  try {
    return JSON.parse(json) as unknown;
  } catch (error) {
    return new JsonConversionError("Invalid JSON.", { cause: error });
  }
};

const describeParsedValue = (value: unknown): string => {
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

export const jsonString = (): JsonDescriptor<string> =>
  JsonDescriptor<string>(
    JsonString(),
    JsonConverter<string>({
      fromJson: (json) => {
        const value = parseJson(json);

        if (isJsonConversionError(value)) {
          return value;
        }

        if (typeof value !== "string") {
          return new JsonConversionError(
            `Expected JSON string, received ${describeParsedValue(value)}.`,
          );
        }

        return value;
      },
      toJson: (value) => JSON.stringify(value),
    }),
    () => "string",
  );

export const jsonBoolean = (): JsonDescriptor<boolean> =>
  JsonDescriptor<boolean>(
    JsonBoolean(),
    JsonConverter<boolean>({
      fromJson: (json) => {
        const value = parseJson(json);

        if (isJsonConversionError(value)) {
          return value;
        }

        if (typeof value !== "boolean") {
          return new JsonConversionError(
            `Expected JSON boolean, received ${describeParsedValue(value)}.`,
          );
        }

        return value;
      },
      toJson: (value) => JSON.stringify(value),
    }),
    () => "boolean",
  );

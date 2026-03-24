import assert from "node:assert/strict";
import test from "node:test";

import {
  JsonArray,
  JsonBoolean,
  JsonNull,
  JsonObject,
  JsonObjectField,
  JsonOneOf,
  JsonString,
  JsonStringHardcoded,
  canBeNull,
  canRead,
  clearOneOfsWithSingleElement,
  prettyPrint,
} from "../src/schema.js";

const expectNoIssues = (
  issues: ReturnType<typeof canRead>,
): void => {
  assert.deepStrictEqual(issues, []);
};

test("prettyPrint renders the upstream schema shapes", () => {
  assert.equal(prettyPrint(JsonString()), "string");
  assert.equal(prettyPrint(JsonBoolean()), "boolean");
  assert.equal(
    prettyPrint(
      JsonObject([
        JsonObjectField("name", JsonString()),
        JsonObjectField("enabled", JsonBoolean()),
      ]),
    ),
    "{name: string, enabled: boolean}",
  );
  assert.equal(
    prettyPrint(
      JsonOneOf([JsonStringHardcoded("red"), JsonStringHardcoded("blue")]),
    ),
    "\"red\" | \"blue\"",
  );
});

test("clearOneOfsWithSingleElement unwraps nested single-option unions", () => {
  assert.deepStrictEqual(
    clearOneOfsWithSingleElement(
      JsonOneOf([
        JsonOneOf([
          JsonObject([
            JsonObjectField("flag", JsonOneOf([JsonBoolean()])),
          ]),
        ]),
      ]),
    ),
    JsonObject([JsonObjectField("flag", JsonBoolean())]),
  );
});

test("canBeNull matches direct and union nullability", () => {
  assert.equal(canBeNull(JsonNull()), true);
  assert.equal(canBeNull(JsonBoolean()), false);
  assert.equal(canBeNull(JsonOneOf([JsonBoolean(), JsonNull()])), true);
});

test("canRead", () => {
  const newSchema = JsonBoolean();
  const oldSchema = JsonBoolean();

  expectNoIssues(canRead(newSchema, oldSchema));
  expectNoIssues(canRead(newSchema, JsonOneOf([oldSchema])));
  expectNoIssues(canRead(JsonOneOf([newSchema]), oldSchema));
  expectNoIssues(canRead(JsonOneOf([newSchema, JsonString()]), oldSchema));
  expectNoIssues(
    canRead(
      JsonOneOf([newSchema, JsonStringHardcoded("some_value")]),
      oldSchema,
    ),
  );
});

test("canRead object with one less field", () => {
  const newSchema = JsonObject([
    JsonObjectField("field1", JsonBoolean()),
  ]);
  const oldSchema = JsonObject([
    JsonObjectField("field1", JsonBoolean()),
    JsonObjectField("field2", JsonBoolean()),
  ]);

  expectNoIssues(canRead(newSchema, oldSchema));
});

test("canRead object with missing field as optional", () => {
  const newSchema = JsonObject([
    JsonObjectField("field1", JsonBoolean()),
    JsonObjectField("field2", JsonOneOf([JsonBoolean(), JsonNull()])),
  ]);
  const oldSchema = JsonObject([
    JsonObjectField("field1", JsonBoolean()),
  ]);

  expectNoIssues(canRead(newSchema, oldSchema));
});

test("canRead enum with one more possibility", () => {
  const newSchema = JsonOneOf([
    JsonStringHardcoded("red"),
    JsonStringHardcoded("blue"),
    JsonStringHardcoded("green"),
  ]);
  const oldSchema = JsonOneOf([
    JsonStringHardcoded("red"),
    JsonStringHardcoded("green"),
  ]);

  expectNoIssues(canRead(newSchema, oldSchema));
});

test("canRead string from enum", () => {
  const newSchema = JsonString();
  const oldSchema = JsonOneOf([
    JsonStringHardcoded("red"),
    JsonStringHardcoded("green"),
  ]);

  expectNoIssues(canRead(newSchema, oldSchema));
});

test("canRead option from non-option", () => {
  const newSchema = JsonOneOf([JsonString(), JsonNull()]);
  const oldSchema = JsonOneOf([
    JsonStringHardcoded("red"),
    JsonStringHardcoded("green"),
  ]);

  expectNoIssues(canRead(newSchema, oldSchema));
});

test("canRead fails for arrays with incompatible element types", () => {
  const newSchema = JsonArray(JsonString());
  const oldSchema = JsonArray(JsonBoolean());

  assert.equal(canRead(newSchema, oldSchema).length, 1);
});

test("canRead fails for incompatible types", () => {
  assert.equal(canRead(JsonString(), JsonBoolean()).length, 1);
});

test("canRead fails for enum with removed possibility", () => {
  const newSchema = JsonOneOf([
    JsonStringHardcoded("red"),
    JsonStringHardcoded("blue"),
  ]);
  const oldSchema = JsonOneOf([
    JsonStringHardcoded("red"),
    JsonStringHardcoded("blue"),
    JsonStringHardcoded("green"),
  ]);

  assert.equal(canRead(newSchema, oldSchema).length, 1);
});

test("canRead fails for object with non-optional new field", () => {
  const newSchema = JsonObject([
    JsonObjectField("field1", JsonBoolean()),
    JsonObjectField("field2", JsonBoolean()),
  ]);
  const oldSchema = JsonObject([
    JsonObjectField("field1", JsonBoolean()),
  ]);

  assert.equal(canRead(newSchema, oldSchema).length, 1);
});

test("canRead fails for incompatible field types", () => {
  const newSchema = JsonObject([
    JsonObjectField("field1", JsonString()),
  ]);
  const oldSchema = JsonObject([
    JsonObjectField("field1", JsonBoolean()),
  ]);

  assert.equal(canRead(newSchema, oldSchema).length, 1);
});

test("canRead fails for hardcoded string with different value", () => {
  assert.equal(
    canRead(
      JsonStringHardcoded("value1"),
      JsonStringHardcoded("value2"),
    ).length,
    1,
  );
});

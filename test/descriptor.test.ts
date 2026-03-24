import assert from "node:assert/strict";
import test from "node:test";

import {
  JsonConversionError,
  type DecodeResult,
  fromJson,
  imap,
  jsonBoolean,
  jsonString,
  toJson,
} from "../src/descriptor.js";

const expectValid = <T>(result: DecodeResult<T>): T => {
  if (!result.ok) {
    assert.fail(result.error.message);
  }

  return result.value;
};

test("imap writes values through the underlying descriptor", () => {
  const descriptor = imap<Error, string>(
    jsonString(),
    (value) => new Error(value),
    (error) => error.message,
  );

  assert.equal(descriptor.converter.toJson(new Error("hello")), "\"hello\"");
});

test("imap reads values through the underlying descriptor", () => {
  const descriptor = imap<Error, string>(
    jsonString(),
    (value) => new Error(value),
    (error) => error.message,
  );
  const result = descriptor.converter.fromJson("\"hello\"");

  const value = expectValid(result);

  assert.ok(value instanceof Error);
  assert.equal(value.message, "hello");
});

test("imap preserves human-readable docs", () => {
  const descriptor = imap<Error, string>(
    jsonString(),
    (value) => new Error(value),
    (error) => error.message,
  );

  assert.equal(descriptor.humanDoc(), "string");
});

test("jsonString writes values", () => {
  const descriptor = jsonString();

  assert.equal(toJson(descriptor, "hello"), "\"hello\"");
});

test("jsonString reads values", () => {
  const descriptor = jsonString();

  assert.equal(expectValid(fromJson(descriptor, "\"hello\"")), "hello");
});

test("jsonString reports type mismatches", () => {
  const descriptor = jsonString();
  const result = fromJson(descriptor, "true");

  assert.equal(result.ok, false);
  assert.ok(result.error instanceof JsonConversionError);
});

test("jsonString humanDoc", () => {
  assert.equal(jsonString().humanDoc(), "string");
});

test("jsonBoolean writes values", () => {
  const descriptor = jsonBoolean();

  assert.equal(toJson(descriptor, true), "true");
  assert.equal(toJson(descriptor, false), "false");
});

test("jsonBoolean reads values", () => {
  const descriptor = jsonBoolean();

  assert.equal(expectValid(fromJson(descriptor, "true")), true);
  assert.equal(expectValid(fromJson(descriptor, "false")), false);
});

test("jsonBoolean reports invalid JSON", () => {
  const descriptor = jsonBoolean();
  const result = fromJson(descriptor, "{");

  assert.equal(result.ok, false);
  assert.ok(result.error instanceof JsonConversionError);
});

test("jsonBoolean humanDoc", () => {
  assert.equal(jsonBoolean().humanDoc(), "boolean");
});

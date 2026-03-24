import assert from "node:assert/strict";
import test from "node:test";

import {
  JsonConversionError,
  fromJson,
  imap,
  jsonBoolean,
  jsonString,
  toJson,
} from "../src/descriptor.js";

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

  assert.ok(result instanceof Error);
  assert.equal(result.message, "hello");
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

  assert.equal(fromJson(descriptor, "\"hello\""), "hello");
});

test("jsonString reports type mismatches", () => {
  const descriptor = jsonString();
  const result = fromJson(descriptor, "true");

  assert.ok(result instanceof JsonConversionError);
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

  assert.equal(fromJson(descriptor, "true"), true);
  assert.equal(fromJson(descriptor, "false"), false);
});

test("jsonBoolean reports invalid JSON", () => {
  const descriptor = jsonBoolean();
  const result = fromJson(descriptor, "{");

  assert.ok(result instanceof JsonConversionError);
});

test("jsonBoolean humanDoc", () => {
  assert.equal(jsonBoolean().humanDoc(), "boolean");
});

# turkish

TypeScript port of [xplosunn/transporter](https://github.com/xplosunn/transporter).

The library exposes two layers:

- JSON schema values for describing payload shapes and comparing schema compatibility across versions.
- Typed JSON descriptors for encoding and decoding values while carrying their schema and human-readable docs.

## Example

```ts
import {
  JsonBoolean,
  JsonNull,
  JsonObject,
  JsonObjectField,
  JsonOneOf,
  JsonString,
  canRead,
  jsonString,
  imap,
} from "turkish";

const oldSchema = JsonObject([
  JsonObjectField("name", JsonString()),
]);

const newSchema = JsonObject([
  JsonObjectField("name", JsonString()),
  JsonObjectField("enabled", JsonOneOf([JsonBoolean(), JsonNull()])),
]);

const issues = canRead(newSchema, oldSchema);

const errorDescriptor = imap(
  jsonString(),
  (message) => new Error(message),
  (error) => error.message,
);
```

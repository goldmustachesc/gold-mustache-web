import { describe, expect, it } from "vitest";
import en from "../en/loyalty.json";
import es from "../es/loyalty.json";
import ptBR from "../pt-BR/loyalty.json";

type JsonPrimitive = boolean | null | number | string;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

interface JsonObject {
  [key: string]: JsonValue;
}

const MUSTACHE_PLACEHOLDER_PATTERN = /\{\{[^{}]+\}\}/;

function collectInvalidKeys(value: JsonValue, path: string[] = []): string[] {
  if (typeof value === "string") {
    return MUSTACHE_PLACEHOLDER_PATTERN.test(value) ? [path.join(".")] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectInvalidKeys(item, [...path, index.toString()]),
    );
  }

  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, nestedValue]) =>
      collectInvalidKeys(nestedValue, [...path, key]),
    );
  }

  return [];
}

function getNestedValue(
  value: JsonValue,
  path: string[],
): JsonValue | undefined {
  return path.reduce<JsonValue | undefined>((current, segment) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }

    return current[segment];
  }, value);
}

describe("loyalty locale messages", () => {
  const locales = [
    { locale: "pt-BR", messages: ptBR },
    { locale: "en", messages: en },
    { locale: "es", messages: es },
  ] as const;

  for (const { locale, messages } of locales) {
    it(`uses ICU placeholders in ${locale}`, () => {
      const invalidKeys = collectInvalidKeys(messages);

      expect(
        invalidKeys,
        `Invalid mustache placeholders found in ${locale}: ${invalidKeys.join(", ")}`,
      ).toEqual([]);
    });

    it(`defines history.empty in ${locale}`, () => {
      const emptyMessage = getNestedValue(messages, ["history", "empty"]);

      expect(emptyMessage).toEqual(expect.any(String));
      expect(emptyMessage).not.toBe("");
    });
  }
});

import { describe, it, expect } from "vitest";
import { maskPhone, maskZipCode, unmask } from "../masks";

describe("utils/masks", () => {
  it("maskPhone handles empty and partial inputs", () => {
    expect(maskPhone("")).toBe("");
    expect(maskPhone("1")).toBe("(1");
    expect(maskPhone("12")).toBe("(12");
    expect(maskPhone("123")).toBe("(12) 3");
    expect(maskPhone("123456")).toBe("(12) 3456");
  });

  it("maskPhone formats landline and mobile numbers", () => {
    expect(maskPhone("1234567")).toBe("(12) 3456-7");
    expect(maskPhone("1234567890")).toBe("(12) 3456-7890");
    expect(maskPhone("12345678901")).toBe("(12) 34567-8901");
  });

  it("maskPhone strips non-digits and truncates at 11", () => {
    expect(maskPhone("(12) 34567-8901xx")).toBe("(12) 34567-8901");
    expect(maskPhone("12a34b567c8901d2")).toBe("(12) 34567-8901");
  });

  it("maskZipCode handles empty, partial, and complete values", () => {
    expect(maskZipCode("")).toBe("");
    expect(maskZipCode("123")).toBe("123");
    expect(maskZipCode("12345")).toBe("12345");
    expect(maskZipCode("123456")).toBe("12345-6");
    expect(maskZipCode("12345678")).toBe("12345-678");
  });

  it("maskZipCode strips non-digits and truncates at 8", () => {
    expect(maskZipCode("12.345-678")).toBe("12345-678");
    expect(maskZipCode("123456789")).toBe("12345-678");
  });

  it("unmask removes all non-digit characters", () => {
    expect(unmask("(11) 98888-7777")).toBe("11988887777");
    expect(unmask("abc")).toBe("");
  });
});

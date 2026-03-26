import { describe, it, expect } from "vitest";
import {
  formatPhoneDisplay,
  isValidDateParam,
  isValidTimeParam,
  isValidPhone,
  isValidClientName,
  sanitizePhoneInput,
  computeCompletedSteps,
  canSubmitForm,
  buildDateOptions,
  formatDateDisplay,
  type SchedulingFormState,
} from "../scheduling";

describe("formatPhoneDisplay", () => {
  it("returns empty string for empty input", () => {
    expect(formatPhoneDisplay("")).toBe("");
  });

  it("formats 2-digit DDD only", () => {
    expect(formatPhoneDisplay("11")).toBe("(11");
  });

  it("formats partial number with DDD", () => {
    expect(formatPhoneDisplay("1199")).toBe("(11) 99");
  });

  it("formats 10-digit landline number", () => {
    expect(formatPhoneDisplay("1133224455")).toBe("(11) 3322-4455");
  });

  it("formats 11-digit mobile number", () => {
    expect(formatPhoneDisplay("11999887766")).toBe("(11) 99988-7766");
  });

  it("strips non-digit characters before formatting", () => {
    expect(formatPhoneDisplay("(11) 99988-7766")).toBe("(11) 99988-7766");
  });

  it("handles single digit", () => {
    expect(formatPhoneDisplay("1")).toBe("(1");
  });

  it("formats 6-digit partial", () => {
    expect(formatPhoneDisplay("119998")).toBe("(11) 9998");
  });
});

describe("isValidDateParam", () => {
  it("returns true for valid YYYY-MM-DD format", () => {
    expect(isValidDateParam("2025-12-15")).toBe(true);
  });

  it("returns false for null", () => {
    expect(isValidDateParam(null)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidDateParam("")).toBe(false);
  });

  it("returns false for DD/MM/YYYY format", () => {
    expect(isValidDateParam("15/12/2025")).toBe(false);
  });

  it("returns false for partial date", () => {
    expect(isValidDateParam("2025-12")).toBe(false);
  });

  it("returns false for random string", () => {
    expect(isValidDateParam("not-a-date")).toBe(false);
  });
});

describe("isValidTimeParam", () => {
  it("returns true for valid HH:MM format", () => {
    expect(isValidTimeParam("10:30")).toBe(true);
  });

  it("returns true for midnight", () => {
    expect(isValidTimeParam("00:00")).toBe(true);
  });

  it("returns false for null", () => {
    expect(isValidTimeParam(null)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidTimeParam("")).toBe(false);
  });

  it("returns false for HH:MM:SS format", () => {
    expect(isValidTimeParam("10:30:00")).toBe(false);
  });

  it("returns false for random string", () => {
    expect(isValidTimeParam("noon")).toBe(false);
  });
});

describe("isValidPhone", () => {
  it("returns true for 10-digit landline", () => {
    expect(isValidPhone("1133224455")).toBe(true);
  });

  it("returns true for 11-digit mobile", () => {
    expect(isValidPhone("11999887766")).toBe(true);
  });

  it("returns false for 9-digit number", () => {
    expect(isValidPhone("113322445")).toBe(false);
  });

  it("returns false for 12-digit number", () => {
    expect(isValidPhone("119998877660")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidPhone("")).toBe(false);
  });

  it("returns false for non-digit string", () => {
    expect(isValidPhone("abcdefghij")).toBe(false);
  });
});

describe("isValidClientName", () => {
  it("returns true for name with 2+ chars", () => {
    expect(isValidClientName("Jo")).toBe(true);
  });

  it("returns true for full name", () => {
    expect(isValidClientName("João Silva")).toBe(true);
  });

  it("returns false for single character", () => {
    expect(isValidClientName("J")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidClientName("")).toBe(false);
  });

  it("returns false for whitespace-only", () => {
    expect(isValidClientName("   ")).toBe(false);
  });

  it("trims before validating", () => {
    expect(isValidClientName("  Jo  ")).toBe(true);
  });
});

describe("sanitizePhoneInput", () => {
  it("strips non-digit characters", () => {
    expect(sanitizePhoneInput("(11) 99988-7766")).toBe("11999887766");
  });

  it("limits to 11 digits", () => {
    expect(sanitizePhoneInput("119998877660")).toBe("11999887766");
  });

  it("returns empty string for non-digit input", () => {
    expect(sanitizePhoneInput("abc")).toBe("");
  });

  it("passes through clean digits", () => {
    expect(sanitizePhoneInput("11999")).toBe("11999");
  });
});

describe("computeCompletedSteps", () => {
  const baseState: SchedulingFormState = {
    clientName: "",
    clientPhone: "",
    selectedServiceId: "",
    selectedDate: "",
    selectedTime: "",
  };

  it("returns 0 when nothing is filled", () => {
    expect(computeCompletedSteps(baseState)).toBe(0);
  });

  it("returns 1 when only client name is valid", () => {
    expect(computeCompletedSteps({ ...baseState, clientName: "João" })).toBe(1);
  });

  it("returns 2 when name and phone are valid", () => {
    expect(
      computeCompletedSteps({
        ...baseState,
        clientName: "João",
        clientPhone: "11999887766",
      }),
    ).toBe(2);
  });

  it("returns 5 when all fields are filled", () => {
    expect(
      computeCompletedSteps({
        clientName: "João Silva",
        clientPhone: "11999887766",
        selectedServiceId: "svc-1",
        selectedDate: "2025-12-15",
        selectedTime: "10:30",
      }),
    ).toBe(5);
  });

  it("counts non-contiguous completions", () => {
    expect(
      computeCompletedSteps({
        ...baseState,
        selectedServiceId: "svc-1",
        selectedTime: "10:30",
      }),
    ).toBe(2);
  });
});

describe("canSubmitForm", () => {
  const validState: SchedulingFormState = {
    clientName: "João Silva",
    clientPhone: "11999887766",
    selectedServiceId: "svc-1",
    selectedDate: "2025-12-15",
    selectedTime: "10:30",
  };

  it("returns true when all fields are valid and not pending", () => {
    expect(canSubmitForm(validState, false)).toBe(true);
  });

  it("returns false when isPending is true", () => {
    expect(canSubmitForm(validState, true)).toBe(false);
  });

  it("returns false when client name is too short", () => {
    expect(canSubmitForm({ ...validState, clientName: "J" }, false)).toBe(
      false,
    );
  });

  it("returns false when phone is invalid", () => {
    expect(canSubmitForm({ ...validState, clientPhone: "123" }, false)).toBe(
      false,
    );
  });

  it("returns false when service is not selected", () => {
    expect(canSubmitForm({ ...validState, selectedServiceId: "" }, false)).toBe(
      false,
    );
  });

  it("returns false when date is not selected", () => {
    expect(canSubmitForm({ ...validState, selectedDate: "" }, false)).toBe(
      false,
    );
  });

  it("returns false when time is not selected", () => {
    expect(canSubmitForm({ ...validState, selectedTime: "" }, false)).toBe(
      false,
    );
  });
});

describe("buildDateOptions", () => {
  it("returns the requested number of date options", () => {
    const options = buildDateOptions(7);
    expect(options).toHaveLength(7);
  });

  it("returns dates in YYYY-MM-DD format", () => {
    const options = buildDateOptions(1);
    expect(options[0].value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("includes display date in DD/MM/YYYY format", () => {
    const options = buildDateOptions(1);
    expect(options[0].display).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it("includes weekday name", () => {
    const options = buildDateOptions(1);
    expect(options[0].weekday).toBeTruthy();
    expect(typeof options[0].weekday).toBe("string");
  });

  it("marks first date as today", () => {
    const options = buildDateOptions(3);
    expect(options[0].isToday).toBe(true);
    expect(options[1].isToday).toBe(false);
  });

  it("returns sequential dates", () => {
    const options = buildDateOptions(3);
    const day0 = new Date(options[0].value);
    const day1 = new Date(options[1].value);
    const day2 = new Date(options[2].value);
    expect(day1.getTime() - day0.getTime()).toBe(86400000);
    expect(day2.getTime() - day1.getTime()).toBe(86400000);
  });
});

describe("formatDateDisplay", () => {
  it("converts YYYY-MM-DD to DD/MM/YYYY", () => {
    expect(formatDateDisplay("2025-12-15")).toBe("15/12/2025");
  });

  it("handles single-digit day and month", () => {
    expect(formatDateDisplay("2025-01-05")).toBe("05/01/2025");
  });
});

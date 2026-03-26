import { formatDateToString, getBrazilDateString } from "@/utils/time-slots";

export interface SchedulingFormState {
  clientName: string;
  clientPhone: string;
  selectedServiceId: string;
  selectedDate: string;
  selectedTime: string;
}

export interface DateOption {
  value: string;
  display: string;
  weekday: string;
  isToday: boolean;
}

const DATE_PARAM_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PARAM_REGEX = /^\d{2}:\d{2}$/;
const PHONE_REGEX = /^\d{10,11}$/;
const MIN_CLIENT_NAME_LENGTH = 2;
const MAX_PHONE_DIGITS = 11;

export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function isValidDateParam(value: string | null): value is string {
  return Boolean(value && DATE_PARAM_REGEX.test(value));
}

export function isValidTimeParam(value: string | null): value is string {
  return Boolean(value && TIME_PARAM_REGEX.test(value));
}

export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone);
}

export function isValidClientName(name: string): boolean {
  return name.trim().length >= MIN_CLIENT_NAME_LENGTH;
}

export function sanitizePhoneInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, MAX_PHONE_DIGITS);
}

export function computeCompletedSteps(state: SchedulingFormState): number {
  return [
    isValidClientName(state.clientName),
    isValidPhone(state.clientPhone),
    !!state.selectedServiceId,
    !!state.selectedDate,
    !!state.selectedTime,
  ].filter(Boolean).length;
}

export function canSubmitForm(
  state: SchedulingFormState,
  isPending: boolean,
): boolean {
  return (
    !!state.selectedServiceId &&
    !!state.selectedDate &&
    !!state.selectedTime &&
    isValidClientName(state.clientName) &&
    isValidPhone(state.clientPhone) &&
    !isPending
  );
}

export function buildDateOptions(days: number): DateOption[] {
  const todayStr = getBrazilDateString();

  return Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const value = formatDateToString(date);
    const [year, month, day] = value.split("-");
    const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
    const weekday = dateObj.toLocaleDateString("pt-BR", { weekday: "long" });

    return {
      value,
      display: `${day}/${month}/${year}`,
      weekday,
      isToday: value === todayStr,
    };
  });
}

export function formatDateDisplay(dateStr: string): string {
  return dateStr.split("-").reverse().join("/");
}

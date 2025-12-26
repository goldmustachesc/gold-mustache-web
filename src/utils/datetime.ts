export const SAO_PAULO_TIMEZONE = "America/Sao_Paulo" as const;

type ZonedDateParts = {
  year: string;
  month: string;
  day: string;
};

type ZonedDateTimeParts = ZonedDateParts & {
  hour: string;
  minute: string;
  second: string;
};

function pickPart(parts: Intl.DateTimeFormatPart[], type: string): string {
  return parts.find((p) => p.type === type)?.value ?? "";
}

function getZonedDateParts(date: Date, timeZone: string): ZonedDateParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  return {
    year: pickPart(parts, "year"),
    month: pickPart(parts, "month"),
    day: pickPart(parts, "day"),
  };
}

function getZonedDateTimeParts(
  date: Date,
  timeZone: string,
): ZonedDateTimeParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  return {
    year: pickPart(parts, "year"),
    month: pickPart(parts, "month"),
    day: pickPart(parts, "day"),
    hour: pickPart(parts, "hour"),
    minute: pickPart(parts, "minute"),
    second: pickPart(parts, "second"),
  };
}

/**
 * Formata uma data "date-only" no padrão dd-MM-yyyy a partir de uma string ISO
 * no formato "YYYY-MM-DD" (ou "YYYY-MM-DDTHH:mm:ss...").
 *
 * Importante: para datas "date-only", não devemos aplicar timezone, senão há
 * risco de "shift" (ex.: 00:00Z virar dia anterior em America/Sao_Paulo).
 */
export function formatDateDdMmYyyyFromIsoDateLike(input: string): string {
  const isoDate = input.split("T")[0];
  const [year, month, day] = isoDate.split("-");

  if (!year || !month || !day) return input;

  return `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`;
}

/**
 * Formata um Date (timestamp) em America/Sao_Paulo no padrão dd-MM-yyyy.
 */
export function formatDateDdMmYyyyInSaoPaulo(date: Date): string {
  const { year, month, day } = getZonedDateParts(date, SAO_PAULO_TIMEZONE);
  return `${day}-${month}-${year}`;
}

/**
 * Formata um Date (timestamp) em America/Sao_Paulo no padrão HH:mm (24h).
 */
export function formatTimeHHmmInSaoPaulo(date: Date): string {
  const { hour, minute } = getZonedDateTimeParts(date, SAO_PAULO_TIMEZONE);
  return `${hour}:${minute}`;
}

/**
 * Formata um Date (timestamp) em America/Sao_Paulo no padrão dd-MM-yyyy HH:mm.
 */
export function formatDateTimeDdMmYyyyHHmmInSaoPaulo(date: Date): string {
  return `${formatDateDdMmYyyyInSaoPaulo(date)} ${formatTimeHHmmInSaoPaulo(date)}`;
}

/**
 * Gera a string ISO date-only (YYYY-MM-DD) usando America/Sao_Paulo.
 * Use para serializar datas selecionadas no calendário mantendo a referência
 * do "dia" no fuso de São Paulo (mesmo se o runtime estiver em UTC).
 */
export function formatIsoDateYyyyMmDdInSaoPaulo(date: Date): string {
  const { year, month, day } = getZonedDateParts(date, SAO_PAULO_TIMEZONE);
  return `${year}-${month}-${day}`;
}

/**
 * Parse de data no formato dd-MM-yyyy para ISO date-only YYYY-MM-DD.
 * (Não valida calendário; apenas formato.)
 */
export function parseDateDdMmYyyyToIsoDate(displayDate: string): string | null {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(displayDate);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

/**
 * Converte uma data ISO date-only (YYYY-MM-DD) para um Date "estável" para
 * lógica de negócio em São Paulo.
 *
 * Retorna um Date em UTC ao meio-dia, para evitar virar o dia anterior quando o
 * runtime estiver em UTC e a formatação/leitura for feita em America/Sao_Paulo.
 */
export function parseIsoDateYyyyMmDdAsSaoPauloDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

/**
 * Formata uma data ISO date-only ("YYYY-MM-DD" ou "YYYY-MM-DDTHH...") para texto
 * localizado (i18n) usando timezone de São Paulo.
 *
 * Use isso para o blog, onde a data deve respeitar o idioma do usuário.
 */
export function formatLocalizedDateFromIsoDateLike(
  input: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  const isoDate = input.split("T")[0];
  const date = parseIsoDateYyyyMmDdAsSaoPauloDate(isoDate);
  return new Intl.DateTimeFormat(locale, {
    timeZone: SAO_PAULO_TIMEZONE,
    ...options,
  }).format(date);
}

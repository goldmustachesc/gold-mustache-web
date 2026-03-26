/**
 * Utilitários de máscara para formatação de campos de input.
 */

/**
 * Aplica máscara de telefone brasileiro.
 * Formatos suportados:
 * - (99) 99999-9999 (celular)
 * - (99) 9999-9999 (fixo)
 */
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  // Celular com 9 dígitos
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Aplica máscara de CEP brasileiro.
 * Formato: 99999-999
 */
export function maskZipCode(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length === 0) return "";
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/**
 * Remove máscara de um valor, retornando apenas os dígitos.
 */
export function unmask(value: string): string {
  return value.replace(/\D/g, "");
}

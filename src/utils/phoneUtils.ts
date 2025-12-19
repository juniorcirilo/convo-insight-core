/**
 * Normaliza número de telefone brasileiro adicionando código do país
 * - Remove caracteres especiais
 * - Adiciona código do país 55 se não presente
 * - Valida tamanho mínimo/máximo
 */
export function normalizeBrazilianPhone(phone: string): string {
  // Remove tudo que não é dígito
  const digits = phone.replace(/\D/g, '');
  
  // Se já começa com 55 e tem tamanho adequado (12-13 dígitos), retorna como está
  if (digits.startsWith('55') && digits.length >= 12 && digits.length <= 13) {
    return digits;
  }
  
  // Se tem 10-11 dígitos (DDD + número), adiciona 55
  if (digits.length >= 10 && digits.length <= 11) {
    return `55${digits}`;
  }
  
  // Retorna o que temos (pode estar inválido, mas será validado pelo Zod)
  return digits;
}

/**
 * Verifica se um número de telefone tem formato válido brasileiro
 */
export function isValidBrazilianPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  
  // Aceita com ou sem código do país (55)
  // Com 55: 12-13 dígitos (5511987654321 ou 551187654321)
  // Sem 55: 10-11 dígitos (11987654321 ou 1187654321)
  return (
    (digits.length >= 10 && digits.length <= 11) || // Sem código país
    (digits.startsWith('55') && digits.length >= 12 && digits.length <= 13) // Com código país
  );
}

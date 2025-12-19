/**
 * Extrai o domínio de um endereço de email
 */
export function extractDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() || "";
}

/**
 * Verifica se o domínio do email é permitido
 */
export function isDomainAllowed(
  email: string,
  allowedDomains: string[],
  isRestrictionEnabled: boolean
): boolean {
  // Se restrição não está habilitada, permite qualquer domínio
  if (!isRestrictionEnabled) return true;

  // Se não há domínios configurados, permite qualquer domínio
  if (allowedDomains.length === 0) return true;

  const domain = extractDomain(email);

  // Verifica se o domínio está na lista de permitidos
  return allowedDomains.some(
    (allowed) =>
      domain === allowed.toLowerCase() ||
      domain.endsWith("." + allowed.toLowerCase())
  );
}

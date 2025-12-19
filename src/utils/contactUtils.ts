/**
 * Utility function to detect if a contact name is missing or invalid
 * A name is considered missing if it equals the phone number
 */
export function isContactNameMissing(name: string, phoneNumber: string): boolean {
  if (!name || !phoneNumber) return false;
  
  // Name is missing if it's exactly the phone number
  if (name === phoneNumber) return true;
  
  // Also check normalized versions (only digits)
  const normalizedName = name.replace(/\D/g, '');
  const normalizedPhone = phoneNumber.replace(/\D/g, '');
  
  return normalizedName === normalizedPhone && normalizedName.length > 0;
}

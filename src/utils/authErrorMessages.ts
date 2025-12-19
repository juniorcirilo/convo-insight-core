/**
 * Translates common Supabase authentication error messages to Portuguese
 */
export function translateAuthError(errorMessage: string): string {
  const translations: Record<string, string> = {
    'Email not confirmed': 'Email não confirmado. Verifique sua caixa de entrada e clique no link de confirmação.',
    'Invalid login credentials': 'Email ou senha incorretos',
    'User already registered': 'Este email já está cadastrado',
    'Password should be at least 6 characters': 'A senha deve ter no mínimo 6 caracteres',
    'Unable to validate email address: invalid format': 'Formato de email inválido',
    'Signup requires a valid password': 'Senha inválida',
    'User not found': 'Usuário não encontrado',
    'Email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos.',
    'Invalid email or password': 'Email ou senha incorretos',
    'Email link is invalid or has expired': 'Link de confirmação inválido ou expirado',
    'Token has expired or is invalid': 'Token expirado ou inválido',
    'New password should be different from the old password': 'A nova senha deve ser diferente da senha anterior',
  };
  
  return translations[errorMessage] || errorMessage;
}

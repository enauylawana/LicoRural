import * as Crypto from 'expo-crypto';

/**
 * Hash SHA-256 de "usuario:senha" em hexadecimal.
 * O Apps Script (função gerarHash) calcula exatamente o mesmo valor,
 * então a planilha nunca guarda a senha em texto puro.
 */
export function hashSenha(usuario: string, senha: string) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${usuario.trim().toLowerCase()}:${senha}`,
  );
}

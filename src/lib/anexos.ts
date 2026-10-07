import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Copia o arquivo escolhido (que o sistema pode apagar do cache) para a pasta
 * de documentos do app, garantindo que o anexo sobreviva ao fechar o aplicativo.
 */
export async function guardarAnexo(uri: string, nome: string): Promise<string> {
  if (Platform.OS === 'web') return uri;
  try {
    const pasta = new Directory(Paths.document, 'anexos');
    pasta.create({ intermediates: true, idempotent: true });
    const destino = new File(pasta, `${Date.now()}-${nome.replace(/[^\w.-]/g, '_')}`);
    await new File(uri).copy(destino);
    return destino.uri;
  } catch {
    return uri;
  }
}

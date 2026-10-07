# Lico Rural — Aplicativo Rural (Lico Systems)

Protótipo acadêmico de aplicativo móvel para **cadastro de produtores rurais e coleta de dados em campo**, com
**funcionamento offline** e sincronização com **Google Sheets** via **Google Apps Script**.

| Camada | Tecnologia |
| --- | --- |
| App | React Native + Expo (SDK 57) + Expo Router |
| Armazenamento local | AsyncStorage |
| Conectividade | @react-native-community/netinfo |
| Integração | Google Apps Script (`apps-script/Code.gs`) |
| Dados centrais | Google Sheets (abas `USUARIOS`, `PRODUTORES`, `FORMULARIOS`) |

## Telas

| Nº | Tela | Arquivo |
| --- | --- | --- |
| 01 | Splash | `src/app/index.tsx` |
| 02 | Login | `src/app/login.tsx` |
| 03 | Home | `src/app/(tabs)/inicio.tsx` |
| 04 | Lista de produtores | `src/app/(tabs)/produtores.tsx` |
| 05–07 | Cadastro de produtor (3 etapas) / edição | `src/app/produtor/novo.tsx` |
| 08 | Detalhe do produtor | `src/app/produtor/[id].tsx` |
| 09 | Lista de formulários | `src/app/(tabs)/formularios.tsx` |
| 10–11 | Preenchimento do formulário + anexos e fotos | `src/app/formulario/novo.tsx` |
| — | Detalhe do formulário | `src/app/formulario/[id].tsx` |
| 12 | Sincronização | `src/app/(tabs)/sincronizar.tsx` |
| — | Meus Dados (perfil, URL do servidor, sair) | `src/app/perfil.tsx` |

## Como rodar o app

```bash
npm install
npx expo start
```

Abra no celular com o **Expo Go** (QR code) ou pressione `a` (Android) / `w` (navegador).

Sem configurar o servidor, o app abre em **modo demonstração**: login `joao` / `1234`, tudo é salvo no
aparelho e a sincronização informa que falta a URL do Apps Script.

## Como configurar o Google Sheets + Apps Script

1. Abra a planilha do projeto:
   <https://docs.google.com/spreadsheets/d/1geNuyJmBvu3XPeR5fwuYPQtj0Nidc1GOGQYpt9cNbNg/edit>
   (o ID está fixado em `PLANILHA_ID` no `Code.gs`; para usar outra planilha, troque esse valor).
2. Menu **Extensões → Apps Script**. Apague o conteúdo e cole `apps-script/Code.gs`.
   Em *Configurações do projeto*, marque "Mostrar arquivo de manifesto" e cole `apps-script/appsscript.json`.
3. Selecione a função **`configurarPlanilha`** e clique em **Executar** (autorize o acesso).
   Ela cria as abas e dois usuários de exemplo: `joao` / `1234` e `maria` / `1234`.
4. **Implantar → Nova implantação → App da Web**
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
5. Copie a URL terminada em `/exec` e informe ao app de uma das formas:
   - arquivo `.env.local` (veja `.env.example`): `EXPO_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec`
     e reinicie com `npx expo start --clear`; **ou**
   - no app, em **Meus Dados → Servidor (Google Apps Script)**.

Para criar outros usuários, use o menu **Lico Rural → Adicionar usuário** na planilha. A senha é gravada como
hash SHA-256 de `usuario:senha` — o mesmo cálculo feito pelo app (`src/lib/hash.ts`).

> Ao alterar o `Code.gs`, crie uma **nova versão** da implantação (Implantar → Gerenciar implantações → Editar),
> senão a URL continua executando o código antigo.

## Como funciona o offline

```
Usuário preenche → AsyncStorage (status PENDENTE) → fila_sincronizacao
        → internet volta → Apps Script (ação "sincronizar", em lote) → Google Sheets
        → confirmação por registro → status SINCRONIZADO (ou ERRO, mantendo o registro local)
```

- **Chaves locais** (`src/lib/storage.ts`): `sessao_usuario`, `produtores_local`, `formularios_local`,
  `fila_sincronizacao`, `ultima_sincronizacao`.
- **IDs gerados no aparelho** (`P-XXXXXXXXXX`, `F-XXXXXXXXXX`): não dependem de sequência do Sheets,
  então funcionam offline.
- **Sem duplicidade**: o Apps Script faz *upsert* pela coluna `ID`; reenviar o mesmo registro atualiza a linha.
- **Sincronização automática** ao abrir o app, após salvar com internet e quando a conexão volta; também
  há o botão "Sincronizar agora".
- Se o registro for editado durante o envio, ele continua pendente (a versão enviada era a antiga).
- Se o app for fechado no meio do envio, o registro volta a `PENDENTE` ao reabrir.
- **Login offline**: após o primeiro login com internet, o mesmo usuário pode entrar sem conexão
  (a credencial fica guardada como hash). "Lembrar de mim" mantém a sessão ao reabrir o app.
- **Anexos**: fotos e documentos são copiados para a pasta do app no aparelho; a planilha recebe a relação dos
  arquivos (coluna `Anexos`).

## API do Apps Script

Todas as chamadas são `POST` para a URL `/exec` com corpo JSON `{ "action": ..., ... }`.

| Ação | Função |
| --- | --- |
| `login` | Valida `usuario` + `senhaHash` na aba USUARIOS e devolve um `token`. |
| `listarProdutores` | Retorna os produtores (exige `token`). |
| `listarFormularios` | Retorna os formulários (exige `token`). |
| `salvarProdutor` | Adiciona ou atualiza uma linha em PRODUTORES. |
| `salvarFormulario` | Adiciona ou atualiza uma linha em FORMULARIOS. |
| `sincronizar` | Processa em lote `registros: [{ tipo, dados }]` e devolve o resultado de cada um. |

## Roteiro de testes (seção 18 do projeto)

1. Login válido (`joao`/`1234`) e inválido (senha errada → mensagem de erro).
2. Cadastrar produtor com internet → status "Enviado" e linha na aba PRODUTORES.
3. Ativar o **modo avião** → cadastrar produtor e preencher formulário → status "Pendente"; banner "Offline".
4. Fechar e reabrir o app → registros pendentes continuam lá.
5. Desativar o modo avião → sincronização automática → status "Enviado".
6. Conferir as abas PRODUTORES e FORMULARIOS no Sheets.
7. Tocar "Sincronizar agora" novamente → nenhuma linha duplicada.
8. Trocar a URL por uma inválida em Meus Dados → sincronização mostra erro e mantém os registros locais.

## Comandos úteis

```bash
npm run typecheck   # verificação de tipos
npx expo lint       # lint
npx expo-doctor     # diagnóstico de dependências
```

## Limitações

Adequado para demonstração acadêmica. O Google Sheets tem limitações de segurança, concorrência e volume; em uma
versão comercial, o caminho natural é substituir o Sheets por uma API e banco de dados próprios, mantendo o
app offline-first.

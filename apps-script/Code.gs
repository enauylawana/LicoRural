/**
 * LICO SYSTEMS — Aplicativo Rural
 * API em Google Apps Script que intermedeia o app e a planilha Google Sheets.
 *
 * Instalação (resumo — veja o README do projeto):
 *   1. Abra a planilha (PLANILHA_ID abaixo), vá em Extensões > Apps Script e cole este arquivo.
 *   2. Execute a função `configurarPlanilha` uma vez (cria as abas e os usuários de exemplo).
 *   3. Implantar > Nova implantação > App da Web
 *        Executar como: Eu | Quem pode acessar: Qualquer pessoa
 *   4. Copie a URL terminada em /exec para o app (.env.local ou tela Meus Dados).
 *
 * Todas as requisições chegam por POST com um JSON { action, ... }.
 */

var VERSAO = '1.0.0';

// Planilha onde o app grava os dados:
// https://docs.google.com/spreadsheets/d/1geNuyJmBvu3XPeR5fwuYPQtj0Nidc1GOGQYpt9cNbNg/edit
var PLANILHA_ID = '1geNuyJmBvu3XPeR5fwuYPQtj0Nidc1GOGQYpt9cNbNg';

function planilha() {
  return SpreadsheetApp.openById(PLANILHA_ID);
}

// Cabeçalho da planilha -> campo do JSON trocado com o app.
var ABAS = {
  USUARIOS: [
    ['ID', 'id'],
    ['Nome', 'nome'],
    ['Usuario', 'usuario'],
    ['Senha_Hash', 'senhaHash'],
    ['Perfil', 'perfil'],
    ['Ativo', 'ativo'],
  ],
  PRODUTORES: [
    ['ID', 'id'],
    ['Nome', 'nome'],
    ['CPF', 'cpf'],
    ['Telefone', 'telefone'],
    ['Nascimento', 'nascimento'],
    ['Email', 'email'],
    ['CEP', 'cep'],
    ['Municipio', 'municipio'],
    ['UF', 'uf'],
    ['Endereco', 'endereco'],
    ['Complemento', 'complemento'],
    ['Latitude', 'latitude'],
    ['Longitude', 'longitude'],
    ['Propriedade', 'propriedade'],
    ['Area_ha', 'area'],
    ['Atividade', 'atividade'],
    ['Observacoes', 'observacoes'],
    ['Usuario', 'usuario'],
    ['Data', 'data'],
    ['Criado_Em', 'criadoEm'],
    ['Atualizado_Em', 'atualizadoEm'],
    ['Recebido_Em', 'recebidoEm'],
  ],
  FORMULARIOS: [
    ['ID', 'id'],
    ['Produtor_ID', 'produtorId'],
    ['Usuario', 'usuario'],
    ['Modelo', 'modelo'],
    ['Possui_Pecuaria', 'possuiPecuaria'],
    ['Qtd_Animais', 'quantidadeAnimais'],
    ['Finalidade', 'finalidade'],
    ['Area_Pastagem_ha', 'areaPastagem'],
    ['Observacoes', 'observacoes'],
    ['Anexos', 'anexos'],
    ['Status', 'status'],
    ['Data', 'data'],
    ['Criado_Em', 'criadoEm'],
    ['Atualizado_Em', 'atualizadoEm'],
    ['Recebido_Em', 'recebidoEm'],
  ],
};

// ---------------------------------------------------------------------------
// Entrada HTTP
// ---------------------------------------------------------------------------

function doGet() {
  return responder({ ok: true, app: 'Lico Rural', versao: VERSAO });
}

function doPost(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    switch (req.action) {
      case 'login':
        return responder(login(req.usuario, req.senhaHash));
      case 'listarProdutores':
        autorizar(req.token);
        return responder({ ok: true, produtores: listar('PRODUTORES') });
      case 'listarFormularios':
        autorizar(req.token);
        return responder({ ok: true, formularios: listar('FORMULARIOS') });
      case 'salvarProdutor':
        autorizar(req.token);
        return responder({ ok: true, id: comTrava(function () { return salvarProdutor(req.dados); }) });
      case 'salvarFormulario':
        autorizar(req.token);
        return responder({ ok: true, id: comTrava(function () { return salvarFormulario(req.dados); }) });
      case 'sincronizar':
        autorizar(req.token);
        return responder({ ok: true, resultados: comTrava(function () { return sincronizar(req.registros || []); }) });
      default:
        return responder({ ok: false, code: 'erro', erro: 'Ação desconhecida: ' + req.action });
    }
  } catch (err) {
    return responder({ ok: false, code: err.code || 'erro', erro: err.message || String(err) });
  }
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function falha(code, mensagem) {
  var e = new Error(mensagem);
  e.code = code;
  return e;
}

/** Evita que duas sincronizações simultâneas gravem a mesma linha. */
function comTrava(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Autenticação
// ---------------------------------------------------------------------------

function login(usuario, senhaHash) {
  usuario = String(usuario || '').trim().toLowerCase();
  var u = buscarUsuario(usuario);
  if (!u || String(u.senhaHash).toLowerCase() !== String(senhaHash || '').toLowerCase()) {
    throw falha('credenciais', 'Usuário ou senha inválidos.');
  }
  if (String(u.ativo).toLowerCase() !== 'sim') {
    throw falha('credenciais', 'Usuário inativo. Procure o administrador.');
  }
  var token = Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty('token_' + token, JSON.stringify({ usuario: usuario, criadoEm: new Date().toISOString() }));
  return {
    ok: true,
    token: token,
    usuario: { id: String(u.id), nome: u.nome, usuario: usuario, perfil: u.perfil },
  };
}

/** O token é emitido no login e continua válido enquanto o usuário estiver ativo. */
function autorizar(token) {
  var raw = token && PropertiesService.getScriptProperties().getProperty('token_' + token);
  if (!raw) throw falha('nao_autorizado', 'Sessão inválida. Entre novamente.');
  var usuario = JSON.parse(raw).usuario;
  var u = buscarUsuario(usuario);
  if (!u || String(u.ativo).toLowerCase() !== 'sim') throw falha('nao_autorizado', 'Usuário inativo.');
  return usuario;
}

function buscarUsuario(usuario) {
  var lista = listar('USUARIOS');
  for (var i = 0; i < lista.length; i++) {
    if (String(lista[i].usuario).trim().toLowerCase() === usuario) return lista[i];
  }
  return null;
}

/** SHA-256 de "usuario:senha" em hexadecimal — o mesmo cálculo feito pelo app. */
function gerarHash(usuario, senha) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(usuario).trim().toLowerCase() + ':' + senha,
    Utilities.Charset.UTF_8
  );
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

// ---------------------------------------------------------------------------
// Leitura e gravação
// ---------------------------------------------------------------------------

function aba(nome) {
  var sh = planilha().getSheetByName(nome);
  if (!sh) throw falha('erro', 'Aba ' + nome + ' não encontrada. Execute configurarPlanilha.');
  return sh;
}

function listar(nome) {
  var sh = aba(nome);
  var campos = ABAS[nome];
  var n = sh.getLastRow() - 1;
  if (n < 1) return [];
  var valores = sh.getRange(2, 1, n, campos.length).getDisplayValues();
  return valores
    .filter(function (linha) { return linha[0] !== ''; })
    .map(function (linha) {
      var obj = {};
      campos.forEach(function (c, i) { obj[c[1]] = linha[i]; });
      if (nome === 'USUARIOS') return obj;
      delete obj.recebidoEm;
      delete obj.data;
      return obj;
    });
}

/** Insere ou atualiza pela coluna ID — reenviar o mesmo registro não gera duplicidade. */
function upsert(nome, obj) {
  if (!obj || !obj.id) throw falha('erro', 'Registro sem ID.');
  var sh = aba(nome);
  var campos = ABAS[nome];
  var linha = campos.map(function (c) {
    var v = obj[c[1]];
    return v === null || v === undefined ? '' : String(v);
  });

  var ultima = sh.getLastRow();
  if (ultima > 1) {
    var ids = sh.getRange(2, 1, ultima - 1, 1).getDisplayValues();
    for (var i = 0; i < ids.length; i++) {
      if (ids[i][0] === String(obj.id)) {
        sh.getRange(i + 2, 1, 1, campos.length).setValues([linha]);
        return obj.id;
      }
    }
  }
  sh.getRange(ultima + 1, 1, 1, campos.length).setNumberFormat('@').setValues([linha]);
  return obj.id;
}

function dataLegivel(iso) {
  var d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) d = new Date();
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
}

function salvarProdutor(d) {
  if (!d || !d.nome) throw falha('erro', 'Produtor sem nome.');
  var obj = Object.assign({}, d, {
    data: dataLegivel(d.criadoEm),
    recebidoEm: new Date().toISOString(),
  });
  return upsert('PRODUTORES', obj);
}

function salvarFormulario(d) {
  if (!d || !d.produtorId) throw falha('erro', 'Formulário sem produtor.');
  var possui = d.possuiPecuaria === true ? 'Sim' : d.possuiPecuaria === false ? 'Não' : '';
  var obj = Object.assign({}, d, {
    possuiPecuaria: possui,
    status: 'Sincronizado',
    data: dataLegivel(d.criadoEm),
    recebidoEm: new Date().toISOString(),
  });
  return upsert('FORMULARIOS', obj);
}

/** Processa em lote os registros pendentes enviados pelo app. */
function sincronizar(registros) {
  return registros.map(function (r) {
    var id = r && r.dados && r.dados.id;
    try {
      if (r.tipo === 'produtor') salvarProdutor(r.dados);
      else if (r.tipo === 'formulario') salvarFormulario(r.dados);
      else throw new Error('Tipo desconhecido: ' + r.tipo);
      return { tipo: r.tipo, id: id, ok: true };
    } catch (err) {
      return { tipo: r && r.tipo, id: id, ok: false, erro: err.message || String(err) };
    }
  });
}

// ---------------------------------------------------------------------------
// Configuração da planilha
// ---------------------------------------------------------------------------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Lico Rural')
    .addItem('Configurar planilha', 'configurarPlanilha')
    .addItem('Adicionar usuário', 'adicionarUsuarioInterativo')
    .addToUi();
}

/** Cria as abas USUARIOS, PRODUTORES e FORMULARIOS e os usuários de exemplo. */
function configurarPlanilha() {
  var ss = planilha();
  Object.keys(ABAS).forEach(function (nome) {
    var sh = ss.getSheetByName(nome) || ss.insertSheet(nome);
    var cabecalho = ABAS[nome].map(function (c) { return c[0]; });
    sh.getRange(1, 1, 1, cabecalho.length)
      .setValues([cabecalho])
      .setFontWeight('bold')
      .setFontColor('#FFFFFF')
      .setBackground('#0A1A3A');
    sh.setFrozenRows(1);
    // Texto puro: preserva zeros à esquerda de CPF/CEP e evita conversão automática de datas.
    sh.getRange(2, 1, sh.getMaxRows() - 1, cabecalho.length).setNumberFormat('@');
    sh.autoResizeColumns(1, cabecalho.length);
  });

  if (listar('USUARIOS').length === 0) {
    criarUsuario('001', 'João Silva', 'joao', '1234', 'Técnico de Campo');
    criarUsuario('002', 'Maria Souza', 'maria', '1234', 'Administrador');
  }
  var padrao = ss.getSheetByName('Página1') || ss.getSheetByName('Sheet1');
  if (padrao && padrao.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(padrao);
}

function criarUsuario(id, nome, usuario, senha, perfil) {
  usuario = String(usuario).trim().toLowerCase();
  if (buscarUsuario(usuario)) throw new Error('Usuário ' + usuario + ' já existe.');
  var sh = aba('USUARIOS');
  // Formato texto antes de gravar: mantém o ID "001" em vez de convertê-lo para o número 1.
  sh.getRange(sh.getLastRow() + 1, 1, 1, 6)
    .setNumberFormat('@')
    .setValues([[id, nome, usuario, gerarHash(usuario, senha), perfil, 'Sim']]);
}

function adicionarUsuarioInterativo() {
  var ui = SpreadsheetApp.getUi();
  var perguntar = function (msg) {
    var r = ui.prompt('Novo usuário', msg, ui.ButtonSet.OK_CANCEL);
    if (r.getSelectedButton() !== ui.Button.OK) throw new Error('Cancelado');
    return r.getResponseText().trim();
  };
  try {
    var nome = perguntar('Nome completo:');
    var usuario = perguntar('Usuário (login):');
    var senha = perguntar('Senha:');
    var perfil = perguntar('Perfil (ex.: Técnico de Campo, Administrador):');
    var id = ('00' + (listar('USUARIOS').length + 1)).slice(-3);
    criarUsuario(id, nome, usuario, senha, perfil);
    ui.alert('Usuário ' + usuario + ' criado. A senha foi gravada como hash.');
  } catch (e) {
    if (e.message !== 'Cancelado') ui.alert('Erro: ' + e.message);
  }
}

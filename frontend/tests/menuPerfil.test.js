// Importa o runner de testes nativo do Node e as asserções estritas.
import test from 'node:test'
import assert from 'node:assert/strict'
// Importa as funções puras responsáveis pelas regras do menu superior.
import {
  linkEstaAtivo,
  obterClassesBreakpointMenu,
  obterLinksMenu,
  obterRotaInicioMenu,
} from '../src/utils/menuPerfil.js'

// Garante que a palavra "Perfil" foi removida dos itens textuais em todos os perfis.
test('remove o item textual Perfil para ADMIN, CLIENTE e COLABORADOR', () => {
  // Percorre os três papéis existentes no sistema.
  for (const tipo of ['ADMIN', 'CLIENTE', 'COLABORADOR']) {
    // Obtém os links renderizados para o perfil atual.
    const links = obterLinksMenu(tipo, '/inicio')
    // Verifica que nenhum item tem o rótulo "Perfil" ou aponta para "/perfil".
    assert.equal(links.some(([to, label]) => to === '/perfil' || label === 'Perfil'), false)
  }
})

// Garante que clicar na logo leva à rota inicial correta de cada perfil.
test('resolve rota inicial da logo para cada perfil logado', () => {
  // Admin deve ir para /admin.
  assert.equal(obterRotaInicioMenu('ADMIN'), '/admin')
  // Cliente deve ir para /cliente.
  assert.equal(obterRotaInicioMenu('CLIENTE'), '/cliente')
  // Colaborador (gerente) deve ir para /colaborador.
  assert.equal(obterRotaInicioMenu('COLABORADOR'), '/colaborador')
  // Perfil desconhecido volta para /login.
  assert.equal(obterRotaInicioMenu(undefined), '/login')
})

// Verifica a navegação específica do gerente (COLABORADOR): Início, Gestão de Obras e Notificações.
test('inclui Gestão de Obras para COLABORADOR apontando para /colaborador sem destaque duplicado', () => {
  // Carrega os links configurados para o gerente.
  const links = obterLinksMenu('COLABORADOR', '/colaborador')
  // Confirma a presença de "Gestão de Obras" apontando para "/colaborador".
  const itemGestao = links.find(([, label]) => label === 'Gestão de Obras')
  // Confirma a presença de "Início" apontando para "/colaborador".
  const itemInicio = links.find(([, label]) => label === 'Início')
  // Valida o destino de ambos.
  assert.equal(itemInicio?.[0], '/colaborador')
  assert.equal(itemGestao?.[0], '/colaborador')
  // Em /colaborador, apenas "Início" deve aparecer ativo.
  assert.equal(linkEstaAtivo(itemInicio, '/colaborador'), true)
  assert.equal(linkEstaAtivo(itemGestao, '/colaborador'), false)
  // Dentro de /colaborador/obra/123, apenas "Gestão de Obras" deve aparecer ativo.
  assert.equal(linkEstaAtivo(itemInicio, '/colaborador/obra/123'), false)
  assert.equal(linkEstaAtivo(itemGestao, '/colaborador/obra/123'), true)
})

// Garante que ADMIN mantém ocultação contextual de Gerentes dentro de /admin/obra/:id e recolhe abaixo de 1280px.
test('aplica breakpoint xl para ADMIN e lg para CLIENTE e COLABORADOR', () => {
  // Em /admin/obra/1, o item Gerentes continua oculto.
  const linksNaObra = obterLinksMenu('ADMIN', '/admin/obra/1')
  assert.equal(linksNaObra.some(([to]) => to === '/admin/funcionarios/gerentes'), false)
  // ADMIN recolhe abaixo de 1280px (xl).
  assert.equal(obterClassesBreakpointMenu('ADMIN').barraDesktop, 'hidden xl:flex')
  // CLIENTE e COLABORADOR recolhem abaixo de 1024px (lg).
  assert.equal(obterClassesBreakpointMenu('CLIENTE').barraDesktop, 'hidden lg:flex')
  assert.equal(obterClassesBreakpointMenu('COLABORADOR').barraDesktop, 'hidden lg:flex')
})

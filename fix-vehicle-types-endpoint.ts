// Fix para permitir que empresas acessem as categorias
// Substitua a linha 816 em server/routes.ts

// Código original:
if (!req.session.userId) {

// Código corrigido:
if (!req.session.userId && !req.session.companyId) {
import { pool } from './db';
import bcrypt from 'bcrypt';

async function setupCompanyPassword() {
  try {
    // Listar todas as empresas
    const { rows: companies } = await pool.query(`
      SELECT id, name, email, active, password
      FROM companies
      ORDER BY name
    `);

    console.log('\n=== EMPRESAS NO BANCO ===\n');

    if (companies.length === 0) {
      console.log('❌ Nenhuma empresa encontrada no banco de dados.');
      console.log('   Cadastre uma empresa primeiro através do painel admin.\n');
      return;
    }

    companies.forEach((company: any, index: number) => {
      console.log(`${index + 1}. ${company.name}`);
      console.log(`   Email: ${company.email || 'Sem email'}`);
      console.log(`   Status: ${company.active ? '✅ Ativa' : '❌ Inativa'}`);
      console.log(`   Senha: ${company.password ? '✅ Configurada' : '❌ Não configurada'}`);
      console.log('');
    });

    // Se houver empresas sem senha, configurar senha padrão para a primeira
    const companyWithoutPassword = companies.find((c: any) => !c.password && c.email);

    if (companyWithoutPassword) {
      console.log(`\n🔧 Configurando senha padrão para: ${companyWithoutPassword.name}`);
      console.log(`   Email: ${companyWithoutPassword.email}`);
      console.log(`   Senha padrão: 123456`);

      const hashedPassword = await bcrypt.hash('123456', 10);

      await pool.query(
        'UPDATE companies SET password = $1 WHERE id = $2',
        [hashedPassword, companyWithoutPassword.id]
      );

      console.log('✅ Senha configurada com sucesso!');
      console.log('\nVocê pode fazer login com:');
      console.log(`   Email: ${companyWithoutPassword.email}`);
      console.log(`   Senha: 123456`);
    } else {
      console.log('✅ Todas as empresas já possuem senha configurada.');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

setupCompanyPassword();

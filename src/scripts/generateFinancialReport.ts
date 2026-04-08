import { query } from '../config/database';
import fs from 'fs';
import path from 'path';

/**
 * Script de Relatório Financeiro para Tributação (LTDA / Simples Nacional)
 * 
 * Este script calcula:
 * 1. GMV (Gross Merchandise Volume) - Todo o dinheiro que passou pela plataforma.
 * 2. Receita Bruta (Take Rate) - Apenas as taxas/comissões que pertencem à Atos2.
 * 3. Estimativa de Imposto (Simples Nacional - Anexo III @ 6%).
 */

async function generateReport() {
  console.log('📊 Gerando Relatório Financeiro para Contabilidade...\n');

  try {
    const result = await query(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as mes,
        COUNT(*) as total_transacoes,
        SUM(amount) as gmv,
        SUM(COALESCE(fee, 0)) as receita_bruta,
        currency
      FROM transactions
      WHERE status = 'COMPLETED'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM'), currency
      ORDER BY mes DESC
    `);

    if (result.rows.length === 0) {
      console.log('⚠️ Nenhuma transação completada encontrada para gerar o relatório.');
      return;
    }

    let reportText = `RELATÓRIO FINANCEIRO ATOS2 - TRIBUTAÇÃO LTDA\n`;
    reportText += `Gerado em: ${new Date().toLocaleString()}\n`;
    reportText += `----------------------------------------------------------\n\n`;

    result.rows.forEach((row: any) => {
      const gmv = parseFloat(row.gmv);
      const receita = parseFloat(row.receita_bruta);
      const impostoEstimado = receita * 0.06; // Estimativa Simples Nacional Anexo III (6%)
      
      console.log(`Período: ${row.mes} (${row.currency})`);
      console.log(`  🔹 Transações: ${row.total_transacoes}`);
      console.log(`  🔹 GMV (Volume Total): ${row.currency} ${gmv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      console.log(`  🔹 Receita Bruta (Taxas): ${row.currency} ${receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      console.log(`  🔹 Imposto Estimado (6%): ${row.currency} ${impostoEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      console.log(`  🔸 Lucro Líquido Est.: ${row.currency} ${(receita - impostoEstimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`);

      reportText += `Período: ${row.mes} (${row.currency})\n`;
      reportText += `Volume Transacionado: ${gmv.toFixed(2)}\n`;
      reportText += `Faturamento (Taxas): ${receita.toFixed(2)}\n`;
      reportText += `Imposto Est. (6%): ${impostoEstimado.toFixed(2)}\n`;
      reportText += `----------------------------------------------------------\n`;
    });

    const reportPath = path.join(process.cwd(), 'relatorio_financeiro.txt');
    fs.writeFileSync(reportPath, reportText);
    console.log(`✅ Relatório gravado com sucesso em: ${reportPath}`);
    console.log(`\n💡 DICA: Envie este arquivo para seu contador mensalmente.`);
    
  } catch (error) {
    console.error('❌ Erro ao gerar relatório:', error);
  } finally {
    process.exit();
  }
}

generateReport();

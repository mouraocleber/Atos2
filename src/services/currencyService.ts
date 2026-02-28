import { query } from '../config/database';
import axios from 'axios';
import { CronJob } from 'cron';

export interface CurrencyRate {
  id: string;
  currency: string;
  rate: number;
  updatedAt: Date;
}

export interface GlobalCurrency {
  name: string;
  symbol: string;
  value: number;
  components: {
    usd: number;
    eur: number;
    jpy: number;
    cny: number;
    brl: number;
  };
  updatedAt: Date;
  nextUpdate: Date;
}

export class CurrencyService {
  private cronJob: CronJob | null = null;

  /**
   * Inicializar serviço de moeda
   * Agenda atualização diária às 00:00 horário de Brasília
   */
  async initialize(): Promise<void> {
    try {
      console.log('Inicializando serviço de moeda Global...');

      // Atualizar moeda na inicialização
      await this.updateGlobalCurrency();

      // Agendar atualização diária às 00:00 horário de Brasília (UTC-3)
      // Cron: 0 3 * * * (3:00 UTC = 00:00 Brasília)
      this.cronJob = new CronJob('0 3 * * *', async () => {
        console.log('Atualizando moeda Global...');
        await this.updateGlobalCurrency();
      });

      this.cronJob.start();
      console.log('Serviço de moeda Global inicializado com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar serviço de moeda:', error);
      throw error;
    }
  }

  /**
   * Obter taxa de câmbio atual
   */
  async getExchangeRate(currency: string): Promise<number> {
    try {
      const result = await query(
        `SELECT rate FROM currency_rates WHERE currency = $1 ORDER BY updated_at DESC LIMIT 1`,
        [currency.toUpperCase()]
      );

      if (result.rows.length === 0) {
        throw new Error(`Taxa de câmbio não encontrada para ${currency}`);
      }

      return result.rows[0].rate;
    } catch (error) {
      console.error('Erro ao obter taxa de câmbio:', error);
      throw error;
    }
  }

  /**
   * Obter moeda Global atual
   */
  async getGlobalCurrency(): Promise<GlobalCurrency> {
    try {
      const result = await query(
        `SELECT * FROM global_currency ORDER BY updated_at DESC LIMIT 1`
      );

      if (result.rows.length === 0) {
        throw new Error('Moeda Global não encontrada');
      }

      const row = result.rows[0];

      return {
        name: row.name,
        symbol: row.symbol,
        value: parseFloat(row.value),
        components: {
          usd: parseFloat(row.usd),
          eur: parseFloat(row.eur),
          jpy: parseFloat(row.jpy),
          cny: parseFloat(row.cny),
          brl: parseFloat(row.brl),
        },
        updatedAt: row.updated_at,
        nextUpdate: row.next_update,
      };
    } catch (error) {
      console.error('Erro ao obter moeda Global:', error);
      throw error;
    }
  }

  /**
   * Atualizar moeda Global
   * Calcula a média de 5 moedas: USD, EUR, JPY, CNY, BRL
   */
  async updateGlobalCurrency(): Promise<GlobalCurrency> {
    try {
      console.log('Iniciando atualização de moeda Global...');

      // Obter taxas de câmbio de API externa
      const rates = await this.fetchExchangeRates();

      // Calcular valor da moeda Global
      const globalValue =
        (rates.usd + rates.eur + rates.jpy + rates.cny + rates.brl) / 5;

      // Próxima atualização
      const nextUpdate = new Date();
      nextUpdate.setDate(nextUpdate.getDate() + 1);
      nextUpdate.setHours(0, 0, 0, 0);

      // Salvar no banco de dados
      const result = await query(
        `INSERT INTO global_currency (name, symbol, value, usd, eur, jpy, cny, brl, updated_at, next_update)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9)
         RETURNING *`,
        [
          'Global',
          'G',
          globalValue.toString(),
          rates.usd.toString(),
          rates.eur.toString(),
          rates.jpy.toString(),
          rates.cny.toString(),
          rates.brl.toString(),
          nextUpdate,
        ]
      );

      const row = result.rows[0];

      console.log(`Moeda Global atualizada: 1 G = ${globalValue.toFixed(4)}`);

      return {
        name: row.name,
        symbol: row.symbol,
        value: parseFloat(row.value),
        components: {
          usd: parseFloat(row.usd),
          eur: parseFloat(row.eur),
          jpy: parseFloat(row.jpy),
          cny: parseFloat(row.cny),
          brl: parseFloat(row.brl),
        },
        updatedAt: row.updated_at,
        nextUpdate: row.next_update,
      };
    } catch (error) {
      console.error('Erro ao atualizar moeda Global:', error);
      throw error;
    }
  }

  /**
   * Buscar taxas de câmbio de API externa
   * Usa API pública (ex: exchangerate-api.com)
   */
  private async fetchExchangeRates(): Promise<{
    usd: number;
    eur: number;
    jpy: number;
    cny: number;
    brl: number;
  }> {
    try {
      // Usar API pública de câmbio
      const apiUrl = 'https://api.exchangerate-api.com/v4/latest/USD';

      const response = await axios.get(apiUrl, {
        timeout: 10000,
      });

      const rates = response.data.rates;

      // Validar que todas as moedas estão disponíveis
      const requiredCurrencies = ['USD', 'EUR', 'JPY', 'CNY', 'BRL'];
      for (const currency of requiredCurrencies) {
        if (!rates[currency]) {
          throw new Error(`Taxa para ${currency} não encontrada`);
        }
      }

      return {
        usd: rates.USD || 1,
        eur: rates.EUR || 0.92,
        jpy: rates.JPY || 149.5,
        cny: rates.CNY || 7.24,
        brl: rates.BRL || 4.97,
      };
    } catch (error) {
      console.error('Erro ao buscar taxas de câmbio:', error);

      // Usar valores padrão em caso de erro
      console.log('Usando taxas padrão...');
      return {
        usd: 1.0,
        eur: 0.92,
        jpy: 149.5,
        cny: 7.24,
        brl: 4.97,
      };
    }
  }

  /**
   * Converter valor de Global para outra moeda
   */
  async convertFromGlobal(globalAmount: number, targetCurrency: string): Promise<number> {
    try {
      const globalCurrency = await this.getGlobalCurrency();
      const targetRate = await this.getExchangeRate(targetCurrency);

      // Converter Global para USD (usando valor médio)
      const usdAmount = globalAmount * globalCurrency.value;

      // Converter USD para moeda alvo
      return usdAmount * targetRate;
    } catch (error) {
      console.error('Erro ao converter moeda:', error);
      throw error;
    }
  }

  /**
   * Converter valor de outra moeda para Global
   */
  async convertToGlobal(amount: number, sourceCurrency: string): Promise<number> {
    try {
      const globalCurrency = await this.getGlobalCurrency();
      const sourceRate = await this.getExchangeRate(sourceCurrency);

      // Converter moeda origem para USD
      const usdAmount = amount / sourceRate;

      // Converter USD para Global
      return usdAmount / globalCurrency.value;
    } catch (error) {
      console.error('Erro ao converter moeda:', error);
      throw error;
    }
  }

  /**
   * Obter histórico de moeda Global
   */
  async getGlobalCurrencyHistory(days: number = 30): Promise<GlobalCurrency[]> {
    try {
      const result = await query(
        `SELECT * FROM global_currency 
         WHERE updated_at >= NOW() - INTERVAL '${days} days'
         ORDER BY updated_at DESC`
      );

      return result.rows.map((row) => ({
        name: row.name,
        symbol: row.symbol,
        value: parseFloat(row.value),
        components: {
          usd: parseFloat(row.usd),
          eur: parseFloat(row.eur),
          jpy: parseFloat(row.jpy),
          cny: parseFloat(row.cny),
          brl: parseFloat(row.brl),
        },
        updatedAt: row.updated_at,
        nextUpdate: row.next_update,
      }));
    } catch (error) {
      console.error('Erro ao obter histórico de moeda:', error);
      throw error;
    }
  }

  /**
   * Parar o serviço de atualização
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('Serviço de moeda Global parado');
    }
  }
}

export default new CurrencyService();


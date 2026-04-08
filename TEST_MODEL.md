# 🧪 Modelo de Testes Automatizados - Atos2

## 1. Configuração do Ambiente de Testes

### 1.1 Dependências Necessárias
```bash
npm install --save-dev jest @types/jest ts-jest
npm install --save-dev supertest @types/supertest
npm install --save-dev dotenv-cli
```

### 1.2 Arquivo de Configuração Jest
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
};
```

### 1.3 Arquivo .env.test
```env
NODE_ENV=test
DATABASE_URL=postgresql://user:password@localhost:5432/atos2_test
REDIS_URL=redis://localhost:6379/1
JWT_SECRET=test_secret_key
OPENAI_API_KEY=test_key
TWILIO_ACCOUNT_SID=test_sid
TWILIO_AUTH_TOKEN=test_token
TWILIO_PHONE_NUMBER=+1234567890
```

---

## 2. Estrutura de Testes

### 2.1 Testes Unitários

#### Teste de Cálculo de Taxas
```typescript
// src/services/__tests__/transactionService.test.ts
import { TransactionService } from '../transactionService';

describe('TransactionService', () => {
  const service = new TransactionService();

  describe('calculateFee', () => {
    it('deve retornar 0% para transferências entre usuários', () => {
      const fee = service.calculateFee(500, true);
      expect(fee).toBe(0);
    });

    it('deve retornar 1% para valores de 0,01 a 999,99', () => {
      const fee = service.calculateFee(500, false);
      expect(fee).toBe(5);
    });

    it('deve retornar 2% para valores de 1.000,00 a 4.999,99', () => {
      const fee = service.calculateFee(2000, false);
      expect(fee).toBe(40);
    });

    it('deve retornar 5% para valores acima de 5.000,00', () => {
      const fee = service.calculateFee(10000, false);
      expect(fee).toBe(500);
    });
  });
});
```

#### Teste de Validação de Usuário
```typescript
// src/services/__tests__/userService.test.ts
import { UserService } from '../userService';

describe('UserService', () => {
  const service = new UserService();

  describe('validateEmail', () => {
    it('deve aceitar email válido', () => {
      const result = service.validateEmail('user@example.com');
      expect(result).toBe(true);
    });

    it('deve rejeitar email inválido', () => {
      const result = service.validateEmail('invalid-email');
      expect(result).toBe(false);
    });
  });

  describe('validateCPF', () => {
    it('deve aceitar CPF válido', () => {
      const result = service.validateCPF('123.456.789-09');
      expect(result).toBe(true);
    });

    it('deve rejeitar CPF inválido', () => {
      const result = service.validateCPF('000.000.000-00');
      expect(result).toBe(false);
    });
  });
});
```

#### Teste de Tradução
```typescript
// src/services/__tests__/translationService.test.ts
import { TranslationService } from '../translationService';

describe('TranslationService', () => {
  const service = new TranslationService();

  describe('detectLanguage', () => {
    it('deve detectar português', () => {
      const lang = service.detectLanguage('Olá, como você está?');
      expect(lang).toBe('pt-BR');
    });

    it('deve detectar inglês', () => {
      const lang = service.detectLanguage('Hello, how are you?');
      expect(lang).toBe('en-US');
    });
  });
});
```

---

### 2.2 Testes de Integração

#### Teste de Registro
```typescript
// src/__tests__/auth.integration.test.ts
import request from 'supertest';
import app from '../index';

describe('Authentication Integration Tests', () => {
  describe('POST /api/auth/register', () => {
    it('deve registrar novo usuário com SMS', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          phone: '+55 11 99999-9999',
          name: 'João Silva',
          nickname: 'joao_silva',
          cpf: '123.456.789-09',
          cep: '01310-100',
          personType: 'PF',
          preferredLanguage: 'pt-BR',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('token');
    });

    it('deve rejeitar email inválido', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          name: 'João Silva',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/send-sms-code', () => {
    it('deve enviar código por SMS', async () => {
      const response = await request(app)
        .post('/api/auth/send-sms-code')
        .send({
          phone: '+55 11 99999-9999',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/auth/verify-code', () => {
    it('deve verificar código válido', async () => {
      const response = await request(app)
        .post('/api/auth/verify-code')
        .send({
          phone: '+55 11 99999-9999',
          code: '123456',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('verified');
    });

    it('deve rejeitar código inválido', async () => {
      const response = await request(app)
        .post('/api/auth/verify-code')
        .send({
          phone: '+55 11 99999-9999',
          code: '000000',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});
```

#### Teste de Transações
```typescript
// src/__tests__/transactions.integration.test.ts
import request from 'supertest';
import app from '../index';

describe('Transactions Integration Tests', () => {
  let token: string;
  let userId: string;
  let recipientId: string;

  beforeAll(async () => {
    // Setup: criar usuários de teste
    // ...
  });

  describe('POST /api/transactions/transfer', () => {
    it('deve transferir sem taxa entre usuários', async () => {
      const response = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${token}`)
        .send({
          recipientId,
          amount: 500,
          description: 'Teste de transferência',
        });

      expect(response.status).toBe(200);
      expect(response.body.fee).toBe(0);
      expect(response.body.totalAmount).toBe(500);
    });

    it('deve cobrar 1% para transferência externa de 500', async () => {
      const response = await request(app)
        .post('/api/transactions/external-transfer')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 500,
          bankDetails: {
            bankName: 'Banco do Brasil',
            accountNumber: '123456-7',
            accountHolder: 'João Silva',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.fee).toBe(5);
      expect(response.body.totalAmount).toBe(505);
    });

    it('deve cobrar 2% para transferência externa de 2000', async () => {
      const response = await request(app)
        .post('/api/transactions/external-transfer')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 2000,
          bankDetails: {
            bankName: 'Banco do Brasil',
            accountNumber: '123456-7',
            accountHolder: 'João Silva',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.fee).toBe(40);
      expect(response.body.totalAmount).toBe(2040);
    });

    it('deve cobrar 5% para transferência externa de 10000', async () => {
      const response = await request(app)
        .post('/api/transactions/external-transfer')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 10000,
          bankDetails: {
            bankName: 'Banco do Brasil',
            accountNumber: '123456-7',
            accountHolder: 'João Silva',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.fee).toBe(500);
      expect(response.body.totalAmount).toBe(10500);
    });

    it('deve rejeitar transferência com saldo insuficiente', async () => {
      const response = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${token}`)
        .send({
          recipientId,
          amount: 999999,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Saldo insuficiente');
    });
  });

  describe('GET /api/transactions', () => {
    it('deve listar transações do usuário', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('deve filtrar por tipo de transação', async () => {
      const response = await request(app)
        .get('/api/transactions?type=TRANSFER')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.every((t: any) => t.type === 'TRANSFER')).toBe(true);
    });
  });
});
```

#### Teste de QR Code
```typescript
// src/__tests__/qrcode.integration.test.ts
import request from 'supertest';
import app from '../index';

describe('QR Code Integration Tests', () => {
  let token: string;

  describe('POST /api/qrcode/generate', () => {
    it('deve gerar QR Code do usuário', async () => {
      const response = await request(app)
        .post('/api/qrcode/generate')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('qrCode');
      expect(response.body).toHaveProperty('expiresAt', null); // Nunca expira
    });
  });

  describe('POST /api/qrcode/scan', () => {
    it('deve conectar usuários via QR Code', async () => {
      const response = await request(app)
        .post('/api/qrcode/scan')
        .set('Authorization', `Bearer ${token}`)
        .send({
          qrData: 'user-id-encoded-in-qr',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('contactAdded');
    });
  });
});
```

---

### 2.3 Testes de Performance

#### Teste de Carga
```typescript
// src/__tests__/performance.test.ts
describe('Performance Tests', () => {
  it('deve processar 100 transferências em menos de 5 segundos', async () => {
    const startTime = Date.now();

    for (let i = 0; i < 100; i++) {
      await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${token}`)
        .send({
          recipientId,
          amount: 10,
        });
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(5000);
  });

  it('deve buscar 1000 transações em menos de 1 segundo', async () => {
    const startTime = Date.now();

    await request(app)
      .get('/api/transactions?limit=1000')
      .set('Authorization', `Bearer ${token}`);

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(1000);
  });
});
```

---

## 3. Executar Testes

### 3.1 Comando Básico
```bash
npm test
```

### 3.2 Testes Específicos
```bash
# Apenas testes unitários
npm test -- --testPathPattern="unit"

# Apenas testes de integração
npm test -- --testPathPattern="integration"

# Apenas testes de performance
npm test -- --testPathPattern="performance"

# Com cobertura
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### 3.3 Configuração no package.json
```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "test:all": "npm run test:unit && npm run test:integration"
  }
}
```

---

## 4. Cobertura de Testes

### 4.1 Metas de Cobertura
| Tipo | Meta |
|------|------|
| Statements | > 80% |
| Branches | > 75% |
| Functions | > 80% |
| Lines | > 80% |

### 4.2 Gerar Relatório
```bash
npm test -- --coverage --coverageReporters=html
# Abrir: coverage/index.html
```

---

## 5. Testes de Segurança

### 5.1 Teste de Autenticação
```typescript
describe('Security Tests', () => {
  it('deve rejeitar requisição sem token', async () => {
    const response = await request(app)
      .get('/api/transactions');

    expect(response.status).toBe(401);
  });

  it('deve rejeitar token inválido', async () => {
    const response = await request(app)
      .get('/api/transactions')
      .set('Authorization', 'Bearer invalid_token');

    expect(response.status).toBe(401);
  });

  it('deve rejeitar token expirado', async () => {
    const expiredToken = generateExpiredToken();
    const response = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
  });
});
```

### 5.2 Teste de Validação de Entrada
```typescript
describe('Input Validation Tests', () => {
  it('deve rejeitar SQL injection', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: "'; DROP TABLE users; --",
        password: 'password',
      });

    expect(response.status).toBe(400);
  });

  it('deve rejeitar XSS', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: '<script>alert("xss")</script>',
      });

    expect(response.status).toBe(400);
  });
});
```

---

## 6. Testes de Banco de Dados

### 6.1 Setup e Teardown
```typescript
describe('Database Tests', () => {
  beforeAll(async () => {
    // Conectar ao banco de testes
    await initializeTestDatabase();
  });

  afterEach(async () => {
    // Limpar dados após cada teste
    await cleanupTestData();
  });

  afterAll(async () => {
    // Desconectar do banco
    await closeDatabase();
  });

  it('deve criar usuário no banco', async () => {
    // ...
  });
});
```

---

## 7. Relatório de Testes

### 7.1 Formato JSON
```bash
npm test -- --json --outputFile=test-results.json
```

### 7.2 Formato HTML
```bash
npm test -- --coverage --coverageReporters=html
```

---

## 8. Integração Contínua (CI/CD)

### 8.1 GitHub Actions
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v2
```

---

## 9. Checklist de Testes

- [ ] Todos os testes passam
- [ ] Cobertura > 80%
- [ ] Sem warnings
- [ ] Performance OK
- [ ] Segurança OK
- [ ] Banco de dados OK
- [ ] Integração OK

---

## 10. Referências

- Jest: https://jestjs.io/
- Supertest: https://github.com/visionmedia/supertest
- Testing Library: https://testing-library.com/


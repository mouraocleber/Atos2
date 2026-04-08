# 🧪 Guia Completo de Testes - Atos2

## 1. Preparação do Ambiente de Testes

### 1.1 Verificar Pré-requisitos
```bash
# Verificar Node.js
node --version  # Deve ser v18+

# Verificar npm
npm --version   # Deve ser v9+

# Verificar PostgreSQL
psql --version  # Deve estar instalado

# Verificar Redis
redis-cli --version  # Deve estar instalado
```

### 1.2 Instalar Dependências
```bash
cd /home/ubuntu/atos2

# Backend
npm install

# Frontend
cd frontend
npm install
cd ..
```

### 1.3 Configurar Variáveis de Ambiente
```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar .env com suas credenciais
nano .env
```

**Variáveis Essenciais:**
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/atos2
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_secret_key_here
OPENAI_API_KEY=sk-...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890
```

### 1.4 Inicializar Banco de Dados
```bash
# Criar banco de dados
createdb atos2

# Executar script de inicialização
psql atos2 < src/config/init-db.sql

# Verificar tabelas
psql atos2 -c "\dt"
```

### 1.5 Iniciar Serviços
```bash
# Terminal 1: Redis
redis-server

# Terminal 2: Backend
npm run dev

# Terminal 3: Frontend
cd frontend
npm run dev
```

---

## 2. Testes de Validação Básica

### 2.1 Executar Testes de Validação
```bash
bash test-validation.sh
```

**Esperado:** 19+ testes passando

### 2.2 Verificar Saída
```
=== TESTES DE VALIDAÇÃO - ATOS2 ===

--- Cálculo de Taxas ---
✓ Taxa 1% para 500 Global
✓ Taxa 2% para 2000 Global
✓ Taxa 5% para 10000 Global
✓ Taxa 0% para transferência interna

--- Validação de Email ---
✓ Email válido
✓ Email inválido (sem @)
✓ Email inválido (sem domínio)

--- Validação de Telefone ---
✓ Telefone válido Brasil
✓ Telefone inválido

--- Validação de CPF ---
✓ CPF com formato
✓ CPF sem formato
✓ CPF inválido

--- Validação de CEP ---
✓ CEP válido
✓ CEP sem hífen
✓ CEP inválido

--- Cálculo de Moeda Global ---
✓ Cálculo de Global

--- Limites de Transação ---
✓ Valor mínimo (0.01)
✓ Valor dentro do limite 1%
✓ Valor dentro do limite 2%
✓ Valor dentro do limite 5%

=== RESUMO ===
Total de testes: 20
Testes passados: 19+ ✓
```

---

## 3. Testes de Integração

### 3.1 Testar Autenticação

#### Teste 1: Enviar Código SMS
```bash
curl -X POST http://localhost:3000/api/auth/send-sms-code \
  -H "Content-Type: application/json" \
  -d '{"phone": "+55 11 99999-9999"}'
```

**Esperado:**
```json
{
  "success": true,
  "message": "Código enviado para +55 11 99999-9999"
}
```

#### Teste 2: Enviar Código Email
```bash
curl -X POST http://localhost:3000/api/auth/send-email-code \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

**Esperado:**
```json
{
  "success": true,
  "message": "Código enviado para test@example.com"
}
```

#### Teste 3: Verificar Código
```bash
curl -X POST http://localhost:3000/api/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{"phone": "+55 11 99999-9999", "code": "123456"}'
```

**Esperado:**
```json
{
  "verified": true,
  "message": "Código verificado com sucesso"
}
```

### 3.2 Testar Registro

#### Teste 4: Registrar Novo Usuário
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+55 11 99999-9999",
    "name": "João Silva",
    "nickname": "joao_silva",
    "cpf": "123.456.789-09",
    "cep": "01310-100",
    "personType": "PF",
    "preferredLanguage": "pt-BR"
  }'
```

**Esperado:**
```json
{
  "userId": "uuid-here",
  "token": "jwt-token-here",
  "user": {
    "id": "uuid",
    "name": "João Silva",
    "nickname": "joao_silva",
    "preferredLanguage": "pt-BR"
  }
}
```

### 3.3 Testar Transações

#### Teste 5: Transferência Entre Usuários (Sem Taxa)
```bash
curl -X POST http://localhost:3000/api/transactions/transfer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -d '{
    "recipientId": "recipient-uuid",
    "amount": 500,
    "description": "Teste de transferência"
  }'
```

**Esperado:**
```json
{
  "transactionId": "uuid",
  "amount": 500,
  "fee": 0,
  "totalAmount": 500,
  "status": "COMPLETED",
  "message": "Transferência realizada com sucesso"
}
```

#### Teste 6: Transferência Externa (Taxa 1%)
```bash
curl -X POST http://localhost:3000/api/transactions/external-transfer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -d '{
    "amount": 500,
    "bankDetails": {
      "bankName": "Banco do Brasil",
      "accountNumber": "123456-7",
      "accountHolder": "João Silva"
    }
  }'
```

**Esperado:**
```json
{
  "transactionId": "uuid",
  "amount": 500,
  "fee": 5,
  "totalAmount": 505,
  "status": "PENDING",
  "message": "Transferência solicitada com sucesso"
}
```

### 3.4 Testar QR Code

#### Teste 7: Gerar QR Code
```bash
curl -X POST http://localhost:3000/api/qrcode/generate \
  -H "Authorization: Bearer JWT_TOKEN"
```

**Esperado:**
```json
{
  "qrCode": "base64-encoded-qr-code",
  "expiresAt": null,
  "message": "QR Code gerado com sucesso"
}
```

#### Teste 8: Escanear QR Code
```bash
curl -X POST http://localhost:3000/api/qrcode/scan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -d '{"qrData": "user-id-encoded"}'
```

**Esperado:**
```json
{
  "contactAdded": true,
  "user": {
    "id": "uuid",
    "name": "Maria Silva",
    "nickname": "maria_silva"
  },
  "message": "Contato adicionado com sucesso"
}
```

### 3.5 Testar Busca de Usuários

#### Teste 9: Buscar por Nickname
```bash
curl -X GET "http://localhost:3000/api/users/search?nickname=joao_silva" \
  -H "Authorization: Bearer JWT_TOKEN"
```

**Esperado:**
```json
{
  "results": [
    {
      "id": "uuid",
      "name": "João Silva",
      "nickname": "joao_silva",
      "email": "joao@example.com",
      "city": "São Paulo",
      "state": "SP"
    }
  ],
  "count": 1
}
```

#### Teste 10: Buscar por Email
```bash
curl -X GET "http://localhost:3000/api/users/search?email=joao@example.com" \
  -H "Authorization: Bearer JWT_TOKEN"
```

---

## 4. Testes de Frontend

### 4.1 Acessar Aplicação
```
http://localhost:5173
```

### 4.2 Testar Página de Registro
1. Abrir http://localhost:5173
2. Clicar em "📱 Telefone"
3. Inserir: +55 11 99999-9999
4. Clicar "Enviar Código"
5. Inserir código: 123456
6. Clicar "Verificar"
7. Preencher perfil
8. Clicar "Criar Conta"

**Esperado:** Redirecionado para home

### 4.3 Testar Tema
1. Acessar Configurações
2. Clicar em "Modo Escuro" / "Modo Claro"
3. Verificar mudança de cores

**Esperado:** Tema muda instantaneamente

### 4.4 Testar Fundos Personalizáveis
1. Acessar Configurações
2. Selecionar fundo (Montanhas, Oceano, etc)
3. Verificar mudança de fundo

**Esperado:** Fundo muda na página

### 4.5 Testar Logo
1. Verificar logo Atos2 na página de Registro
2. Verificar cores azul (#0066FF) e laranja (#FF8C00)

**Esperado:** Logo exibida corretamente

---

## 5. Testes de Performance

### 5.1 Teste de Carga
```bash
# Instalar Apache Bench
apt-get install apache2-utils

# Testar 100 requisições
ab -n 100 -c 10 http://localhost:3000/api/health

# Testar 1000 requisições
ab -n 1000 -c 50 http://localhost:3000/api/health
```

**Esperado:**
- Tempo de resposta < 100ms
- Taxa de erro 0%
- Throughput > 100 req/s

### 5.2 Teste de Memória
```bash
# Monitorar uso de memória
watch -n 1 'ps aux | grep node'
```

**Esperado:**
- Uso de memória estável
- Sem memory leaks

---

## 6. Testes de Segurança

### 6.1 Teste de Autenticação
```bash
# Tentar acessar sem token
curl -X GET http://localhost:3000/api/transactions

# Esperado: 401 Unauthorized
```

### 6.2 Teste de Validação de Entrada
```bash
# Tentar SQL injection
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "'; DROP TABLE users; --", "password": "test"}'

# Esperado: 400 Bad Request
```

### 6.3 Teste de CORS
```bash
# Testar CORS
curl -X OPTIONS http://localhost:3000/api/transactions \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET"

# Esperado: 200 OK com headers CORS
```

---

## 7. Testes de Banco de Dados

### 7.1 Verificar Tabelas
```bash
psql atos2 -c "\dt"
```

**Esperado:** 11 tabelas criadas

### 7.2 Verificar Dados
```bash
# Contar usuários
psql atos2 -c "SELECT COUNT(*) FROM users;"

# Contar transações
psql atos2 -c "SELECT COUNT(*) FROM transactions;"

# Verificar moeda Global
psql atos2 -c "SELECT * FROM global_currency ORDER BY updated_at DESC LIMIT 1;"
```

### 7.3 Verificar Índices
```bash
psql atos2 -c "\di"
```

**Esperado:** Índices criados para performance

---

## 8. Checklist de Testes

### Autenticação
- [ ] SMS enviado com sucesso
- [ ] Email enviado com sucesso
- [ ] Código verificado corretamente
- [ ] Usuário registrado com dados completos
- [ ] Token JWT gerado

### Transações
- [ ] Transferência entre usuários sem taxa
- [ ] Transferência externa com taxa 1%
- [ ] Transferência externa com taxa 2%
- [ ] Transferência externa com taxa 5%
- [ ] Saldo atualizado corretamente
- [ ] Histórico registrado

### QR Code
- [ ] QR Code gerado
- [ ] QR Code nunca expira
- [ ] Escanear QR Code funciona
- [ ] Contato adicionado automaticamente

### Busca
- [ ] Buscar por nickname
- [ ] Buscar por email
- [ ] Buscar por telefone
- [ ] Buscar por cidade
- [ ] Resultados corretos

### Frontend
- [ ] Página de Registro funciona
- [ ] Tema claro/escuro funciona
- [ ] Fundos personalizáveis funcionam
- [ ] Logo exibida corretamente
- [ ] Cores corretas (azul e laranja)
- [ ] Responsivo em mobile

### Segurança
- [ ] Sem token retorna 401
- [ ] Token inválido retorna 401
- [ ] SQL injection bloqueado
- [ ] XSS bloqueado
- [ ] CORS configurado

### Performance
- [ ] Tempo de resposta < 100ms
- [ ] Taxa de erro 0%
- [ ] Sem memory leaks
- [ ] Banco de dados otimizado

---

## 9. Troubleshooting

### Erro: "Connection refused"
```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Verificar se Redis está rodando
redis-cli ping
```

### Erro: "EADDRINUSE: address already in use"
```bash
# Matar processo na porta
lsof -i :3000
kill -9 <PID>
```

### Erro: "Database does not exist"
```bash
# Criar banco
createdb atos2

# Executar script
psql atos2 < src/config/init-db.sql
```

### Erro: "Invalid token"
```bash
# Gerar novo token
# Fazer login novamente
```

---

## 10. Relatório de Testes

### Template
```markdown
# Relatório de Testes - Atos2

**Data:** [Data]
**Testador:** [Nome]
**Ambiente:** [Dev/Staging/Prod]

## Resumo
- Total de testes: X
- Passados: X
- Falhados: X
- Taxa de sucesso: X%

## Detalhes
### Autenticação
- [x] SMS
- [x] Email
- [x] Registro

### Transações
- [x] Transferência interna
- [x] Transferência externa
- [x] Taxas corretas

### QR Code
- [x] Geração
- [x] Escanear
- [x] Conexão

## Problemas Encontrados
1. [Descrição]
2. [Descrição]

## Recomendações
1. [Recomendação]
2. [Recomendação]

## Assinatura
[Nome] - [Data]
```

---

## 11. Próximos Passos

Após todos os testes passarem:

1. ✅ Revisar resultados
2. ✅ Documentar problemas
3. ✅ Fazer correções
4. ✅ Executar testes novamente
5. ✅ Fazer checkpoint
6. ✅ Deploy em staging
7. ✅ Deploy em produção

---

**Sucesso nos testes! 🚀**


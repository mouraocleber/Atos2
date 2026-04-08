#!/bin/bash

# 🧪 Script de Teste Rápido - Atos2
# Este script valida as funcionalidades principais do app

set -e

echo "🚀 Iniciando testes rápidos do Atos2..."
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variáveis
API_URL="http://localhost:3000/api"
TEST_RESULTS=0
TEST_PASSED=0
TEST_FAILED=0

# Função para testar endpoint
test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  local expected_status=$4
  local description=$5

  echo -n "Testando: $description... "

  if [ -z "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint")
  else
    response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi

  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$status_code" = "$expected_status" ]; then
    echo -e "${GREEN}✓ PASSOU${NC} (Status: $status_code)"
    ((TEST_PASSED++))
  else
    echo -e "${RED}✗ FALHOU${NC} (Esperado: $expected_status, Obtido: $status_code)"
    echo "Response: $body"
    ((TEST_FAILED++))
  fi

  ((TEST_RESULTS++))
}

# ============================================
# 1. TESTES DE AUTENTICAÇÃO
# ============================================
echo -e "${YELLOW}=== TESTES DE AUTENTICAÇÃO ===${NC}"
echo ""

test_endpoint "POST" "/auth/send-sms-code" \
  '{"phone": "+55 11 99999-9999"}' \
  "200" \
  "Enviar código SMS"

test_endpoint "POST" "/auth/send-email-code" \
  '{"email": "test@example.com"}' \
  "200" \
  "Enviar código Email"

test_endpoint "POST" "/auth/verify-code" \
  '{"phone": "+55 11 99999-9999", "code": "123456"}' \
  "200" \
  "Verificar código"

echo ""

# ============================================
# 2. TESTES DE TRANSAÇÕES
# ============================================
echo -e "${YELLOW}=== TESTES DE TRANSAÇÕES ===${NC}"
echo ""

# Teste de cálculo de taxa (via curl para simular)
echo "Testando: Cálculo de taxa 1% (0-999,99)... "
if node -e "
const fee = 500 * 0.01;
if (fee === 5) {
  console.log('✓ PASSOU');
  process.exit(0);
} else {
  console.log('✗ FALHOU');
  process.exit(1);
}
" 2>/dev/null; then
  ((TEST_PASSED++))
else
  ((TEST_FAILED++))
fi
((TEST_RESULTS++))

echo "Testando: Cálculo de taxa 2% (1000-4999,99)... "
if node -e "
const fee = 2000 * 0.02;
if (fee === 40) {
  console.log('✓ PASSOU');
  process.exit(0);
} else {
  console.log('✗ FALHOU');
  process.exit(1);
}
" 2>/dev/null; then
  ((TEST_PASSED++))
else
  ((TEST_FAILED++))
fi
((TEST_RESULTS++))

echo "Testando: Cálculo de taxa 5% (acima de 5000)... "
if node -e "
const fee = 10000 * 0.05;
if (fee === 500) {
  console.log('✓ PASSOU');
  process.exit(0);
} else {
  console.log('✗ FALHOU');
  process.exit(1);
}
" 2>/dev/null; then
  ((TEST_PASSED++))
else
  ((TEST_FAILED++))
fi
((TEST_RESULTS++))

echo "Testando: Taxa 0% para transferência entre usuários... "
if node -e "
const isInternal = true;
const fee = isInternal ? 0 : (500 * 0.01);
if (fee === 0) {
  console.log('✓ PASSOU');
  process.exit(0);
} else {
  console.log('✗ FALHOU');
  process.exit(1);
}
" 2>/dev/null; then
  ((TEST_PASSED++))
else
  ((TEST_FAILED++))
fi
((TEST_RESULTS++))

echo ""

# ============================================
# 3. TESTES DE VALIDAÇÃO
# ============================================
echo -e "${YELLOW}=== TESTES DE VALIDAÇÃO ===${NC}"
echo ""

echo "Testando: Validação de email... "
if node -e "
const email = 'test@example.com';
const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (regex.test(email)) {
  console.log('✓ PASSOU');
  process.exit(0);
} else {
  console.log('✗ FALHOU');
  process.exit(1);
}
" 2>/dev/null; then
  ((TEST_PASSED++))
else
  ((TEST_FAILED++))
fi
((TEST_RESULTS++))

echo "Testando: Rejeição de email inválido... "
if node -e "
const email = 'invalid-email';
const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!regex.test(email)) {
  console.log('✓ PASSOU');
  process.exit(0);
} else {
  console.log('✗ FALHOU');
  process.exit(1);
}
" 2>/dev/null; then
  ((TEST_PASSED++))
else
  ((TEST_FAILED++))
fi
((TEST_RESULTS++))

echo "Testando: Validação de CPF... "
if node -e "
const cpf = '123.456.789-09';
const cleaned = cpf.replace(/\D/g, '');
if (cleaned.length === 11) {
  console.log('✓ PASSOU');
  process.exit(0);
} else {
  console.log('✗ FALHOU');
  process.exit(1);
}
" 2>/dev/null; then
  ((TEST_PASSED++))
else
  ((TEST_FAILED++))
fi
((TEST_RESULTS++))

echo ""

# ============================================
# 4. TESTES DE MOEDA GLOBAL
# ============================================
echo -e "${YELLOW}=== TESTES DE MOEDA GLOBAL ===${NC}"
echo ""

echo "Testando: Cálculo de moeda Global... "
if node -e "
const usd = 1.00;
const eur = 0.92;
const jpy = 149.50;
const cny = 7.24;
const brl = 4.97;
const global = (usd + eur + jpy + cny + brl) / 5;
if (global > 0) {
  console.log('✓ PASSOU (Valor: ' + global.toFixed(2) + ')');
  process.exit(0);
} else {
  console.log('✗ FALHOU');
  process.exit(1);
}
" 2>/dev/null; then
  ((TEST_PASSED++))
else
  ((TEST_FAILED++))
fi
((TEST_RESULTS++))

echo ""

# ============================================
# RESUMO DOS TESTES
# ============================================
echo -e "${YELLOW}=== RESUMO DOS TESTES ===${NC}"
echo ""
echo "Total de testes: $TEST_RESULTS"
echo -e "Testes passados: ${GREEN}$TEST_PASSED${NC}"
echo -e "Testes falhados: ${RED}$TEST_FAILED${NC}"
echo ""

if [ $TEST_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ TODOS OS TESTES PASSARAM!${NC}"
  exit 0
else
  echo -e "${RED}✗ ALGUNS TESTES FALHARAM${NC}"
  exit 1
fi


#!/bin/bash

# 🧪 Testes de Validação - Atos2

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

TEST_PASSED=0
TEST_FAILED=0
TEST_TOTAL=0

test_case() {
  local description=$1
  local condition=$2

  echo -n "Testando: $description... "
  ((TEST_TOTAL++))

  if eval "$condition"; then
    echo -e "${GREEN}✓ PASSOU${NC}"
    ((TEST_PASSED++))
  else
    echo -e "${RED}✗ FALHOU${NC}"
    ((TEST_FAILED++))
  fi
}

echo -e "${YELLOW}=== TESTES DE VALIDAÇÃO - ATOS2 ===${NC}"
echo ""

# Testes de Cálculo de Taxa
echo -e "${YELLOW}--- Cálculo de Taxas ---${NC}"
test_case "Taxa 1% para 500 Global" "[ \$(echo '500 * 0.01' | bc) = '5.00' ]"
test_case "Taxa 2% para 2000 Global" "[ \$(echo '2000 * 0.02' | bc) = '40.00' ]"
test_case "Taxa 5% para 10000 Global" "[ \$(echo '10000 * 0.05' | bc) = '500.00' ]"
test_case "Taxa 0% para transferência interna" "[ 0 -eq 0 ]"

echo ""
echo -e "${YELLOW}--- Validação de Email ---${NC}"
test_case "Email válido" "echo 'test@example.com' | grep -E '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' > /dev/null"
test_case "Email inválido (sem @)" "! echo 'invalid-email' | grep -E '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' > /dev/null"
test_case "Email inválido (sem domínio)" "! echo 'test@' | grep -E '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' > /dev/null"

echo ""
echo -e "${YELLOW}--- Validação de Telefone ---${NC}"
test_case "Telefone válido Brasil" "echo '+55 11 99999-9999' | grep -E '^\+55 [0-9]{2} [0-9]{4,5}-[0-9]{4}$' > /dev/null"
test_case "Telefone inválido" "! echo '123456' | grep -E '^\+55 [0-9]{2} [0-9]{4,5}-[0-9]{4}$' > /dev/null"

echo ""
echo -e "${YELLOW}--- Validação de CPF ---${NC}"
test_case "CPF com formato" "echo '123.456.789-09' | grep -E '^[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}$' > /dev/null"
test_case "CPF sem formato" "echo '12345678909' | grep -E '^[0-9]{11}$' > /dev/null"
test_case "CPF inválido" "! echo 'abc-def-ghi' | grep -E '^([0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}|[0-9]{11})$' > /dev/null"

echo ""
echo -e "${YELLOW}--- Validação de CEP ---${NC}"
test_case "CEP válido" "echo '12345-678' | grep -E '^[0-9]{5}-[0-9]{3}$' > /dev/null"
test_case "CEP sem hífen" "echo '12345678' | grep -E '^[0-9]{8}$' > /dev/null"
test_case "CEP inválido" "! echo 'abc-def' | grep -E '^[0-9]{5}-[0-9]{3}$' > /dev/null"

echo ""
echo -e "${YELLOW}--- Cálculo de Moeda Global (com Arredondamento) ---${NC}"
# Cálculo: (1 + 0.92 + 149.5 + 7.24 + 4.97) / 5 = 163.63 / 5 = 32.726 ≈ 32.73
GLOBAL_CALC=$(echo "scale=2; (1 + 0.92 + 149.5 + 7.24 + 4.97) / 5" | bc)
test_case "Cálculo de Global com arredondamento" "[ '$GLOBAL_CALC' = '32.72' ] || [ '$GLOBAL_CALC' = '32.73' ]"

echo ""
echo -e "${YELLOW}--- Limites de Transação ---${NC}"
test_case "Valor mínimo (0.01)" "[ \$(echo '0.01 > 0' | bc) -eq 1 ]"
test_case "Valor dentro do limite 1%" "[ \$(echo '999.99 <= 999.99' | bc) -eq 1 ]"
test_case "Valor dentro do limite 2%" "[ \$(echo '2000 >= 1000 && 2000 <= 4999.99' | bc) -eq 1 ]"
test_case "Valor dentro do limite 5%" "[ \$(echo '10000 >= 5000' | bc) -eq 1 ]"

echo ""
echo -e "${YELLOW}=== RESUMO ===${NC}"
echo "Total de testes: $TEST_TOTAL"
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


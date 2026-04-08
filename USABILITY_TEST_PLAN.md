# 📋 Plano de Teste de Usabilidade - Atos2

## 1. Objetivo do Teste
Validar a usabilidade, fluxos de navegação e experiência do usuário no app Atos2, identificando pontos de melhoria e confirmando que as funcionalidades principais são intuitivas.

---

## 2. Perfil dos Usuários Teste

### Usuário 1: João Silva (PF - Pessoa Física)
- **Idade:** 28 anos
- **Ocupação:** Desenvolvedor de Software
- **Experiência:** Alto conhecimento técnico
- **Objetivo:** Enviar dinheiro para amigos e usar QR Code para conectar

### Usuário 2: Maria Santos (PF - Pessoa Física)
- **Idade:** 35 anos
- **Ocupação:** Gerente de Projetos
- **Experiência:** Médio conhecimento técnico
- **Objetivo:** Receber pagamentos e gerenciar produtos

### Usuário 3: Pedro Costa (PJ - Pessoa Jurídica)
- **Idade:** 42 anos
- **Ocupação:** Proprietário de Loja Online
- **Experiência:** Baixo conhecimento técnico
- **Objetivo:** Vender produtos e receber pagamentos

---

## 3. Cenários de Teste

### 3.1 Fluxo de Registro e Onboarding

#### Teste 1.1: Registro via SMS
**Objetivo:** Validar que o usuário consegue se registrar usando SMS

**Passos:**
1. Abrir app Atos2
2. Clicar em "📱 Telefone"
3. Inserir número: +55 11 99999-9999
4. Clicar "Enviar Código"
5. Receber SMS com código
6. Inserir código de 6 dígitos
7. Clicar "Verificar"
8. Preencher perfil (nome, apelido, CPF, CEP, idioma)
9. Clicar "Criar Conta"

**Critérios de Sucesso:**
- ✅ SMS recebido em até 30 segundos
- ✅ Código aceito na primeira tentativa
- ✅ Perfil criado com sucesso
- ✅ Redirecionado para home do app
- ✅ Saldo inicial de 0 Global

**Tempo Esperado:** 3-5 minutos

---

#### Teste 1.2: Registro via Email
**Objetivo:** Validar que o usuário consegue se registrar usando Email

**Passos:**
1. Abrir app Atos2
2. Clicar em "📧 Email"
3. Inserir email: usuario@email.com
4. Clicar "Enviar Código"
5. Verificar email (caixa de entrada ou spam)
6. Copiar código de 6 dígitos
7. Inserir código no app
8. Clicar "Verificar"
9. Preencher perfil completo
10. Clicar "Criar Conta"

**Critérios de Sucesso:**
- ✅ Email recebido em até 1 minuto
- ✅ Código válido por 10 minutos
- ✅ Limite de 3 tentativas funcionando
- ✅ Botão "Reenviar código" funcional
- ✅ Conta criada com sucesso

**Tempo Esperado:** 4-6 minutos

---

#### Teste 1.3: Validação de Dados de Cadastro
**Objetivo:** Validar que o sistema valida corretamente os dados inseridos

**Passos:**
1. Tentar registrar com email inválido (ex: "email@")
2. Tentar registrar com CPF inválido (ex: "000.000.000-00")
3. Tentar registrar com CEP inválido
4. Tentar registrar com apelido já existente
5. Tentar registrar com nome vazio

**Critérios de Sucesso:**
- ✅ Mensagens de erro claras e úteis
- ✅ Campos inválidos destacados em vermelho
- ✅ Sugestões de correção exibidas
- ✅ Botão "Criar Conta" desabilitado até validação

**Tempo Esperado:** 2-3 minutos

---

### 3.2 Fluxo de Mensagens e Tradução

#### Teste 2.1: Enviar Mensagem de Texto
**Objetivo:** Validar envio de mensagem de texto simples

**Passos:**
1. Acessar chat com contato
2. Digitar mensagem: "Olá, como você está?"
3. Clicar botão enviar
4. Verificar status da mensagem (enviada → entregue → lida)
5. Receber resposta

**Critérios de Sucesso:**
- ✅ Mensagem aparece na tela instantaneamente
- ✅ Status atualiza em tempo real
- ✅ Timestamp correto
- ✅ Mensagem aparece no chat do receptor
- ✅ Notificação recebida

**Tempo Esperado:** 2-3 segundos

---

#### Teste 2.2: Tradução Automática
**Objetivo:** Validar que mensagens são traduzidas automaticamente

**Cenário:** João (português) envia mensagem para Maria (inglês)

**Passos:**
1. João envia: "Olá, tudo bem?"
2. Maria recebe mensagem em inglês
3. Maria vê indicador "Traduzido de Português para Inglês"
4. Maria responde em inglês: "Hi, I'm fine!"
5. João recebe em português

**Critérios de Sucesso:**
- ✅ Tradução automática sem ação do usuário
- ✅ Indicador de tradução visível
- ✅ Mensagem original acessível (clique para ver)
- ✅ Tradução precisa
- ✅ Sem atraso perceptível

**Tempo Esperado:** 1-2 segundos

---

#### Teste 2.3: Enviar Áudio
**Objetivo:** Validar gravação e envio de mensagem de áudio

**Passos:**
1. Clicar ícone de microfone
2. Gravar mensagem: "Olá, tudo bem?"
3. Clicar "Enviar"
4. Verificar transcrição automática
5. Verificar tradução (se necessário)

**Critérios de Sucesso:**
- ✅ Gravação inicia ao clicar
- ✅ Contador de tempo visível
- ✅ Transcrição precisa
- ✅ Áudio enviado com sucesso
- ✅ Receptor consegue ouvir

**Tempo Esperado:** 30-60 segundos

---

#### Teste 2.4: Enviar Imagem/Vídeo
**Objetivo:** Validar envio de mídia

**Passos:**
1. Clicar ícone de anexo
2. Selecionar imagem da galeria
3. Clicar "Enviar"
4. Verificar compressão automática
5. Verificar tempo de upload

**Critérios de Sucesso:**
- ✅ Seletor de arquivo funciona
- ✅ Preview da imagem exibido
- ✅ Upload completo em tempo razoável
- ✅ Imagem visualizável no chat
- ✅ Tamanho otimizado

**Tempo Esperado:** 5-10 segundos (dependendo do tamanho)

---

### 3.3 Fluxo de Conexão via QR Code

#### Teste 3.1: Gerar QR Code
**Objetivo:** Validar geração de QR Code pessoal

**Passos:**
1. Acessar aba "QR Code"
2. Visualizar QR Code pessoal
3. Clicar "Compartilhar"
4. Selecionar app de mensagem
5. Clicar "Baixar" para salvar imagem

**Critérios de Sucesso:**
- ✅ QR Code exibido claramente
- ✅ Informações do usuário visíveis
- ✅ Compartilhamento funciona
- ✅ Download salva imagem
- ✅ QR Code nunca expira

**Tempo Esperado:** 1-2 minutos

---

#### Teste 3.2: Escanear QR Code
**Objetivo:** Validar leitura e conexão via QR Code

**Passos:**
1. Acessar aba "QR Code"
2. Clicar "Escanear QR Code"
3. Permitir acesso à câmera
4. Apontar para QR Code de outro usuário
5. Confirmar conexão

**Critérios de Sucesso:**
- ✅ Câmera abre corretamente
- ✅ QR Code detectado automaticamente
- ✅ Dados do usuário exibidos
- ✅ Conexão confirmada
- ✅ Novo contato adicionado
- ✅ Chat abre automaticamente

**Tempo Esperado:** 30-60 segundos

---

### 3.4 Fluxo de Transações Financeiras

#### Teste 4.1: Transferência Entre Usuários (Sem Taxa)
**Objetivo:** Validar transferência gratuita entre usuários

**Cenário:** João envia 100 Global para Maria

**Passos:**
1. Acessar "Enviar Dinheiro"
2. Selecionar contato "Maria Silva"
3. Inserir valor: 100
4. Verificar taxa: 0% (sem taxa)
5. Verificar total: 100 Global
6. Clicar "Confirmar Transferência"
7. Inserir senha/biometria
8. Confirmar

**Critérios de Sucesso:**
- ✅ Taxa exibida como "Sem taxa"
- ✅ Total igual ao valor inserido
- ✅ Transferência processada em tempo real
- ✅ Saldo de João reduzido em 100
- ✅ Saldo de Maria aumentado em 100
- ✅ Notificação enviada para Maria
- ✅ Comprovante gerado

**Tempo Esperado:** 3-5 segundos

---

#### Teste 4.2: Transferência para Fora do App (Com Taxa 1%)
**Objetivo:** Validar transferência com taxa de 1%

**Cenário:** João envia 500 Global para conta bancária

**Passos:**
1. Acessar "Enviar Dinheiro"
2. Selecionar "Para Fora do App"
3. Inserir dados bancários
4. Inserir valor: 500
5. Verificar taxa: 5 Global (1%)
6. Verificar total: 505 Global
7. Clicar "Confirmar"

**Critérios de Sucesso:**
- ✅ Taxa calculada corretamente (1%)
- ✅ Total exibido corretamente
- ✅ Transferência processada
- ✅ Saldo reduzido em 505
- ✅ Comprovante com detalhes da taxa
- ✅ Transferência bancária em 1-2 dias úteis

**Tempo Esperado:** 5-10 segundos

---

#### Teste 4.3: Transferência com Taxa 2%
**Objetivo:** Validar transferência com taxa de 2%

**Cenário:** João envia 2.000 Global para fora do app

**Passos:**
1. Acessar "Enviar Dinheiro"
2. Selecionar "Para Fora do App"
3. Inserir valor: 2.000
4. Verificar taxa: 40 Global (2%)
5. Verificar total: 2.040 Global

**Critérios de Sucesso:**
- ✅ Taxa calculada corretamente (2%)
- ✅ Total exibido corretamente
- ✅ Transferência processada
- ✅ Saldo reduzido em 2.040

**Tempo Esperado:** 5-10 segundos

---

#### Teste 4.4: Transferência com Taxa 5%
**Objetivo:** Validar transferência com taxa de 5%

**Cenário:** João envia 10.000 Global para fora do app

**Passos:**
1. Acessar "Enviar Dinheiro"
2. Selecionar "Para Fora do App"
3. Inserir valor: 10.000
4. Verificar taxa: 500 Global (5%)
5. Verificar total: 10.500 Global

**Critérios de Sucesso:**
- ✅ Taxa calculada corretamente (5%)
- ✅ Total exibido corretamente
- ✅ Transferência processada
- ✅ Saldo reduzido em 10.500

**Tempo Esperado:** 5-10 segundos

---

#### Teste 4.5: Visualizar Histórico de Transações
**Objetivo:** Validar visualização do histórico

**Passos:**
1. Acessar "Transações"
2. Verificar lista de transações
3. Filtrar por tipo (enviadas, recebidas)
4. Filtrar por data
5. Clicar em transação para ver detalhes

**Critérios de Sucesso:**
- ✅ Todas as transações listadas
- ✅ Filtros funcionam corretamente
- ✅ Detalhes completos exibidos
- ✅ Comprovante disponível para download
- ✅ Timestamps corretos

**Tempo Esperado:** 2-3 minutos

---

### 3.5 Fluxo de Produtos

#### Teste 5.1: Criar Produto
**Objetivo:** Validar criação de novo produto

**Passos:**
1. Acessar "Meus Produtos"
2. Clicar "Novo Produto"
3. Preencher:
   - Nome: "Notebook Dell"
   - Preço: 3.500,00
   - Estoque: 5
   - Categoria: "Eletrônicos"
   - Descrição: "Notebook com processador Intel i7"
4. Fazer upload de imagem
5. Clicar "Salvar"

**Critérios de Sucesso:**
- ✅ Formulário valida dados
- ✅ Upload de imagem funciona
- ✅ Produto criado com sucesso
- ✅ Produto aparece na lista
- ✅ Dados salvos corretamente

**Tempo Esperado:** 2-3 minutos

---

#### Teste 5.2: Editar Produto
**Objetivo:** Validar edição de produto existente

**Passos:**
1. Acessar "Meus Produtos"
2. Clicar em produto
3. Clicar "Editar"
4. Alterar preço: 3.200,00
5. Alterar estoque: 3
6. Clicar "Salvar"

**Critérios de Sucesso:**
- ✅ Dados carregam corretamente
- ✅ Alterações salvas
- ✅ Lista atualizada
- ✅ Histórico de alterações registrado

**Tempo Esperado:** 1-2 minutos

---

#### Teste 5.3: Visualizar Produtos por Categoria
**Objetivo:** Validar filtro de categoria

**Passos:**
1. Acessar "Meus Produtos"
2. Clicar em categoria "Eletrônicos"
3. Verificar produtos filtrados
4. Clicar em "Todos" para resetar

**Critérios de Sucesso:**
- ✅ Filtro funciona corretamente
- ✅ Apenas produtos da categoria exibidos
- ✅ Contador de produtos atualizado
- ✅ Valor total do inventário recalculado

**Tempo Esperado:** 30 segundos

---

### 3.6 Fluxo de Backup

#### Teste 6.1: Criar Backup via Dispositivo
**Objetivo:** Validar backup via ID do dispositivo

**Passos:**
1. Acessar "Configurações" → "Backup"
2. Selecionar "📱 Via Dispositivo"
3. Inserir ID do dispositivo
4. Clicar "Iniciar Backup"
5. Aguardar conclusão

**Critérios de Sucesso:**
- ✅ Backup inicia
- ✅ Progresso exibido
- ✅ Backup completa com sucesso
- ✅ Notificação enviada
- ✅ Arquivo disponível para download

**Tempo Esperado:** 2-5 minutos

---

#### Teste 6.2: Criar Backup via Email
**Objetivo:** Validar backup via email

**Passos:**
1. Acessar "Configurações" → "Backup"
2. Selecionar "📧 Via Email"
3. Inserir email: usuario@email.com
4. Clicar "Iniciar Backup"
5. Verificar email

**Critérios de Sucesso:**
- ✅ Email recebido em até 1 minuto
- ✅ Link de download válido
- ✅ Arquivo completo
- ✅ Notificação de sucesso no app

**Tempo Esperado:** 2-5 minutos

---

### 3.7 Fluxo de Segurança

#### Teste 7.1: Bloquear Usuário
**Objetivo:** Validar bloqueio de usuário

**Passos:**
1. Abrir chat com usuário
2. Clicar menu (⋮)
3. Selecionar "Bloquear"
4. Confirmar bloqueio
5. Tentar enviar mensagem

**Critérios de Sucesso:**
- ✅ Usuário bloqueado com sucesso
- ✅ Mensagens não podem ser enviadas
- ✅ Usuário não consegue enviar mensagens
- ✅ Opção de desbloquear disponível

**Tempo Esperado:** 30 segundos

---

#### Teste 7.2: Denunciar Mensagem
**Objetivo:** Validar denúncia de conteúdo

**Passos:**
1. Abrir chat
2. Pressionar mensagem suspeita
3. Clicar "Denunciar"
4. Selecionar motivo: "SCAM"
5. Adicionar descrição (opcional)
6. Clicar "Enviar Denúncia"

**Critérios de Sucesso:**
- ✅ Denúncia registrada
- ✅ Usuário bloqueado automaticamente (se SCAM)
- ✅ Notificação de sucesso
- ✅ Denúncia enviada para moderação

**Tempo Esperado:** 1-2 minutos

---

## 4. Métricas de Sucesso

| Métrica | Alvo | Aceitável |
|---------|------|-----------|
| Taxa de Conclusão de Tarefas | > 90% | > 80% |
| Tempo Médio por Tarefa | < 5 min | < 10 min |
| Erros de Navegação | 0 | < 2 |
| Satisfação do Usuário | > 4/5 | > 3/5 |
| Tempo de Carregamento | < 2s | < 5s |

---

## 5. Feedback Esperado

### Positivo
- ✅ Interface intuitiva
- ✅ Fluxos claros
- ✅ Cores agradáveis
- ✅ Responsivo
- ✅ Rápido

### Negativo (Possíveis)
- ❌ Falta de confirmação em ações críticas
- ❌ Mensagens de erro pouco claras
- ❌ Falta de tutorial inicial
- ❌ Botões muito pequenos
- ❌ Falta de atalhos

---

## 6. Recomendações

### Melhorias Imediatas
1. Adicionar tutorial onboarding
2. Melhorar mensagens de erro
3. Adicionar confirmação em transferências
4. Adicionar busca de contatos
5. Adicionar favoritos

### Melhorias Futuras
1. Integração com cartão de crédito
2. Criptomoedas
3. Investimentos
4. Seguros
5. Empréstimos

---

## 7. Conclusão

O app Atos2 apresenta uma experiência de usuário sólida com fluxos bem definidos. Os testes devem validar que todas as funcionalidades funcionam como esperado e que a interface é intuitiva para usuários de diferentes níveis de experiência.

**Data do Teste:** [Data]
**Testadores:** João Silva, Maria Santos, Pedro Costa
**Status:** Pendente


# Guia de Tradução e Suporte a Idiomas

## 🌍 Visão Geral

O aplicativo inclui um sistema automático de tradução de mensagens usando a API OpenAI. As mensagens de texto e áudio são automaticamente traduzidas para o idioma preferido do receptor.

## 📋 Idiomas Suportados

| Código | Idioma | Região |
|--------|--------|--------|
| `pt-BR` | Português | Brasil |
| `pt-PT` | Português | Portugal |
| `en-US` | Inglês | Estados Unidos |
| `en-GB` | Inglês | Reino Unido |
| `es-ES` | Espanhol | Espanha |
| `es-MX` | Espanhol | México |
| `fr-FR` | Francês | França |
| `de-DE` | Alemão | Alemanha |
| `it-IT` | Italiano | Itália |
| `ja-JP` | Japonês | Japão |
| `zh-CN` | Chinês | Simplificado |
| `zh-TW` | Chinês | Tradicional |
| `ru-RU` | Russo | Rússia |
| `ko-KR` | Coreano | Coreia do Sul |
| `ar-SA` | Árabe | Arábia Saudita |

## 🔧 Configuração

### 1. Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env`:

```env
# OpenAI
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4.1-mini

# Idiomas suportados
SUPPORTED_LANGUAGES=pt-BR,en-US,es-ES,fr-FR,de-DE,it-IT,ja-JP,zh-CN
```

### 2. Obter Chave OpenAI

1. Acesse [OpenAI Platform](https://platform.openai.com)
2. Crie uma conta ou faça login
3. Vá para [API Keys](https://platform.openai.com/account/api-keys)
4. Clique em "Create new secret key"
5. Copie a chave e adicione ao `.env`

## 📝 Fluxo de Tradução

### Envio de Mensagem de Texto

```
Usuário A (pt-BR) → Escreve mensagem em português
                 ↓
            OpenAI detecta idioma
                 ↓
         Traduz para idioma de B (en-US)
                 ↓
         Salva tradução no banco
                 ↓
     Usuário B recebe em inglês
```

### Envio de Mensagem de Áudio

```
Usuário A → Grava áudio em português
         ↓
    Whisper transcreve áudio
         ↓
    OpenAI traduz transcrição
         ↓
    Usuário B recebe texto traduzido
```

## 🔌 API Endpoints

### Enviar Mensagem com Tradução Automática

```http
POST /api/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipientId": "uuid-do-receptor",
  "type": "TEXT",
  "content": "Olá, como você está?"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Mensagem enviada com sucesso",
  "data": {
    "id": "uuid",
    "senderId": "uuid",
    "recipientId": "uuid",
    "type": "TEXT",
    "content": "Olá, como você está?",
    "translatedContent": "Hello, how are you?",
    "translatedLanguage": "en-US",
    "originalLanguage": "pt-BR",
    "status": "SENT",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Transcrever Áudio

```http
POST /api/messages/transcribe/audio
Authorization: Bearer <token>
Content-Type: application/json

{
  "audioPath": "/uploads/audio_123.mp3"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Áudio transcrito com sucesso",
  "data": {
    "transcription": "Olá, como você está?",
    "language": "pt-BR"
  }
}
```

### Traduzir Mensagem Existente

```http
POST /api/messages/translate
Authorization: Bearer <token>
Content-Type: application/json

{
  "messageId": "uuid-da-mensagem",
  "targetLanguage": "en-US"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Mensagem traduzida com sucesso",
  "data": {
    "id": "uuid",
    "messageId": "uuid-da-mensagem",
    "originalContent": "Olá, como você está?",
    "originalLanguage": "pt-BR",
    "translatedContent": "Hello, how are you?",
    "translatedLanguage": "en-US",
    "provider": "openai",
    "createdAt": "2024-01-15T10:35:00Z"
  }
}
```

### Obter Idiomas Suportados

```http
GET /api/messages/languages/supported
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "success": true,
  "message": "Idiomas suportados",
  "data": [
    { "code": "pt-BR", "name": "Portuguese (Brazil)" },
    { "code": "en-US", "name": "English (US)" },
    { "code": "es-ES", "name": "Spanish (Spain)" },
    ...
  ]
}
```

## 🗄️ Banco de Dados

### Tabela `messages`

Campos adicionados para tradução:

```sql
- translated_content TEXT          -- Conteúdo traduzido
- translated_language VARCHAR(10)  -- Idioma da tradução
- original_language VARCHAR(10)    -- Idioma original
```

### Tabela `translations`

Armazena histórico de traduções:

```sql
- id UUID PRIMARY KEY
- message_id UUID (FK)
- original_content TEXT
- original_language VARCHAR(10)
- translated_content TEXT
- translated_language VARCHAR(10)
- provider VARCHAR(50)
- created_at TIMESTAMP
```

## 💰 Custos

### Preços OpenAI (Exemplo)

- **Tradução (GPT-4.1 Mini):** ~$0.00015 por 1K tokens
- **Transcrição (Whisper):** $0.02 por minuto de áudio

### Estimativa de Custo Mensal

Para 10.000 mensagens traduzidas por dia:
- Tradução: ~$45/mês
- Transcrição (1000 áudios/dia): ~$600/mês

**Total estimado:** ~$645/mês

## 🔒 Segurança

### Boas Práticas

1. **Nunca exponha a chave OpenAI**
   - Use variáveis de ambiente
   - Não faça commit do `.env`

2. **Rate Limiting**
   - Implemente rate limiting para evitar abuso
   - Máximo de 100 requisições por minuto por usuário

3. **Validação de Entrada**
   - Valide idiomas suportados
   - Limite tamanho de mensagens (máx. 4000 caracteres)

4. **Auditoria**
   - Log todas as traduções
   - Rastreie uso de API

## 🚀 Otimizações

### Cache de Traduções

As traduções são armazenadas no banco de dados para evitar traduzir a mesma mensagem múltiplas vezes:

```typescript
// Verificar se tradução já existe
const existingTranslation = await translationService.getTranslation(
  messageId,
  targetLanguage
);

if (existingTranslation) {
  // Usar tradução em cache
  return existingTranslation;
}
```

### Detecção Automática de Idioma

O sistema detecta automaticamente o idioma da mensagem:

```typescript
const detectedLanguage = await translationService.detectLanguage(content);
```

### Tradução Assíncrona

Para mensagens de áudio longas, considere processar a tradução em background:

```typescript
// Processar em fila (implementar com Bull ou similar)
await translationQueue.add({
  messageId,
  targetLanguage,
});
```

## 🐛 Troubleshooting

### Erro: "Invalid API Key"

- Verifique se a chave está correta em `.env`
- Certifique-se de que a chave tem créditos disponíveis

### Erro: "Rate limit exceeded"

- Implemente backoff exponencial
- Reduza frequência de requisições

### Tradução Incorreta

- Aumente o contexto da mensagem
- Use prompts mais específicos
- Considere usar modelo mais avançado (gpt-4)

## 📚 Referências

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [Supported Languages](https://platform.openai.com/docs/guides/gpt-language)

## 🔄 Atualizações Futuras

- [ ] Suporte a mais idiomas
- [ ] Tradução de imagens (OCR)
- [ ] Tradução de vídeos
- [ ] Melhor detecção de contexto
- [ ] Cache distribuído com Redis
- [ ] Processamento em background com filas


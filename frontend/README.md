# Atos2 Frontend

Frontend React em TypeScript para o aplicativo Atos2 com tema em vermelho e amarelo.

## 🎨 Design

- **Cores Principais:** Vermelho (#DC143C) e Amarelo (#FFD700)
- **Tema:** Dark mode com acentos em vermelho e amarelo
- **Componentes:** Button, Input, Card, e mais
- **Responsivo:** Mobile-first design

## 📦 Instalação

```bash
npm install
```

## 🚀 Desenvolvimento

```bash
npm run dev
```

O servidor estará disponível em `http://localhost:5173`

## 🏗️ Build

```bash
npm run build
```

## 📁 Estrutura

```
src/
├── components/      # Componentes reutilizáveis
├── pages/          # Páginas da aplicação
├── styles/         # Estilos globais
├── types/          # Tipos TypeScript
├── utils/          # Funções utilitárias
├── App.tsx         # Componente principal
└── main.tsx        # Entry point
```

## 🔗 Integração com API

O frontend se conecta com a API backend em `http://localhost:3000/api`

### Endpoints Principais

- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/login` - Fazer login
- `GET /api/auth/me` - Obter dados do usuário
- `POST /api/messages` - Enviar mensagem
- `GET /api/messages/conversation/:id` - Obter conversa

## 🎯 Funcionalidades

- [ ] Login e Registro
- [ ] Chat em tempo real
- [ ] Tradução automática de mensagens
- [ ] Transações de cash
- [ ] Perfil de usuário
- [ ] Lista de contatos
- [ ] Catálogo de produtos

## 📝 Licença

ISC


# Estágio de compilação
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY tsconfig.json ./

# Instalar todas as dependências (incluindo devDependencies para o build)
RUN npm install

# Copiar código fonte
COPY src ./src

# Compilar o projeto
RUN NODE_OPTIONS="--max-old-space-size=1024" npm run build

# Estágio de produção
FROM node:22-alpine

WORKDIR /app

# Criar diretório de uploads
RUN mkdir -p uploads/images uploads/videos uploads/audio

# Copiar apenas os arquivos necessários do estágio de compilação
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY landing-page ./landing-page

# Instalar apenas dependências de produção
RUN npm install --omit=dev

# Expor a porta do backend (3001 — padrão do projeto)
EXPOSE 3001

# Comando para iniciar a aplicação
CMD ["npm", "start"]

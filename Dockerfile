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
RUN npm run build

# Estágio de produção
FROM node:22-alpine

WORKDIR /app

# Copiar apenas os arquivos necessários do estágio de compilação
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Instalar apenas dependências de produção
#RUN npm install --omit=dev
RUN npm install

# Expor a porta do backend
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "start"]

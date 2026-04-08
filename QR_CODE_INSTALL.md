# 📱 Guia: Gerar QR Code para Instalar Atos2

## 🎯 Objetivo

Gerar um **QR Code** que permite instalar o app Atos2 diretamente no seu celular escaneando com a câmera.

---

## 📋 Pré-requisitos

1. ✅ APK gerado (via EAS Build)
2. ✅ Link do APK disponível
3. ✅ Gerador de QR Code online

---

## ⚡ Método 1: Usando QR Code Online (Mais Rápido)

### Passo 1: Obter Link do APK

```bash
# Ver lista de builds
eas build:list

# Copiar a URL do APK (algo como)
# https://eas-builds.s3.us-west-2.amazonaws.com/...apk
```

### Passo 2: Gerar QR Code

**Opção A: QR Code Monkey**
1. Acesse: https://www.qr-code-generator.com/
2. Cole o link do APK no campo "Text"
3. Clique em "Generate QR Code"
4. Baixe a imagem PNG

**Opção B: QR Server**
1. Use esta URL diretamente:
   ```
   https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=SEU_LINK_APK
   ```
2. Substitua `SEU_LINK_APK` pelo link real

**Opção C: Expo QR Code (Automático)**
```bash
# O EAS fornece um QR Code automaticamente
eas build:view [BUILD_ID]
# Procure por "QR Code" na saída
```

### Passo 3: Escanear QR Code

1. Abra a câmera do seu celular
2. Aponte para o QR Code
3. Toque na notificação que aparecer
4. O APK será baixado
5. Toque em "Instalar"

---

## 🛠️ Método 2: Criar QR Code com Python

### Passo 1: Instalar Biblioteca

```bash
pip install qrcode[pil]
```

### Passo 2: Criar Script

Crie arquivo `generate_qr.py`:

```python
import qrcode
import sys

# Obter link do APK como argumento
if len(sys.argv) < 2:
    print("Uso: python generate_qr.py <link_apk>")
    sys.exit(1)

apk_link = sys.argv[1]

# Gerar QR Code
qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_L,
    box_size=10,
    border=4,
)
qr.add_data(apk_link)
qr.make(fit=True)

# Criar imagem
img = qr.make_image(fill_color="black", back_color="white")

# Salvar
img.save("atos2_install_qr.png")
print("✓ QR Code gerado: atos2_install_qr.png")
```

### Passo 3: Executar

```bash
python generate_qr.py "https://seu-link-apk.com/app.apk"
```

---

## 🖥️ Método 3: Criar QR Code com Node.js

### Passo 1: Instalar Biblioteca

```bash
npm install qrcode
```

### Passo 2: Criar Script

Crie arquivo `generate-qr.js`:

```javascript
const QRCode = require('qrcode');

const apkLink = process.argv[2];

if (!apkLink) {
    console.log('Uso: node generate-qr.js <link_apk>');
    process.exit(1);
}

QRCode.toFile('atos2_install_qr.png', apkLink, {
    color: {
        dark: '#000000',
        light: '#FFFFFF'
    },
    width: 300,
    margin: 2
}, (err) => {
    if (err) {
        console.error('Erro:', err);
        process.exit(1);
    }
    console.log('✓ QR Code gerado: atos2_install_qr.png');
});
```

### Passo 3: Executar

```bash
node generate-qr.js "https://seu-link-apk.com/app.apk"
```

---

## 📲 Método 4: Usar Link Direto (Sem QR Code)

Se preferir não usar QR Code, pode compartilhar o link diretamente:

### Via WhatsApp
```
Oi! Baixe o Atos2 aqui:
https://seu-link-apk.com/app.apk
```

### Via Email
```
Assunto: Instale o Atos2

Clique no link para baixar:
https://seu-link-apk.com/app.apk

Após baixar, abra o arquivo e clique em Instalar.
```

### Via SMS
```
Baixe Atos2: https://seu-link-apk.com/app.apk
```

---

## 🔗 Obter Link do APK - Passo a Passo

### Passo 1: Listar Builds

```bash
eas build:list
```

**Saída esperada:**
```
┌─────────────────────────────────────────────────────────┐
│ ID          │ Platform │ Status      │ Artifacts       │
├─────────────────────────────────────────────────────────┤
│ abc123...   │ android  │ FINISHED    │ Download APK    │
│ def456...   │ android  │ IN_PROGRESS │ -               │
└─────────────────────────────────────────────────────────┘
```

### Passo 2: Ver Detalhes do Build

```bash
eas build:view abc123...
```

**Procure por:**
```
Download URL: https://eas-builds.s3.us-west-2.amazonaws.com/...apk
QR Code: [QR CODE]
```

### Passo 3: Copiar Link

Copie a URL completa do APK.

---

## 📊 Comparação de Métodos

| Método | Velocidade | Facilidade | Requer Código |
|--------|-----------|-----------|---------------|
| QR Code Online | ⚡ Rápido | ⭐⭐⭐⭐⭐ | Não |
| Python | ⚡⚡ Médio | ⭐⭐⭐ | Sim |
| Node.js | ⚡⚡ Médio | ⭐⭐⭐ | Sim |
| Link Direto | ⚡⚡⚡ Muito Rápido | ⭐⭐⭐⭐⭐ | Não |

---

## ✅ Checklist de Instalação

- [ ] APK gerado via EAS
- [ ] Link do APK obtido
- [ ] QR Code gerado
- [ ] QR Code salvo como imagem
- [ ] Celular com câmera funcionando
- [ ] Escanear QR Code
- [ ] APK baixado
- [ ] Arquivo aberto
- [ ] Instalação iniciada
- [ ] App instalado com sucesso

---

## 🆘 Troubleshooting

### "QR Code não funciona"
- Verificar se o link está correto
- Tentar gerar novamente
- Usar link direto em vez de QR Code

### "APK não baixa"
- Verificar conexão de internet
- Verificar se o link está ativo
- Tentar novamente em alguns minutos

### "Não consegue instalar"
- Verificar espaço em disco
- Ativar "Fontes desconhecidas"
- Desinstalar versão anterior

### "QR Code muito pequeno"
- Aumentar tamanho (300x300px)
- Usar gerador online com mais opções
- Imprimir em papel maior

---

## 🎯 Próximas Etapas

1. ✅ Gerar QR Code
2. ✅ Escanear com celular
3. ✅ Instalar app
4. ✅ Abrir Atos2
5. ✅ Registrar usuário
6. ✅ Testar funcionalidades

---

## 📚 Documentação Relacionada

- `QUICK_START_APK.md` - Guia rápido de APK
- `MOBILE_TESTING_GUIDE.md` - Guia de testes
- `BUILD_APK.md` - Guia detalhado de build

---

**Versão:** 1.0  
**Data:** 24/10/2025  
**Status:** ✅ Pronto para Usar


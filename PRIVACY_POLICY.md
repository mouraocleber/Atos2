# Política de Privacidade - Atos2

*Última atualização: Abril de 2026*

O **Atos2** está comprometido com a proteção da sua privacidade e de seus dados pessoais. Esta política regula o tratamento de informações fornecidas por você durante o uso de nossos aplicativos e serviços, em total conformidade com a Lei Geral de Proteção de Dados (LGPD) e demais legislações aplicáveis.

## 1. Coleta de Dados

Para fornecer um serviço completo, seguro e integrado (Chat + Carteira + Marketplace), coletamos as seguintes categorias de dados:

*   **Identificação Pessoal/Corporativa:** Nome completo, E-mail, Telefone, CPF/CNPJ, Apelido e data de nascimento (se aplicável).
*   **Dados de Localização:** CEP (que resolve automaticamente Endereço/Bairro/Cidade/UF via ViaCEP) e histórico de IPs para segurança das transações.
*   **Dados Financeiros e Transacionais:** Histórico de saldo, logs de transferência (remetente/destinatário, valores, taxas) e chaves PIX cadastradas.
*   **Dados de Mídia e Conversação:** Textos, áudios, fotos e vídeos trocados na plataforma. As mídias são transferidas via canais seguros e armazenadas temporariamente ou de forma persistente (caching) a critério da arquitetura em produção, mas são estritamente de caráter conversacional confidencial.
*   **Dados Biométricos e de Segurança:** Senhas (armazenadas via Hash seguro Bcrypt) e tokens de autenticação/acesso (JWT). Dependendo das configurações locais do seu dispositivo (React Native/Expo), seu hardware pode solicitar biometria ou FaceID para autorizar transações, mas o Atos2 *não* coleta nem armazena o molde biométrico em nossos servidores em nuvem.

## 2. Finalidade do Tratamento

Suas informações são utilizadas estritamente para:
*   **Criação e Gestão de Conta:** Autenticar seu acesso, recuperar senhas e gerenciar de forma inequívoca o seu perfil (PF ou PJ).
*   **Operações Financeiras:** Validar saldos, autorizar pagamentos na Moeda Global (G), calcular taxas devidas e gerar comprovantes detalhados com validade de auditoria (guardados por até 7 anos por exigência legal).
*   **Conformidade Legal:** Evitar fraudes (através da validação matemática e comportamental de CPFs e CNPJs) e mitigar crimes financeiros (como lavagem de dinheiro).
*   **Comunicação do Sistema:** Interações via WebSocket (Push Notifications) enviando alertas transacionais, recibos e mensagens diretas dos seus contatos.

## 3. Armazenamento e Segurança

*   Servidores em Produção: Nossos dados sensíveis rodam em clusters de banco de dados (PostgreSQL + Redis) hospedados em infraestrutura fechada na nuvem (DigitalOcean).
*   Criptografia de Senha: Nunca sabemos ou podemos recuperar sua senha descodificada.
*   Retenção de Arquivos (Uploads): Fotos de perfis e mídias de produtos estão abrigadas nos diretórios seguros internos vinculados à conta criadora.

## 4. Compartilhamento de Dados

Não vendemos, trocamos ou expomos publicamente nenhum de seus dados financeiros, exceto nos estritos casos:
*   Exibição condicional pública de "Nome" ou "Apelido" e foto de perfil na tela de busca ou Catálogo pelo próprio aplicativo.
*   Uso de fornecedores externos estritamente integrados e homologados pela Atos2:
    *   Exemplo 1: **Google Services / Firebase** para login social e envio de notificações para a build Android.
    *   Exemplo 2: Mecanismos de roteamento de voz temporários (Ex: **Twilio**) via WebRTC.
    *   Exemplo 3: Instituições bancárias para fechamento de PIX e gateway (ex: **Stripe**).
*   Ordens judiciais e investigações requisitadas pelas autoridades legais do Brasil.

## 5. Exclusão e Meus Direitos

Sob a LGPD do Brasil, o Usuário conta com o direito irrevogável de:
1.  Solicitar o extrato consolidado de seus dados sistêmicos.
2.  Desativar sua conta e solicitar o expurgo dos dados – com a ressalva *crítica* de que logs financeiros e de transações não poderão ser removidos até o fim do ciclo prescricional fiscal obrigatório (tipicamente 5 a 7 anos).
3.  Corrigir informações inexatas.

> [!CAUTION]
> A remoção ou interrupção do envio de dados de base implicará diretamente na incapacidade do aplicativo Atos2 sustentar a Carteira do cliente ou a visibilidade no Marketplace, procedendo-se com o encerramento da conta.

---
**Contato e Encarregado de Dados (DPO):** 
Para exercer seus direitos de privacidade ou esclarecer dúvidas, entre em contato via `privacy@atos2.com`.

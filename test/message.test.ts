import request from 'supertest';
import app from '../src/index';
import { expect } from 'chai';
import { Message } from '../src/types';
import { User } from '../src/types';
import userService from '../src/services/userService';
import contactService from '../src/services/contactService';
import { query } from '../src/config/database';

// Variáveis globais para o teste
let user1: User;
let user2: User;
let token1: string;
let token2: string;

describe('Message Features Integration Tests', () => {
  before(async () => {
    // Limpar e inicializar o banco de dados (simulação)
    await query('DROP TABLE IF EXISTS messages, contacts, users CASCADE');
    await query(require('fs').readFileSync('./src/config/init-db.sql', 'utf8'));

    // Criar usuários de teste
    user1 = await userService.createUser({
      email: 'user1@test.com',
      phone: '11987654321',
      nickname: 'user1',
      name: 'User One',
      personType: 'PF',
      cpf: '11122233344',
      cep: '01001000',
      password: 'password123',
      blockNonContacts: false,
    });

    user2 = await userService.createUser({
      email: 'user2@test.com',
      phone: '11987654322',
      nickname: 'user2',
      name: 'User Two',
      personType: 'PF',
      cpf: '11122233355',
      cep: '01001000',
      password: 'password123',
      blockNonContacts: true, // User 2 bloqueia não-contatos
    });

    // Login para obter tokens
    const res1 = await request(app).post('/api/auth/login').send({ email: user1.email, password: 'password123' });
    token1 = res1.body.data.token;

    const res2 = await request(app).post('/api/auth/login').send({ email: user2.email, password: 'password123' });
    token2 = res2.body.data.token;
  });

  // Teste 1: Bloqueio de mensagens de não-contatos
  it('should block message from non-contact if recipient has blockNonContacts enabled', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        recipientId: user2.id,
        type: 'TEXT',
        content: 'Hello from non-contact user1',
      });

    expect(res.statusCode).to.equal(403);
    expect(res.body.error).to.equal('BLOCKED_NON_CONTACT');
  });

  it('should allow message from contact even if recipient has blockNonContacts enabled', async () => {
    // User 2 adiciona User 1 como contato
    await contactService.addContact(user2.id, user1.id);

    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        recipientId: user2.id,
        type: 'TEXT',
        content: 'Hello from contact user1',
      });

    expect(res.statusCode).to.equal(201);
    expect(res.body.data.content).to.equal('Hello from contact user1');
  });

  // Teste 2: Filtragem de palavras-chave
  it('should block message containing blocked keywords', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        recipientId: user2.id,
        type: 'TEXT',
        content: 'Esta é uma mensagem de spam',
      });

    expect(res.statusCode).to.equal(403);
    expect(res.body.error).to.equal('BLOCKED_KEYWORD');
  });

  it('should allow message without blocked keywords', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        recipientId: user2.id,
        type: 'TEXT',
        content: 'Mensagem normal',
      });

    expect(res.statusCode).to.equal(201);
    expect(res.body.data.content).to.equal('Mensagem normal');
  });

  // Teste 3: Edição de mensagem
  let sentMessage: Message;
  it('should allow editing a sent message', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        recipientId: user2.id,
        type: 'TEXT',
        content: 'Mensagem original',
      });
    sentMessage = res.body.data;

    const editRes = await request(app)
      .put(`/api/messages/${sentMessage.id}`)
      .set('Authorization', `Bearer ${token1}`)
      .send({
        newContent: 'Mensagem editada',
      });

    expect(editRes.statusCode).to.equal(200);
    expect(editRes.body.data.content).to.equal('Mensagem editada');
    expect(editRes.body.data.isEdited).to.be.true;
  });

  it('should prevent editing a message by a different user', async () => {
    const editRes = await request(app)
      .put(`/api/messages/${sentMessage.id}`)
      .set('Authorization', `Bearer ${token2}`)
      .send({
        newContent: 'Tentativa de edição por user2',
      });

    expect(editRes.statusCode).to.equal(403);
    expect(editRes.body.error).to.equal('UNAUTHORIZED_ACTION');
  });

  // Teste 4: Agendamento de mensagem
  it('should schedule a message for a future time', async () => {
    const futureTime = new Date(Date.now() + 60000).toISOString(); // 1 minuto no futuro

    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        recipientId: user2.id,
        type: 'TEXT',
        content: 'Mensagem agendada',
        scheduledAt: futureTime,
      });

    expect(res.statusCode).to.equal(201);
    expect(res.body.message).to.equal('Mensagem agendada com sucesso');
    expect(res.body.data.status).to.equal('SCHEDULED');
    expect(res.body.data.isScheduled).to.be.true;
  });
});

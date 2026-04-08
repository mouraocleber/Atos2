import { query } from './src/config/database';
import { mercadoPagoService } from './src/services/mercadoPagoService';

async function patchAndTest() {
  const cleberEmail = 'mourao.cleber@gmail.com';
  const cleberCpf = '85805254620';
  const amandaCpf = '09920931713';

  // List all users and their cpfs to understand the current state
  const allUsers = await query("SELECT id, nickname, email, cpf FROM users ORDER BY created_at");
  console.log('All users:', JSON.stringify(allUsers.rows, null, 2));
  process.exit(0);
}
patchAndTest();

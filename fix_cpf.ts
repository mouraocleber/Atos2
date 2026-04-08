import { query } from './src/config/database';

async function fixCPF() {
  // Free up 12345678909 by changing whoever has it
  await query("UPDATE users SET cpf = '00000000001' WHERE cpf = '12345678909'");
  
  // Set it to Cleber
  await query("UPDATE users SET cpf = '12345678909' WHERE email = 'mourao.cleber@gmail.com'");
  
  console.log('CPF officially mapped to Cleber!');
  process.exit(0);
}
fixCPF();

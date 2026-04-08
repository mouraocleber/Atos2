import { query } from './src/config/database';

async function fixUserEmail() {
  await query("UPDATE users SET email = 'mourao.cleber@gmail.com' WHERE email = 'mourao.cleber@gmail.comm'");
  console.log('Fixed email from .comm to .com');
  process.exit(0);
}
fixUserEmail();

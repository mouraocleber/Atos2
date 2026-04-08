import { query } from './src/config/database';

async function fixAmandaEmail() {
  await query("UPDATE users SET email = 'amandinha.mourao@gmail.com' WHERE email = 'Amandinha@atos2.com'");
  console.log('Fixed Amandinha email to: amandinha.mourao@gmail.com');
  process.exit(0);
}
fixAmandaEmail();

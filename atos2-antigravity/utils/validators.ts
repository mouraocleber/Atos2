export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function isValidPhone(phone: string): boolean {
  // Apenas extrai dígitos numericos
  const digits = phone.replace(/\D/g, '');
  // Verifica se tem 10 (ex: 1144445555) ou 11 (ex: 11999998888) dígitos
  return digits.length >= 10 && digits.length <= 15;
}

export function isValidCPF(cpf: string): boolean {
  let strCPF = cpf.replace(/\D/g, '');
  if (strCPF.length !== 11) return false;
  
  // Retorna falso se for uma repetição (ex: 11111111111)
  if (/^(\d)\1+$/.test(strCPF)) return false; 

  let soma = 0;
  let resto;
  
  for (let i = 1; i <= 9; i++) {
    soma = soma + parseInt(strCPF.substring(i-1, i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if ((resto === 10) || (resto === 11)) resto = 0;
  if (resto !== parseInt(strCPF.substring(9, 10))) return false;

  soma = 0;
  for (let i = 1; i <= 10; i++) {
    soma = soma + parseInt(strCPF.substring(i-1, i)) * (12 - i);
  }
  resto = (soma * 10) % 11;
  if ((resto === 10) || (resto === 11)) resto = 0;
  if (resto !== parseInt(strCPF.substring(10, 11))) return false;

  return true;
}

export function isValidCNPJ(cnpj: string): boolean {
  let strCNPJ = cnpj.replace(/\D/g, '');
  if (strCNPJ.length !== 14) return false;
  if (/^(\d)\1+$/.test(strCNPJ)) return false;

  let tamanho = strCNPJ.length - 2;
  let numeros = strCNPJ.substring(0, tamanho);
  let digitos = strCNPJ.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado !== parseInt(digitos.charAt(0))) return false;
  
  tamanho = tamanho + 1;
  numeros = strCNPJ.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado !== parseInt(digitos.charAt(1))) return false;
  
  return true;
}

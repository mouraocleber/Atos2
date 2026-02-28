/**
 * Moedas Suportadas - ISO 4217
 * Lista completa de moedas com seus respectivos países
 */

export const SUPPORTED_CURRENCIES = {
  // América
  AED: { code: 'AED', name: 'Dirham dos Emirados Árabes', country: 'Emirados Árabes Unidos', symbol: 'د.إ' },
  AFN: { code: 'AFN', name: 'Afegani', country: 'Afeganistão', symbol: '؋' },
  ALL: { code: 'ALL', name: 'Lek', country: 'Albânia', symbol: 'L' },
  AMD: { code: 'AMD', name: 'Dram Armênio', country: 'Armênia', symbol: '֏' },
  ANG: { code: 'ANG', name: 'Florim das Antilhas Holandesas', country: 'Antilhas Holandesas', symbol: 'ƒ' },
  AOA: { code: 'AOA', name: 'Kwanza Angolano', country: 'Angola', symbol: 'Kz' },
  ARS: { code: 'ARS', name: 'Peso Argentino', country: 'Argentina', symbol: '$' },
  AUD: { code: 'AUD', name: 'Dólar Australiano', country: 'Austrália', symbol: 'A$' },
  AWG: { code: 'AWG', name: 'Florim Arubano', country: 'Aruba', symbol: 'ƒ' },
  AZN: { code: 'AZN', name: 'Manat Azerbaijano', country: 'Azerbaijão', symbol: '₼' },
  BAM: { code: 'BAM', name: 'Marco Conversível da Bósnia e Herzegovina', country: 'Bósnia e Herzegovina', symbol: 'KM' },
  BBD: { code: 'BBD', name: 'Dólar Barbadiano', country: 'Barbados', symbol: '$' },
  BDT: { code: 'BDT', name: 'Taka Bangladeshiana', country: 'Bangladesh', symbol: '৳' },
  BGN: { code: 'BGN', name: 'Lev Búlgaro', country: 'Bulgária', symbol: 'лв' },
  BHD: { code: 'BHD', name: 'Dinar Bahreinita', country: 'Bahrein', symbol: '.د.ب' },
  BIF: { code: 'BIF', name: 'Franco Burundiano', country: 'Burundi', symbol: 'FBu' },
  BMD: { code: 'BMD', name: 'Dólar Bermudense', country: 'Bermudas', symbol: '$' },
  BND: { code: 'BND', name: 'Dólar Bruneiano', country: 'Brunei', symbol: '$' },
  BOB: { code: 'BOB', name: 'Boliviano', country: 'Bolívia', symbol: 'Bs.' },
  BRL: { code: 'BRL', name: 'Real Brasileiro', country: 'Brasil', symbol: 'R$' },
  BSD: { code: 'BSD', name: 'Dólar Bahamense', country: 'Bahamas', symbol: '$' },
  BTC: { code: 'BTC', name: 'Bitcoin', country: 'Criptomoeda', symbol: '₿' },
  BTN: { code: 'BTN', name: 'Ngultrum Butanês', country: 'Butão', symbol: 'Nu.' },
  BWP: { code: 'BWP', name: 'Pula Botsuanesa', country: 'Botsuana', symbol: 'P' },
  BYN: { code: 'BYN', name: 'Rublo Bielorrusso', country: 'Bielorrússia', symbol: 'Br' },
  BZD: { code: 'BZD', name: 'Dólar Belizense', country: 'Belize', symbol: '$' },
  CAD: { code: 'CAD', name: 'Dólar Canadense', country: 'Canadá', symbol: 'C$' },
  CDF: { code: 'CDF', name: 'Franco Congolês', country: 'Congo', symbol: 'FC' },
  CHF: { code: 'CHF', name: 'Franco Suíço', country: 'Suíça', symbol: 'CHF' },
  CLF: { code: 'CLF', name: 'Unidade de Fomento Chilena', country: 'Chile', symbol: 'UF' },
  CLP: { code: 'CLP', name: 'Peso Chileno', country: 'Chile', symbol: '$' },
  CNY: { code: 'CNY', name: 'Yuan Chinês', country: 'China', symbol: '¥' },
  COP: { code: 'COP', name: 'Peso Colombiano', country: 'Colômbia', symbol: '$' },
  CRC: { code: 'CRC', name: 'Colón Costa-riquenho', country: 'Costa Rica', symbol: '₡' },
  CUC: { code: 'CUC', name: 'Peso Cubano Conversível', country: 'Cuba', symbol: '$' },
  CUP: { code: 'CUP', name: 'Peso Cubano', country: 'Cuba', symbol: '₱' },
  CVE: { code: 'CVE', name: 'Escudo Cabo-verdiano', country: 'Cabo Verde', symbol: '$' },
  CZK: { code: 'CZK', name: 'Coroa Tcheca', country: 'República Tcheca', symbol: 'Kč' },
  DJF: { code: 'DJF', name: 'Franco Djiboutiano', country: 'Djibuti', symbol: 'Fdj' },
  DKK: { code: 'DKK', name: 'Coroa Dinamarquesa', country: 'Dinamarca', symbol: 'kr' },
  DOP: { code: 'DOP', name: 'Peso Dominicano', country: 'República Dominicana', symbol: '$' },
  DZD: { code: 'DZD', name: 'Dinar Argelino', country: 'Argélia', symbol: 'د.ج' },
  EGP: { code: 'EGP', name: 'Libra Egípcia', country: 'Egito', symbol: '£' },
  ERN: { code: 'ERN', name: 'Nakfa Eritreano', country: 'Eritreia', symbol: 'Nfk' },
  ETB: { code: 'ETB', name: 'Birr Etíope', country: 'Etiópia', symbol: 'Br' },
  EUR: { code: 'EUR', name: 'Euro', country: 'União Europeia', symbol: '€' },
  FJD: { code: 'FJD', name: 'Dólar Fijiano', country: 'Fiji', symbol: '$' },
  FKP: { code: 'FKP', name: 'Libra das Ilhas Malvinas', country: 'Ilhas Malvinas', symbol: '£' },
  GBP: { code: 'GBP', name: 'Libra Esterlina', country: 'Reino Unido', symbol: '£' },
  GEL: { code: 'GEL', name: 'Lari Georgiano', country: 'Geórgia', symbol: '₾' },
  GHS: { code: 'GHS', name: 'Cedi Ganês', country: 'Gana', symbol: '₵' },
  GIP: { code: 'GIP', name: 'Libra de Gibraltar', country: 'Gibraltar', symbol: '£' },
  GMD: { code: 'GMD', name: 'Dalasi Gambiano', country: 'Gâmbia', symbol: 'D' },
  GNF: { code: 'GNF', name: 'Franco Guineano', country: 'Guiné', symbol: 'FG' },
  GTQ: { code: 'GTQ', name: 'Quetzal Guatemalteco', country: 'Guatemala', symbol: 'Q' },
  GYD: { code: 'GYD', name: 'Dólar Guianense', country: 'Guiana', symbol: '$' },
  HKD: { code: 'HKD', name: 'Dólar de Hong Kong', country: 'Hong Kong', symbol: '$' },
  HNL: { code: 'HNL', name: 'Lempira Hondurenha', country: 'Honduras', symbol: 'L' },
  HRK: { code: 'HRK', name: 'Kuna Croata', country: 'Croácia', symbol: 'kn' },
  HTG: { code: 'HTG', name: 'Gourde Haitiano', country: 'Haiti', symbol: 'G' },
  HUF: { code: 'HUF', name: 'Forint Húngaro', country: 'Hungria', symbol: 'Ft' },
  IDR: { code: 'IDR', name: 'Rupia Indonésia', country: 'Indonésia', symbol: 'Rp' },
  ILS: { code: 'ILS', name: 'Novo Sheqel Israelita', country: 'Israel', symbol: '₪' },
  INR: { code: 'INR', name: 'Rupia Indiana', country: 'Índia', symbol: '₹' },
  IQD: { code: 'IQD', name: 'Dinar Iraquiano', country: 'Iraque', symbol: 'ع.د' },
  IRR: { code: 'IRR', name: 'Rial Iraniano', country: 'Irã', symbol: '﷼' },
  ISK: { code: 'ISK', name: 'Coroa Islandesa', country: 'Islândia', symbol: 'kr' },
  JMD: { code: 'JMD', name: 'Dólar Jamaicano', country: 'Jamaica', symbol: '$' },
  JOD: { code: 'JOD', name: 'Dinar Jordaniano', country: 'Jordânia', symbol: 'د.ا' },
  JPY: { code: 'JPY', name: 'Iene Japonês', country: 'Japão', symbol: '¥' },
  KES: { code: 'KES', name: 'Xelim Queniano', country: 'Quênia', symbol: 'KSh' },
  KGS: { code: 'KGS', name: 'Som Quirguiz', country: 'Quirguistão', symbol: 'с' },
  KHR: { code: 'KHR', name: 'Rial Cambojano', country: 'Camboja', symbol: '៛' },
  KMF: { code: 'KMF', name: 'Franco Comoriano', country: 'Comores', symbol: 'CF' },
  KPW: { code: 'KPW', name: 'Won Norte-coreano', country: 'Coreia do Norte', symbol: '₩' },
  KRW: { code: 'KRW', name: 'Won Sul-coreano', country: 'Coreia do Sul', symbol: '₩' },
  KWD: { code: 'KWD', name: 'Dinar Kuwaitiano', country: 'Kuwait', symbol: 'د.ك' },
  KYD: { code: 'KYD', name: 'Dólar das Ilhas Cayman', country: 'Ilhas Cayman', symbol: '$' },
  KZT: { code: 'KZT', name: 'Tenge Cazaque', country: 'Cazaquistão', symbol: '₸' },
  LAK: { code: 'LAK', name: 'Kip Laosiano', country: 'Laos', symbol: '₭' },
  LBP: { code: 'LBP', name: 'Libra Libanesa', country: 'Líbano', symbol: '£' },
  LKR: { code: 'LKR', name: 'Rupia Cingalesa', country: 'Sri Lanka', symbol: 'Rs' },
  LRD: { code: 'LRD', name: 'Dólar Liberiano', country: 'Libéria', symbol: '$' },
  LSL: { code: 'LSL', name: 'Loti Lesotano', country: 'Lesoto', symbol: 'L' },
  LYD: { code: 'LYD', name: 'Dinar Líbio', country: 'Líbia', symbol: 'ل.د' },
  MAD: { code: 'MAD', name: 'Dirham Marroquino', country: 'Marrocos', symbol: 'د.م.' },
  MDL: { code: 'MDL', name: 'Leu Moldavo', country: 'Moldávia', symbol: 'L' },
  MGA: { code: 'MGA', name: 'Ariary Malgaxe', country: 'Madagascar', symbol: 'Ar' },
  MKD: { code: 'MKD', name: 'Denar Macedônio', country: 'Macedônia do Norte', symbol: 'ден' },
  MMK: { code: 'MMK', name: 'Quiate Birmanês', country: 'Mianmar', symbol: 'K' },
  MNT: { code: 'MNT', name: 'Tugrik Mongol', country: 'Mongólia', symbol: '₮' },
  MOP: { code: 'MOP', name: 'Pataca Macaense', country: 'Macau', symbol: 'P' },
  MRU: { code: 'MRU', name: 'Ouguiya Mauritana', country: 'Mauritânia', symbol: 'UM' },
  MUR: { code: 'MUR', name: 'Rupia Mauriciana', country: 'Maurício', symbol: '₨' },
  MVR: { code: 'MVR', name: 'Rufiyaa Maldiviana', country: 'Maldivas', symbol: 'Rf' },
  MWK: { code: 'MWK', name: 'Kwacha Malauiana', country: 'Malawi', symbol: 'MK' },
  MXN: { code: 'MXN', name: 'Peso Mexicano', country: 'México', symbol: '$' },
  MYR: { code: 'MYR', name: 'Ringgit Malaio', country: 'Malásia', symbol: 'RM' },
  MZN: { code: 'MZN', name: 'Metical Moçambicano', country: 'Moçambique', symbol: 'MT' },
  NAD: { code: 'NAD', name: 'Dólar Namibiano', country: 'Namíbia', symbol: '$' },
  NGN: { code: 'NGN', name: 'Naira Nigeriana', country: 'Nigéria', symbol: '₦' },
  NIO: { code: 'NIO', name: 'Córdoba Nicaraguano', country: 'Nicarágua', symbol: 'C$' },
  NOK: { code: 'NOK', name: 'Coroa Norueguesa', country: 'Noruega', symbol: 'kr' },
  NPR: { code: 'NPR', name: 'Rupia Nepalesa', country: 'Nepal', symbol: '₨' },
  NZD: { code: 'NZD', name: 'Dólar Neozelandês', country: 'Nova Zelândia', symbol: '$' },
  OMR: { code: 'OMR', name: 'Rial Omanita', country: 'Omã', symbol: 'ر.ع.' },
  PAB: { code: 'PAB', name: 'Balboa Panamenho', country: 'Panamá', symbol: 'B/.' },
  PEN: { code: 'PEN', name: 'Sol Peruano', country: 'Peru', symbol: 'S/' },
  PGK: { code: 'PGK', name: 'Kina Papua-nova-guinéense', country: 'Papua Nova Guiné', symbol: 'K' },
  PHP: { code: 'PHP', name: 'Peso Filipinense', country: 'Filipinas', symbol: '₱' },
  PKR: { code: 'PKR', name: 'Rupia Paquistanesa', country: 'Paquistão', symbol: '₨' },
  PLN: { code: 'PLN', name: 'Zloti Polonês', country: 'Polônia', symbol: 'zł' },
  PYG: { code: 'PYG', name: 'Guarani Paraguaio', country: 'Paraguai', symbol: '₲' },
  QAR: { code: 'QAR', name: 'Rial Catariano', country: 'Catar', symbol: 'ر.ق' },
  RON: { code: 'RON', name: 'Leu Romeno', country: 'Romênia', symbol: 'lei' },
  RSD: { code: 'RSD', name: 'Dinar Sérvio', country: 'Sérvia', symbol: 'Дин.' },
  RUB: { code: 'RUB', name: 'Rublo Russo', country: 'Rússia', symbol: '₽' },
  RWF: { code: 'RWF', name: 'Franco Ruandês', country: 'Ruanda', symbol: 'FRw' },
  SAR: { code: 'SAR', name: 'Rial Saudita', country: 'Arábia Saudita', symbol: 'ر.س' },
  SBD: { code: 'SBD', name: 'Dólar das Ilhas Salomão', country: 'Ilhas Salomão', symbol: '$' },
  SCR: { code: 'SCR', name: 'Rupia Seichelense', country: 'Seicheles', symbol: '₨' },
  SDG: { code: 'SDG', name: 'Libra Sudanesa', country: 'Sudão', symbol: '£' },
  SEK: { code: 'SEK', name: 'Coroa Sueca', country: 'Suécia', symbol: 'kr' },
  SGD: { code: 'SGD', name: 'Dólar Singapuriano', country: 'Singapura', symbol: '$' },
  SHP: { code: 'SHP', name: 'Libra de Santa Helena', country: 'Santa Helena', symbol: '£' },
  SLL: { code: 'SLL', name: 'Leone Serra-leonês', country: 'Serra Leoa', symbol: 'Le' },
  SOS: { code: 'SOS', name: 'Xelim Somali', country: 'Somália', symbol: 'Sh' },
  SRD: { code: 'SRD', name: 'Dólar Surinamês', country: 'Suriname', symbol: '$' },
  SSP: { code: 'SSP', name: 'Libra Sul-sudanesa', country: 'Sudão do Sul', symbol: '£' },
  STN: { code: 'STN', name: 'Dobra Santomense', country: 'São Tomé e Príncipe', symbol: 'Db' },
  SYP: { code: 'SYP', name: 'Libra Síria', country: 'Síria', symbol: '£' },
  SZL: { code: 'SZL', name: 'Lilangeni Suazi', country: 'Eswatini', symbol: 'L' },
  THB: { code: 'THB', name: 'Baht Tailandês', country: 'Tailândia', symbol: '฿' },
  TJS: { code: 'TJS', name: 'Somoni Tadjique', country: 'Tajiquistão', symbol: 'ЅМ' },
  TMT: { code: 'TMT', name: 'Manat Turcomano', country: 'Turcomenistão', symbol: 'm' },
  TND: { code: 'TND', name: 'Dinar Tunisiano', country: 'Tunísia', symbol: 'د.ت' },
  TOP: { code: 'TOP', name: 'Paanga Tonganesa', country: 'Tonga', symbol: 'T$' },
  TRY: { code: 'TRY', name: 'Lira Turca', country: 'Turquia', symbol: '₺' },
  TTD: { code: 'TTD', name: 'Dólar Trindadense', country: 'Trinidad e Tobago', symbol: '$' },
  TWD: { code: 'TWD', name: 'Novo Dólar Taiwanês', country: 'Taiwan', symbol: 'NT$' },
  TZS: { code: 'TZS', name: 'Xelim Tanzaniano', country: 'Tanzânia', symbol: 'TSh' },
  UAH: { code: 'UAH', name: 'Hryvnia Ucraniana', country: 'Ucrânia', symbol: '₴' },
  UGX: { code: 'UGX', name: 'Xelim Ugandês', country: 'Uganda', symbol: 'USh' },
  USD: { code: 'USD', name: 'Dólar Americano', country: 'Estados Unidos', symbol: '$' },
  UYU: { code: 'UYU', name: 'Peso Uruguaio', country: 'Uruguai', symbol: '$' },
  UZS: { code: 'UZS', name: 'Som Uzbeque', country: 'Uzbequistão', symbol: 'сўм' },
  VES: { code: 'VES', name: 'Bolívar Soberano Venezuelano', country: 'Venezuela', symbol: 'Bs.' },
  VND: { code: 'VND', name: 'Dong Vietnamita', country: 'Vietnã', symbol: '₫' },
  VUV: { code: 'VUV', name: 'Vatu Vanuatuano', country: 'Vanuatu', symbol: 'VT' },
  WST: { code: 'WST', name: 'Tala Samoano', country: 'Samoa', symbol: 'T' },
  XAF: { code: 'XAF', name: 'Franco CFA BEAC', country: 'África Central', symbol: 'FCFA' },
  XCD: { code: 'XCD', name: 'Dólar do Caribe Oriental', country: 'Caribe', symbol: '$' },
  XOF: { code: 'XOF', name: 'Franco CFA WAEMU', country: 'África Ocidental', symbol: 'CFA' },
  XPF: { code: 'XPF', name: 'Franco CFP', country: 'Polinésia Francesa', symbol: '₣' },
  YER: { code: 'YER', name: 'Rial Iemenita', country: 'Iêmen', symbol: '﷼' },
  ZAR: { code: 'ZAR', name: 'Rand Sul-africano', country: 'África do Sul', symbol: 'R' },
  ZMW: { code: 'ZMW', name: 'Kwacha Zambiana', country: 'Zâmbia', symbol: 'ZK' },
  ZWL: { code: 'ZWL', name: 'Dólar Zimbabueano', country: 'Zimbábue', symbol: '$' },
};

/**
 * Obter lista de códigos de moedas suportadas
 */
export function getSupportedCurrencyCodes(): string[] {
  return Object.keys(SUPPORTED_CURRENCIES);
}

/**
 * Obter informações de uma moeda
 */
export function getCurrencyInfo(code: string) {
  return SUPPORTED_CURRENCIES[code as keyof typeof SUPPORTED_CURRENCIES];
}

/**
 * Validar se uma moeda é suportada
 */
export function isCurrencySupported(code: string): boolean {
  return code in SUPPORTED_CURRENCIES;
}

/**
 * Obter lista de moedas por região
 */
export function getCurrenciesByRegion(region: 'americas' | 'europe' | 'asia' | 'africa' | 'oceania') {
  const regionMap: Record<string, string[]> = {
    americas: ['USD', 'CAD', 'MXN', 'BRL', 'ARS', 'CLP', 'COP', 'PEN', 'UYU', 'VES', 'JMD', 'TTD', 'BSD', 'BBD', 'BZD', 'GTQ', 'HNL', 'NIO', 'PAB', 'SRD', 'GYD'],
    europe: ['EUR', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK', 'ISK', 'CZK', 'HUF', 'PLN', 'RON', 'BGN', 'HRK', 'RUB', 'UAH', 'BYN', 'KZT'],
    asia: ['JPY', 'CNY', 'INR', 'IDR', 'PHP', 'THB', 'MYR', 'SGD', 'VND', 'KRW', 'TWD', 'HKD', 'PKR', 'BDT', 'LKR', 'MMK', 'KHR', 'LAK'],
    africa: ['ZAR', 'EGP', 'NGN', 'KES', 'GHS', 'MAD', 'TND', 'UGX', 'ETB', 'RWF', 'TZS', 'ZMW', 'ZWL', 'MUR', 'SCR'],
    oceania: ['AUD', 'NZD', 'FJD', 'PGK', 'SBD', 'TOP', 'VUV', 'WST', 'XPF'],
  };

  return regionMap[region] || [];
}

/**
 * Moedas mais populares
 */
export const POPULAR_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'CNY', 'INR', 'BRL', 'MXN', 'KRW', 'SGD', 'HKD'];

/**
 * Moedas com maior volume de transação
 */
export const MAJOR_CURRENCIES = ['USD', 'EUR', 'JPY', 'GBP', 'CHF', 'CAD', 'AUD', 'CNY'];


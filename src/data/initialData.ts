import { Category, CreditCard, Transaction } from '../types/finance';

export const DEFAULT_CREDIT_CARDS: CreditCard[] = [
  {
    id: 'card-nubank',
    name: 'Nubank Ultravioleta',
    brand: 'mastercard',
    lastFourDigits: '8392',
    limit: 12000,
    closingDay: 25,
    dueDay: 5,
    color: '#8B5CF6', // Purple
  },
  {
    id: 'card-itau',
    name: 'Itaú Click Visa',
    brand: 'visa',
    lastFourDigits: '4120',
    limit: 8500,
    closingDay: 18,
    dueDay: 28,
    color: '#F97316', // Orange
  },
];

export const DEFAULT_CATEGORIES: Category[] = [
  // DESPESAS
  {
    id: 'cat-alimentacao',
    name: 'Alimentação',
    type: 'expense',
    color: '#F59E0B', // Amber
    icon: 'Utensils',
    budgetLimit: 2200,
    subcategories: [
      { id: 'sub-supermercado', name: 'Supermercado' },
      { id: 'sub-restaurante', name: 'Restaurantes & Bares' },
      { id: 'sub-delivery', name: 'Delivery & iFood' },
      { id: 'sub-padaria', name: 'Padaria & Cafeteria' },
      { id: 'sub-feira', name: 'Feira & Hortifruti' },
    ],
  },
  {
    id: 'cat-moradia',
    name: 'Moradia',
    type: 'expense',
    color: '#3B82F6', // Blue
    icon: 'Home',
    budgetLimit: 3200,
    subcategories: [
      { id: 'sub-aluguel', name: 'Aluguel / Financiamento' },
      { id: 'sub-condominio', name: 'Condomínio' },
      { id: 'sub-energia', name: 'Energia Elétrica' },
      { id: 'sub-agua', name: 'Água & Saneamento' },
      { id: 'sub-internet', name: 'Internet & TV a Cabo' },
      { id: 'sub-manutencao-casa', name: 'Manutenção & Reformas' },
    ],
  },
  {
    id: 'cat-transporte',
    name: 'Transporte',
    type: 'expense',
    color: '#8B5CF6', // Purple
    icon: 'Car',
    budgetLimit: 1200,
    subcategories: [
      { id: 'sub-combustivel', name: 'Combustível' },
      { id: 'sub-uber', name: 'Uber / Aplicativos' },
      { id: 'sub-transporte-publico', name: 'Transporte Público' },
      { id: 'sub-manutencao-auto', name: 'Manutenção & Revisão' },
      { id: 'sub-estacionamento', name: 'Estacionamento & Pedágios' },
      { id: 'sub-seguro-auto', name: 'Seguro Veicular / IPVA' },
    ],
  },
  {
    id: 'cat-saude',
    name: 'Saúde & Cuidados',
    type: 'expense',
    color: '#EC4899', // Pink
    icon: 'HeartPulse',
    budgetLimit: 900,
    subcategories: [
      { id: 'sub-farmacia', name: 'Farmácia & Medicamentos' },
      { id: 'sub-plano-saude', name: 'Plano de Saúde' },
      { id: 'sub-consultas', name: 'Consultas & Exames' },
      { id: 'sub-academia', name: 'Academia & Treinos' },
      { id: 'sub-estetica', name: 'Salão & Barbearia' },
    ],
  },
  {
    id: 'cat-educacao',
    name: 'Educação',
    type: 'expense',
    color: '#10B981', // Emerald
    icon: 'GraduationCap',
    budgetLimit: 700,
    subcategories: [
      { id: 'sub-cursos', name: 'Cursos & Treinamentos' },
      { id: 'sub-faculdade', name: 'Faculdade & Pós' },
      { id: 'sub-livros', name: 'Livros & Material' },
      { id: 'sub-idiomas', name: 'Aulas de Idiomas' },
    ],
  },
  {
    id: 'cat-lazer',
    name: 'Lazer & Entretenimento',
    type: 'expense',
    color: '#06B6D4', // Cyan
    icon: 'Film',
    budgetLimit: 850,
    subcategories: [
      { id: 'sub-streaming', name: 'Streaming & Assinaturas' },
      { id: 'sub-viagens', name: 'Viagens & Passeios' },
      { id: 'sub-cinema', name: 'Cinema & Shows' },
      { id: 'sub-hobbies', name: 'Jogos & Hobbies' },
    ],
  },
  {
    id: 'cat-compras',
    name: 'Compras & Pessoal',
    type: 'expense',
    color: '#F97316', // Orange
    icon: 'ShoppingBag',
    budgetLimit: 600,
    subcategories: [
      { id: 'sub-roupas', name: 'Roupas & Calçados' },
      { id: 'sub-eletronicos', name: 'Eletrônicos & Gadgets' },
      { id: 'sub-presentes', name: 'Presentes & Lembranças' },
      { id: 'sub-decoracao', name: 'Casa & Utilidades' },
    ],
  },
  {
    id: 'cat-financas',
    name: 'Tarifas & Encargos',
    type: 'expense',
    color: '#64748B', // Slate
    icon: 'Receipt',
    budgetLimit: 250,
    subcategories: [
      { id: 'sub-tarifas', name: 'Tarifas Bancárias' },
      { id: 'sub-juros', name: 'Juros & IOF' },
      { id: 'sub-seguros', name: 'Seguros Pessoais' },
    ],
  },

  // RECEITAS
  {
    id: 'cat-salario',
    name: 'Remuneração & Salário',
    type: 'income',
    color: '#059669', // Emerald
    icon: 'Briefcase',
    subcategories: [
      { id: 'sub-salario-mensal', name: 'Salário Principal' },
      { id: 'sub-adiantamento', name: 'Adiantamento' },
      { id: 'sub-decimo-terceiro', name: '13º Salário' },
      { id: 'sub-ferias', name: 'Férias Remuneradas' },
      { id: 'sub-bonus', name: 'Bônus & PLR' },
    ],
  },
  {
    id: 'cat-renda-extra',
    name: 'Renda Extra & Serviços',
    type: 'income',
    color: '#6366F1', // Indigo
    icon: 'Laptop',
    subcategories: [
      { id: 'sub-freelance', name: 'Projetos Freelance' },
      { id: 'sub-consultoria', name: 'Consultoria' },
      { id: 'sub-vendas', name: 'Venda de Produtos' },
      { id: 'sub-comissao', name: 'Comissões' },
    ],
  },
  {
    id: 'cat-investimentos',
    name: 'Rendimentos & Investimentos',
    type: 'income',
    color: '#14B8A6', // Teal
    icon: 'TrendingUp',
    subcategories: [
      { id: 'sub-dividendos', name: 'Dividendos & JCP' },
      { id: 'sub-renda-fixa', name: 'Rendimentos CDI / Selic' },
      { id: 'sub-aluguel-recebido', name: 'Aluguel Recebido' },
    ],
  },
  {
    id: 'cat-outras-receitas',
    name: 'Outras Entradas',
    type: 'income',
    color: '#84CC16', // Lime
    icon: 'PiggyBank',
    subcategories: [
      { id: 'sub-restituicao', name: 'Restituição IRPF' },
      { id: 'sub-reembolso', name: 'Reembolsos' },
      { id: 'sub-presente-dinheiro', name: 'Presentes & Doações' },
      { id: 'sub-cashback', name: 'Cashback & Recompensas' },
    ],
  },
];

export const generateDefaultTransactions = (): Transaction[] => {
  return [
    // --- OUTUBRO 2026 (Mês Atual) ---
    {
      id: 'tx-oct-01',
      description: 'Salário Mensal Tech Corp',
      amount: 8500.0,
      type: 'income',
      categoryId: 'cat-salario',
      subcategoryId: 'sub-salario-mensal',
      date: '2026-10-05',
      paymentMethod: 'bank_transfer',
      status: 'completed',
      notes: 'Salário líquido depositado',
      createdAt: '2026-10-05T08:00:00Z',
    },
    {
      id: 'tx-oct-02',
      description: 'Aluguel do Apartamento',
      amount: 2300.0,
      type: 'expense',
      categoryId: 'cat-moradia',
      subcategoryId: 'sub-aluguel',
      date: '2026-10-05',
      paymentMethod: 'pix',
      status: 'completed',
      notes: 'Transferência para proprietário',
      createdAt: '2026-10-05T10:15:00Z',
    },
    {
      id: 'tx-oct-03',
      description: 'Condomínio Residencial',
      amount: 580.0,
      type: 'expense',
      categoryId: 'cat-moradia',
      subcategoryId: 'sub-condominio',
      date: '2026-10-06',
      dueDate: '2026-10-10',
      paymentMethod: 'boleto',
      status: 'completed',
      notes: 'Boleto referente a Outubro',
      createdAt: '2026-10-06T09:30:00Z',
    },
    {
      id: 'tx-oct-04',
      description: 'Compras Mês - Pão de Açúcar',
      amount: 684.5,
      type: 'expense',
      categoryId: 'cat-alimentacao',
      subcategoryId: 'sub-supermercado',
      date: '2026-10-03',
      paymentMethod: 'credit_card',
      cardId: 'card-nubank',
      status: 'completed',
      notes: 'Abastecimento da despensa e carnes',
      createdAt: '2026-10-03T18:40:00Z',
    },
    {
      id: 'tx-oct-05',
      description: 'Consultoria UI/UX App Mobile',
      amount: 1850.0,
      type: 'income',
      categoryId: 'cat-renda-extra',
      subcategoryId: 'sub-consultoria',
      date: '2026-10-04',
      paymentMethod: 'pix',
      status: 'completed',
      notes: 'Entrega da primeira sprint',
      createdAt: '2026-10-04T14:20:00Z',
    },
    {
      id: 'tx-oct-06',
      description: 'Jantar Restaurante Le Bistrot',
      amount: 215.0,
      type: 'expense',
      categoryId: 'cat-alimentacao',
      subcategoryId: 'sub-restaurante',
      date: '2026-10-02',
      paymentMethod: 'credit_card',
      cardId: 'card-nubank',
      status: 'completed',
      notes: 'Jantar comemorativo',
      createdAt: '2026-10-02T21:00:00Z',
    },
    {
      id: 'tx-oct-07',
      description: 'Combustível Posto Ipiranga',
      amount: 240.0,
      type: 'expense',
      categoryId: 'cat-transporte',
      subcategoryId: 'sub-combustivel',
      date: '2026-10-04',
      paymentMethod: 'debit_card',
      status: 'completed',
      notes: 'Tanque cheio gasolina aditivada',
      createdAt: '2026-10-04T11:10:00Z',
    },
    // PARCELAMENTO: Notebook Dell Inspiron (Parcela 3 de 6 no Nubank)
    {
      id: 'tx-inst-dell-03',
      description: 'Notebook Dell Inspiron (03/06)',
      amount: 450.0,
      type: 'expense',
      categoryId: 'cat-compras',
      subcategoryId: 'sub-eletronicos',
      date: '2026-10-10',
      paymentMethod: 'credit_card',
      cardId: 'card-nubank',
      status: 'pending',
      installment: {
        current: 3,
        total: 6,
        groupId: 'grp-dell-notebook',
      },
      notes: 'Parcela 3/6 no cartão Nubank',
      createdAt: '2026-08-10T10:00:00Z',
    },
    // PARCELAMENTO: Smartphone Galaxy (Parcela 1 de 4 no Itaú)
    {
      id: 'tx-inst-galaxy-01',
      description: 'Smartphone Samsung Galaxy (01/04)',
      amount: 320.0,
      type: 'expense',
      categoryId: 'cat-compras',
      subcategoryId: 'sub-eletronicos',
      date: '2026-10-18',
      paymentMethod: 'credit_card',
      cardId: 'card-itau',
      status: 'pending',
      installment: {
        current: 1,
        total: 4,
        groupId: 'grp-galaxy-phone',
      },
      notes: 'Parcela 1/4 no cartão Itaú',
      createdAt: '2026-10-01T10:00:00Z',
    },
    {
      id: 'tx-oct-08',
      description: 'Energia Elétrica Enel',
      amount: 185.3,
      type: 'expense',
      categoryId: 'cat-moradia',
      subcategoryId: 'sub-energia',
      date: '2026-10-10',
      paymentMethod: 'pix',
      status: 'pending',
      notes: 'Vencimento dia 10',
      createdAt: '2026-10-01T08:00:00Z',
    },
    {
      id: 'tx-oct-09',
      description: 'Internet Fibra 600MB',
      amount: 129.9,
      type: 'expense',
      categoryId: 'cat-moradia',
      subcategoryId: 'sub-internet',
      date: '2026-10-15',
      paymentMethod: 'credit_card',
      cardId: 'card-itau',
      status: 'pending',
      notes: 'Débito automático no cartão',
      createdAt: '2026-10-01T08:00:00Z',
    },
    {
      id: 'tx-oct-10',
      description: 'Assinatura Spotify + Netflix',
      amount: 89.8,
      type: 'expense',
      categoryId: 'cat-lazer',
      subcategoryId: 'sub-streaming',
      date: '2026-10-01',
      paymentMethod: 'credit_card',
      cardId: 'card-nubank',
      status: 'completed',
      notes: 'Cobrança mensal recorrente',
      createdAt: '2026-10-01T02:00:00Z',
    },
    {
      id: 'tx-oct-11',
      description: 'Academia SmartFit',
      amount: 139.9,
      type: 'expense',
      categoryId: 'cat-saude',
      subcategoryId: 'sub-academia',
      date: '2026-10-01',
      paymentMethod: 'credit_card',
      cardId: 'card-nubank',
      status: 'completed',
      notes: 'Mensalidade plano Black',
      createdAt: '2026-10-01T06:00:00Z',
    },
    {
      id: 'tx-oct-12',
      description: 'Farmácia Droga Raia',
      amount: 98.4,
      type: 'expense',
      categoryId: 'cat-saude',
      subcategoryId: 'sub-farmacia',
      date: '2026-10-03',
      paymentMethod: 'debit_card',
      status: 'completed',
      notes: 'Vitaminas e protetor solar',
      createdAt: '2026-10-03T16:00:00Z',
    },
    {
      id: 'tx-oct-13',
      description: 'Dividendos FIIs & Ações',
      amount: 420.8,
      type: 'income',
      categoryId: 'cat-investimentos',
      subcategoryId: 'sub-dividendos',
      date: '2026-10-15',
      paymentMethod: 'bank_transfer',
      status: 'pending',
      notes: 'Proventos creditados na corretora',
      createdAt: '2026-10-02T10:00:00Z',
    },
    {
      id: 'tx-oct-14',
      description: 'iFood Almoço de Domingo',
      amount: 78.5,
      type: 'expense',
      categoryId: 'cat-alimentacao',
      subcategoryId: 'sub-delivery',
      date: '2026-10-04',
      paymentMethod: 'pix',
      status: 'completed',
      notes: 'Hambúrguer artesanal',
      createdAt: '2026-10-04T13:30:00Z',
    },
    {
      id: 'tx-oct-15',
      description: 'Corrida Uber Centro',
      amount: 34.2,
      type: 'expense',
      categoryId: 'cat-transporte',
      subcategoryId: 'sub-uber',
      date: '2026-10-05',
      paymentMethod: 'credit_card',
      cardId: 'card-nubank',
      status: 'completed',
      notes: 'Deslocamento reunião presencial',
      createdAt: '2026-10-05T14:15:00Z',
    },

    // --- PARCELAS FUTURAS (Novembro e Dezembro) ---
    {
      id: 'tx-inst-dell-04',
      description: 'Notebook Dell Inspiron (04/06)',
      amount: 450.0,
      type: 'expense',
      categoryId: 'cat-compras',
      subcategoryId: 'sub-eletronicos',
      date: '2026-11-10',
      paymentMethod: 'credit_card',
      cardId: 'card-nubank',
      status: 'pending',
      installment: {
        current: 4,
        total: 6,
        groupId: 'grp-dell-notebook',
      },
      notes: 'Parcela futura 4/6',
      createdAt: '2026-08-10T10:00:00Z',
    },
    {
      id: 'tx-inst-galaxy-02',
      description: 'Smartphone Samsung Galaxy (02/04)',
      amount: 320.0,
      type: 'expense',
      categoryId: 'cat-compras',
      subcategoryId: 'sub-eletronicos',
      date: '2026-11-18',
      paymentMethod: 'credit_card',
      cardId: 'card-itau',
      status: 'pending',
      installment: {
        current: 2,
        total: 4,
        groupId: 'grp-galaxy-phone',
      },
      notes: 'Parcela futura 2/4',
      createdAt: '2026-10-01T10:00:00Z',
    },

    // --- SETEMBRO 2026 (Mês Anterior) ---
    {
      id: 'tx-inst-dell-02',
      description: 'Notebook Dell Inspiron (02/06)',
      amount: 450.0,
      type: 'expense',
      categoryId: 'cat-compras',
      subcategoryId: 'sub-eletronicos',
      date: '2026-09-10',
      paymentMethod: 'credit_card',
      cardId: 'card-nubank',
      status: 'completed',
      installment: {
        current: 2,
        total: 6,
        groupId: 'grp-dell-notebook',
      },
      createdAt: '2026-08-10T10:00:00Z',
    },
    {
      id: 'tx-sep-01',
      description: 'Salário Mensal Tech Corp',
      amount: 8500.0,
      type: 'income',
      categoryId: 'cat-salario',
      subcategoryId: 'sub-salario-mensal',
      date: '2026-09-05',
      paymentMethod: 'bank_transfer',
      status: 'completed',
      createdAt: '2026-09-05T08:00:00Z',
    },
    {
      id: 'tx-sep-02',
      description: 'Projeto Website Freelance',
      amount: 2400.0,
      type: 'income',
      categoryId: 'cat-renda-extra',
      subcategoryId: 'sub-freelance',
      date: '2026-09-18',
      paymentMethod: 'pix',
      status: 'completed',
      createdAt: '2026-09-18T16:00:00Z',
    },
    {
      id: 'tx-sep-03',
      description: 'Rendimento CDB Liquidez Diária',
      amount: 312.4,
      type: 'income',
      categoryId: 'cat-investimentos',
      subcategoryId: 'sub-renda-fixa',
      date: '2026-09-30',
      paymentMethod: 'bank_transfer',
      status: 'completed',
      createdAt: '2026-09-30T18:00:00Z',
    },
    {
      id: 'tx-sep-04',
      description: 'Aluguel Apartamento',
      amount: 2300.0,
      type: 'expense',
      categoryId: 'cat-moradia',
      subcategoryId: 'sub-aluguel',
      date: '2026-09-05',
      paymentMethod: 'pix',
      status: 'completed',
      createdAt: '2026-09-05T10:00:00Z',
    },
    {
      id: 'tx-sep-05',
      description: 'Condomínio Residencial',
      amount: 575.0,
      type: 'expense',
      categoryId: 'cat-moradia',
      subcategoryId: 'sub-condominio',
      date: '2026-09-06',
      paymentMethod: 'boleto',
      status: 'completed',
      createdAt: '2026-09-06T09:00:00Z',
    },
    {
      id: 'tx-sep-06',
      description: 'Supermercado Mês',
      amount: 1420.0,
      type: 'expense',
      categoryId: 'cat-alimentacao',
      subcategoryId: 'sub-supermercado',
      date: '2026-09-08',
      paymentMethod: 'credit_card',
      cardId: 'card-nubank',
      status: 'completed',
      createdAt: '2026-09-08T17:30:00Z',
    },
    {
      id: 'tx-sep-07',
      description: 'Restaurantes & Bares Setembro',
      amount: 540.0,
      type: 'expense',
      categoryId: 'cat-alimentacao',
      subcategoryId: 'sub-restaurante',
      date: '2026-09-21',
      paymentMethod: 'credit_card',
      cardId: 'card-itau',
      status: 'completed',
      createdAt: '2026-09-21T21:00:00Z',
    },
    {
      id: 'tx-sep-08',
      description: 'Combustível Mensal',
      amount: 480.0,
      type: 'expense',
      categoryId: 'cat-transporte',
      subcategoryId: 'sub-combustivel',
      date: '2026-09-12',
      paymentMethod: 'debit_card',
      status: 'completed',
      createdAt: '2026-09-12T10:00:00Z',
    },
    {
      id: 'tx-sep-09',
      description: 'Curso TypeScript Avançado & Cloud',
      amount: 349.0,
      type: 'expense',
      categoryId: 'cat-educacao',
      subcategoryId: 'sub-cursos',
      date: '2026-09-14',
      paymentMethod: 'credit_card',
      cardId: 'card-itau',
      status: 'completed',
      createdAt: '2026-09-14T19:00:00Z',
    },
    {
      id: 'tx-sep-10',
      description: 'Energia Elétrica',
      amount: 198.5,
      type: 'expense',
      categoryId: 'cat-moradia',
      subcategoryId: 'sub-energia',
      date: '2026-09-10',
      paymentMethod: 'pix',
      status: 'completed',
      createdAt: '2026-09-10T11:00:00Z',
    },
    {
      id: 'tx-sep-11',
      description: 'Plano de Saúde Familiar',
      amount: 620.0,
      type: 'expense',
      categoryId: 'cat-saude',
      subcategoryId: 'sub-plano-saude',
      date: '2026-09-20',
      paymentMethod: 'boleto',
      status: 'completed',
      createdAt: '2026-09-20T10:00:00Z',
    },
    {
      id: 'tx-sep-12',
      description: 'Tênis de Corrida Nike',
      amount: 450.0,
      type: 'expense',
      categoryId: 'cat-compras',
      subcategoryId: 'sub-roupas',
      date: '2026-09-25',
      paymentMethod: 'credit_card',
      cardId: 'card-nubank',
      status: 'completed',
      createdAt: '2026-09-25T15:00:00Z',
    },

    // --- AGOSTO 2026 ---
    {
      id: 'tx-inst-dell-01',
      description: 'Notebook Dell Inspiron (01/06)',
      amount: 450.0,
      type: 'expense',
      categoryId: 'cat-compras',
      subcategoryId: 'sub-eletronicos',
      date: '2026-08-10',
      paymentMethod: 'credit_card',
      cardId: 'card-nubank',
      status: 'completed',
      installment: {
        current: 1,
        total: 6,
        groupId: 'grp-dell-notebook',
      },
      createdAt: '2026-08-10T10:00:00Z',
    },
    {
      id: 'tx-aug-01',
      description: 'Salário Mensal Tech Corp',
      amount: 8500.0,
      type: 'income',
      categoryId: 'cat-salario',
      subcategoryId: 'sub-salario-mensal',
      date: '2026-08-05',
      paymentMethod: 'bank_transfer',
      status: 'completed',
      createdAt: '2026-08-05T08:00:00Z',
    },
    {
      id: 'tx-aug-02',
      description: 'Bônus Semestral Performance',
      amount: 3200.0,
      type: 'income',
      categoryId: 'cat-salario',
      subcategoryId: 'sub-bonus',
      date: '2026-08-15',
      paymentMethod: 'bank_transfer',
      status: 'completed',
      createdAt: '2026-08-15T09:00:00Z',
    },
    {
      id: 'tx-aug-03',
      description: 'Aluguel Apartamento',
      amount: 2300.0,
      type: 'expense',
      categoryId: 'cat-moradia',
      subcategoryId: 'sub-aluguel',
      date: '2026-08-05',
      paymentMethod: 'pix',
      status: 'completed',
      createdAt: '2026-08-05T10:00:00Z',
    },
    {
      id: 'tx-aug-04',
      description: 'Supermercado Mensal',
      amount: 1560.0,
      type: 'expense',
      categoryId: 'cat-alimentacao',
      subcategoryId: 'sub-supermercado',
      date: '2026-08-07',
      paymentMethod: 'credit_card',
      cardId: 'card-itau',
      status: 'completed',
      createdAt: '2026-08-07T14:00:00Z',
    },
    {
      id: 'tx-aug-05',
      description: 'Viagem Final de Semana Serra',
      amount: 890.0,
      type: 'expense',
      categoryId: 'cat-lazer',
      subcategoryId: 'sub-viagens',
      date: '2026-08-22',
      paymentMethod: 'credit_card',
      cardId: 'card-nubank',
      status: 'completed',
      createdAt: '2026-08-22T19:00:00Z',
    },
  ];
};

const STORAGE_KEYS = {
  CATEGORIES: 'finanplan_categories_v1',
  TRANSACTIONS: 'finanplan_transactions_v1',
  CARDS: 'finanplan_cards_v1',
};

export const loadStoredCategories = (): Category[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading stored categories', e);
  }
  return DEFAULT_CATEGORIES;
};

export const saveStoredCategories = (categories: Category[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  } catch (e) {
    console.error('Error saving categories', e);
  }
};

export const loadStoredTransactions = (): Transaction[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading stored transactions', e);
  }
  return generateDefaultTransactions();
};

export const saveStoredTransactions = (transactions: Transaction[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  } catch (e) {
    console.error('Error saving transactions', e);
  }
};

export const loadStoredCards = (): CreditCard[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CARDS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading stored cards', e);
  }
  return DEFAULT_CREDIT_CARDS;
};

export const saveStoredCards = (cards: CreditCard[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
  } catch (e) {
    console.error('Error saving cards', e);
  }
};

export const resetAllDataToDefault = (): {
  categories: Category[];
  transactions: Transaction[];
  cards: CreditCard[];
} => {
  const categories = DEFAULT_CATEGORIES;
  const transactions = generateDefaultTransactions();
  const cards = DEFAULT_CREDIT_CARDS;
  saveStoredCategories(categories);
  saveStoredTransactions(transactions);
  saveStoredCards(cards);
  return { categories, transactions, cards };
};

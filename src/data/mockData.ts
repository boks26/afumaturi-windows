import { Category, Resource, Employee, Recipe, FinalProduct, ProductionReport, StockMovement } from '../types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat_afumate', name: 'Carne Afumată' },
  { id: 'cat_salamuri', name: 'Salamuri Crud & Semi-Afumate' },
  { id: 'cat_conserve', name: 'Conserve din Carne (Tușoncă)' },
  { id: 'cat_zvintate', name: 'Carne Crud-Zvântată & Chipsuri' },
  { id: 'cat_slanina', name: 'Produse din Slănină' },
];

export const INITIAL_RESOURCES: Resource[] = [
  // Materie Prima
  { id: 'res_ciafa', label: 'Ciafă de porc', bundle: 'materie_prima', unit: 'kg', currentPrice: 75, stock: 42, lastPurchaseDate: '2026-07-10' },
  { id: 'res_pulpa', label: 'Pulpă de porc', bundle: 'materie_prima', unit: 'kg', currentPrice: 68, stock: 85, lastPurchaseDate: '2026-07-09' },
  { id: 'res_piept', label: 'Piept de porc', bundle: 'materie_prima', unit: 'kg', currentPrice: 62, stock: 50, lastPurchaseDate: '2026-07-11' },
  { id: 'res_pui', label: 'Pui întreg', bundle: 'materie_prima', unit: 'kg', currentPrice: 45, stock: 35, lastPurchaseDate: '2026-07-08' },
  { id: 'res_vita', label: 'Carne de vită', bundle: 'materie_prima', unit: 'kg', currentPrice: 95, stock: 20, lastPurchaseDate: '2026-07-07' },
  { id: 'res_slanina', label: 'Slănină cub', bundle: 'materie_prima', unit: 'kg', currentPrice: 35, stock: 30, lastPurchaseDate: '2026-07-10' },
  { id: 'res_apa_baza', label: 'Apă pentru marinadă', bundle: 'materie_prima', unit: 'l', currentPrice: 0.15, stock: 500, lastPurchaseDate: '2026-07-12' },

  // Condimente
  { id: 'res_sare_gema', label: 'Sare gemă alimentară', bundle: 'condiment', unit: 'kg', currentPrice: 8, stock: 25, lastPurchaseDate: '2026-07-01' },
  { id: 'res_sare_nitrit', label: 'Sare de nitrit', bundle: 'condiment', unit: 'kg', currentPrice: 12, stock: 15, lastPurchaseDate: '2026-07-01' },
  { id: 'res_usturoi', label: 'Usturoi granulat', bundle: 'condiment', unit: 'kg', currentPrice: 65, stock: 5, lastPurchaseDate: '2026-07-05' },
  { id: 'res_piper', label: 'Piper negru măcinat', bundle: 'condiment', unit: 'kg', currentPrice: 90, stock: 4.5, lastPurchaseDate: '2026-07-05' },
  { id: 'res_coriandru', label: 'Coriandru boabe', bundle: 'condiment', unit: 'kg', currentPrice: 75, stock: 3, lastPurchaseDate: '2026-07-05' },
  { id: 'res_ienibahar', label: 'Ienibahar măcinat', bundle: 'condiment', unit: 'kg', currentPrice: 110, stock: 2, lastPurchaseDate: '2026-07-02' },
  { id: 'res_polifosfat', label: 'Polifosfat', bundle: 'condiment', unit: 'kg', currentPrice: 45, stock: 6, lastPurchaseDate: '2026-07-01' },
  { id: 'res_mat_porc', label: 'Maț de porc (intestin)', bundle: 'condiment', unit: 'm', currentPrice: 3, stock: 120, lastPurchaseDate: '2026-07-10' },
  { id: 'res_borcan', label: 'Borcan sticlă 0.5L', bundle: 'condiment', unit: 'buc', currentPrice: 2.5, stock: 200, lastPurchaseDate: '2026-07-02' },
  { id: 'res_capac', label: 'Capac borcan metalic', bundle: 'condiment', unit: 'buc', currentPrice: 0.8, stock: 350, lastPurchaseDate: '2026-07-02' },

  // Alte Cheltuieli (Resources)
  { id: 'res_aschii', label: 'Așchii de lemn (fag/cireș)', bundle: 'alta_cheltuiala', unit: 'kg', currentPrice: 18, stock: 40, lastPurchaseDate: '2026-07-01' },
  { id: 'res_gaz', label: 'Gaz metan (autoclavă/arzător)', bundle: 'alta_cheltuiala', unit: 'm3', currentPrice: 15, stock: 100, lastPurchaseDate: '2026-07-01' },
  { id: 'res_curent', label: 'Energie electrică', bundle: 'alta_cheltuiala', unit: 'kW', currentPrice: 3.5, stock: 1000, lastPurchaseDate: '2026-07-01' },
  { id: 'res_apa_regie', label: 'Apă curentă (spălare/abur)', bundle: 'alta_cheltuiala', unit: 'm3', currentPrice: 20, stock: 50, lastPurchaseDate: '2026-07-01' },
];

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp_mihai',
    name: 'Mihai Tehnologul',
    role: 'Tehnolog / Fumător Șef',
    rates: {
      'rec_ciafa_afumata': 3.5, // 3.5 Lei/kg of semi-finished
      'rec_salam_casa': 4.5,
      'rec_pui_afumat': 2.8,
    },
    totalPaid: 1540,
    lastPaidDate: '2026-07-10',
    active: true,
  },
  {
    id: 'emp_vasile',
    name: 'Vasile Operator',
    role: 'Operator Pregătire și Sărare',
    rates: {
      'rec_ciafa_afumata': 2.5,
      'rec_salam_casa': 3.0,
      'rec_tusonca_porc': 1.5, // 1.5 Lei/buc (per jar)
    },
    totalPaid: 980,
    lastPaidDate: '2026-07-10',
    active: true,
  },
  {
    id: 'emp_ana',
    name: 'Ana Secție',
    role: 'Ambalare și Etichetare',
    rates: {
      'rec_ciafa_afumata': 1.2,
      'rec_salam_casa': 1.5,
      'rec_tusonca_porc': 1.0,
    },
    totalPaid: 650,
    lastPaidDate: '2026-07-10',
    active: true,
  },
];

export const INITIAL_RECIPES: Recipe[] = [
  // Sub-Retete
  {
    id: 'sub_saramura_injectare',
    label: 'Saramură Injectare (Saramură Concentrată)',
    categoryId: 'cat_afumate',
    isSubRecipe: true,
    baseUnit: 'kg',
    defaultMarkup: 0,
    lines: [
      { id: 'l1', type: 'materie_prima', resourceId: 'res_apa_baza', quantity: 0.90 },
      { id: 'l2', type: 'materie_prima', resourceId: 'res_sare_nitrit', quantity: 0.08 }, // Sum of raw materials = 0.90 + 0.08 = 0.98. Let's make it add up to 1.0!
      { id: 'l3', type: 'materie_prima', resourceId: 'res_polifosfat', quantity: 0.02 }, // 0.90 + 0.08 + 0.02 = 1.0 KG! Perfect.
      { id: 'l4', type: 'condiment', resourceId: 'res_usturoi', quantity: 0.005 }, // condiments are normalized norms per 1kg
      { id: 'l5', type: 'condiment', resourceId: 'res_piper', quantity: 0.003 },
    ]
  },
  {
    id: 'sub_marinada_murat',
    label: 'Marinadă pentru Murat cu Usturoi',
    categoryId: 'cat_slanina',
    isSubRecipe: true,
    baseUnit: 'kg',
    defaultMarkup: 0,
    lines: [
      { id: 'l6', type: 'materie_prima', resourceId: 'res_apa_baza', quantity: 0.88 },
      { id: 'l7', type: 'materie_prima', resourceId: 'res_sare_gema', quantity: 0.12 }, // Sum = 1.0 KG!
      { id: 'l8', type: 'condiment', resourceId: 'res_usturoi', quantity: 0.02 },
      { id: 'l9', type: 'condiment', resourceId: 'res_coriandru', quantity: 0.005 },
    ]
  },

  // Retete Principale
  {
    id: 'rec_ciafa_afumata',
    label: 'Ciafă Afumată Tradițională',
    categoryId: 'cat_afumate',
    isSubRecipe: false,
    baseUnit: 'kg',
    defaultMarkup: 70,
    lines: [
      { id: 'l10', type: 'materie_prima', resourceId: 'res_ciafa', quantity: 1.0 }, // Sum of materie_prima + subreteta_as_materie_prima = 1.0 kg
      { id: 'l11', type: 'subreteta', subRecipeId: 'sub_saramura_injectare', quantity: 0.15 }, // we inject 150g brine per 1kg meat
      { id: 'l12', type: 'condiment', resourceId: 'res_piper', quantity: 0.002 },
      { id: 'l13', type: 'alta_cheltuiala', resourceId: 'res_aschii', quantity: 0.06 }, // 60g wood chips per kg
      { id: 'l14', type: 'alta_cheltuiala', resourceId: 'res_curent', quantity: 0.25 }, // 0.25 kW per kg
      { id: 'l15', type: 'manopera', employeeId: 'emp_mihai', quantity: 1.0 }, // rate for mihai
      { id: 'l16', type: 'manopera', employeeId: 'emp_vasile', quantity: 1.0 }, // rate for vasile
    ]
  },
  {
    id: 'rec_salam_casa',
    label: 'Salam de Casă Tradițional',
    categoryId: 'cat_salamuri',
    isSubRecipe: false,
    baseUnit: 'kg',
    defaultMarkup: 70,
    lines: [
      { id: 'l17', type: 'materie_prima', resourceId: 'res_pulpa', quantity: 0.85 },
      { id: 'l18', type: 'materie_prima', resourceId: 'res_slanina', quantity: 0.15 }, // Sum of raw materials = 1.0 kg!
      { id: 'l19', type: 'condiment', resourceId: 'res_sare_nitrit', quantity: 0.02 }, // 20g
      { id: 'l20', type: 'condiment', resourceId: 'res_piper', quantity: 0.004 }, // 4g
      { id: 'l21', type: 'condiment', resourceId: 'res_usturoi', quantity: 0.003 }, // 3g
      { id: 'l22', type: 'condiment', resourceId: 'res_mat_porc', quantity: 1.3 }, // 1.3 meters casing per kg
      { id: 'l23', type: 'alta_cheltuiala', resourceId: 'res_aschii', quantity: 0.08 }, // 80g wood chips
      { id: 'l24', type: 'alta_cheltuiala', resourceId: 'res_curent', quantity: 0.35 }, // 0.35 kW
      { id: 'l25', type: 'manopera', employeeId: 'emp_mihai', quantity: 1.0 },
      { id: 'l26', type: 'manopera', employeeId: 'emp_vasile', quantity: 1.0 },
    ]
  },
  {
    id: 'rec_tusonca_porc',
    label: 'Tușoncă de Porc Premium (0.5L)',
    categoryId: 'cat_conserve',
    isSubRecipe: false,
    baseUnit: 'buc',
    defaultMarkup: 70,
    lines: [
      { id: 'l27', type: 'materie_prima', resourceId: 'res_pulpa', quantity: 0.45 }, // 450g pork pulp
      { id: 'l28', type: 'materie_prima', resourceId: 'res_slanina', quantity: 0.05 }, // 50g fat. Sum = 0.50 kg total meat!
      { id: 'l29', type: 'condiment', resourceId: 'res_sare_gema', quantity: 0.006 }, // 6g
      { id: 'l30', type: 'condiment', resourceId: 'res_piper', quantity: 0.001 }, // 1g
      { id: 'l31', type: 'condiment', resourceId: 'res_borcan', quantity: 1.0 }, // 1 jar
      { id: 'l32', type: 'condiment', resourceId: 'res_capac', quantity: 1.0 }, // 1 cap
      { id: 'l33', type: 'alta_cheltuiala', resourceId: 'res_gaz', quantity: 0.08 }, // 0.08 m3 gas per jar
      { id: 'l34', type: 'alta_cheltuiala', resourceId: 'res_curent', quantity: 0.15 }, // 0.15 kW
      { id: 'l35', type: 'manopera', employeeId: 'emp_vasile', quantity: 1.0 },
      { id: 'l36', type: 'manopera', employeeId: 'emp_ana', quantity: 1.0 },
    ]
  }
];

export const INITIAL_PRODUCTS: FinalProduct[] = [
  { id: 'prod_ciafa', label: 'Ciafă Afumată', recipeId: 'rec_ciafa_afumata', stock: 15, lastProductionDate: '2026-07-10' },
  { id: 'prod_salam', label: 'Salam de Casă', recipeId: 'rec_salam_casa', stock: 24, lastProductionDate: '2026-07-09' },
  { id: 'prod_tusonca', label: 'Tușoncă de Porc (Borcan 0.5L)', recipeId: 'rec_tusonca_porc', stock: 45, lastProductionDate: '2026-07-11' },
];

export const INITIAL_REPORTS: ProductionReport[] = [
  {
    id: 'rep_1',
    name: 'Lot Ciafă Afumată #104',
    date: '2026-07-10',
    productId: 'prod_ciafa',
    inputQty: 25.0, // Cantitate semifabricat la intrare (kg)
    outputQty: 21.2, // Cantitate produs final la iesire (kg) - s-a pierdut 15.2% la afumare
    calculatedCostPerKgInput: 84.58, // Calculated from recipe ciafa
    calculatedTotalCostInput: 2114.50, // 25.0 * 84.58
    calculatedCostPerKgOutput: 99.74, // 2114.50 / 21.2
    sellingPriceSuggested: 169.56, // 99.74 * 1.70
    sellingPriceReal: 170.00,
    income: 3604.00, // 170.00 * 21.2
    profit: 1489.50, // 3604.00 - 2114.50
    status: 'finalizat',
  },
  {
    id: 'rep_2',
    name: 'Lot Salam de Casă #89',
    date: '2026-07-09',
    productId: 'prod_salam',
    inputQty: 40.0,
    outputQty: 32.8, // 18% pierdere
    calculatedCostPerKgInput: 78.42,
    calculatedTotalCostInput: 3136.80,
    calculatedCostPerKgOutput: 95.63,
    sellingPriceSuggested: 162.58,
    sellingPriceReal: 165.00,
    income: 5412.00,
    profit: 2275.20,
    status: 'finalizat',
  },
  {
    id: 'rep_3',
    name: 'Lot Tușoncă Porc #12',
    date: '2026-07-11',
    productId: 'prod_tusonca',
    inputQty: 50.0, // means 50 jars
    outputQty: 50.0, // no weight loss because it is canned!
    calculatedCostPerKgInput: 43.15, // Cost per jar
    calculatedTotalCostInput: 2157.50,
    calculatedCostPerKgOutput: 43.15,
    sellingPriceSuggested: 73.36,
    sellingPriceReal: 75.00,
    income: 3750.00,
    profit: 1592.50,
    status: 'finalizat',
  }
];

export const INITIAL_MOVEMENTS: StockMovement[] = [
  // initial movements matching reports and stock
  { id: 'mov_1', resourceId: 'res_ciafa', type: 'iesire', quantity: 25.0, date: '2026-07-10', source: 'Lot Ciafă Afumată #104' },
  { id: 'mov_2', resourceId: 'res_pulpa', type: 'iesire', quantity: 34.0, date: '2026-07-09', source: 'Lot Salam de Casă #89' }, // 40kg input of recipe = 85% pulpa (34kg) and 15% slanina (6kg)
  { id: 'mov_3', resourceId: 'res_slanina', type: 'iesire', quantity: 6.0, date: '2026-07-09', source: 'Lot Salam de Casă #89' },
  { id: 'mov_4', resourceId: 'res_pulpa', type: 'iesire', quantity: 22.5, date: '2026-07-11', source: 'Lot Tușoncă Porc #12' }, // 50 jars * 0.45kg
  { id: 'mov_5', resourceId: 'res_slanina', type: 'iesire', quantity: 2.5, date: '2026-07-11', source: 'Lot Tușoncă Porc #12' }, // 50 jars * 0.05kg
];

export type ResourceBundle = 'materie_prima' | 'condiment' | 'alta_cheltuiala';

export interface Resource {
  id: string;
  label: string;
  bundle: ResourceBundle;
  unit: string; // e.g., 'kg', 'g', 'l', 'ml', 'buc'
  currentPrice: number; // Lei per unit
  stock: number; // current stock quantity
  lastPurchaseDate?: string;
}

export interface StockMovement {
  id: string;
  resourceId: string;
  type: 'intrare' | 'iesire';
  quantity: number;
  priceUnit?: number; // only for 'intrare'
  date: string;
  source?: string; // description or link to DareDeSeama ID
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  rates: { [recipeId: string]: number }; // pay in Lei per kg of semi-finished product for this recipe
  totalPaid: number;
  lastPaidDate?: string;
  active: boolean;
}

export type RecipeLineType = 'materie_prima' | 'condiment' | 'subreteta' | 'alta_cheltuiala' | 'manopera';

export interface RecipeLine {
  id: string;
  type: RecipeLineType;
  resourceId?: string; // used for materie_prima, condiment, alta_cheltuiala
  subRecipeId?: string; // used if type === 'subreteta'
  employeeId?: string; // used if type === 'manopera'
  quantity: number; // quantity needed per 1 unit of parent recipe's base unit
}

export interface Recipe {
  id: string;
  label: string;
  categoryId: string; // reference to category
  isSubRecipe: boolean; // e.g., marinade or brine is subrecipe
  baseUnit: 'kg' | 'buc';
  defaultMarkup: number; // percentage, e.g., 70 for 70%
  lines: RecipeLine[];
}

export interface FinalProduct {
  id: string;
  label: string;
  recipeId: string;
  stock: number;
  lastProductionDate?: string;
}

export interface ProductionReport {
  id: string;
  name: string;
  date: string;
  productId: string;
  inputQty: number; // cantitate semifabricat la intrare
  outputQty: number; // cantitate produs final la iesire
  calculatedCostPerKgInput: number; // unit cost of semi-finished from recipe
  calculatedTotalCostInput: number; // inputQty * calculatedCostPerKgInput
  calculatedCostPerKgOutput: number; // calculatedTotalCostInput / outputQty
  sellingPriceSuggested: number; // cost output * (1 + markup/100)
  sellingPriceReal: number; // actual selling price entered
  income: number; // sellingPriceReal * outputQty
  profit: number; // income - calculatedTotalCostInput
  status: 'draft' | 'finalizat';
}

export interface Category {
  id: string;
  name: string;
}

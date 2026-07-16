export type ResourceBundle = "materie_prima" | "condiment" | "ambalaj" | "alta_cheltuiala" | "semifabricat";

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
  type: "intrare" | "iesire";
  quantity: number;
  priceUnit?: number; // only for 'intrare'
  date: string;
  source?: string; // description or link to DareDeSeama ID
}

export interface BulkStockItem { resourceId: string; quantity: number; totalPrice: number; }
export interface BulkStockImport { date: string; source: string; items: BulkStockItem[]; }

export interface SubrecipeStock {
  recipeId: string; recipeLabel: string; resourceId: string; unit: string;
  stock: number; currentPrice: number;
}

export interface SubrecipeProduction {
  id: string; recipeId: string; recipeLabel: string; quantity: number;
  unit: string; totalCost: number; unitCost: number; stock: number;
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

export type RecipeLineType =
  "materie_prima" | "condiment" | "subreteta" | "alta_cheltuiala" | "manopera";

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
  categoryId?: string; // legacy catalog classification; not used by recipe calculations
  isSubRecipe: boolean; // e.g., marinade or brine is subrecipe
  baseUnit: "kg" | "buc";
  defaultMarkup: number; // percentage, e.g., 70 for 70%
  lines: RecipeLine[];
  productId?: string; // optional reverse association; multiple recipes may target one product
}

export interface FinalProduct {
  id: string;
  label: string;
  recipeId: string;
  stock: number;
  lastProductionDate?: string;
  suggestedPrice?: number;
}

export interface ProductSale { id: string; productId: string; productLabel: string; date: string; quantity: number; unitPrice: number; revenue: number; fifoCost: number; profit: number; entryType?: "sale" | "return"; originalSaleId?: string | null; returnKind?: "restock" | "damaged" | null; returnedQuantity?: number; allocations: Array<{ quantity: number; unitCost: number; totalCost: number; date?: string | null; source?: string; provisional?: boolean }>; note?: string; }
export interface ProductSalePreview { fifoCost: number; averageCost: number; stock: number; stockAfter: number; allocations: ProductSale["allocations"]; }

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
  status: "draft" | "finalizat";
}

export interface Category {
  id: string;
  name: string;
}

export type PartyRole = "customer" | "supplier";
export type ProductionMode = "own_production" | "custom_processing";
export type JobStatus = "draft" | "in_progress" | "completed" | "cancelled";
export type MaterialOwnership = "producer" | "customer";
export type PricingBasis = "input_qty" | "output_qty" | "fixed";
export type ChargeType =
  | "processing_fee"
  | "labor"
  | "ingredient"
  | "packaging"
  | "smoking"
  | "utility"
  | "other"
  | "adjustment";
export type ChargeDirection = "receivable" | "expense" | "adjustment";

export interface Party {
  id: string;
  name: string;
  roles: PartyRole[];
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  active: boolean;
}

export interface JobInput {
  id: string;
  resourceId?: string | null;
  resourceLabel: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  ownership: MaterialOwnership;
  suppliedByPartyId?: string | null;
  stockMovementId?: string | null;
}

export interface JobCharge {
  id: string;
  jobId?: string;
  type: ChargeType;
  description: string;
  quantity?: number | null;
  unitPrice?: number | null;
  amount: number;
  direction: ChargeDirection;
  effect?: "increase" | "decrease" | null;
  needsReview?: boolean;
}

export interface JobTotals {
  producerMaterialCost: number;
  customerMaterialQty: number;
  expenses: number;
  receivable: number;
  adjustments: number;
  netReceivable: number;
  paid: number;
  balance: number;
  margin: number;
}

export interface Payment {
  id: string;
  partyId: string;
  jobId?: string | null;
  date: string;
  amount: number;
  direction: "incoming" | "outgoing";
  method: "cash" | "bank" | "card" | "other";
  note?: string | null;
  status: "posted" | "voided";
  reversalOf?: string | null;
  voidedAt?: string | null;
  voidReason?: string | null;
}

export interface ProductionJob {
  id: string;
  name: string;
  date: string;
  mode: ProductionMode;
  partyId?: string | null;
  productId: string;
  recipeId: string;
  inputQty: number;
  outputQty?: number | null;
  unit: string;
  yieldPercent?: number | null;
  lossPercent?: number | null;
  pricingBasis?: PricingBasis | null;
  processingRate?: number | null;
  status: JobStatus;
  inputs: JobInput[];
  charges: JobCharge[];
  totals: JobTotals;
  payments: Payment[];
  notes?: string | null;
  sourceKey?: string | null;
}

export interface OwnershipOverride {
  resourceId: string;
  ownership: MaterialOwnership;
  suppliedByPartyId?: string | null;
}

export interface JobChargeInput extends Omit<JobCharge, "id" | "needsReview"> {}

export interface ProductionJobInput {
  name: string;
  date: string;
  mode: ProductionMode;
  partyId?: string | null;
  productId: string;
  recipeId: string;
  inputQty: number;
  outputQty?: number | null;
  unit: string;
  pricingBasis?: PricingBasis | null;
  processingRate?: number | null;
  status?: Exclude<JobStatus, "completed">;
  ownershipOverrides?: OwnershipOverride[];
  charges?: JobChargeInput[];
  notes?: string | null;
}

export type PartyInput = Omit<Party, "id">;
export type PaymentInput = Omit<Payment, "id" | "status">;

export interface PartyStatement {
  party: Party;
  jobs: ProductionJob[];
  payments: Payment[];
  totals: { netReceivable: number; paid: number; balance: number };
}

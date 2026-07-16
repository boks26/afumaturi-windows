import { apiConfig } from "../config/api";
import {
  Category,
  Employee,
  FinalProduct,
  JobCharge,
  JobChargeInput,
  JobInput,
  JobTotals,
  Party,
  PartyInput,
  PartyStatement,
  Payment,
  PaymentInput,
  ProductionJob,
  ProductionJobInput,
  ProductionMode,
  ProductionReport,
  JobStatus,
  Recipe,
  RecipeLine,
  Resource,
  StockMovement,
  SubrecipeStock,
  SubrecipeProduction,
  ProductSale,
  ProductSalePreview,
  BulkStockImport,
} from "../types";
import { absoluteRequest, apiRequest, tokenStorage } from "./apiClient";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: { page: number; limit: number; total: number };
}

interface OAuthToken {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token?: string;
}

interface ApiUser {
  id: number;
  name: string;
  mail: string;
  roles: string[];
}

interface ApiCategory {
  id: number;
  name: string;
}

interface ApiProduct {
  id: number;
  title: string;
  field_stoc: number;
  field_reteta: number | null;
  field_pret?: number;
}

interface ApiRecipe {
  id: number;
  title: string;
  field_ingrediente: string | null;
  field_categorie?: number | null;
  field_unitate_baza?: string | null;
  field_produs_asociat?: number | null;
}

interface StoredRecipeData {
  categoryId?: string;
  isSubRecipe?: boolean;
  baseUnit?: "kg" | "buc";
  defaultMarkup?: number;
  lines?: RecipeLine[];
}

const unwrap = <T>(response: ApiEnvelope<T>) => response.data;

const parseRecipeData = (value: string | null): StoredRecipeData => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
};

const mapRecipe = (recipe: ApiRecipe): Recipe => {
  const stored = parseRecipeData(recipe.field_ingrediente);
  return {
    id: String(recipe.id),
    label: recipe.title,
    categoryId: stored.categoryId || String(recipe.field_categorie || ""),
    isSubRecipe: stored.isSubRecipe ?? false,
    baseUnit:
      stored.baseUnit || (recipe.field_unitate_baza === "buc" ? "buc" : "kg"),
    defaultMarkup: stored.defaultMarkup ?? 0,
    lines: Array.isArray(stored.lines) ? stored.lines : [],
    productId: recipe.field_produs_asociat ? String(recipe.field_produs_asociat) : undefined,
  };
};

const recipePayload = (recipe: Omit<Recipe, "id"> | Partial<Recipe>) => ({
  ...(recipe.label !== undefined ? { title: recipe.label } : {}),
  ...(recipe.categoryId !== undefined
    ? { field_categorie: Number(recipe.categoryId) || null }
    : {}),
  ...(recipe.baseUnit !== undefined
    ? { field_unitate_baza: recipe.baseUnit }
    : {}),
  ...(recipe.productId !== undefined
    ? { field_produs_asociat: Number(recipe.productId) || null }
    : {}),
  field_ingrediente: JSON.stringify({
    categoryId: recipe.categoryId,
    isSubRecipe: recipe.isSubRecipe,
    baseUnit: recipe.baseUnit,
    defaultMarkup: recipe.defaultMarkup,
    lines: recipe.lines || [],
  }),
});

export const authApi = {
  async login(username: string, password: string): Promise<ApiUser> {
    if (!apiConfig.oauthClientId) {
      throw new Error("VITE_OAUTH_CLIENT_ID nu este configurat în .env.");
    }
    const token = await absoluteRequest<OAuthToken>(
      `${apiConfig.baseUrl}/oauth/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          grant_type: "password",
          client_id: apiConfig.oauthClientId,
          client_secret: apiConfig.oauthClientSecret,
          username,
          password,
          scope: "afumaturi_board",
        }),
      },
    );
    tokenStorage.set(token.access_token);
    try {
      return await this.me();
    } catch (error) {
      tokenStorage.clear();
      throw error;
    }
  },
  async me(): Promise<ApiUser> {
    return unwrap(await apiRequest<ApiEnvelope<ApiUser>>("/user/me"));
  },
  async logout(): Promise<void> {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } finally {
      tokenStorage.clear();
    }
  },
  hasToken: () => Boolean(tokenStorage.get()),
};

export const catalogApi = {
  async categories(): Promise<Category[]> {
    const rows = unwrap(
      await apiRequest<ApiEnvelope<ApiCategory[]>>("/categories"),
    );
    return rows.map((row) => ({ id: String(row.id), name: row.name }));
  },
  async products(): Promise<FinalProduct[]> {
    const rows = unwrap(
      await apiRequest<ApiEnvelope<ApiProduct[]>>("/products?limit=100"),
    );
    return rows.map((row) => ({
      id: String(row.id),
      label: row.title,
      recipeId: String(row.field_reteta || ""),
      stock: Number(row.field_stoc || 0),
      suggestedPrice: Number(row.field_pret || 0),
    }));
  },
  async createProduct(
    product: Omit<FinalProduct, "id" | "stock">,
  ): Promise<FinalProduct> {
    const row = unwrap(
      await apiRequest<ApiEnvelope<ApiProduct>>("/products", {
        method: "POST",
        body: JSON.stringify({
          title: product.label,
          field_reteta: Number(product.recipeId) || null,
          field_stoc: 0,
        }),
      }),
    );
    return {
      id: String(row.id),
      label: row.title,
      recipeId: String(row.field_reteta || ""),
      stock: Number(row.field_stoc || 0),
    };
  },
  async updateProduct(
    id: string,
    product: Partial<FinalProduct>,
  ): Promise<void> {
    await apiRequest(`/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...(product.label !== undefined ? { title: product.label } : {}),
        ...(product.recipeId !== undefined
          ? { field_reteta: Number(product.recipeId) || null }
          : {}),
        ...(product.stock !== undefined ? { field_stoc: product.stock } : {}),
      }),
    });
  },
  deleteProduct: (id: string) =>
    apiRequest(`/products/${id}`, { method: "DELETE" }),
  async recipes(): Promise<Recipe[]> {
    const rows = unwrap(await apiRequest<ApiEnvelope<ApiRecipe[]>>("/recipes"));
    return rows.map(mapRecipe);
  },
  async createRecipe(recipe: Omit<Recipe, "id">): Promise<Recipe> {
    const row = unwrap(
      await apiRequest<ApiEnvelope<ApiRecipe>>("/recipes", {
        method: "POST",
        body: JSON.stringify(recipePayload(recipe)),
      }),
    );
    return mapRecipe(row);
  },
  async updateRecipe(id: string, recipe: Partial<Recipe>): Promise<void> {
    await apiRequest(`/recipes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(recipePayload(recipe)),
    });
  },
  deleteRecipe: (id: string) =>
    apiRequest(`/recipes/${id}`, { method: "DELETE" }),
};

export const boardApi = {
  resources: () =>
    apiRequest<ApiEnvelope<Resource[]>>("/board/resources")
      .then(unwrap)
      .then((rows) => rows.map((row) => ({ ...row, id: String(row.id) }))),
  createResource: (resource: Omit<Resource, "id">) =>
    apiRequest<ApiEnvelope<Resource>>("/board/resources", {
      method: "POST",
      body: JSON.stringify(resource),
    })
      .then(unwrap)
      .then((row) => ({ ...row, id: String(row.id) })),
  updateResource: (id: string, resource: Partial<Resource>) =>
    apiRequest<ApiEnvelope<Resource>>(`/board/resources/${id}`, {
      method: "PATCH",
      body: JSON.stringify(resource),
    })
      .then(unwrap)
      .then((row) => ({ ...row, id: String(row.id) })),
  deleteResource: (id: string) =>
    apiRequest(`/board/resources/${id}`, { method: "DELETE" }),
  adjustStock: (
    id: string,
    movement: Omit<StockMovement, "id" | "resourceId">,
  ) =>
    apiRequest<ApiEnvelope<{ resource: Resource; movement: StockMovement }>>(
      `/board/resources/${id}/stock`,
      { method: "POST", body: JSON.stringify(movement) },
    )
      .then(unwrap)
      .then((result) => ({
        resource: { ...result.resource, id: String(result.resource.id) },
        movement: {
          ...result.movement,
          id: String(result.movement.id),
          resourceId: String(result.movement.resourceId),
        },
      })),
  bulkReceiveResources: (data: BulkStockImport) =>
    apiRequest<ApiEnvelope<{ items: Array<{ resource: Resource; movement: StockMovement; lotId: number; totalCost: number }>; totalCost: number }>>("/board/resources/bulk-receive", {
      method: "POST",
      body: JSON.stringify({ ...data, items: data.items.map((item) => ({ ...item, resourceId: Number(item.resourceId) })) }),
    }).then(unwrap).then((result) => ({ ...result, items: result.items.map((item) => ({ ...item, resource: { ...item.resource, id: String(item.resource.id) }, movement: { ...item.movement, id: String(item.movement.id), resourceId: String(item.movement.resourceId) } })) })),
  movements: () =>
    apiRequest<ApiEnvelope<StockMovement[]>>("/board/stock-movements")
      .then(unwrap)
      .then((rows) =>
        rows.map((row) => ({
          ...row,
          id: String(row.id),
          resourceId: String(row.resourceId),
        })),
      ),
  subrecipeStocks: () =>
    apiRequest<ApiEnvelope<SubrecipeStock[]>>("/board/subrecipes/stock")
      .then(unwrap)
      .then((rows) => rows.map((row) => ({ ...row, recipeId: String(row.recipeId), resourceId: String(row.resourceId) }))),
  produceSubrecipe: (recipeId: string, quantity: number, date: string) =>
    apiRequest<ApiEnvelope<SubrecipeProduction>>(`/board/subrecipes/${recipeId}/produce`, {
      method: "POST",
      body: JSON.stringify({ quantity, date }),
    }).then(unwrap),
  productSales: () => apiRequest<ApiEnvelope<ProductSale[]>>("/board/product-sales").then(unwrap).then((rows)=>rows.map((row)=>({...row,id:String(row.id),productId:String(row.productId),originalSaleId:row.originalSaleId==null?null:String(row.originalSaleId)}))),
  productSalePreview: (productId: string, quantity: number) => apiRequest<ApiEnvelope<ProductSalePreview>>(`/board/product-sales?productId=${productId}&quantity=${quantity}`).then(unwrap),
  createProductSale: (data: {productId:string;date:string;quantity:number;unitPrice:number;note?:string}) => apiRequest<ApiEnvelope<ProductSale>>("/board/product-sales",{method:"POST",body:JSON.stringify({...data,productId:Number(data.productId)})}).then(unwrap),
  returnProductSale: (saleId: string, data: {date:string;quantity:number;damaged:boolean;note?:string}) => apiRequest<ApiEnvelope<ProductSale>>(`/board/product-sales/${saleId}/return`,{method:"POST",body:JSON.stringify(data)}).then(unwrap),
  employees: () =>
    apiRequest<ApiEnvelope<Employee[]>>("/board/employees")
      .then(unwrap)
      .then((rows) => rows.map((row) => ({ ...row, id: String(row.id) }))),
  createEmployee: (employee: Omit<Employee, "id" | "totalPaid">) =>
    apiRequest<ApiEnvelope<Employee>>("/board/employees", {
      method: "POST",
      body: JSON.stringify(employee),
    })
      .then(unwrap)
      .then((row) => ({ ...row, id: String(row.id) })),
  updateEmployee: (id: string, employee: Partial<Employee>) =>
    apiRequest<ApiEnvelope<Employee>>(`/board/employees/${id}`, {
      method: "PATCH",
      body: JSON.stringify(employee),
    })
      .then(unwrap)
      .then((row) => ({ ...row, id: String(row.id) })),
  deleteEmployee: (id: string) =>
    apiRequest<ApiEnvelope<Employee>>(`/board/employees/${id}`, {
      method: "DELETE",
    })
      .then(unwrap)
      .then((row) => ({ ...row, id: String(row.id) })),
  payEmployee: (id: string, amount: number) =>
    apiRequest<ApiEnvelope<{ paymentId: number; employee: Employee }>>(
      `/board/employees/${id}/payments`,
      { method: "POST", body: JSON.stringify({ amount }) },
    )
      .then(unwrap)
      .then((result) => ({
        ...result,
        employee: { ...result.employee, id: String(result.employee.id) },
      })),
  reports: () =>
    apiRequest<ApiEnvelope<ProductionReport[]>>("/board/production-reports")
      .then(unwrap)
      .then((rows) =>
        rows.map((row) => ({
          ...row,
          id: String(row.id),
          productId: String(row.productId),
        })),
      ),
  createReport: (report: Omit<ProductionReport, "id">) =>
    apiRequest<ApiEnvelope<ProductionReport>>("/board/production-reports", {
      method: "POST",
      body: JSON.stringify(report),
    })
      .then(unwrap)
      .then((row) => ({
        ...row,
        id: String(row.id),
        productId: String(row.productId),
      })),
  updateReport: (id: string, report: Partial<ProductionReport>) =>
    apiRequest<ApiEnvelope<ProductionReport>>(
      `/board/production-reports/${id}`,
      { method: "PATCH", body: JSON.stringify(report) },
    )
      .then(unwrap)
      .then((row) => ({
        ...row,
        id: String(row.id),
        productId: String(row.productId),
      })),
  deleteReport: (id: string) =>
    apiRequest(`/board/production-reports/${id}`, { method: "DELETE" }),
};

const queryString = (
  filters: Record<string, string | number | boolean | null | undefined>,
) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "")
      params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : "";
};

const stringId = (value: string | number | null | undefined) =>
  value == null ? null : String(value);
const mapPayment = (row: Payment): Payment => ({
  ...row,
  id: String(row.id),
  partyId: String(row.partyId),
  jobId: stringId(row.jobId),
  reversalOf: stringId(row.reversalOf),
});
const mapInput = (row: JobInput): JobInput => ({
  ...row,
  id: String(row.id),
  resourceId: stringId(row.resourceId),
  suppliedByPartyId: stringId(row.suppliedByPartyId),
  stockMovementId: stringId(row.stockMovementId),
});
const mapCharge = (row: JobCharge): JobCharge => ({
  ...row,
  id: String(row.id),
  jobId: row.jobId == null ? undefined : String(row.jobId),
});
const emptyTotals: JobTotals = {
  producerMaterialCost: 0,
  customerMaterialQty: 0,
  expenses: 0,
  receivable: 0,
  adjustments: 0,
  netReceivable: 0,
  paid: 0,
  balance: 0,
  margin: 0,
};
const mapJob = (row: ProductionJob): ProductionJob => ({
  ...row,
  id: String(row.id),
  partyId: stringId(row.partyId),
  productId: String(row.productId),
  recipeId: String(row.recipeId),
  inputs: (row.inputs || []).map(mapInput),
  charges: (row.charges || []).map(mapCharge),
  totals: row.totals || emptyTotals,
  payments: (row.payments || []).map(mapPayment),
});
const mapParty = (row: Party): Party => ({ ...row, id: String(row.id) });

const jobPayload = (input: Partial<ProductionJobInput>) => ({
  ...input,
  ...(input.partyId !== undefined
    ? { partyId: input.partyId ? Number(input.partyId) : null }
    : {}),
  ...(input.productId !== undefined
    ? { productId: Number(input.productId) }
    : {}),
  ...(input.recipeId !== undefined ? { recipeId: Number(input.recipeId) } : {}),
  ...(input.ownershipOverrides
    ? {
        ownershipOverrides: input.ownershipOverrides.map((item) => ({
          ...item,
          resourceId: Number(item.resourceId),
          suppliedByPartyId: item.suppliedByPartyId
            ? Number(item.suppliedByPartyId)
            : null,
        })),
      }
    : {}),
});

export const partyApi = {
  list: (filters: { search?: string; role?: string; active?: boolean } = {}) =>
    apiRequest<ApiEnvelope<Party[]>>(`/board/parties${queryString(filters)}`)
      .then(unwrap)
      .then((rows) => rows.map(mapParty)),
  create: (party: PartyInput) =>
    apiRequest<ApiEnvelope<Party>>("/board/parties", {
      method: "POST",
      body: JSON.stringify(party),
    })
      .then(unwrap)
      .then(mapParty),
  get: (id: string) =>
    apiRequest<ApiEnvelope<Party>>(`/board/parties/${id}`)
      .then(unwrap)
      .then(mapParty),
  update: (id: string, party: Partial<PartyInput>) =>
    apiRequest<ApiEnvelope<Party>>(`/board/parties/${id}`, {
      method: "PATCH",
      body: JSON.stringify(party),
    })
      .then(unwrap)
      .then(mapParty),
  archive: (id: string) =>
    apiRequest<ApiEnvelope<Party>>(`/board/parties/${id}`, { method: "DELETE" })
      .then(unwrap)
      .then(mapParty),
  statement: (
    id: string,
    filters: { dateFrom?: string; dateTo?: string } = {},
  ) =>
    apiRequest<ApiEnvelope<PartyStatement>>(
      `/board/parties/${id}/statement${queryString(filters)}`,
    )
      .then(unwrap)
      .then((row) => ({
        ...row,
        party: mapParty(row.party),
        jobs: (row.jobs || []).map(mapJob),
        payments: (row.payments || []).map(mapPayment),
        totals: row.totals || { netReceivable: 0, paid: 0, balance: 0 },
      })),
};

export const productionJobApi = {
  list: (
    filters: {
      mode?: ProductionMode;
      status?: JobStatus;
      partyId?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
    } = {},
  ) =>
    apiRequest<ApiEnvelope<ProductionJob[]>>(
      `/board/production-jobs${queryString(filters)}`,
    )
      .then(unwrap)
      .then((rows) => rows.map(mapJob)),
  create: (job: ProductionJobInput) =>
    apiRequest<ApiEnvelope<ProductionJob>>("/board/production-jobs", {
      method: "POST",
      body: JSON.stringify(jobPayload(job)),
    })
      .then(unwrap)
      .then(mapJob),
  get: (id: string) =>
    apiRequest<ApiEnvelope<ProductionJob>>(`/board/production-jobs/${id}`)
      .then(unwrap)
      .then(mapJob),
  update: (id: string, job: Partial<ProductionJobInput>) =>
    apiRequest<ApiEnvelope<ProductionJob>>(`/board/production-jobs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(jobPayload(job)),
    })
      .then(unwrap)
      .then(mapJob),
  delete: (id: string) =>
    apiRequest(`/board/production-jobs/${id}`, { method: "DELETE" }),
  start: (id: string) =>
    apiRequest<ApiEnvelope<ProductionJob>>(`/board/production-jobs/${id}/start`, { method: "POST" })
      .then(unwrap)
      .then(mapJob),
  finalize: (id: string, outputQty: number) =>
    apiRequest<ApiEnvelope<ProductionJob>>(
      `/board/production-jobs/${id}/finalize`,
      { method: "POST", body: JSON.stringify({ outputQty }) },
    )
      .then(unwrap)
      .then(mapJob),
  charges: (id: string) =>
    apiRequest<ApiEnvelope<JobCharge[]>>(`/board/production-jobs/${id}/charges`)
      .then(unwrap)
      .then((rows) => rows.map(mapCharge)),
  addCharge: async (id: string, charge: JobChargeInput) => {
    await apiRequest<ApiEnvelope<JobCharge>>(
      `/board/production-jobs/${id}/charges`,
      { method: "POST", body: JSON.stringify(charge) },
    );
    return productionJobApi.get(id);
  },
  updateCharge: async (
    jobId: string,
    chargeId: string,
    charge: Partial<JobChargeInput>,
  ) => {
    await apiRequest<ApiEnvelope<JobCharge>>(
      `/board/production-jobs/${jobId}/charges/${chargeId}`,
      { method: "PATCH", body: JSON.stringify(charge) },
    );
    return productionJobApi.get(jobId);
  },
  deleteCharge: async (jobId: string, chargeId: string) => {
    await apiRequest(`/board/production-jobs/${jobId}/charges/${chargeId}`, {
      method: "DELETE",
    });
    return productionJobApi.get(jobId);
  },
};

export const paymentApi = {
  list: (
    filters: {
      partyId?: string;
      jobId?: string;
      dateFrom?: string;
      dateTo?: string;
      status?: Payment["status"];
    } = {},
  ) =>
    apiRequest<ApiEnvelope<Payment[]>>(`/board/payments${queryString(filters)}`)
      .then(unwrap)
      .then((rows) => rows.map(mapPayment)),
  create: (payment: PaymentInput) =>
    apiRequest<ApiEnvelope<Payment>>("/board/payments", {
      method: "POST",
      body: JSON.stringify({
        ...payment,
        partyId: Number(payment.partyId),
        jobId: payment.jobId ? Number(payment.jobId) : null,
      }),
    })
      .then(unwrap)
      .then(mapPayment),
  get: (id: string) =>
    apiRequest<ApiEnvelope<Payment>>(`/board/payments/${id}`)
      .then(unwrap)
      .then(mapPayment),
  void: (
    id: string,
    reason: string,
    date = new Date().toISOString().slice(0, 10),
  ) =>
    apiRequest<ApiEnvelope<{ payment: Payment; reversal: Payment }>>(
      `/board/payments/${id}/void`,
      { method: "POST", body: JSON.stringify({ reason, date }) },
    )
      .then(unwrap)
      .then((row) => ({
        payment: mapPayment(row.payment),
        reversal: mapPayment(row.reversal),
      })),
};

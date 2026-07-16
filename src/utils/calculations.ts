import { Recipe, Resource, Employee, RecipeLine, RecipeLineType } from '../types';

/**
 * Recursively calculates the unit cost of a recipe per its base unit (1 kg or 1 buc).
 */
export function calculateRecipeCost(
  recipeId: string,
  allRecipes: Recipe[],
  allResources: Resource[],
  allEmployees: Employee[],
  visited: Set<string> = new Set()
): number {
  if (visited.has(recipeId)) {
    // Avoid infinite recursion for circular references
    return 0;
  }
  const recipe = allRecipes.find((r) => r.id === recipeId);
  if (!recipe) return 0;

  visited.add(recipeId);

  let totalCost = 0;

  for (const line of recipe.lines) {
    switch (line.type) {
      case 'materie_prima':
      case 'condiment':
      case 'alta_cheltuiala': {
        const resource = allResources.find((r) => r.id === line.resourceId);
        if (resource) {
          totalCost += resource.currentPrice * line.quantity;
        }
        break;
      }
      case 'subreteta': {
        if (line.subRecipeId) {
          const subCost = calculateRecipeCost(line.subRecipeId, allRecipes, allResources, allEmployees, new Set(visited));
          totalCost += subCost * line.quantity;
        }
        break;
      }
      case 'manopera': {
        if (line.employeeId) {
          const employee = allEmployees.find((e) => e.id === line.employeeId);
          if (employee) {
            // Find employee rate for the parent recipe
            const rate = employee.rates[recipeId] || 0;
            totalCost += rate * line.quantity;
          }
        }
        break;
      }
    }
  }

  return totalCost;
}

/**
 * Checks if adding a sub-recipe to a recipe would introduce a circular reference.
 */
export function wouldIntroduceCycle(
  recipeId: string,
  subRecipeId: string,
  allRecipes: Recipe[]
): boolean {
  if (recipeId === subRecipeId) return true;

  const checkCycle = (currentId: string): boolean => {
    const currentRecipe = allRecipes.find((r) => r.id === currentId);
    if (!currentRecipe) return false;

    for (const line of currentRecipe.lines) {
      if (line.type === 'subreteta' && line.subRecipeId) {
        if (line.subRecipeId === recipeId) return true;
        if (checkCycle(line.subRecipeId)) return true;
      }
    }
    return false;
  };

  return checkCycle(subRecipeId);
}

export interface ScaledItem {
  resourceId: string;
  label: string;
  quantity: number;
  unit: string;
  priceUnit: number;
  total: number;
}

export interface ScaledLabor {
  employeeId: string;
  name: string;
  role: string;
  recipeLabel: string;
  rate: number;
  quantity: number;
  total: number;
}

export interface ScaledResult {
  materiePrima: ScaledItem[];
  condimente: ScaledItem[];
  condimenteRecete: ScaledItem[];
  alteCheltuieli: ScaledItem[];
  muncaPersonal: ScaledLabor[];
  subrecipes: Array<{ recipeId: string; label: string; quantity: number; unit: string; unitCost: number; totalCost: number; condimente: ScaledItem[] }>;
  totals: {
    materiePrima: number;
    condimente: number;
    condimenteRecete: number;
    alteCheltuieli: number;
    muncaPersonal: number;
    grandTotal: number;
  };
}

/**
 * Traverses a recipe recursively to split and scale all raw materials,
 * main condiments, sub-recipe condiments, expenses, and labor based on a target quantity.
 */
export function scaleRecipeIngredients(
  recipeId: string,
  targetQuantity: number,
  allRecipes: Recipe[],
  allResources: Resource[],
  allEmployees: Employee[]
): ScaledResult {
  const result: ScaledResult = {
    materiePrima: [],
    condimente: [],
    condimenteRecete: [],
    alteCheltuieli: [],
    muncaPersonal: [],
    subrecipes: [],
    totals: {
      materiePrima: 0,
      condimente: 0,
      condimenteRecete: 0,
      alteCheltuieli: 0,
      muncaPersonal: 0,
      grandTotal: 0,
    },
  };

  const collectSubrecipeCondiments = (recipeId: string, multiplier: number, items: ScaledItem[], visited: Set<string>) => {
    if (visited.has(recipeId)) return;
    const recipe = allRecipes.find((r) => r.id === recipeId);
    if (!recipe) return;
    const nextVisited = new Set(visited).add(recipeId);
    for (const line of recipe.lines) {
      const scaledQty = line.quantity * multiplier;
      if (line.type === 'condiment' && line.resourceId) {
        const resource = allResources.find((r) => r.id === line.resourceId);
        if (!resource) continue;
        const existing = items.find((item) => item.resourceId === resource.id);
        if (existing) { existing.quantity += scaledQty; existing.total += resource.currentPrice * scaledQty; }
        else items.push({ resourceId: resource.id, label: resource.label, quantity: scaledQty, unit: resource.unit, priceUnit: resource.currentPrice, total: resource.currentPrice * scaledQty });
      }
      else if (line.type === 'subreteta' && line.subRecipeId) collectSubrecipeCondiments(line.subRecipeId, scaledQty, items, nextVisited);
    }
  };

  const traverse = (currentRecipeId: string, multiplier: number, isSubLevel: boolean) => {
    const recipe = allRecipes.find((r) => r.id === currentRecipeId);
    if (!recipe) return;

    for (const line of recipe.lines) {
      const scaledQty = line.quantity * multiplier;

      switch (line.type) {
        case 'materie_prima': {
          const resource = allResources.find((r) => r.id === line.resourceId);
          if (resource) {
            const existing = result.materiePrima.find((item) => item.resourceId === resource.id);
            const lineTotal = resource.currentPrice * scaledQty;
            if (existing) {
              existing.quantity += scaledQty;
              existing.total += lineTotal;
            } else {
              result.materiePrima.push({
                resourceId: resource.id,
                label: resource.label,
                quantity: scaledQty,
                unit: resource.unit,
                priceUnit: resource.currentPrice,
                total: lineTotal,
              });
            }
          }
          break;
        }
        case 'condiment': {
          const resource = allResources.find((r) => r.id === line.resourceId);
          if (resource) {
            // Spices from sub-recipes go to 'condimenteRecete', main level goes to 'condimente'
            const list = isSubLevel ? result.condimenteRecete : result.condimente;
            const existing = list.find((item) => item.resourceId === resource.id);
            const lineTotal = resource.currentPrice * scaledQty;
            if (existing) {
              existing.quantity += scaledQty;
              existing.total += lineTotal;
            } else {
              list.push({
                resourceId: resource.id,
                label: resource.label,
                quantity: scaledQty,
                unit: resource.unit,
                priceUnit: resource.currentPrice,
                total: lineTotal,
              });
            }
          }
          break;
        }
        case 'alta_cheltuiala': {
          const resource = allResources.find((r) => r.id === line.resourceId);
          if (resource) {
            const existing = result.alteCheltuieli.find((item) => item.resourceId === resource.id);
            const lineTotal = resource.currentPrice * scaledQty;
            if (existing) {
              existing.quantity += scaledQty;
              existing.total += lineTotal;
            } else {
              result.alteCheltuieli.push({
                resourceId: resource.id,
                label: resource.label,
                quantity: scaledQty,
                unit: resource.unit,
                priceUnit: resource.currentPrice,
                total: lineTotal,
              });
            }
          }
          break;
        }
        case 'subreteta': {
          if (line.subRecipeId) {
            const subrecipe = allRecipes.find((item) => item.id === line.subRecipeId);
            const condimente: ScaledItem[] = [];
            collectSubrecipeCondiments(line.subRecipeId, scaledQty, condimente, new Set());
            const unitCost = subrecipe ? calculateRecipeCost(subrecipe.id, allRecipes, allResources, allEmployees) : 0;
            result.subrecipes.push({ recipeId: line.subRecipeId, label: subrecipe?.label || `Subrețeta ${line.subRecipeId}`, quantity: scaledQty, unit: subrecipe?.baseUnit || 'kg', unitCost, totalCost: unitCost * scaledQty, condimente });
            // Recursively traverse the sub-recipe, flag as sub-level to separate spices
            traverse(line.subRecipeId, scaledQty, true);
          }
          break;
        }
        case 'manopera': {
          if (line.employeeId) {
            const employee = allEmployees.find((e) => e.id === line.employeeId);
            if (employee) {
              const rate = employee.rates[currentRecipeId] || 0;
              const lineTotal = rate * scaledQty;
              const existing = result.muncaPersonal.find(
                (m) => m.employeeId === employee.id && m.recipeLabel === recipe.label
              );
              if (existing) {
                existing.quantity += scaledQty;
                existing.total += lineTotal;
              } else {
                result.muncaPersonal.push({
                  employeeId: employee.id,
                  name: employee.name,
                  role: employee.role,
                  recipeLabel: recipe.label,
                  rate: rate,
                  quantity: scaledQty,
                  total: lineTotal,
                });
              }
            }
          }
          break;
        }
      }
    }
  };

  // Start traversing from the top-level recipe
  traverse(recipeId, targetQuantity, false);

  // Calculate totals
  result.totals.materiePrima = result.materiePrima.reduce((sum, item) => sum + item.total, 0);
  result.totals.condimente = result.condimente.reduce((sum, item) => sum + item.total, 0);
  result.totals.condimenteRecete = result.condimenteRecete.reduce((sum, item) => sum + item.total, 0);
  result.totals.alteCheltuieli = result.alteCheltuieli.reduce((sum, item) => sum + item.total, 0);
  result.totals.muncaPersonal = result.muncaPersonal.reduce((sum, item) => sum + item.total, 0);

  result.totals.grandTotal =
    result.totals.materiePrima +
    result.totals.condimente +
    result.totals.condimenteRecete +
    result.totals.alteCheltuieli +
    result.totals.muncaPersonal;

  return result;
}

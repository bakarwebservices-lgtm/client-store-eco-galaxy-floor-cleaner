import { Prisma } from '@prisma/client';

export interface SmartRuleConfig {
  ruleField?: string | null;
  ruleOperator?: string | null;
  ruleValue?: string | null;
}

/**
 * Resolves a SMART collection rule into a Prisma ProductWhereInput filter.
 * Accurately accounts for effective pricing (checks base Product.price AND active ProductVariant.price overrides).
 */
export function resolveSmartCollectionWhere(
  rule: SmartRuleConfig
): Prisma.ProductWhereInput {
  const { ruleField, ruleOperator, ruleValue } = rule;

  if (!ruleField || !ruleOperator || ruleValue === undefined || ruleValue === null || ruleValue === '') {
    return {};
  }

  const val = ruleValue.trim();

  switch (ruleField) {
    case 'tags': {
      if (ruleOperator === 'not_equals') {
        return { NOT: { tags: { has: val } } };
      }
      // Both equals and contains match when tags array has the tag
      return { tags: { has: val } };
    }

    case 'vendor': {
      if (ruleOperator === 'equals') {
        return { vendor: { equals: val, mode: 'insensitive' } };
      }
      if (ruleOperator === 'contains') {
        return { vendor: { contains: val, mode: 'insensitive' } };
      }
      if (ruleOperator === 'not_equals') {
        return { NOT: { vendor: { equals: val, mode: 'insensitive' } } };
      }
      return {};
    }

    case 'type': {
      if (ruleOperator === 'equals') {
        return { type: { equals: val, mode: 'insensitive' } };
      }
      if (ruleOperator === 'contains') {
        return { type: { contains: val, mode: 'insensitive' } };
      }
      if (ruleOperator === 'not_equals') {
        return { NOT: { type: { equals: val, mode: 'insensitive' } } };
      }
      return {};
    }

    case 'featured': {
      const boolVal = val.toLowerCase() === 'true' || val === '1';
      return { featured: boolVal };
    }

    case 'price': {
      const priceNum = parseFloat(val);
      if (isNaN(priceNum)) return {};

      if (ruleOperator === 'greater_than') {
        // Effective price check: Matches if base product price >= priceNum OR any active variant price >= priceNum
        return {
          OR: [
            { price: { gte: priceNum } },
            {
              variants: {
                some: {
                  isActive: true,
                  price: { gte: priceNum },
                },
              },
            },
          ],
        };
      }

      if (ruleOperator === 'less_than') {
        // Effective price check: Matches if base product price <= priceNum OR any active variant price <= priceNum
        return {
          OR: [
            { price: { lte: priceNum } },
            {
              variants: {
                some: {
                  isActive: true,
                  price: { lte: priceNum },
                },
              },
            },
          ],
        };
      }

      if (ruleOperator === 'equals') {
        return {
          OR: [
            { price: { equals: priceNum } },
            {
              variants: {
                some: {
                  isActive: true,
                  price: { equals: priceNum },
                },
              },
            },
          ],
        };
      }

      return {};
    }

    default:
      return {};
  }
}

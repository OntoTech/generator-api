import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FilterOperator {
  EQ = 'eq',
  NE = 'ne',
  GT = 'gt',
  GTE = 'gte',
  LT = 'lt',
  LTE = 'lte',
  BETWEEN = 'between',
  LIKE = 'like',
  ILIKE = 'ilike',
  IN = 'in',
  CONTAINS = 'contains',
  OVERLAP = 'overlap',
}

export interface FilterCondition {
  op?: FilterOperator;
  value: any;
}

export type FilterValue = FilterCondition | any;

export class ListGeneratorDto {
  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Page size', minimum: 1, default: 10 })
  size?: number = 10;

  @ApiPropertyOptional({
    description:
      'Sort column (use data property name for JSONB, e.g., "name", or table column: "created_at", "updated_at", "code")',
  })
  sortColumn?: string;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'], default: 'DESC' })
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({
    description:
      'Advanced filters for data JSONB column. Supports operators: eq, ne, gt, gte, lt, lte, between, like, ilike, in, contains, overlap. Use $and/$or/$not for complex queries.',
    example: {
      name: { op: 'eq', value: 'John' },
      age: { op: 'gte', value: 18 },
      score: { op: 'between', value: [50, 100] },
      tags: { op: 'contains', value: ['admin'] },
      status: { op: 'in', value: ['active', 'pending'] },
      $or: [{ name: 'John' }, { name: 'Jane' }],
      $and: [{ age: { op: 'gt', value: 18 } }, { status: 'active' }],
      $not: { status: 'deleted' },
    },
  })
  filters?: Record<string, FilterValue | FilterValue[] | Record<string, FilterValue>[]>;
}

export type ValidationResult = {
  isValid: boolean;
  errors: string[];
};

export interface ModelItem {
  id: string;
  type: string;
  baseModelItemId: string;
  props: {
    code: string;
    name?: string;
    description?: string;
  };
}

export type ModelRelationType = 'base:object--object' | 'base:object--attribute';

export interface ModelRelation {
  id: string;
  from: string;
  to: string;
  type: ModelRelationType;
  props: {
    isRequired?: boolean;
  };
}

export interface IModel {
  id?: string;
  type: string;
  code: string;
  name: string;
  description: string;
  props: {
    domain: string;
  };
  items: ModelItem[];
  relations: ModelRelation[];
}

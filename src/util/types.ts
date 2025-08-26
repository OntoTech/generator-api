export type ValidationResult = {
  isValid: boolean;
  errors: string[];
};

export interface ModelItem {
  id: string;
  type: string;
  props: {
    code: string;
    name?: string;
    description?: string;
    type?: string;
  };
}

export interface ModelRelation {
  id: string;
  from: string;
  to: string;
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

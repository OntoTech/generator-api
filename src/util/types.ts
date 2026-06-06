export type ValidationResult = {
  isValid: boolean;
  errors: string[];
};

export interface ModelItem {
  id: string;
  type: string;
  baseModelItemId: string;
  baseType: string;
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

export enum SearchType {
  Exact = 'exact',
  Fuzzy = 'fuzzy',
}

export interface IUserInfo {
  surname?: string;
  logonname?: string;
  email?: string;
  firstname?: string;
  name?: string;
  family_name?: string;
  objectGUID?: string;
  middlename?: string;
  middle_name?: string;
  uid?: string;
  sub?: string;
  roles?: string[];
  roleNames?: string[];
  federalAppBffAuthHeader?: string;
}

export interface Empresa {
  id: string;
  name: string;
  address?: string;
}

export interface MaterialItem {
  id: string;
  materialTypeId: string;
  quantity: string;
  unit: string;
}

export interface MaterialType {
  id: string;
  name: string;
  unit: string;
}

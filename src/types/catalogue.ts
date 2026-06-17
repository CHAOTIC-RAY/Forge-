export interface HighStockProduct {
  title: string;
  type: string;
  link: string;
  stockInfo: string;
  outlet: string;
  sku?: string;
  price?: string;
  categories?: string[];
}

export interface CategoryCount {
  category: string;
  count: number;
}

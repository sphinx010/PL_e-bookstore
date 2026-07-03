import { db } from '../client';
import { NotFoundError } from '../../errors';
import type { Product } from '../types';

export async function getActiveProducts(): Promise<Product[]> {
  const { data, error } = await db
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch products: ${error.message}`);
  return (data ?? []) as Product[];
}

export async function getProductByCode(code: string): Promise<Product> {
  const { data, error } = await db
    .from('products')
    .select('*')
    .eq('code', code)
    .eq('is_active', true)
    .single();

  if (error || !data) throw new NotFoundError(`Product not found: ${code}`);
  return data as Product;
}

export async function getProductById(id: string): Promise<Product> {
  const { data, error } = await db
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) throw new NotFoundError(`Product not found: ${id}`);
  return data as Product;
}

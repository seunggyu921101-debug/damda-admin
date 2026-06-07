import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export type Business = Database['public']['Tables']['businesses']['Row']
export type BusinessInsert = Database['public']['Tables']['businesses']['Insert']
export type BusinessUpdate = Database['public']['Tables']['businesses']['Update']

// 사업장에 속한 상품(목록 표시용 최소 필드)
export interface BusinessProduct {
  id: string
  name: string
  sale_price: number
  original_price: number
  is_visible: boolean
  is_sold_out: boolean
  sale_type: Database['public']['Enums']['product_sale_type']
  category: { id: string; name: string } | null
}

// 사업주의 사업장 목록
export async function getBusinessesByVendor(vendorId: string): Promise<Business[]> {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('business_owner_id', vendorId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

// 사업장 단건 조회
export async function getBusiness(id: string): Promise<Business> {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

// 사업장에 속한 상품 목록
export async function getProductsByBusiness(businessId: string): Promise<BusinessProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, sale_price, original_price, is_visible, is_sold_out, sale_type, category:categories(id, name)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as unknown as BusinessProduct[]) || []
}

// 사업장 생성
export async function createBusiness(input: BusinessInsert): Promise<Business> {
  const { data, error } = await supabase
    .from('businesses')
    .insert(input)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

// 사업장 수정
export async function updateBusiness(id: string, input: BusinessUpdate): Promise<Business> {
  const { data, error } = await supabase
    .from('businesses')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

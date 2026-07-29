import { supabase } from '@/lib/supabase'

export interface ChangeAdminPasswordParams {
  currentPassword: string
  newPassword: string
}

export async function changeAdminPassword({
  currentPassword,
  newPassword,
}: ChangeAdminPasswordParams): Promise<void> {
  const { error } = await supabase.rpc('change_admin_password', {
    p_current_password: currentPassword,
    p_new_password: newPassword,
  })

  if (!error) return

  if (error.message.includes('CURRENT_PASSWORD_INVALID')) {
    throw new Error('현재 비밀번호가 올바르지 않습니다.')
  }

  if (error.message.includes('PASSWORD_REUSE_NOT_ALLOWED')) {
    throw new Error('현재 비밀번호와 다른 비밀번호를 입력해주세요.')
  }

  if (error.message.includes('PASSWORD_POLICY_VIOLATION')) {
    throw new Error('새 비밀번호는 8자 이상이며 영문, 숫자, 특수문자를 포함해야 합니다.')
  }

  if (error.message.includes('ADMIN_NOT_FOUND')) {
    throw new Error('활성화된 관리자 계정을 확인할 수 없습니다.')
  }

  throw new Error('비밀번호 변경에 실패했습니다. 잠시 후 다시 시도해주세요.')
}

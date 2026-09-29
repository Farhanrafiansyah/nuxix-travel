export type CurrentUser = {
  id: number
  name: string
  email: string
  role: string
  department: string
}

export const useCurrentUser = () => useState<CurrentUser | null>('current-user', () => null)

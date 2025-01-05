export interface User {
  uuid: string
}

const SOBAKA_USER = 'sobaka-user'

export const get_user = (): User | null => {
  try {
    return JSON.parse(localStorage.getItem(SOBAKA_USER)!) as User
  } catch {
    return null
  }
}

export const update_user = (user: User) => {
  localStorage.setItem(SOBAKA_USER, JSON.stringify(user))
}

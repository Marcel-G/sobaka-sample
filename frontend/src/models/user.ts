export interface User {
  uuid: string
}

const SOBAKA_USER = 'sobaka-user'

export const get_user = (): User | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return JSON.parse(localStorage.getItem(SOBAKA_USER)!) as User
  } catch {
    return null
  }
}

export const update_user = (user: User) => {
  localStorage.setItem(SOBAKA_USER, JSON.stringify(user))
}

export const create_user = () => {
  const uuid = crypto.randomUUID()
  const user: User = { uuid }

  update_user(user)

  return user
}

export const init_user = () => get_user() || create_user()

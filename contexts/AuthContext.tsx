import { createContext, ReactNode, useState } from "react";
import { api } from "../services/api";
import {useRouter} from "next/router"

type SignInCredentials = {
  email: string;
  password: string;
}


type AuthContextData = {
  signIn(credentials: SignInCredentials): Promise<void>;
  isAuthenticated: boolean;
  user:User;
}

type AuthProviderProps = {
  children: ReactNode;
}

type User = {
  email:string;
  permissions:string[];
  roles:string[]
}

export const AuthContext = createContext({} as AuthContextData)

export function AuthProvider({ children }: AuthProviderProps) {

  const [user, setUser] = useState<User>()
  
  const router = useRouter()

  const isAuthenticated = !!user

  async function signIn({ email, password }: SignInCredentials) {
    try {
      const response = await api.post('sessions', {
        email,
        password
      })

      const {token, refreshToken, permissions, roles} = response.data

     setUser({
      email,
      permissions,
      roles
     })

     router.push('/dashboard')
    }
    catch (err) {
      console.log(err)
    }



  }

  return (
    <AuthContext.Provider value={{ signIn, isAuthenticated, user }}>
      {children}
    </AuthContext.Provider>
  )
} 
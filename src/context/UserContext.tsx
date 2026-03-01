// 📦 Importamos React y hooks necesarios para contexto y estado
import React, { createContext, useContext, useEffect, useState } from 'react';

// 🧩 Definimos la estructura esperada de un objeto "usuario"
// Incluye nombre, correo, imagen, y opcionalmente el token JWT
interface User {
  name?: string;
  email?: string;
  picture?: string;
  jwt?: string; // 🔑 Añadimos JWT opcionalmente al objeto usuario
  [key: string]: any; // Permite agregar propiedades adicionales
}

// 🧠 Definimos la forma del contexto: usuario actual, función para actualizarlo, y logout
interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

// 🧵 Creamos el contexto en sí, sin valor inicial definido (usamos undefined)
const UserContext = createContext<UserContextType | undefined>(undefined);

// 🧱 Proveedor del contexto, envolverá el árbol de la app para proveer acceso global al usuario
export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 🔄 Estado local que almacena el usuario actual
  const [user, setUser] = useState<User | null>(null);

  // 📦 Al cargar el componente por primera vez, intentamos recuperar usuario y JWT desde localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('jwt');

    if (savedUser) {
      const userData = JSON.parse(savedUser);
      if (savedToken) userData.jwt = savedToken; // 🔗 Asociamos el token si existe
      setUser(userData); // ✅ Cargamos al usuario en el estado
    }
  }, []);

  // 🔓 Función que borra al usuario actual y elimina datos del localStorage
  const logout = () => {
    setUser(null); // 🔄 Limpia el estado local
    localStorage.removeItem('user'); // ❌ Elimina usuario guardado
    localStorage.removeItem('jwt');  // ❌ Elimina token JWT
  };

  // 🪄 Devolvemos el proveedor del contexto con acceso al estado del usuario y las funciones
  return (
    <UserContext.Provider value={{ user, setUser, logout }}>
      {children}
    </UserContext.Provider>
  );
};

// 🧰 Hook personalizado para consumir el contexto de usuario de forma sencilla
export const useUser = (): UserContextType => {
  const context = useContext(UserContext);

  // 🚨 Si alguien intenta usar este hook fuera del <UserProvider>, lanzamos un error
  if (!context) {
    throw new Error('useUser debe usarse dentro de <UserProvider>');
  }

  return context;
};

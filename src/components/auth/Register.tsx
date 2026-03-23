'use client' // + marca el componente de registro para ejecutarse en el cliente

import React, { useEffect, useRef, useState } from "react"; // + importa React, refs y efectos para forzar el foco inicial del campo nombre
import { Alert, Box, Button, Dialog, DialogContent, DialogTitle, Divider, IconButton, InputAdornment, TextField, Typography } from "@mui/material"; // + importa controles y tipografia para construir el nuevo estilo visual del registro
import VisibilityIcon from "@mui/icons-material/Visibility"; // + importa el icono para mostrar la contrasena del campo password
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff"; // + importa el icono para ocultar la contrasena del campo password
import Image from "next/image"; // + importa el componente Image para usar la imagen local de Google del directorio public

interface RegisterProps { // + define las propiedades necesarias para controlar el modal de registro desde el header
  open: boolean; // + indica si el modal de registro debe estar visible
  username: string; // + recibe el valor actual del campo nombre de usuario
  email: string; // + recibe el valor actual del campo correo electronico
  password: string; // + recibe el valor actual del campo contrasena
  error: string; // + recibe el mensaje de error que se mostrara en el formulario
  isSubmitting: boolean; // + indica si el formulario esta procesando una accion
  onClose: () => void; // + recibe la funcion para cerrar el modal
  onUsernameChange: (value: string) => void; // + recibe la funcion que actualiza el nombre de usuario
  onEmailChange: (value: string) => void; // + recibe la funcion que actualiza el correo electronico
  onPasswordChange: (value: string) => void; // + recibe la funcion que actualiza la contrasena
  onRegister: () => void | Promise<void>; // + recibe la funcion para registrar una cuenta nueva
  onOpenLogin: () => void; // + recibe la funcion para abrir el modal de login desde registro
  onGoogleLogin: () => void | Promise<void>; // + recibe la funcion para iniciar sesion con Google desde registro
} // + cierra la definicion de propiedades del modal de registro

export default function Register({ open, username, email, password, error, isSubmitting, onClose, onUsernameChange, onEmailChange, onPasswordChange, onRegister, onOpenLogin, onGoogleLogin }: RegisterProps) { // + define el modal reutilizable del formulario de registro
  const [showPassword, setShowPassword] = useState(false); // + controla si el campo contrasena se muestra como texto o como password
  const handleTogglePasswordVisibility = () => setShowPassword((prev) => !prev); // + alterna la visibilidad del valor escrito en la contrasena
  const usernameInputRef = useRef<HTMLInputElement | null>(null); // + guarda una referencia directa al input de nombre para aplicar foco manual al abrir el modal

  useEffect(() => { // + fuerza el foco en el campo nombre de usuario cada vez que el modal se abre
    if (!open) { // + evita intentar enfocar el input cuando el modal aun no esta visible
      return; // + corta el efecto si el modal permanece cerrado
    }

    const focusTimeout = window.setTimeout(() => { // + espera un instante a que el Dialog termine de montar sus nodos internos
      usernameInputRef.current?.focus(); // + coloca el cursor directamente en el campo nombre de usuario al abrir el modal
      usernameInputRef.current?.select(); // + selecciona el contenido existente para que el usuario pueda reemplazarlo rapido si quiere
    }, 50);

    return () => { // + limpia el temporizador si el modal se cierra o el componente se desmonta antes de ejecutarse
      window.clearTimeout(focusTimeout); // + evita focos tardios cuando el modal ya no esta disponible
    };
  }, [open]); // + reactiva el enfoque solo cuando cambia la apertura del modal

  return ( // + renderiza el modal con los campos y botones del registro
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 4 } }}> {/* + renderiza el modal del formulario con una tarjeta mas redondeada para igualar el login */} 
      <DialogTitle sx={{ px: 3.5, pt: 3.5, pb: 1, fontSize: "2rem", fontWeight: 800, color: "#222" }}>Registrate</DialogTitle> {/* + muestra un titulo grande y pesado siguiendo el estilo del modal login */} 
      <DialogContent sx={{ pt: "8px !important", px: 3.5, pb: 3.5 }}> {/* + agrega un espaciado interior generoso para airear la composicion del registro */} 
        <Box component="form" onSubmit={(event) => { event.preventDefault(); void onRegister(); }} sx={{ display: "flex", flexDirection: "column", gap: 2.25 }}> {/* + organiza el formulario como una columna amplia y limpia */} 
          <TextField label="Nombre de usuario" value={username} onChange={(event) => onUsernameChange(event.target.value)} autoComplete="username" autoFocus inputRef={usernameInputRef} fullWidth placeholder="Escribe tu nombre de usuario" InputLabelProps={{ shrink: true }} sx={{ "& .MuiOutlinedInput-root": { minHeight: 58, borderRadius: 3, fontSize: "1rem" } }} /> {/* + conecta el campo nombre con una referencia para asegurar el foco inicial al abrir el modal */} 
          <TextField label="Correo electronico" type="email" value={email} onChange={(event) => onEmailChange(event.target.value)} autoComplete="email" fullWidth placeholder="Escribe tu correo electronico" InputLabelProps={{ shrink: true }} sx={{ "& .MuiOutlinedInput-root": { minHeight: 58, borderRadius: 3, fontSize: "1rem" } }} /> {/* + muestra el campo de correo con el mismo lenguaje visual del login */} 
          <TextField label="Contrasena" type={showPassword ? "text" : "password"} value={password} onChange={(event) => onPasswordChange(event.target.value)} autoComplete="new-password" fullWidth placeholder="Escribe tu contrasena" InputLabelProps={{ shrink: true }} InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={handleTogglePasswordVisibility} edge="end" aria-label="mostrar u ocultar contrasena">{showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}</IconButton></InputAdornment> }} sx={{ "& .MuiOutlinedInput-root": { minHeight: 58, borderRadius: 3, fontSize: "1rem" } }} /> {/* + muestra el campo password con control para ver u ocultar la contrasena */} 
          {error ? <Alert severity="error" variant="outlined" sx={{ borderRadius: 2.5 }}>{error}</Alert> : null} {/* + muestra el mensaje de error del registro dentro de una alerta mas integrada al diseno */} 
          <Button variant="contained" type="submit" disabled={isSubmitting} sx={{ mt: 0.5, minHeight: 54, borderRadius: 3, textTransform: "none", fontSize: "1.05rem", fontWeight: 700, bgcolor: "#1565d8", "&:hover": { bgcolor: "#0f56ba" } }}>Registrarse</Button> {/* + muestra un boton principal ancho y dominante para crear la cuenta */} 
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 0.75, mt: -0.25 }}> {/* + coloca la invitacion al login en una sola linea centrada */} 
            <Typography sx={{ color: "#4a4a4a", fontSize: "0.98rem" }}>Ya tienes una cuenta?</Typography> {/* + presenta el texto introductorio antes del acceso a login */} 
            <Button variant="text" onClick={onOpenLogin} disabled={isSubmitting} sx={{ textTransform: "none", fontSize: "0.98rem", fontWeight: 700, color: "#2a74db", minWidth: "auto", px: 0.5 }}>Inicia sesion</Button> {/* + abre el formulario login desde un enlace visual similar al modal login */} 
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#7f7f7f", mt: 0.5 }}> {/* + inserta el separador visual entre el registro normal y el acceso social */} 
            <Divider sx={{ flex: 1 }} /> {/* + dibuja la linea izquierda del separador */} 
            <Typography sx={{ fontSize: "0.95rem", color: "#6d6d6d" }}>O</Typography> {/* + muestra el texto central del separador */} 
            <Divider sx={{ flex: 1 }} /> {/* + dibuja la linea derecha del separador */} 
          </Box>
          <Button variant="outlined" startIcon={<Image src="/imagenes/google.png" alt="Google" width={22} height={22} />} onClick={() => void onGoogleLogin()} disabled={isSubmitting} sx={{ minHeight: 54, borderRadius: 3, textTransform: "none", fontSize: "1rem", fontWeight: 600, borderColor: "#1565d8", color: "#1565d8", justifyContent: "center", px: 2.25, "& .MuiButton-startIcon": { mr: 1.5 }, "&:hover": { borderColor: "#0f56ba", bgcolor: "rgba(21, 101, 216, 0.08)" } }}>Iniciar con Google</Button> {/* + replica el boton social del login para mantener consistencia visual entre ambos modales */} 
        </Box>
      </DialogContent>
    </Dialog>
  );
}

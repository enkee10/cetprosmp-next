'use client' // + marca el componente de login para ejecutarse en el cliente

import React, { useEffect, useRef, useState } from "react"; // + importa React, refs y efectos para forzar el foco inicial del campo correo
import { Alert, Box, Button, Dialog, DialogContent, DialogTitle, Divider, IconButton, InputAdornment, TextField, Typography } from "@mui/material"; // + importa controles y tipografia para construir la nueva composicion visual del login
import VisibilityIcon from "@mui/icons-material/Visibility"; // + importa el icono para mostrar la contrasena del campo password
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff"; // + importa el icono para ocultar la contrasena del campo password
import Image from "next/image"; // + importa el componente Image para usar la imagen local de Google del directorio public

interface LoginProps { // + define las propiedades necesarias para controlar el modal desde el header
  open: boolean; // + indica si el modal debe estar visible
  email: string; // + recibe el valor actual del campo correo
  password: string; // + recibe el valor actual del campo contrasena
  error: string; // + recibe el mensaje de error que se mostrara en el formulario
  info: string; // + recibe el mensaje informativo que se mostrara cuando el flujo no sea un error
  isSubmitting: boolean; // + indica si el formulario esta procesando una accion
  onClose: () => void; // + recibe la funcion para cerrar el modal
  onEmailChange: (value: string) => void; // + recibe la funcion que actualiza el correo
  onPasswordChange: (value: string) => void; // + recibe la funcion que actualiza la contrasena
  onGoogleLogin: () => void | Promise<void>; // + recibe la funcion para iniciar sesion con Google
  onEmailLogin: () => void | Promise<void>; // + recibe la funcion para iniciar sesion con correo y contrasena
  onForgotPassword: () => void | Promise<void>; // + recibe la funcion que envia el correo para restablecer la contrasena
  onOpenRegister: () => void; // + recibe la funcion que abre el formulario de registro desde login
} // + cierra la definicion de propiedades del modal login

export default function Login({ open, email, password, error, info, isSubmitting, onClose, onEmailChange, onPasswordChange, onGoogleLogin, onEmailLogin, onForgotPassword, onOpenRegister }: LoginProps) { // + define el modal reutilizable del formulario login
  const [showPassword, setShowPassword] = useState(false); // + controla si el campo contrasena se muestra como texto o como password
  const handleTogglePasswordVisibility = () => setShowPassword((prev) => !prev); // + alterna la visibilidad del valor escrito en la contrasena
  const emailInputRef = useRef<HTMLInputElement | null>(null); // + guarda una referencia directa al input de correo para aplicar foco manual al abrir el modal

  useEffect(() => { // + fuerza el foco en el campo correo cada vez que el modal se abre
    if (!open) { // + evita intentar enfocar el input cuando el modal aun no esta visible
      return; // + corta el efecto si el modal permanece cerrado
    }

    const focusTimeout = window.setTimeout(() => { // + espera un instante a que el Dialog termine de montar sus nodos internos
      emailInputRef.current?.focus(); // + coloca el cursor directamente en el campo correo al abrir el modal
      emailInputRef.current?.select(); // + selecciona el contenido existente para que el usuario pueda reemplazarlo rapido si quiere
    }, 50);

    return () => { // + limpia el temporizador si el modal se cierra o el componente se desmonta antes de ejecutarse
      window.clearTimeout(focusTimeout); // + evita focos tardios cuando el modal ya no esta disponible
    };
  }, [open]); // + reactiva el enfoque solo cuando cambia la apertura del modal

  return ( // + renderiza el modal con los campos y botones del login
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 4 } }}> {/* + renderiza el modal del formulario con una tarjeta mas redondeada como en la referencia */} 
      <DialogTitle sx={{ px: 3.5, pt: 3.5, pb: 1, fontSize: "2rem", fontWeight: 800, color: "#222" }}>Login</DialogTitle> {/* + muestra un titulo mas grande y pesado para acercarse al ejemplo visual */} 
      <DialogContent sx={{ pt: "8px !important", px: 3.5, pb: 3.5 }}> {/* + agrega un espaciado interior mas generoso para airear la composicion */} 
        <Box component="form" onSubmit={(event) => { event.preventDefault(); void onEmailLogin(); }} sx={{ display: "flex", flexDirection: "column", gap: 2.25 }}> {/* + organiza el formulario como una columna amplia y limpia */} 
          <TextField label="Correo electronico" type="email" value={email} onChange={(event) => onEmailChange(event.target.value)} autoComplete="email" autoFocus inputRef={emailInputRef} fullWidth placeholder="Escribe tu correo electronico" InputLabelProps={{ shrink: true }} sx={{ "& .MuiOutlinedInput-root": { minHeight: 58, borderRadius: 3, fontSize: "1rem" } }} /> {/* + conecta el campo correo con una referencia para asegurar el foco inicial al abrir el modal */} 
          <TextField label="Contrasena" type={showPassword ? "text" : "password"} value={password} onChange={(event) => onPasswordChange(event.target.value)} autoComplete="current-password" fullWidth placeholder="Escribe tu contrasena" InputLabelProps={{ shrink: true }} InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={handleTogglePasswordVisibility} edge="end" aria-label="mostrar u ocultar contrasena">{showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}</IconButton></InputAdornment> }} sx={{ "& .MuiOutlinedInput-root": { minHeight: 58, borderRadius: 3, fontSize: "1rem" } }} /> {/* + mantiene el campo password sin foco automatico para priorizar el correo al abrir */} 
          <Box sx={{ display: "flex", justifyContent: "center", mt: -0.75 }}> {/* + centra el enlace de recuperacion debajo del campo password como en la referencia */} 
            <Button variant="text" onClick={() => void onForgotPassword()} disabled={isSubmitting} sx={{ textTransform: "none", borderRadius: "999px", fontSize: "0.98rem", fontWeight: 600, color: "#2a74db" }}>Olvidaste tu contrasena?</Button> {/* + envia el correo de restablecimiento usando el email escrito en el formulario */} 
          </Box>
          {error ? <Alert severity="error" variant="outlined" sx={{ borderRadius: 2.5 }}>{error}</Alert> : null} {/* + muestra el mensaje de error del login dentro de una alerta mas integrada al diseno */} 
          {info ? <Alert severity="info" variant="outlined" sx={{ borderRadius: 2.5 }}>{info}</Alert> : null} {/* + muestra los avisos del login dentro de una alerta informativa mas integrada al diseno */} 
          <Button variant="contained" type="submit" disabled={isSubmitting} sx={{ mt: 0.5, minHeight: 54, borderRadius: 3, textTransform: "none", fontSize: "1.05rem", fontWeight: 700, bgcolor: "#1565d8", "&:hover": { bgcolor: "#0f56ba" } }}>Iniciar sesion</Button> {/* + muestra un boton principal ancho y dominante para el acceso con correo */} 
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 0.75, mt: -0.25 }}> {/* + coloca la invitacion al registro en una sola linea centrada */} 
            <Typography sx={{ color: "#4a4a4a", fontSize: "0.98rem" }}>No tienes una cuenta?</Typography> {/* + presenta el texto introductorio antes del acceso a registro */} 
            <Button variant="text" onClick={onOpenRegister} disabled={isSubmitting} sx={{ textTransform: "none", fontSize: "0.98rem", fontWeight: 700, color: "#2a74db", minWidth: "auto", px: 0.5 }}>Registrate</Button> {/* + abre el formulario de registro desde un enlace visual similar al ejemplo */} 
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#7f7f7f", mt: 0.5 }}> {/* + inserta el separador visual entre el login normal y el social */} 
            <Divider sx={{ flex: 1 }} /> {/* + dibuja la linea izquierda del separador */} 
            <Typography sx={{ fontSize: "0.95rem", color: "#6d6d6d" }}>O</Typography> {/* + muestra el texto central del separador */} 
            <Divider sx={{ flex: 1 }} /> {/* + dibuja la linea derecha del separador */} 
          </Box>
          <Button variant="outlined" startIcon={<Image src="/imagenes/google.png" alt="Google" width={22} height={22} />} onClick={() => void onGoogleLogin()} disabled={isSubmitting} sx={{ minHeight: 54, borderRadius: 3, textTransform: "none", fontSize: "1rem", fontWeight: 600, borderColor: "#1565d8", color: "#1565d8", justifyContent: "center", px: 2.25, "& .MuiButton-startIcon": { mr: 1.5 }, "&:hover": { borderColor: "#0f56ba", bgcolor: "rgba(21, 101, 216, 0.08)" } }}>Iniciar con Google</Button> {/* + recupera los tonos azules del boton manteniendo el icono desde public/imagenes */} 
        </Box>
      </DialogContent>
    </Dialog>
  );
}

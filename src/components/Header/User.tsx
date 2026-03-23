'use client' // marca el componente para ejecutarse en el cliente

import React, { useEffect, useRef, useState } from "react"; // importa React y los hooks usados por el componente
import { Avatar, Box, Button, Divider, IconButton, Popper, Typography, useMediaQuery, useTheme } from "@mui/material"; // importa los componentes de interfaz usados por el menu del usuario
import Login from "@/components/auth/Login"; // importa el nuevo componente separado que contiene el modal login
import Register from "@/components/auth/Register"; // importa el nuevo componente separado que contiene el modal register
import { useAuth } from "@/context/AuthContext"; // importa el contexto de autenticacion para iniciar y cerrar sesion
import CloseIcon from "@mui/icons-material/Close"; // importa el icono para cerrar el popper del usuario
import LogoutIcon from "@mui/icons-material/Logout"; // importa el icono del boton de cerrar sesion
import { usePathname, useRouter, useSearchParams } from "next/navigation"; // + importa utilidades para leer y limpiar parametros de retorno tras verificar correo

const getFirebaseAuthMessage = (error: unknown, fallbackMessage: string) => { // + traduce los codigos y mensajes de Firebase Auth o Functions a textos claros para el usuario final
  const code = (error as { code?: string } | null)?.code || ""; // + intenta extraer el codigo devuelto por Firebase Auth o por una callable de Functions
  const rawMessage = (error as { message?: string; details?: { message?: string } } | null)?.details?.message || (error as { message?: string } | null)?.message || ""; // + intenta extraer el mensaje detallado devuelto por Firebase o por el backend
  switch (code) { // + evalua el codigo recibido desde Firebase Auth o Functions
    case "auth/invalid-email": // + contempla cuando el correo no cumple el formato esperado
      return "El correo electronico no es valido."; // + informa que el email ingresado debe corregirse
    case "auth/missing-email": // + contempla cuando Firebase recibe un flujo de correo sin email informado
      return "Ingresa tu correo electronico."; // + informa que falta el correo requerido para continuar
    case "auth/missing-password": // + contempla cuando Firebase recibe el acceso sin contrasena
      return "Ingresa tu contrasena."; // + informa que falta la contrasena en el formulario
    case "auth/invalid-credential": // + contempla credenciales invalidas en el login por email y contrasena
    case "auth/invalid-login-credentials": // + contempla la variante nueva del mismo error de acceso invalido
      return "Correo o contrasena incorrectos."; // + informa un error generico cuando Firebase no distingue entre usuario y contrasena
    case "auth/user-not-found": // + contempla cuando el correo no corresponde a una cuenta registrada
      return "No existe una cuenta con ese correo electronico."; // + informa que el usuario no esta registrado en el sistema
    case "auth/wrong-password": // + contempla cuando la contrasena ingresada no coincide con la cuenta
      return "La contrasena ingresada no es correcta."; // + informa que la contrasena escrita no coincide con la almacenada
    case "auth/user-disabled": // + contempla cuando la cuenta fue deshabilitada por administracion
      return "Tu cuenta ha sido deshabilitada. Contacta con administracion."; // + informa que la cuenta existe pero no puede iniciar sesion
    case "auth/too-many-requests": // + contempla bloqueos temporales por demasiados intentos fallidos
      return "Demasiados intentos. Intenta nuevamente en unos minutos."; // + informa que debe esperar antes de volver a intentar
    case "auth/network-request-failed": // + contempla problemas de conectividad al comunicarse con Firebase
      return "No se pudo conectar con el servidor. Revisa tu conexion a internet."; // + informa un problema de red durante la autenticacion
    case "auth/email-not-verified": // + contempla el caso controlado donde el correo aun no fue verificado
      return "Debes verificar tu correo antes de iniciar sesion."; // + informa que primero debe confirmar su direccion de correo
    case "auth/email-already-in-use": // + contempla cuando el correo ya fue registrado en Firebase Auth
    case "already-exists": // + contempla el codigo emitido por Functions para correo ya existente
    case "functions/already-exists": // + contempla la variante namespaced del mismo error de Functions
      return "Ese correo ya esta registrado."; // + informa que debe usar otro correo o iniciar sesion
    case "auth/weak-password": // + contempla cuando Firebase detecta una contrasena demasiado debil
      return "La contrasena es demasiado debil. Usa una mas segura."; // + informa que debe elegir una contrasena mas robusta
    case "auth/invalid-password": // + contempla cuando el backend de Admin detecta una contrasena invalida por longitud o formato
      return "La contrasena debe tener al menos 6 caracteres."; // + informa la regla minima de longitud contemplada por Firebase para password
    case "auth/operation-not-allowed": // + contempla cuando el proveedor de email y contrasena no esta habilitado
      return "El acceso con correo y contrasena no esta habilitado en Firebase."; // + informa un problema de configuracion del proyecto
    case "functions/invalid-argument": // + contempla errores de validacion enviados por la callable de registro
    case "functions/failed-precondition": // + contempla problemas de configuracion enviados por la callable de registro
    case "functions/resource-exhausted": // + contempla limites o demasiados intentos reportados por la callable
      return rawMessage || fallbackMessage; // + prioriza el mensaje especifico enviado por el backend para mostrarselo tal cual al usuario
    case "functions/internal": // + contempla errores internos devueltos por la callable cuando el backend no pudo completar el registro
      return rawMessage || "Ocurrio un error interno mientras se procesaba tu solicitud."; // + muestra el detalle del backend si existe o un texto generico si no
    default: // + cubre cualquier otro codigo no contemplado explicitamente
      return fallbackMessage; // + devuelve el mensaje generico definido por el flujo que llamo la funcion
  }
}; // + cierra el traductor de errores de Firebase a mensajes de interfaz

const shouldLogAuthError = (error: unknown) => { // + decide si un error debe registrarse en consola o mostrarse solo dentro del formulario
  const code = (error as { code?: string } | null)?.code || ""; // + intenta extraer el codigo del error que viene desde Firebase o Functions
  return !code.startsWith("auth/") && !code.startsWith("functions/"); // + solo deja pasar a consola los errores inesperados que no son validaciones de usuario
}; // + cierra el filtro para evitar ruido de errores esperados en desarrollo

export default function User() { // define el componente del usuario mostrado en el header
  const { user, loginWithGoogle, loginWithEmail, registerWithEmail, resetPassword, logout } = useAuth(); // + obtiene tambien el metodo para enviar el correo de restablecimiento desde login
  const [open, setOpen] = useState(false); // controla la apertura del popper del usuario autenticado
  const [isMounted, setIsMounted] = useState(false); // evita renderizar el componente antes del montaje en cliente
  const [loginModalOpen, setLoginModalOpen] = useState(false); // controla si el modal de login esta abierto
  const [registerModalOpen, setRegisterModalOpen] = useState(false); // controla si el modal de registro esta abierto
  const [email, setEmail] = useState(""); // guarda el correo ingresado en el formulario
  const [password, setPassword] = useState(""); // guarda la contrasena ingresada en el formulario
  const [loginError, setLoginError] = useState(""); // guarda el mensaje de error visible en el modal
  const [loginInfo, setLoginInfo] = useState(""); // + guarda mensajes informativos del modal como verificacion o recuperacion de contrasena
  const [registerUsername, setRegisterUsername] = useState(""); // guarda el nombre de usuario ingresado en el formulario de registro
  const [registerEmail, setRegisterEmail] = useState(""); // guarda el correo ingresado en el formulario de registro
  const [registerPassword, setRegisterPassword] = useState(""); // guarda la contrasena ingresada en el formulario de registro
  const [registerError, setRegisterError] = useState(""); // guarda el mensaje de error visible en el modal de registro
  const [isSubmitting, setIsSubmitting] = useState(false); // evita multiples envios simultaneos del formulario

  const anchorRef = useRef<HTMLDivElement | null>(null); // referencia el contenedor que ancla el popper del usuario
  const popperContentRef = useRef<HTMLDivElement | null>(null); // referencia el panel del popper para detectar clics internos correctamente

  const theme = useTheme(); // obtiene el tema actual de MUI
  const isMediumScreen = useMediaQuery(theme.breakpoints.down("md")); // detecta pantallas medianas o menores para cerrar el popper
  const searchParams = useSearchParams(); // + lee los parametros actuales de la URL para detectar retorno desde verificacion de correo
  const pathname = usePathname(); // + obtiene la ruta actual para limpiar parametros temporales sin cambiar de pagina
  const router = useRouter(); // + permite reemplazar la URL luego de procesar la verificacion de correo

  useEffect(() => { // marca el componente como montado en el cliente
    setIsMounted(true); // habilita el render cuando ya existe el entorno cliente
  }, []); // ejecuta el efecto una sola vez

  useEffect(() => { // cierra el popper cuando cambia a una pantalla mas pequena
    if (isMediumScreen && open) { // verifica si el popper esta abierto en una pantalla reducida
      setOpen(false); // cierra el popper cuando el layout cambia
    }
  }, [isMediumScreen, open]); // vuelve a revisar cuando cambia el tamano o el estado del popper

  useEffect(() => { // cierra el popper al hacer clic fuera del contenedor del usuario
    if (!open) { // evita listeners globales cuando el popper esta cerrado
      return; // sale del efecto si no hay panel abierto
    }

    const handleDocumentMouseDown = (event: MouseEvent) => { // define la logica para detectar clics externos
      const target = event.target as Node | null; // obtiene el nodo que origino el clic
      const anchorElement = anchorRef.current; // obtiene el contenedor que engloba avatar y popper
      const popperElement = popperContentRef.current; // obtiene el panel visual del popper renderizado por MUI
      const clickedInsideAnchor = !!(anchorElement && target && anchorElement.contains(target)); // verifica si el clic ocurrio dentro del avatar o su ancla
      const clickedInsidePopper = !!(popperElement && target && popperElement.contains(target)); // verifica si el clic ocurrio dentro del panel del popper
      if (!clickedInsideAnchor && !clickedInsidePopper) { // cierra solo cuando el clic ocurre fuera del avatar y del panel
        setOpen(false); // cierra el popper cuando el clic es externo
      }
    };

    document.addEventListener("mousedown", handleDocumentMouseDown); // registra el listener global mientras el popper esta abierto
    return () => { // limpia el listener al cerrar el popper o desmontar el componente
      document.removeEventListener("mousedown", handleDocumentMouseDown); // elimina el listener global previamente registrado
    };
  }, [open]); // reactiva el efecto cuando cambia el estado del popper

  useEffect(() => { // + abre el modal login cuando el usuario vuelve desde el enlace de verificacion de correo
    const emailVerified = searchParams.get("emailVerified"); // + lee la marca que indica que el usuario viene de verificar su correo
    const verifiedEmail = searchParams.get("email"); // + lee el correo que debe precargarse en el formulario login
    if (emailVerified === "1" && verifiedEmail && !user) { // + valida que la URL corresponda a un retorno valido de verificacion y que no haya sesion activa
      setEmail(verifiedEmail); // + precarga el correo verificado en el formulario login
      setPassword(""); // + deja vacia la contrasena para que el usuario solo deba escribirla
      setLoginError(""); // + limpia errores anteriores para mostrar el retorno de verificacion como un mensaje informativo
      setLoginInfo("Correo verificado. Ingresa tu contrasena para continuar."); // + muestra una guia clara al abrir el modal login
      setRegisterModalOpen(false); // + asegura que el modal de registro quede cerrado
      setLoginModalOpen(true); // + abre automaticamente el modal login al volver desde el correo
      router.replace(pathname); // + limpia los parametros temporales de la URL despues de procesarlos
    }
  }, [pathname, router, searchParams, user]); // + vuelve a evaluar solo si cambia la URL o el estado de sesion

  const handleToggle = () => { // alterna la visibilidad del popper del usuario autenticado
    setOpen((prev) => !prev); // invierte el estado actual del popper
  };

  const handleClose = () => { // cierra el popper del usuario autenticado
    setOpen(false); // oculta el popper del usuario
  };

  const handleLoginModalOpen = () => { // abre el modal del formulario de login
    setLoginError(""); // limpia cualquier error anterior antes de mostrar el modal
    setLoginInfo(""); // + limpia cualquier mensaje informativo previo al abrir login manualmente
    setRegisterModalOpen(false); // asegura que el modal de registro quede cerrado al abrir login
    setLoginModalOpen(true); // muestra el modal del login
  };

  const handleLoginModalClose = () => { // cierra el modal del formulario de login
    setLoginError(""); // limpia el mensaje de error al cerrar el modal
    setLoginInfo(""); // + limpia el mensaje informativo al cerrar el modal
    setPassword(""); // borra la contrasena por seguridad al cerrar el modal
    setLoginModalOpen(false); // oculta el modal de login
  };

  const handleRegisterModalOpen = () => { // abre el modal del formulario de registro
    setRegisterError(""); // limpia errores previos antes de mostrar el modal de registro
    setLoginModalOpen(false); // asegura que el modal de login quede cerrado al abrir registro
    setRegisterModalOpen(true); // muestra el modal de registro
  };

  const handleRegisterModalClose = () => { // cierra el modal del formulario de registro
    setRegisterError(""); // limpia el mensaje de error al cerrar el modal de registro
    setRegisterPassword(""); // borra la contrasena del registro por seguridad al cerrar el modal
    setRegisterModalOpen(false); // oculta el modal de registro
  };

  const handleGoogleLogin = async () => { // maneja el acceso con Google desde el modal
    setLoginError(""); // limpia errores previos antes del login con Google
    setLoginInfo(""); // + limpia mensajes informativos previos antes del login con Google
    setIsSubmitting(true); // bloquea las acciones mientras se procesa el login con Google
    try { // inicia el flujo controlado del login con Google
      await loginWithGoogle(); // ejecuta la autenticacion con Google desde el contexto
      handleLoginModalClose(); // cierra el modal si el acceso fue exitoso
      handleRegisterModalClose(); // cierra tambien el modal de registro si el acceso con Google comenzo desde ahi
    } catch (error) { // captura fallos del login con Google
      if (shouldLogAuthError(error)) { // + evita registrar en consola los errores esperados que ya se mostraran al usuario en el modal
        console.error("Error during Google sign-in from modal:", error); // + registra solo errores inesperados del login con Google para depuracion real
      }
      setLoginError(getFirebaseAuthMessage(error, "No se pudo iniciar sesion con Google.")); // + muestra un mensaje mas preciso usando el error completo devuelto por Firebase
    } finally { // ejecuta la limpieza final del intento de login con Google
      setIsSubmitting(false); // vuelve a habilitar los controles del modal
    }
  };

  const handleEmailLogin = async () => { // maneja el acceso con correo y contrasena desde el modal
    if (!email.trim() || !password) { // valida que el usuario haya completado ambos campos
      setLoginError("Ingresa tu correo y contrasena."); // muestra una validacion basica si faltan datos
      return; // corta la ejecucion cuando el formulario esta incompleto
    }

    setLoginError(""); // limpia errores previos antes del login con correo
    setLoginInfo(""); // + limpia mensajes informativos previos antes del login con correo
    setIsSubmitting(true); // bloquea el formulario mientras se verifica el acceso
    try { // inicia el flujo controlado del login con correo
      await loginWithEmail(email.trim(), password); // autentica al usuario con sus credenciales
      handleLoginModalClose(); // cierra el modal si el acceso fue exitoso
    } catch (error) { // captura fallos del login con correo
      if (shouldLogAuthError(error)) { // + evita registrar en consola los errores esperados que ya se mostraran al usuario en el modal
        console.error("Error during email sign-in from modal:", error); // + registra solo errores inesperados del login por correo para depuracion real
      }
      setLoginError(getFirebaseAuthMessage(error, "No se pudo iniciar sesion con las credenciales ingresadas.")); // + muestra el mensaje especifico que corresponda al error completo recibido desde Firebase
    } finally { // ejecuta la limpieza final del intento de login con correo
      setIsSubmitting(false); // vuelve a habilitar el formulario al terminar
    }
  };

  const handleForgotPassword = async () => { // + maneja el envio del correo para restablecer la contrasena desde el login
    if (!email.trim()) { // + valida que exista un correo escrito antes de solicitar la recuperacion
      setLoginInfo(""); // + limpia mensajes informativos previos cuando falta el dato minimo necesario
      setLoginError("Ingresa tu correo para restablecer la contrasena."); // + pide primero el correo para poder enviar el enlace de restablecimiento
      return; // + detiene el flujo hasta que el usuario complete su correo
    }

    setLoginError(""); // + limpia errores previos antes de intentar enviar el correo de recuperacion
    setLoginInfo(""); // + limpia mensajes informativos previos antes del nuevo intento
    setIsSubmitting(true); // + bloquea temporalmente el formulario mientras Firebase procesa el envio
    try { // + inicia el flujo controlado del restablecimiento de contrasena
      await resetPassword(email.trim()); // + solicita a Firebase enviar el correo de restablecimiento al email indicado
      setLoginInfo("Te enviamos un correo para restablecer tu contrasena."); // + confirma al usuario que el correo de recuperacion fue enviado
    } catch (error) { // + captura errores del flujo de restablecimiento para mostrarlos en el modal
      if (shouldLogAuthError(error)) { // + evita registrar en consola los errores esperados que ya se mostraran al usuario en el modal
        console.error("Error during password reset from modal:", error); // + registra solo errores inesperados del restablecimiento para depuracion real
      }
      setLoginError(getFirebaseAuthMessage(error, "No se pudo enviar el correo para restablecer la contrasena.")); // + muestra el mensaje especifico que corresponda al error completo recibido desde Firebase
    } finally { // + ejecuta la limpieza final del intento de recuperacion
      setIsSubmitting(false); // + vuelve a habilitar el formulario cuando termina el intento
    }
  };

  const handleRegister = async () => { // maneja el registro publico desde el modal register
    if (!registerUsername.trim() || !registerEmail.trim() || !registerPassword) { // valida que el usuario haya completado todos los campos del registro
      setRegisterError("Completa nombre de usuario, correo y contrasena."); // muestra una validacion basica si faltan datos del registro
      return; // corta la ejecucion cuando el formulario de registro esta incompleto
    }

    setRegisterError(""); // limpia errores previos antes del intento de registro
    setIsSubmitting(true); // bloquea el formulario mientras se procesa el registro
    try {
      await registerWithEmail(registerUsername.trim(), registerEmail.trim(), registerPassword); // registra el usuario nuevo y luego lo autentica automaticamente
      handleRegisterModalClose(); // cierra el modal si el registro fue exitoso
      setLoginError(""); // + limpia errores previos para mostrar la confirmacion del registro como un mensaje informativo
      setLoginInfo("Te enviamos un correo de verificacion. Verifica tu email antes de iniciar sesion."); // + informa en login que primero debe confirmar su correo
      setEmail(registerEmail.trim()); // deja precargado el correo registrado para facilitar el siguiente ingreso
      setPassword(""); // limpia la contrasena del login por seguridad despues del registro
      setLoginModalOpen(true); // abre el modal login para que el usuario vea el mensaje de verificacion
    } catch (error: any) {
      if (shouldLogAuthError(error)) { // + evita registrar en consola los errores esperados que ya se mostraran al usuario en el modal
        console.error("Error during register from modal:", error); // + registra solo errores inesperados del registro para depuracion real
      }
      setRegisterError(getFirebaseAuthMessage(error, "No se pudo completar el registro.")); // + muestra el mensaje especifico que corresponda al error completo recibido desde Firebase o Functions
    } finally {
      setIsSubmitting(false); // vuelve a habilitar los controles cuando termina el intento de registro
    }
  };

  if (!isMounted) return null; // evita renderizar antes de que exista el entorno cliente

  return ( // renderiza el menu del usuario autenticado o el boton para abrir el modal login
    <>
      {user ? ( // muestra el popper del usuario cuando existe una sesion activa
        <Box ref={anchorRef} sx={{ display: "inline-block" }}> {/* define el ancla visual del popper */} 
          <IconButton onClick={handleToggle} color="inherit"> {/* permite abrir y cerrar el popper del usuario */} 
            <Avatar alt={user.displayName || "Usuario"} src={user.photoURL || undefined} sx={{ width: 32, height: 32 }} imgProps={{ referrerPolicy: "no-referrer" }} /> {/* muestra el avatar del usuario autenticado */} 
          </IconButton>

          <Popper open={open} anchorEl={anchorRef.current} placement="bottom-end" modifiers={[{ name: "offset", options: { offset: [0, 8] } }]} sx={{ zIndex: 1300 }}> {/* posiciona el panel del usuario debajo del avatar */} 
            <Box ref={popperContentRef} sx={{ width: 320, borderRadius: 6, mt: -0.5, p: 2, bgcolor: "#fff", color: "rgba(0, 0, 0, 0.87)", position: "relative", boxShadow: 3 }}> {/* define la tarjeta visual del popper */} 
              <IconButton size="small" onClick={handleClose} sx={{ position: "absolute", top: 12, right: 12, color: "rgba(0, 0, 0, 0.87)", bgcolor: "rgba(255, 255, 255, 0.514)", "&:hover": { bgcolor: "rgba(228, 228, 228, 0.523)" } }}> {/* agrega el boton de cierre del popper */} 
                <CloseIcon fontSize="small" /> {/* muestra el icono de cierre */} 
              </IconButton>

              <Typography variant="body2" sx={{ color: "rgba(0, 0, 0, 0.87)", textAlign: "center", fontWeight: "bold" }}>{user.email}</Typography> {/* muestra el correo del usuario autenticado */} 
              <Typography variant="body2" sx={{ color: "rgba(0, 0, 0, 0.87)", mb: 3, textAlign: "center" }}>-</Typography> {/* muestra un separador visual debajo del correo */} 

              <Box display="flex" flexDirection="column" alignItems="center" mb={2}> {/* agrupa el avatar grande y el saludo del usuario */} 
                <Avatar src={user.photoURL || undefined} alt={user.displayName || "Usuario"} sx={{ width: 64, height: 64, mb: 1 }} imgProps={{ referrerPolicy: "no-referrer" }} /> {/* muestra el avatar grande dentro del popper */} 
                <Typography variant="h6" fontWeight="bold">Hola, {user.displayName}</Typography> {/* saluda al usuario autenticado */} 
              </Box>

              <Box display="flex" justifyContent="center"> {/* centra el boton para administrar la cuenta de Google */} 
                <Button variant="outlined" href="https://accounts.google.com/AccountChooser?continue=https://myaccount.google.com" target="_blank" sx={{ borderRadius: 999, textTransform: "none", borderColor: "rgba(0, 0, 0, 0.87)", color: "rgba(0, 0, 0, 0.87)", "&:hover": { bgcolor: "rgba(176, 176, 176, 0.208)", borderColor: "#6a6a6a87" } }}>Administrar tu Cuenta de Google</Button> {/* abre la gestion de la cuenta Google en otra pestana */} 
              </Box>

              <Box mt={2} display="flex" justifyContent="center" flexWrap="wrap"> {/* agrupa el cierre de sesion y los enlaces informativos */} 
                <Button onClick={() => { void logout(); handleClose(); }} variant="text" startIcon={<LogoutIcon />} sx={{ fontWeight: "bold", textTransform: "none", opacity: 0.8, mb: 2, borderRadius: 999, bgcolor: "#1076dc", color: "white", px: "16px", "&:hover": { bgcolor: "#0051a1", borderColor: "#fff" } }}>Cerrar sesion</Button> {/* permite cerrar la sesion actual y cerrar el popper */} 

                <Divider sx={{ borderColor: "rgba(255,255,255,0.2)", my: 1 }} /> {/* separa visualmente el boton de salida y los textos legales */} 

                <Box sx={{ display: "flex", justifyContent: "space-around", width: "100%", "& .miTexto": { fontSize: 12, color: "rgb(0, 0, 0)", opacity: 0.8 } }}> {/* distribuye los textos legales en la parte inferior */} 
                  <Typography className="miTexto">Politica de Privacidad</Typography> {/* muestra el texto de privacidad */} 
                  <Typography className="miTexto">Condiciones del Servicio</Typography> {/* muestra el texto de condiciones */} 
                </Box>
              </Box>
            </Box>
          </Popper>
        </Box>
      ) : ( // muestra el acceso al modal login cuando no hay un usuario autenticado
        <>
          <Button onClick={handleLoginModalOpen} sx={{ backgroundColor: "#cceeff", color: "black", textTransform: "none", fontWeight: "bold", borderRadius: "999px", px: 1.2, py: 0.5, ml: "8px", whiteSpace: "nowrap", minWidth: "auto", letterSpacing: "0", boxShadow: "none", "&:hover": { backgroundColor: "#b3e6ff", boxShadow: "none" } }}>Iniciar sesion</Button> {/* abre el modal login desde el header */} 
          <Login open={loginModalOpen} email={email} password={password} error={loginError} info={loginInfo} isSubmitting={isSubmitting} onClose={handleLoginModalClose} onEmailChange={setEmail} onPasswordChange={setPassword} onGoogleLogin={handleGoogleLogin} onEmailLogin={handleEmailLogin} onForgotPassword={handleForgotPassword} onOpenRegister={handleRegisterModalOpen} /> {/* + delega tambien el restablecimiento de contrasena y los mensajes informativos al componente login */} 
          <Register open={registerModalOpen} username={registerUsername} email={registerEmail} password={registerPassword} error={registerError} isSubmitting={isSubmitting} onClose={handleRegisterModalClose} onUsernameChange={setRegisterUsername} onEmailChange={setRegisterEmail} onPasswordChange={setRegisterPassword} onRegister={handleRegister} onOpenLogin={handleLoginModalOpen} onGoogleLogin={handleGoogleLogin} /> {/* delega el formulario register al nuevo componente separado */} 
        </>
      )}
    </>
  );
}

/**
 * Utilidades de validación puras.
 * Estas funciones son independientes de React Native,
 * lo que las hace fácil de probar con Jest.
 */

/**
 * Verifica si un correo electrónico tiene formato válido.
 */
export function esEmailValido(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Verifica si una contraseña cumple la política de seguridad:
 * - Mínimo 8 caracteres
 * - Al menos una letra mayúscula
 * - Al menos un número
 */
export function esPasswordSegura(password: string): boolean {
  const passRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passRegex.test(password);
}

/**
 * Verifica si dos contraseñas coinciden.
 */
export function passwordsCoinciden(pass1: string, pass2: string): boolean {
  return pass1 === pass2;
}

/**
 * Valida los campos obligatorios de un usuario.
 * Devuelve null si todo está bien, o un mensaje de error.
 */
export function validarCamposUsuario(campos: {
  nombre: string;
  apellido_paterno: string;
  cargo: string;
  area: string;
}): string | null {
  if (!campos.nombre.trim()) return 'El nombre es obligatorio.';
  if (!campos.apellido_paterno.trim()) return 'El apellido paterno es obligatorio.';
  if (!campos.cargo.trim()) return 'El cargo es obligatorio.';
  if (!campos.area.trim()) return 'El área es obligatoria.';
  return null;
}

/**
 * Calcula los kilómetros recorridos en un viaje.
 * Devuelve null si los datos no son válidos.
 */
export function calcularKmRecorridos(
  kmInicial: number,
  kmFinal: number
): number | null {
  if (kmFinal < kmInicial) return null;
  return kmFinal - kmInicial;
}

/**
 * Formatea una fecha ISO a formato legible en español (DD/MM/YYYY).
 */
export function formatearFecha(isoDate: string): string {
  const fecha = new Date(isoDate + 'T00:00:00'); // Evita desfase de UTC
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const anio = fecha.getFullYear();
  return `${dia}/${mes}/${anio}`;
}

/**
 * Genera las iniciales de un usuario a partir de nombre y apellido.
 */
export function obtenerIniciales(nombre: string, apellido: string): string {
  const n = nombre.trim().charAt(0).toUpperCase();
  const a = apellido.trim().charAt(0).toUpperCase();
  return `${n}${a}`;
}

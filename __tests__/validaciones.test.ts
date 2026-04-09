import {
  esEmailValido,
  esPasswordSegura,
  passwordsCoinciden,
  validarCamposUsuario,
  calcularKmRecorridos,
  formatearFecha,
  obtenerIniciales,
} from '../src/utils/validaciones';

// ─────────────────────────────────────────────
// BLOQUE 1: Validación de correo electrónico
// ─────────────────────────────────────────────
describe('esEmailValido', () => {
  test('acepta un correo con formato correcto', () => {
    expect(esEmailValido('usuario@empresa.com')).toBe(true);
  });

  test('acepta correo con subdominio', () => {
    expect(esEmailValido('admin@mail.dominio.mx')).toBe(true);
  });

  test('rechaza correo sin @', () => {
    expect(esEmailValido('usuarioempresa.com')).toBe(false);
  });

  test('rechaza correo sin dominio', () => {
    expect(esEmailValido('usuario@')).toBe(false);
  });

  test('rechaza cadena vacía', () => {
    expect(esEmailValido('')).toBe(false);
  });

  test('rechaza correo con espacios', () => {
    expect(esEmailValido('usuario @empresa.com')).toBe(false);
  });
});

// ─────────────────────────────────────────────
// BLOQUE 2: Fortaleza de contraseña
// ─────────────────────────────────────────────
describe('esPasswordSegura', () => {
  test('acepta contraseña válida (mayúscula + número + 8 chars)', () => {
    expect(esPasswordSegura('Segura12')).toBe(true);
  });

  test('acepta contraseña más larga válida', () => {
    expect(esPasswordSegura('MiPassword99!')).toBe(true);
  });

  test('rechaza contraseña sin mayúscula', () => {
    expect(esPasswordSegura('segura12')).toBe(false);
  });

  test('rechaza contraseña sin número', () => {
    expect(esPasswordSegura('Seguridad')).toBe(false);
  });

  test('rechaza contraseña de menos de 8 caracteres', () => {
    expect(esPasswordSegura('Seg1')).toBe(false);
  });

  test('rechaza cadena vacía', () => {
    expect(esPasswordSegura('')).toBe(false);
  });
});

// ─────────────────────────────────────────────
// BLOQUE 3: Coincidencia de contraseñas
// ─────────────────────────────────────────────
describe('passwordsCoinciden', () => {
  test('retorna true si son iguales', () => {
    expect(passwordsCoinciden('Segura12', 'Segura12')).toBe(true);
  });

  test('retorna false si son diferentes', () => {
    expect(passwordsCoinciden('Segura12', 'Segura23')).toBe(false);
  });

  test('es sensible a mayúsculas/minúsculas', () => {
    expect(passwordsCoinciden('Segura12', 'segura12')).toBe(false);
  });
});

// ─────────────────────────────────────────────
// BLOQUE 4: Validación de campos de usuario
// ─────────────────────────────────────────────
describe('validarCamposUsuario', () => {
  const camposCompletos = {
    nombre: 'Luis',
    apellido_paterno: 'García',
    cargo: 'Supervisor',
    area: 'Almacén',
  };

  test('retorna null cuando todos los campos están completos', () => {
    expect(validarCamposUsuario(camposCompletos)).toBeNull();
  });

  test('error cuando falta el nombre', () => {
    expect(validarCamposUsuario({ ...camposCompletos, nombre: '' }))
      .toBe('El nombre es obligatorio.');
  });

  test('error cuando falta el apellido paterno', () => {
    expect(validarCamposUsuario({ ...camposCompletos, apellido_paterno: '' }))
      .toBe('El apellido paterno es obligatorio.');
  });

  test('error cuando falta el cargo', () => {
    expect(validarCamposUsuario({ ...camposCompletos, cargo: '' }))
      .toBe('El cargo es obligatorio.');
  });

  test('error cuando falta el área', () => {
    expect(validarCamposUsuario({ ...camposCompletos, area: '' }))
      .toBe('El área es obligatoria.');
  });

  test('rechaza campo con solo espacios en blanco', () => {
    expect(validarCamposUsuario({ ...camposCompletos, nombre: '   ' }))
      .toBe('El nombre es obligatorio.');
  });
});

// ─────────────────────────────────────────────
// BLOQUE 5: Cálculo de kilómetros recorridos
// ─────────────────────────────────────────────
describe('calcularKmRecorridos', () => {
  test('calcula correctamente la diferencia de km', () => {
    expect(calcularKmRecorridos(100, 150)).toBe(50);
  });

  test('retorna 0 si km inicial y final son iguales', () => {
    expect(calcularKmRecorridos(200, 200)).toBe(0);
  });

  test('retorna null si km final es menor al inicial', () => {
    expect(calcularKmRecorridos(300, 250)).toBeNull();
  });
});

// ─────────────────────────────────────────────
// BLOQUE 6: Formateo de fechas
// ─────────────────────────────────────────────
describe('formatearFecha', () => {
  test('formatea correctamente una fecha ISO', () => {
    expect(formatearFecha('2025-03-15')).toBe('15/03/2025');
  });

  test('formatea con día y mes de un solo dígito con cero inicial', () => {
    expect(formatearFecha('2025-01-05')).toBe('05/01/2025');
  });
});

// ─────────────────────────────────────────────
// BLOQUE 7: Iniciales de usuario
// ─────────────────────────────────────────────
describe('obtenerIniciales', () => {
  test('devuelve iniciales en mayúscula', () => {
    expect(obtenerIniciales('luis', 'garcía')).toBe('LG');
  });

  test('funciona con nombres que ya tienen mayúscula', () => {
    expect(obtenerIniciales('Ana', 'Pérez')).toBe('AP');
  });

  test('maneja espacios al inicio del nombre', () => {
    expect(obtenerIniciales('  Carlos', '  Ruiz')).toBe('CR');
  });
});

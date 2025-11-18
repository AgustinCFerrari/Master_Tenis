// test/login.test.js
import { jest } from '@jest/globals';

// 1) Definimos los mocks ESM ANTES de importar el controlador
jest.unstable_mockModule('../models/Usuario.js', () => ({
  default: {
    findOne: jest.fn(),
  },
}));

jest.unstable_mockModule('bcrypt', () => ({
  default: {
    compare: jest.fn(),
  },
}));

// 2) Ahora sí, importamos controlador y módulos ya mockeados
const { login } = await import('../controllers/usuarioController.js');
const UsuarioMock = (await import('../models/Usuario.js')).default;
const bcryptMock = (await import('bcrypt')).default;

describe('Pruebas de login', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      session: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      render: jest.fn(),
      redirect: jest.fn(),
    };

    jest.clearAllMocks();
  });

  test('Caso 1: Debe rechazar cuando faltan campos', async () => {
    req.body = { username: '', password: '' };

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith('login', {
      mensaje: 'Completá usuario y contraseña.',
    });
  });

  test('Caso 2: Usuario no existe', async () => {
    req.body = { username: 'user', password: '123' };

    // Simulamos que no encuentra usuario en BD
    UsuarioMock.findOne.mockResolvedValue(null);

    await login(req, res);

    expect(UsuarioMock.findOne).toHaveBeenCalledWith({ username: 'user' });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.render).toHaveBeenCalledWith('login', {
      mensaje: 'Usuario y/o contraseña inválidos.',
    });
  });

  test('Caso 3: Contraseña incorrecta', async () => {
    req.body = { username: 'test', password: '123' };

    // Usuario encontrado
    UsuarioMock.findOne.mockResolvedValue({
      username: 'test',
      password: 'hashedpass',
    });

    // Pero la contraseña NO coincide
    bcryptMock.compare.mockResolvedValue(false);

    await login(req, res);

    expect(UsuarioMock.findOne).toHaveBeenCalledWith({ username: 'test' });
    expect(bcryptMock.compare).toHaveBeenCalledWith('123', 'hashedpass');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.render).toHaveBeenCalledWith('login', {
      mensaje: 'Usuario y/o contraseña inválidos.',
    });
  });

  test('Caso 4: Login correcto', async () => {
    req.body = { username: 'test', password: '123' };

    const user = {
      _id: '1',
      username: 'test',
      password: 'hashedpass',
      rol: 'cliente',
      nombre: 'Agus',
      apellido: 'Ferrari',
    };

    UsuarioMock.findOne.mockResolvedValue(user);
    bcryptMock.compare.mockResolvedValue(true);

    await login(req, res);

    // Verificamos que se guardó bien en la sesión
    expect(req.session.usuario).toEqual({
      id: '1',
      username: 'test',
      rol: 'cliente',
      nombre: 'Agus',
      apellido: 'Ferrari',
    });

    expect(res.redirect).toHaveBeenCalledWith('/panel');
  });
});

import { jest } from '@jest/globals';
import { autorizar } from '../middlewares/autorizar.js'; // ajustá la ruta si hace falta

// Helpers para crear req, res, next "fake"
const crearReq = (rol) => ({
  session: rol
    ? { usuario: { rol } }
    : { usuario: {} }, // sin rol
});

const crearRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.render = jest.fn().mockReturnValue(res);
  return res;
};

const crearNext = () => jest.fn();

describe("Middleware 'autorizar'", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Prueba 1: Debe rechazar cuando no hay rol', () => {
    // rolesPermitidos puede ser cualquier cosa, el problema acá es que NO hay rol
    const middleware = autorizar(['admin', 'empleado']);

    const req = crearReq(null); // sin rol
    const res = crearRes();
    const next = crearNext();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.render).toHaveBeenCalledWith('error-autorizacion', {
      mensaje: 'No tenés permisos.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('Prueba 2: Debe rechazar cuando el rol no está permitido', () => {
    const middleware = autorizar(['admin', 'empleado']);

    const req = crearReq('cliente'); // rol no permitido
    const res = crearRes();
    const next = crearNext();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.render).toHaveBeenCalledWith('error-autorizacion', {
      mensaje: 'No tenés permisos.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('Prueba 3: Debe permitir cuando el rol está permitido', () => {
    const middleware = autorizar(['admin', 'empleado']);

    const req = crearReq('admin'); // rol permitido
    const res = crearRes();
    const next = crearNext();

    middleware(req, res, next);

    // No debería setear 403 ni renderizar error
    expect(res.status).not.toHaveBeenCalled();
    expect(res.render).not.toHaveBeenCalled();
    // Debe continuar la cadena de middlewares
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('Prueba 4: Debe permitir cuando no se especifican roles permitidos', () => {
    // Sin parámetros → rolesPermitidos = []
    const middleware = autorizar(); // o autorizar([])

    const req = crearReq('cliente'); // cualquier rol
    const res = crearRes();
    const next = crearNext();

    middleware(req, res, next);

    // Al no haber rolesPermitidos, no debería bloquear
    expect(res.status).not.toHaveBeenCalled();
    expect(res.render).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});

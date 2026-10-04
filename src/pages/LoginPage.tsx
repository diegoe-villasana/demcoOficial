import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Credenciales hardcodeadas solo para mock/demo en el front.
// Reemplazar por autenticación real contra tu backend antes de producción.
const MOCK_EMAIL = 'admin@demco.com';
const MOCK_PASSWORD = 'demco123';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (email === MOCK_EMAIL && password === MOCK_PASSWORD) {
      setError('');
      navigate('/home');
    } else {
      setError('Correo o contraseña incorrectos.');
    }
  };

  const handleGoToRegister = () => {
    navigate('/register'); // Ajusta esta ruta a la vista real de registro
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-md p-8 shadow-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-full bg-[#008751] mb-3" />
          <h1 className="text-2xl font-semibold text-[#1f2421]">Iniciar Sesión</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-[#1f2421] mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#008751]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1f2421] mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#008751]"
              required
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm -mt-1">{error}</p>
          )}

          <button
            type="submit"
            className="bg-[#008751] hover:bg-green-700 text-white rounded py-2 font-medium mt-2"
          >
            Entrar
          </button>
        </form>

        <p className="text-xs text-slate-400 mt-4 text-center">
          Demo: {MOCK_EMAIL} / {MOCK_PASSWORD}
        </p>

        <div className="flex justify-between items-center mt-6 text-sm">
          <button
            onClick={handleGoToRegister}
            className="text-[#008751] font-medium hover:underline"
          >
            Registrarse
          </button>
          <button
            onClick={() => navigate('/')}
            className="text-slate-500 hover:underline"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
};

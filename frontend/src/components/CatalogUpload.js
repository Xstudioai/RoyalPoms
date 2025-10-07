import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { ArrowLeftIcon, ArrowUpTrayIcon, TrashIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CatalogUpload = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [uploadMode, setUploadMode] = useState('pdf'); // 'pdf' or 'image'
  const [imageName, setImageName] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      const response = await axios.post(`${API}/admin-login`, loginForm);
      if (response.data.authenticated) {
        setIsAuthenticated(true);
      }
    } catch (error) {
      setLoginError('Usuario o contraseña incorrectos');
    }
  };

  const handleClearCatalog = async () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar todos los outfits del catálogo?')) {
      try {
        await axios.delete(`${API}/outfits`);
        setUploadResult({
          success: true,
          message: 'Catálogo limpiado exitosamente'
        });
      } catch (error) {
        setUploadResult({
          success: false,
          message: 'Error limpiando el catálogo'
        });
      }
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    setLoading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      let response;
      if (uploadMode === 'pdf' && file.type === 'application/pdf') {
        response = await axios.post(`${API}/upload-catalog`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        setUploadResult({
          success: true,
          message: response.data.message,
          outfits: response.data.outfits
        });
      } else if (uploadMode === 'image' && file.type.startsWith('image/')) {
        if (!imageName.trim()) {
          alert('Por favor ingresa un nombre para el outfit');
          setLoading(false);
          return;
        }
        formData.append('name', imageName.trim());
        
        response = await axios.post(`${API}/upload-outfit-image`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        setUploadResult({
          success: true,
          message: response.data.message,
          outfits: 1
        });
        setImageName('');
      } else {
        const expectedType = uploadMode === 'pdf' ? 'PDF' : 'imagen';
        alert(`Por favor selecciona un archivo ${expectedType}`);
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error('Error uploading:', error);
      setUploadResult({
        success: false,
        message: error.response?.data?.detail || 'Error subiendo el archivo'
      });
    } finally {
      setLoading(false);
    }
  }, [uploadMode, imageName]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: uploadMode === 'pdf' ? {
      'application/pdf': ['.pdf']
    } : {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    multiple: false
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Navigation */}
      <nav className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center space-x-3 text-white hover:text-yellow-400 transition-colors"
            >
              <ArrowLeftIcon className="w-6 h-6" />
              <img 
                src="https://customer-assets.emergentagent.com/job_pupfashionapp/artifacts/fmfy7m8b_1000295919-removebg-preview.png" 
                alt="Gummy Pet Spa" 
                className="w-10 h-10"
              />
              <span className="text-xl font-bold">Gummy Pet Spa</span>
            </button>
            <div className="flex items-center space-x-4">
              <span className="text-white/70">Panel de Administración</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {!isAuthenticated ? (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-4">
                Acceso Administrativo
              </h1>
              <p className="text-white/70">
                Ingresa tus credenciales para acceder al panel de administración
              </p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-white font-semibold mb-2">Usuario</label>
                <input
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                  className="w-full bg-white/10 border border-white/30 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-yellow-400"
                  placeholder="admin"
                  required
                />
              </div>
              
              <div>
                <label className="block text-white font-semibold mb-2">Contraseña</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  className="w-full bg-white/10 border border-white/30 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-yellow-400"
                  placeholder="••••••••"
                  required
                />
              </div>
              
              {loginError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-center">
                  {loginError}
                </div>
              )}
              
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 text-black font-bold py-3 px-6 rounded-lg hover:from-yellow-400 hover:to-orange-500 transition-all duration-300"
              >
                Iniciar Sesión
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-white mb-4">
                Panel de Administración
              </h1>
              <p className="text-xl text-white/70">
                Gestiona el catálogo de outfits de Gummy Pet Spa
              </p>
            </div>

            {/* Mode Selection */}
            <div className="mb-8 flex justify-center">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-2 border border-white/20">
                <button
                  onClick={() => setUploadMode('pdf')}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                    uploadMode === 'pdf'
                      ? 'bg-yellow-500 text-black'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  Subir PDF (Múltiples)
                </button>
                <button
                  onClick={() => setUploadMode('image')}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                    uploadMode === 'image'
                      ? 'bg-yellow-500 text-black'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  Subir Imagen Individual
                </button>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
          {!loading && !uploadResult && (
            <div>
              {uploadMode === 'image' && (
                <div className="mb-6">
                  <label className="block text-white font-semibold mb-2">Nombre del Outfit</label>
                  <input
                    type="text"
                    value={imageName}
                    onChange={(e) => setImageName(e.target.value)}
                    className="w-full bg-white/10 border border-white/30 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-yellow-400"
                    placeholder="Ej: Abrigo de Invierno Elegante"
                    maxLength={50}
                  />
                </div>
              )}
              
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
                  isDragActive
                    ? 'border-yellow-400 bg-yellow-400/10'
                    : 'border-white/30 bg-white/5 hover:border-yellow-400/70 hover:bg-white/10'
                }`}
              >
                <input {...getInputProps()} />
                <ArrowUpTrayIcon className="w-16 h-16 text-white/70 mx-auto mb-6" />
                {isDragActive ? (
                  <p className="text-xl text-yellow-400">
                    ¡Suelta el archivo {uploadMode === 'pdf' ? 'PDF' : 'de imagen'} aquí!
                  </p>
                ) : (
                  <div>
                    <p className="text-xl text-white mb-4">
                      Arrastra un archivo {uploadMode === 'pdf' ? 'PDF' : 'de imagen'} aquí o{' '}
                      <span className="text-yellow-400 underline">haz clic para seleccionar</span>
                    </p>
                    <p className="text-white/60">
                      {uploadMode === 'pdf' 
                        ? 'El sistema extraerá automáticamente las imágenes de cada página'
                        : 'Formatos: PNG, JPG, JPEG, WEBP'
                      }
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-8 bg-blue-400/10 rounded-xl p-6 border border-blue-400/30">
                <h3 className="text-blue-400 font-semibold mb-2">
                  {uploadMode === 'pdf' ? 'Instrucciones PDF:' : 'Instrucciones Imagen:'}
                </h3>
                <ul className="text-white/70 space-y-2">
                  {uploadMode === 'pdf' ? (
                    <>
                      <li>• Cada página del PDF debe contener una imagen de outfit</li>
                      <li>• Las imágenes deben ser claras y de buena calidad</li>
                      <li>• Se recomienda usar fondos blancos o transparentes</li>
                      <li>• El sistema procesará automáticamente cada página como un outfit separado</li>
                    </>
                  ) : (
                    <>
                      <li>• Usa imágenes de alta calidad (PNG recomendado)</li>
                      <li>• Fondo transparente o blanco para mejores resultados</li>
                      <li>• Tamaño recomendado: 1024x1024 píxeles</li>
                      <li>• Nombra cada outfit de forma descriptiva</li>
                    </>
                  )}
                </ul>
              </div>
              
              {/* Clear Catalog Button */}
              <div className="mt-8 pt-6 border-t border-white/20">
                <button
                  onClick={handleClearCatalog}
                  className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 font-semibold py-3 px-6 rounded-lg transition-all duration-300 flex items-center space-x-2"
                >
                  <TrashIcon className="w-5 h-5" />
                  <span>Limpiar Todo el Catálogo</span>
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="text-6xl mb-6 animate-pulse">📁</div>
              <h2 className="text-2xl font-bold text-white mb-4">
                Procesando catálogo...
              </h2>
              <p className="text-white/70 mb-6">
                Extrayendo y procesando las imágenes del PDF
              </p>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
              </div>
            </div>
          )}

          {uploadResult && (
            <div className="text-center py-12">
              {uploadResult.success ? (
                <div>
                  <div className="text-6xl mb-6">✅</div>
                  <h2 className="text-2xl font-bold text-green-400 mb-4">
                    ¡Catálogo subido exitosamente!
                  </h2>
                  <p className="text-white/70 mb-6">
                    {uploadResult.message}
                  </p>
                  <div className="bg-green-400/10 rounded-xl p-4 border border-green-400/30 mb-6">
                    <p className="text-green-400">
                      Se procesaron <strong>{uploadResult.outfits}</strong> outfits del catálogo
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-6xl mb-6">❌</div>
                  <h2 className="text-2xl font-bold text-red-400 mb-4">
                    Error al subir catálogo
                  </h2>
                  <p className="text-white/70 mb-6">
                    {uploadResult.message}
                  </p>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => {
                    setUploadResult(null);
                    setLoading(false);
                  }}
                  className="bg-gradient-to-r from-yellow-500 to-orange-600 text-black font-bold py-3 px-6 rounded-full hover:from-yellow-400 hover:to-orange-500 transition-all duration-300"
                >
                  Subir otro catálogo
                </button>
                
                <button
                  onClick={() => navigate('/tryon')}
                  className="bg-white/10 text-white font-semibold py-3 px-6 rounded-full hover:bg-white/20 transition-all duration-300"
                >
                  Probar la aplicación
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 text-center">
          <h3 className="text-xl font-bold text-white mb-4">Acciones Rápidas</h3>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => navigate('/tryon')}
              className="bg-white/10 text-white font-semibold py-2 px-4 rounded-lg hover:bg-white/20 transition-colors"
            >
              Ver Aplicación
            </button>
            <button
              onClick={() => navigate('/')}
              className="bg-white/10 text-white font-semibold py-2 px-4 rounded-lg hover:bg-white/20 transition-colors"
            >
              Página Principal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CatalogUpload;
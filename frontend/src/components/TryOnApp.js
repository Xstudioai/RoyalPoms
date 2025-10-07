import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { ArrowLeftIcon, ArrowDownTrayIcon, ShareIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TryOnApp = () => {
  const navigate = useNavigate();
  const [outfits, setOutfits] = useState([]);
  const [selectedOutfit, setSelectedOutfit] = useState(null);
  const [dogImage, setDogImage] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState(null);
  const [currentTryonId, setCurrentTryonId] = useState(null);
  const [step, setStep] = useState(1); // 1: upload, 2: select, 3: generate, 4: result
  const [loadingMessage, setLoadingMessage] = useState('');

  useEffect(() => {
    loadOutfits();
  }, []);

  const loadOutfits = async () => {
    try {
      const response = await axios.get(`${API}/outfits`);
      setOutfits(response.data);
    } catch (error) {
      console.error('Error loading outfits:', error);
      alert('Error cargando el catálogo de outfits');
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    console.log('Files dropped:', acceptedFiles);
    const file = acceptedFiles[0];
    if (file && file.type.startsWith('image/')) {
      console.log('Valid image file selected:', file.name, file.type);
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        console.log('Image loaded, setting state and moving to step 2');
        setDogImage({
          file,
          preview: reader.result,
          base64
        });
        setStep(2);
      };
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        alert('Error al leer el archivo. Por favor intenta de nuevo.');
      };
      reader.readAsDataURL(file);
    } else {
      console.log('Invalid file type or no file selected');
      alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, WEBP)');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    multiple: false
  });

  const handleTryOn = async () => {
    if (!dogImage || !selectedOutfit) {
      alert('Por favor selecciona una foto de tu perro y un outfit');
      return;
    }

    setLoading(true);
    setStep(3);
    setLoadingMessage('Preparando la magia...');

    try {
      // Simulate different loading stages
      setTimeout(() => setLoadingMessage('Analizando la foto de tu perro...'), 1000);
      setTimeout(() => setLoadingMessage('Ajustando el outfit perfectamente...'), 3000);
      setTimeout(() => setLoadingMessage('Creando la imagen final...'), 5000);

      const response = await axios.post(`${API}/tryon`, {
        dog_image_base64: dogImage.base64,
        outfit_id: selectedOutfit.id,
        customer_name: customerName || null
      });

      setResultImage(`data:image/png;base64,${response.data.result_image_base64}`);
      setCurrentTryonId(response.data.id);
      setStep(4);
    } catch (error) {
      console.error('Error in try-on:', error);
      alert('Error generando la imagen. Por favor intenta de nuevo.');
      setStep(2);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleDownload = () => {
    if (resultImage) {
      const link = document.createElement('a');
      link.href = resultImage;
      link.download = `gummy-pet-spa-tryon-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleWhatsAppShare = async () => {
    if (!currentTryonId) return;

    try {
      const response = await axios.post(`${API}/tryon/${currentTryonId}/whatsapp`);
      window.open(response.data.whatsapp_url, '_blank');
    } catch (error) {
      console.error('Error generating WhatsApp link:', error);
      alert('Error generando el enlace de WhatsApp');
    }
  };

  const resetApp = () => {
    setDogImage(null);
    setSelectedOutfit(null);
    setCustomerName('');
    setResultImage(null);
    setCurrentTryonId(null);
    setStep(1);
  };

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
              <span className="text-white/70">Paso {step} de 4</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step 1: Upload Dog Image */}
        {step === 1 && (
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-8">
              Sube una foto de tu perro
            </h1>
            <p className="text-xl text-white/70 mb-12">
              Asegúrate de que se vea el cuerpo completo para mejores resultados
            </p>
            
            <div className="max-w-2xl mx-auto">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
                  isDragActive
                    ? 'border-yellow-400 bg-yellow-400/10'
                    : 'border-white/30 bg-white/5 hover:border-yellow-400/70 hover:bg-white/10'
                }`}
              >
                <input {...getInputProps()} />
                <div className="text-6xl mb-6">📸</div>
                {isDragActive ? (
                  <p className="text-xl text-yellow-400">¡Suelta la imagen aquí!</p>
                ) : (
                  <div>
                    <p className="text-xl text-white mb-4">
                      Arrastra una foto aquí o <span className="text-yellow-400 underline">haz clic para seleccionar</span>
                    </p>
                    <p className="text-white/60">
                      Formatos: JPG, PNG, WEBP
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Select Outfit */}
        {step === 2 && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-4">
                Elige el outfit perfecto
              </h1>
              <p className="text-xl text-white/70">
                Selecciona de nuestro catálogo el que más te guste
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Dog Image Preview */}
              <div className="lg:col-span-1">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 sticky top-8">
                  <h3 className="text-xl font-bold text-white mb-4">Tu perro</h3>
                  {dogImage && (
                    <img 
                      src={dogImage.preview} 
                      alt="Tu perro" 
                      className="w-full rounded-xl mb-4"
                    />
                  )}
                  <input
                    type="text"
                    placeholder="Nombre (opcional)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-white/10 border border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-yellow-400"
                  />
                  <button
                    onClick={() => setStep(1)}
                    className="w-full mt-4 bg-white/10 text-white font-semibold py-2 px-4 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    Cambiar foto
                  </button>
                </div>
              </div>

              {/* Outfit Selection */}
              <div className="lg:col-span-2">
                {outfits.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-white/70 text-xl">
                      No hay outfits disponibles. El administrador debe subir el catálogo.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {outfits.map((outfit) => (
                      <div
                        key={outfit.id}
                        onClick={() => setSelectedOutfit(outfit)}
                        className={`bg-white/10 backdrop-blur-md rounded-xl p-4 border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${
                          selectedOutfit?.id === outfit.id
                            ? 'border-yellow-400 bg-yellow-400/10'
                            : 'border-white/20 hover:border-yellow-400/50'
                        }`}
                      >
                        <img 
                          src={`data:image/png;base64,${outfit.image_base64}`}
                          alt={outfit.name}
                          className="w-full h-48 object-cover rounded-lg mb-3"
                        />
                        <p className="text-white text-center font-semibold">
                          {outfit.name}
                        </p>
                        {selectedOutfit?.id === outfit.id && (
                          <div className="mt-2 text-center">
                            <span className="bg-yellow-400 text-black text-sm font-bold py-1 px-3 rounded-full">
                              ✓ Seleccionado
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                {selectedOutfit && (
                  <div className="text-center mt-8">
                    <button
                      onClick={handleTryOn}
                      disabled={loading}
                      className="bg-gradient-to-r from-yellow-500 to-orange-600 text-black font-bold py-4 px-8 rounded-full text-lg hover:from-yellow-400 hover:to-orange-500 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ¡Generar Imagen!
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Generating */}
        {step === 3 && (
          <div className="text-center py-20">
            <div className="max-w-2xl mx-auto">
              <div className="text-6xl mb-8 animate-bounce">✨</div>
              <h1 className="text-4xl font-bold text-white mb-6">
                Creando tu imagen perfecta...
              </h1>
              <p className="text-xl text-white/70 mb-8">
                {loadingMessage || 'Preparando la magia...'}
              </p>
              
              {/* Loading Animation */}
              <div className="flex justify-center mb-8">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400"></div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <p className="text-white/60 text-sm">
                  Este proceso puede tomar hasta 1 minuto. ¡La espera vale la pena! 🐕
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Result */}
        {step === 4 && resultImage && (
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-8">
              ¡Increíble resultado! 🎉
            </h1>
            
            <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Original */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4">Antes</h3>
                <img 
                  src={dogImage.preview} 
                  alt="Original" 
                  className="w-full rounded-xl"
                />
              </div>
              
              {/* Result */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4">¡Después!</h3>
                <img 
                  src={resultImage} 
                  alt="Resultado" 
                  className="w-full rounded-xl"
                />
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <button
                onClick={handleDownload}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 px-6 rounded-full flex items-center justify-center space-x-2 hover:from-green-400 hover:to-green-500 transition-all duration-300"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                <span>Descargar Imagen</span>
              </button>
              
              <button
                onClick={handleWhatsAppShare}
                className="bg-gradient-to-r from-green-600 to-green-700 text-white font-bold py-3 px-6 rounded-full flex items-center justify-center space-x-2 hover:from-green-500 hover:to-green-600 transition-all duration-300"
              >
                <ShareIcon className="w-5 h-5" />
                <span>Compartir por WhatsApp</span>
              </button>
              
              <button
                onClick={resetApp}
                className="bg-white/10 text-white font-semibold py-3 px-6 rounded-full hover:bg-white/20 transition-all duration-300"
              >
                Probar otro outfit
              </button>
            </div>
            
            <div className="mt-8 bg-yellow-400/10 backdrop-blur-md rounded-xl p-6 border border-yellow-400/30">
              <p className="text-yellow-400 font-semibold mb-2">¡Gracias por usar Gummy Pet Spa!</p>
              <p className="text-white/70">
                ¿Te gustó el resultado? ¡Visítanos para conseguir este hermoso outfit para tu mascota!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TryOnApp;
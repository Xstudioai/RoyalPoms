import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { ArrowLeftIcon, ArrowDownTrayIcon, ShareIcon, PhotoIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://doggie-outfitter.preview.emergentagent.com';
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
  const [showVirtualTryOn, setShowVirtualTryOn] = useState(false);
  const [step, setStep] = useState(1); // 1: catalog, 2: upload dog, 3: generating, 4: result
  const [loadingMessage, setLoadingMessage] = useState('');

  useEffect(() => {
    createStaticOutfits();
  }, []);

  const createStaticOutfits = () => {
    console.log('Creating static catalog with local images...');
    
    // Create static catalog with 55 outfits (1.jpg to 55.jpg)
    const staticOutfits = [];
    for (let i = 1; i <= 55; i++) {
      staticOutfits.push({
        id: `outfit-${i}`,
        name: `Outfit ${i}`,
        image_url: `/outfits/${i}.jpg`,
        number: i
      });
    }
    
    console.log('Static catalog created:', staticOutfits.length, 'outfits');
    setOutfits(staticOutfits);
  };

  const handleOutfitSelect = (outfit) => {
    setSelectedOutfit(outfit);
    setShowVirtualTryOn(true);
    setStep(2); // Move to dog image upload step
  };

  const onDrop = useCallback((acceptedFiles) => {
    console.log('Files dropped:', acceptedFiles);
    const file = acceptedFiles[0];
    if (file && file.type.startsWith('image/')) {
      console.log('Valid image file selected:', file.name, file.type);
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        console.log('Image loaded, setting state and moving to step 3');
        setDogImage({
          file,
          preview: reader.result,
          base64
        });
        handleTryOn(base64);
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
  }, [selectedOutfit]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    multiple: false
  });

  const handleTryOn = async (imageBase64) => {
    if (!imageBase64 || !selectedOutfit) {
      alert('Por favor selecciona una foto de tu perro');
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

      // For static catalog, we'll use the outfit number to find the corresponding outfit in the backend
      // First, try to find the outfit in the backend by position/number
      const response = await axios.post(`${API}/tryon`, {
        dog_image_base64: imageBase64,
        outfit_number: selectedOutfit.number, // Send the outfit number instead of ID
        customer_name: customerName || null
      });

      console.log('API Response received:', {
        hasResultImage: !!response.data.result_image_base64,
        resultImageLength: response.data.result_image_base64?.length || 0,
        id: response.data.id
      });
      
      if (!response.data.result_image_base64) {
        console.error('❌ No result_image_base64 in response!');
        alert('Error: No se recibió imagen del servidor');
        setStep(2);
        return;
      }
      
      const imageData = `data:image/png;base64,${response.data.result_image_base64}`;
      console.log('✅ Setting result image. Length:', imageData.length);
      
      // Update state in sequence to ensure proper rendering
      setCurrentTryonId(response.data.id);
      setResultImage(imageData);
      
      // Small delay to ensure state is set before moving to step 4
      setTimeout(() => {
        setStep(4);
        console.log('✅ Moved to Step 4. ResultImage set:', !!imageData);
      }, 100);
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
    setShowVirtualTryOn(false);
    setStep(1);
  };

  const goBackToCatalog = () => {
    setShowVirtualTryOn(false);
    setStep(1);
    setDogImage(null);
    setResultImage(null);
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
              {showVirtualTryOn && (
                <button
                  onClick={goBackToCatalog}
                  className="text-white/70 hover:text-white transition-colors text-sm"
                >
                  ← Volver al catálogo
                </button>
              )}
              {showVirtualTryOn && <span className="text-white/70">Paso {step} de 4</span>}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Catalog View */}
        {!showVirtualTryOn && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-5xl font-bold text-white mb-4">
                ✨ Catálogo Gummy Pet Spa ✨
              </h1>
              <p className="text-xl text-white/70 mb-2">
                Selecciona el outfit perfecto para tu mascota
              </p>
              <p className="text-lg text-white/50">
                {outfits.length} trajes disponibles
              </p>
            </div>

            {outfits.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">👔</div>
                <p className="text-white/70 text-xl mb-4">
                  Cargando catálogo...
                </p>
                <p className="text-white/50">
                  {outfits.length === 0 ? 'Conectando con el servidor...' : `${outfits.length} outfits cargados`}
                </p>
                <div className="mt-4 text-xs text-white/30">
                  API: {BACKEND_URL}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3 md:gap-4">
                {outfits.map((outfit, index) => (
                  <div
                    key={outfit.id}
                    className="group relative cursor-pointer"
                    onClick={() => handleOutfitSelect(outfit)}
                  >
                    {/* Outfit Card */}
                    <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 border border-white/20 hover:border-yellow-400/70 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                      {/* Outfit Image */}
                      <div className="aspect-square overflow-hidden rounded-lg mb-2">
                        <img 
                          src={outfit.image_url}
                          alt={outfit.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          onError={(e) => {
                            console.log('Error loading image:', outfit.image_url);
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                      
                      {/* Outfit Number */}
                      <div className="text-center">
                        <p className="text-white text-xs font-semibold truncate">
                          #{index + 1}
                        </p>
                      </div>
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex items-end justify-center pb-3">
                        <div className="bg-yellow-400 text-black px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
                          <PhotoIcon className="w-3 h-3" />
                          <span>Probar</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Virtual Try-On Interface */}
        {showVirtualTryOn && (
          <div>
            {/* Step 2: Upload Dog Image */}
            {step === 2 && (
              <div className="text-center">
                <h1 className="text-4xl font-bold text-white mb-4">
                  Sube una foto de tu perro
                </h1>
                <p className="text-xl text-white/70 mb-8">
                  Asegúrate de que se vea el cuerpo completo para mejores resultados
                </p>
                
                {/* Selected Outfit Display */}
                {selectedOutfit && (
                  <div className="mb-8">
                    <div className="bg-yellow-400/10 backdrop-blur-md rounded-xl p-4 border border-yellow-400/30 max-w-md mx-auto">
                      <h3 className="text-yellow-400 font-bold mb-2">Outfit Seleccionado</h3>
                      <div className="flex items-center justify-center space-x-4">
                        <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-yellow-400/50">
                          <img 
                            src={selectedOutfit.image_url}
                            alt="Selected outfit"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-white text-sm">Outfit #{outfits.findIndex(o => o.id === selectedOutfit.id) + 1}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
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
                  
                  <div className="mt-6">
                    <input
                      type="text"
                      placeholder="Nombre de tu mascota (opcional)"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full max-w-xs mx-auto bg-white/10 border border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-yellow-400"
                    />
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

            {/* Step 4: Result - Debug Info */}
            {step === 4 && !resultImage && (
              <div className="text-center py-20">
                <h1 className="text-2xl text-red-400 mb-4">Debug: Step 4 pero sin resultImage</h1>
                <p className="text-white">Step: {step}</p>
                <p className="text-white">ResultImage: {resultImage ? 'Exists' : 'NULL'}</p>
                <p className="text-white">ResultImage length: {resultImage?.length || 0}</p>
              </div>
            )}

            {/* Step 4: Result */}
            {step === 4 && resultImage && (
              <div className="text-center">
                {console.log('Rendering Step 4 with resultImage:', resultImage?.substring(0, 50) + '...')}
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
        )}
      </div>
    </div>
  );
};

export default TryOnApp;
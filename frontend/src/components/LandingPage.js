import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon, SparklesIcon, HeartIcon, CameraIcon } from '@heroicons/react/24/outline';

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <CameraIcon className="w-8 h-8" />,
      title: "Foto Instantánea",
      description: "Sube una foto de tu perro y ve cómo le queda la ropa al instante"
    },
    {
      icon: <SparklesIcon className="w-8 h-8" />,
      title: "IA Avanzada",
      description: "Tecnología de última generación para resultados realistas y profesionales"
    },
    {
      icon: <HeartIcon className="w-8 h-8" />,
      title: "Diseño Personalizado",
      description: "Cada imagen se genera cuidadosamente para que tu mascota luzca increíble"
    }
  ];

  const testimonials = [
    {
      name: "María González",
      text: "¡Increíble! Pude ver cómo se veía mi Golden con diferentes outfits antes de comprar. ¡Definitivamente volveré!",
      rating: 5
    },
    {
      name: "Carlos Rodríguez",
      text: "La calidad de las imágenes es impresionante. Mi perrita se ve hermosa en cada prueba virtual.",
      rating: 5
    },
    {
      name: "Ana Martínez",
      text: "Perfecto para elegir el outfit ideal. Ahorro tiempo y mi perro siempre luce fantástico.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Navigation */}
      <nav className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <img 
                src="https://customer-assets.emergentagent.com/job_pupfashionapp/artifacts/fmfy7m8b_1000295919-removebg-preview.png" 
                alt="Gummy Pet Spa" 
                className="w-12 h-12"
              />
              <span className="text-2xl font-bold text-white">Gummy Pet Spa</span>
            </div>
            <div className="flex space-x-6">
              <button 
                onClick={() => navigate('/admin')}
                className="text-white/70 hover:text-white transition-colors"
              >
                Admin
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-6 leading-tight">
              Prueba Virtual de Ropa
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                para tu Perro
              </span>
            </h1>
            <p className="text-xl text-white/80 mb-8 max-w-3xl mx-auto leading-relaxed">
              Descubre cómo se verá tu mascota con nuestros hermosos outfits antes de comprar. 
              Tecnología de IA de última generación para resultados increíblemente realistas.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/tryon')}
                className="bg-gradient-to-r from-yellow-500 to-orange-600 text-black font-bold py-4 px-8 rounded-full text-lg hover:from-yellow-400 hover:to-orange-500 transform hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-2 shadow-2xl"
              >
                <span>Probar Ahora</span>
                <ArrowRightIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                className="bg-white/10 text-white font-semibold py-4 px-8 rounded-full text-lg hover:bg-white/20 transition-all duration-300 backdrop-blur-sm border border-white/20"
              >
                Ver Características
              </button>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-20 h-20 bg-yellow-400/20 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-40 right-20 w-32 h-32 bg-purple-400/20 rounded-full blur-2xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-20 left-1/3 w-24 h-24 bg-blue-400/20 rounded-full blur-xl animate-pulse delay-500"></div>
        </div>
      </div>

      {/* Features Section */}
      <section id="features" className="py-20 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">¿Por qué elegir nuestra tecnología?</h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Combinamos inteligencia artificial avanzada con amor por las mascotas
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center border border-white/20 hover:bg-white/15 transition-all duration-300">
                <div className="text-yellow-400 mb-4 flex justify-center">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">{feature.title}</h3>
                <p className="text-white/70 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">¿Cómo funciona?</h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Tres simples pasos para ver a tu mascota con su nuevo outfit
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Sube la foto", desc: "Toma una foto de cuerpo entero de tu perro" },
              { step: "2", title: "Elige el outfit", desc: "Selecciona de nuestro catálogo el outfit que más te guste" },
              { step: "3", title: "¡Listo!", desc: "Descarga el resultado y compártelo por WhatsApp" }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-2xl font-bold text-black mx-auto mb-6">
                  {item.step}
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">{item.title}</h3>
                <p className="text-white/70 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Lo que dicen nuestros clientes</h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Miles de mascotas felices y dueños satisfechos
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
                <div className="flex text-yellow-400 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="text-2xl">⭐</span>
                  ))}
                </div>
                <p className="text-white/80 mb-6 italic">"{testimonial.text}"</p>
                <p className="text-white font-semibold">- {testimonial.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">
            ¿Listo para ver a tu perro con su nuevo look?
          </h2>
          <p className="text-xl text-white/70 mb-8">
            Únete a miles de dueños que ya han probado nuestro probador virtual
          </p>
          <button
            onClick={() => navigate('/tryon')}
            className="bg-gradient-to-r from-yellow-500 to-orange-600 text-black font-bold py-6 px-12 rounded-full text-xl hover:from-yellow-400 hover:to-orange-500 transform hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-3 mx-auto shadow-2xl"
          >
            <span>Comenzar Prueba Virtual</span>
            <ArrowRightIcon className="w-6 h-6" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/40 backdrop-blur-md border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <img 
                src="https://customer-assets.emergentagent.com/job_pupfashionapp/artifacts/fmfy7m8b_1000295919-removebg-preview.png" 
                alt="Gummy Pet Spa" 
                className="w-10 h-10"
              />
              <span className="text-xl font-bold text-white">Gummy Pet Spa</span>
            </div>
            <div className="text-white/70">
              <p>© 2025 Gummy Pet Spa. Todos los derechos reservados.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
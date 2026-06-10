import React from 'react';

interface BackgroundSpheresProps {
  variant?: 'dark' | 'light';
}

export default function BackgroundSpheres({ variant = 'dark' }: BackgroundSpheresProps) {
  const isDark = variant === 'dark';
  
  return (
    <>
      {/* Fondo con esferas grises con más contraste - SIN BACKDROP BLUR */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Esfera Gris Grande - Superior Izquierda - MÁS VISIBLE */}
        <div 
          className="absolute rounded-full"
          style={{
            width: '450px',
            height: '450px',
            background: 'radial-gradient(circle at 30% 30%, rgba(140, 140, 140, 0.45), rgba(90, 90, 90, 0.35), rgba(50, 50, 50, 0.25))',
            boxShadow: '0 0 120px rgba(100, 100, 100, 0.35), 0 0 200px rgba(80, 80, 80, 0.2), inset -20px -20px 50px rgba(0, 0, 0, 0.6), inset 20px 20px 40px rgba(180, 180, 180, 0.2)',
            top: '-15%',
            left: '-8%',
            animation: 'float 10s ease-in-out infinite',
            opacity: isDark ? 1 : 0.1
          }}
        ></div>

        {/* Esfera Gris - Superior Derecha - MÁS VISIBLE */}
        <div 
          className="absolute rounded-full"
          style={{
            width: '380px',
            height: '380px',
            background: 'radial-gradient(circle at 30% 30%, rgba(135, 135, 135, 0.43), rgba(88, 88, 88, 0.33), rgba(48, 48, 48, 0.23))',
            boxShadow: '0 0 110px rgba(95, 95, 95, 0.33), 0 0 180px rgba(75, 75, 75, 0.18), inset -18px -18px 45px rgba(0, 0, 0, 0.58), inset 18px 18px 38px rgba(175, 175, 175, 0.2)',
            top: '8%',
            right: '-10%',
            animation: 'float 12s ease-in-out infinite 2s',
            opacity: isDark ? 0.95 : 0.1
          }}
        ></div>

        {/* Esfera Gris Grande - Inferior Izquierda - MÁS VISIBLE */}
        <div 
          className="absolute rounded-full"
          style={{
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle at 30% 30%, rgba(145, 145, 145, 0.48), rgba(92, 92, 92, 0.38), rgba(52, 52, 52, 0.28))',
            boxShadow: '0 0 130px rgba(105, 105, 105, 0.38), 0 0 210px rgba(85, 85, 85, 0.22), inset -22px -22px 55px rgba(0, 0, 0, 0.62), inset 22px 22px 42px rgba(185, 185, 185, 0.2)',
            bottom: '-18%',
            left: '-12%',
            animation: 'float 14s ease-in-out infinite 4s',
            opacity: isDark ? 1 : 0.1
          }}
        ></div>

        {/* Esfera Gris - Inferior Derecha - MÁS VISIBLE */}
        <div 
          className="absolute rounded-full"
          style={{
            width: '420px',
            height: '420px',
            background: 'radial-gradient(circle at 30% 30%, rgba(138, 138, 138, 0.44), rgba(89, 89, 89, 0.34), rgba(49, 49, 49, 0.24))',
            boxShadow: '0 0 115px rgba(98, 98, 98, 0.34), 0 0 190px rgba(78, 78, 78, 0.19), inset -19px -19px 48px rgba(0, 0, 0, 0.59), inset 19px 19px 39px rgba(178, 178, 178, 0.2)',
            bottom: '-8%',
            right: '8%',
            animation: 'float 11s ease-in-out infinite 3s',
            opacity: isDark ? 0.98 : 0.1
          }}
        ></div>

        {/* Esfera Gris Mediana - Centro - MÁS VISIBLE */}
        <div 
          className="absolute rounded-full"
          style={{
            width: '280px',
            height: '280px',
            background: 'radial-gradient(circle at 35% 35%, rgba(142, 142, 142, 0.46), rgba(91, 91, 91, 0.36), rgba(51, 51, 51, 0.26))',
            boxShadow: '0 0 105px rgba(102, 102, 102, 0.36), 0 0 175px rgba(82, 82, 82, 0.21), inset -17px -17px 42px rgba(0, 0, 0, 0.60), inset 17px 17px 35px rgba(182, 182, 182, 0.2)',
            top: '45%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            animation: 'float 9s ease-in-out infinite 1s',
            opacity: isDark ? 0.92 : 0.1
          }}
        ></div>

        {/* Esfera Gris Pequeña - Superior Centro - MÁS VISIBLE */}
        <div 
          className="absolute rounded-full"
          style={{
            width: '180px',
            height: '180px',
            background: 'radial-gradient(circle at 35% 35%, rgba(132, 132, 132, 0.42), rgba(86, 86, 86, 0.32), rgba(47, 47, 47, 0.22))',
            boxShadow: '0 0 95px rgba(92, 92, 92, 0.32), 0 0 160px rgba(72, 72, 72, 0.17), inset -15px -15px 35px rgba(0, 0, 0, 0.56), inset 15px 15px 30px rgba(172, 172, 172, 0.2)',
            top: '18%',
            left: '32%',
            animation: 'float 8s ease-in-out infinite 2.5s',
            opacity: isDark ? 0.88 : 0.1
          }}
        ></div>

        {/* Esfera Gris Pequeña - Inferior - MÁS VISIBLE */}
        <div 
          className="absolute rounded-full"
          style={{
            width: '150px',
            height: '150px',
            background: 'radial-gradient(circle at 35% 35%, rgba(136, 136, 136, 0.44), rgba(87, 87, 87, 0.33), rgba(48, 48, 48, 0.23))',
            boxShadow: '0 0 90px rgba(96, 96, 96, 0.33), 0 0 155px rgba(76, 76, 76, 0.18), inset -14px -14px 32px rgba(0, 0, 0, 0.57), inset 14px 14px 28px rgba(176, 176, 176, 0.2)',
            bottom: '32%',
            right: '28%',
            animation: 'float 7s ease-in-out infinite 1.5s',
            opacity: isDark ? 0.85 : 0.1
          }}
        ></div>

        {/* Esfera Gris Muy Pequeña - Izquierda - MÁS VISIBLE */}
        <div 
          className="absolute rounded-full"
          style={{
            width: '120px',
            height: '120px',
            background: 'radial-gradient(circle at 35% 35%, rgba(134, 134, 134, 0.43), rgba(86, 86, 86, 0.32), rgba(47, 47, 47, 0.22))',
            boxShadow: '0 0 85px rgba(94, 94, 94, 0.32), 0 0 145px rgba(74, 74, 74, 0.17), inset -13px -13px 28px rgba(0, 0, 0, 0.55), inset 13px 13px 25px rgba(174, 174, 174, 0.2)',
            top: '62%',
            left: '18%',
            animation: 'float 6.5s ease-in-out infinite 3.5s',
            opacity: isDark ? 0.82 : 0.1
          }}
        ></div>

        {/* Esfera Gris Diminuta - Superior Derecha - MÁS VISIBLE */}
        <div 
          className="absolute rounded-full"
          style={{
            width: '100px',
            height: '100px',
            background: 'radial-gradient(circle at 35% 35%, rgba(130, 130, 130, 0.41), rgba(84, 84, 84, 0.31), rgba(46, 46, 46, 0.21))',
            boxShadow: '0 0 80px rgba(90, 90, 90, 0.31), 0 0 140px rgba(70, 70, 70, 0.16), inset -12px -12px 25px rgba(0, 0, 0, 0.54), inset 12px 12px 22px rgba(170, 170, 170, 0.2)',
            top: '28%',
            right: '18%',
            animation: 'float 6s ease-in-out infinite 2s',
            opacity: isDark ? 0.80 : 0.1
          }}
        ></div>
      </div>

      {/* Estilos de animación */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-25px) translateX(15px);
          }
          50% {
            transform: translateY(-15px) translateX(-15px);
          }
          75% {
            transform: translateY(-35px) translateX(8px);
          }
        }
      `}</style>
    </>
  );
}

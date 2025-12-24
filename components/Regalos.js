"use client";
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { db, auth } from '@/lib/firebase';
import { signInAnonymously } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const VARIANTES = [
  { nombre: 'Fotografia', video: '/Fotografia.mov', img: '/Fotografia.png' },
  { nombre: 'Pandulce', video: '/Pandulce.mov', img: '/Pandulce.png' },
  { nombre: 'Saludo', video: '/Saludo.mov', img: '/Saludo.png' },
  { nombre: 'Vino', video: '/Vino.mov', img: '/Vino.png' }
];

export default function Regalo() {
  const [estado, setEstado] = useState('cargando');
  const [frase, setFrase] = useState("");
  const [varianteActual, setVarianteActual] = useState(VARIANTES[0]); 
  const [errorMsg, setErrorMsg] = useState("");
  
  const videoRef = useRef(null);

  const asignarRegaloCompleto = async (uid) => {
    try {
      const randomId = Math.floor(Math.random() * 50) + 1;
      const fraseRef = doc(db, "frases", randomId.toString());
      const fraseSnap = await getDoc(fraseRef);
      
      const randomVarIndex = Math.floor(Math.random() * VARIANTES.length);
      const varianteElegida = VARIANTES[randomVarIndex];
      setVarianteActual(varianteElegida);

      if (fraseSnap.exists()) {
        const texto = fraseSnap.data().texto;
        setFrase(texto);
        await setDoc(doc(db, "usuarios", uid), {
          fraseId: randomId,
          fraseTexto: texto,
          varianteIndex: randomVarIndex,
          fecha: serverTimestamp()
        });
        return true;
      } else {
        throw new Error(`No se encontró la frase ID: ${randomId}.`);
      }
    } catch (e) {
      setErrorMsg("Error buscando frase: " + e.message);
      return false;
    }
  };

  useEffect(() => {
    const iniciar = async () => {
      try {
        const userCredential = await signInAnonymously(auth);
        const uid = userCredential.user.uid;
        const userDoc = await getDoc(doc(db, "usuarios", uid));
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          setFrase(data.fraseTexto);
          if (data.varianteIndex !== undefined && VARIANTES[data.varianteIndex]) {
            setVarianteActual(VARIANTES[data.varianteIndex]);
          }
          setEstado('caja');
        } else {
          const exito = await asignarRegaloCompleto(uid);
          if (exito) setEstado('caja');
        }
      } catch (error) {
        setErrorMsg("Error de conexión: " + error.message);
      }
    };
    iniciar();
  }, []);

  const abrirRegalo = () => {
    setEstado('abriendo');
    setTimeout(() => {
      setEstado('video');
    }, 800);
  };

  const terminarVideo = () => {
    setEstado('final');
    lanzarConfeti();
  };

  const lanzarConfeti = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FF4500', '#00FF00']
    });
  };

  if (estado === 'cargando') {
    return (
      <div className="flex flex-col h-screen items-center justify-center text-white bg-black p-4 text-center">
        {errorMsg ? (
          <p className="text-red-500 font-mono">{errorMsg}</p>
        ) : (
          <p className="animate-pulse font-mono uppercase tracking-widest">D8 Creative - Cargando...</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white overflow-hidden relative font-sans">
      
      <AnimatePresence mode='wait'>
        
        {/* FASE 1: LA CARTA */}
        {(estado === 'caja' || estado === 'abriendo') && (
          <motion.div
            key="sobre"
            initial={{ scale: 0, opacity: 0 }}
            animate={estado === 'abriendo' 
              ? { scale: [1, 1.1, 1], rotate: [0, -3, 3, -3, 3, 0] } 
              : { scale: 1, opacity: 1 }
            }
            exit={{ scale: 1.5, opacity: 0 }}
            onClick={abrirRegalo}
            className="cursor-pointer z-10 flex flex-col items-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/Carta.png" 
              alt="Abrir Carta" 
              className="w-64 md:w-80 drop-shadow-[0_0_25px_rgba(255,215,0,0.4)]" 
            />
            <p className="mt-8 text-xl text-yellow-400 font-bold tracking-[0.2em] animate-pulse uppercase">
              Toca para abrir
            </p>
          </motion.div>
        )}

        {/* FASE 2: VIDEO CON CHROMA CSS */}
        {estado === 'video' && (
          <motion.div
            key="video-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black"
          >
            <video 
              ref={videoRef}
              src={varianteActual.video}
              autoPlay 
              playsInline 
              onEnded={terminarVideo}
              className="w-full h-full object-cover md:object-contain mix-blend-screen saturate-[1.2] contrast-[1.1] brightness-[1.1]"
            />
          </motion.div>
        )}

        {/* FASE 3: MODAL FINAL */}
        {estado === 'final' && (
          <motion.div
            key="modal"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 14 }}
            className="z-20 max-w-sm w-[90%] bg-white text-black p-6 pt-12 rounded-3xl shadow-2xl text-center border-b-8 border-r-8 border-yellow-400 relative"
          >
            <div className="absolute -top-16 left-1/2 transform -translate-x-1/2">
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img 
                 src={varianteActual.img} 
                 alt="D8 Persona" 
                 className="w-32 h-32 object-contain drop-shadow-xl" 
               />
            </div>

            <h2 className="mt-12 text-2xl font-black text-gray-800 mb-2 italic">¡MI DESEO 2026!</h2>
            <div className="h-1.5 w-12 bg-yellow-400 mx-auto mb-6 rounded-full"></div>
            
            <p className="text-xl italic font-medium text-gray-700 leading-relaxed mb-8 px-2">
              &quot;{frase}&quot;
            </p>

            {/* BOTÓN DE COMPARTIR (Sustituye al botón de recambio) */}
            <button 
              onClick={async () => {
                const shareData = {
                  title: 'D8 Creative 2026',
                  text: `✨ Mi deseo para este 2026 es: "${frase}" - Descubrí el tuyo en D8 Creative `,
                  url: window.location.href,
                };
                
                try {
                  if (navigator.share) {
                    await navigator.share(shareData);
                  } else {
                    await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
                    alert("¡Frase copiada! Pegala en tus historias de Instagram ✨");
                  }
                } catch (err) {
                  console.log("Error al compartir", err);
                }
              }} 
              className="bg-zinc-950 text-white px-8 py-4 rounded-full font-bold shadow-lg hover:bg-zinc-700 transition transform active:scale-95 flex items-center justify-center gap-2 mx-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.445.01 10.173 0 8 0zm0 1.44c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.282.11-.705.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002z"/>
                <path d="M8 3.89a4.11 4.11 0 1 0 0 8.22 4.11 4.11 0 0 0 0-8.22zm0 6.78a2.67 2.67 0 1 1 0-5.34 2.67 2.67 0 0 1 0 5.34zM12.65 3.35a.975.975 0 1 1-1.95 0 .975.975 0 0 1 1.95 0z"/>
              </svg>
              COMPARTIR DESEO
            </button>
            
            <div className="mt-8 text-[10px] text-gray-400 font-mono uppercase tracking-widest">
              D8 Creative
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
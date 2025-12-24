"use client";
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { db, auth } from '@/lib/firebase';
import { signInAnonymously } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

// Declaración de assets locales (en carpeta public)
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
      // 1. Azar reforzado para el ID de la frase (1 al 50)
      const seed = Math.floor(Math.random() * 1000000);
      const randomId = (seed % 50) + 1;
      
      const fraseRef = doc(db, "frases", randomId.toString());
      const fraseSnap = await getDoc(fraseRef);
      
      // 2. Vinculamos el video al ID de la frase para mayor variedad entre usuarios
      const varianteIndex = randomId % VARIANTES.length;
      const varianteElegida = VARIANTES[varianteIndex];
      setVarianteActual(varianteElegida);

      if (fraseSnap.exists()) {
        const texto = fraseSnap.data().texto;
        setFrase(texto);
        
        // 3. Guardamos en Firebase para que sea permanente para este usuario
        await setDoc(doc(db, "usuarios", uid), {
          fraseId: randomId,
          fraseTexto: texto,
          varianteIndex: varianteIndex,
          fecha: serverTimestamp()
        });
        return true;
      } else {
        // Fallback en caso de que Firestore no responda o falte un ID
        setFrase("¡Que el 2026 te sorprenda con grandes proyectos!");
        return true;
      }
    } catch (e) {
      console.error("Error asignando regalo:", e);
      setErrorMsg("Error de conexión. Intenta de nuevo.");
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
        setErrorMsg("Problema de conexión.");
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
          <p className="text-red-500 font-mono text-xs">{errorMsg}</p>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="animate-pulse font-mono uppercase tracking-[0.3em] text-[10px]">D8 Creative</p>
          </div>
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
            className="cursor-pointer z-10 flex flex-col items-center px-4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/Carta.png" 
              alt="Abrir Carta" 
              className="w-64 md:w-80 drop-shadow-[0_0_25px_rgba(255,215,0,0.3)]" 
            />
            <p className="mt-8 text-lg text-yellow-400 font-bold tracking-[0.3em] animate-pulse uppercase">
              Toca para abrir
            </p>
          </motion.div>
        )}

        {/* FASE 2: VIDEO */}
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
              className="w-full h-full object-cover md:object-contain"
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

            <button 
              onClick={async () => {
                const shareData = {
                  title: 'D8 Creative 2026',
                  text: `✨ Mi deseo para este 2026 es: "${frase}" - Descubrí el tuyo en D8 Creative`,
                  url: window.location.href,
                };
                
                try {
                  if (navigator.share) {
                    await navigator.share(shareData);
                  } else {
                    await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
                    alert("¡Copiado! Ya podés pegarlo en tus redes ✨");
                  }
                } catch (err) {
                  console.log("Error al compartir", err);
                }
              }} 
              className="bg-zinc-950 text-white px-8 py-4 rounded-full font-bold shadow-lg hover:bg-zinc-700 transition transform active:scale-95 flex items-center justify-center gap-2 mx-auto uppercase text-xs tracking-widest"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5zm-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>
              </svg>
              Compartir Deseo
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
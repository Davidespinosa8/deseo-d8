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

// FECHA DE LANZAMIENTO: 25 de Diciembre 2025, 00:00:00
const FECHA_OBJETIVO = new Date("2025-12-25T00:00:00").getTime();

export default function Regalo() {
  const [estado, setEstado] = useState('cargando');
  const [frase, setFrase] = useState("");
  const [varianteActual, setVarianteActual] = useState(VARIANTES[0]); 
  const [errorMsg, setErrorMsg] = useState("");
  
  const [bloqueado, setBloqueado] = useState(true);
  const [tiempoRestante, setTiempoRestante] = useState({ dias: 0, horas: 0, min: 0, seg: 0 });

  const videoRef = useRef(null);

  // --- CORRECCIÓN: Definimos la función ANTES del useEffect para evitar el error de declaración ---
  const asignarRegaloCompleto = async (uid) => {
    try {
      const seed = Math.floor(Math.random() * 1000000);
      const randomId = (seed % 50) + 1;
      const fraseRef = doc(db, "frases", randomId.toString());
      const fraseSnap = await getDoc(fraseRef);
      const varianteIndex = randomId % VARIANTES.length;

      if (fraseSnap.exists()) {
        const texto = fraseSnap.data().texto;
        setFrase(texto);
        setVarianteActual(VARIANTES[varianteIndex]);
        await setDoc(doc(db, "usuarios", uid), {
          fraseId: randomId, 
          fraseTexto: texto, 
          varianteIndex, 
          fecha: serverTimestamp()
        });
      }
    } catch (e) { 
      console.error(e); 
    }
  };

  useEffect(() => {
    // 1. Lógica del Cronómetro
    const intervalo = setInterval(() => {
      const ahora = new Date().getTime();
      const distancia = FECHA_OBJETIVO - ahora;

      if (distancia <= 0) {
        setBloqueado(false);
        clearInterval(intervalo);
      } else {
        setTiempoRestante({
          dias: Math.floor(distancia / (1000 * 60 * 60 * 24)),
          horas: Math.floor((distancia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          min: Math.floor((distancia % (1000 * 60 * 60)) / (1000 * 60)),
          seg: Math.floor((distancia % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    // 2. Lógica de Firebase
    const iniciar = async () => {
      try {
        const userCredential = await signInAnonymously(auth);
        const uid = userCredential.user.uid;
        const userDoc = await getDoc(doc(db, "usuarios", uid));
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          setFrase(data.fraseTexto);
          if (data.varianteIndex !== undefined) setVarianteActual(VARIANTES[data.varianteIndex]);
        } else {
          await asignarRegaloCompleto(uid);
        }
        setEstado('listo');
      } catch (error) {
        setErrorMsg("Problema de conexión.");
      }
    };
    
    iniciar();
    return () => clearInterval(intervalo);
  }, []);

  const abrirRegalo = () => {
    setEstado('abriendo');
    setTimeout(() => setEstado('video'), 800);
  };

  const lanzarConfeti = () => {
    confetti({ 
      particleCount: 150, 
      spread: 70, 
      origin: { y: 0.6 }, 
      colors: ['#FFD700', '#FF4500', '#00FF00'] 
    });
  };

  if (estado === 'cargando') return (
    <div className="flex h-screen items-center justify-center bg-black text-yellow-400 font-mono text-xs tracking-widest uppercase animate-pulse">
      Cargando destino...
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white overflow-hidden relative font-sans p-4">
      
      <AnimatePresence mode='wait'>
        
        {bloqueado ? (
          <motion.div 
            key="countdown"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-center z-30"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Carta.png" alt="Carta" className="w-48 mx-auto mb-10 opacity-50 grayscale" />
            <h2 className="text-yellow-400 font-black text-2xl mb-4 italic uppercase tracking-tighter">Falta poco para abrirlo...</h2>
            <div className="flex gap-4 justify-center font-mono text-3xl md:text-5xl">
              <div className="flex flex-col"><span className="text-white">{tiempoRestante.dias}</span><span className="text-[10px] text-gray-500 uppercase">Días</span></div>
              <span className="text-yellow-400">:</span>
              <div className="flex flex-col"><span className="text-white">{tiempoRestante.horas}</span><span className="text-[10px] text-gray-500 uppercase">Hrs</span></div>
              <span className="text-yellow-400">:</span>
              <div className="flex flex-col"><span className="text-white">{tiempoRestante.min}</span><span className="text-[10px] text-gray-500 uppercase">Min</span></div>
              <span className="text-yellow-400">:</span>
              {/* CORRECCIÓN: Eliminado conflicto text-white y text-yellow-400 */}
              <div className="flex flex-col"><span className="text-yellow-400">{tiempoRestante.seg}</span><span className="text-[10px] text-gray-500 uppercase font-sans">Seg</span></div>
            </div>
            <p className="mt-8 text-gray-500 text-[10px] uppercase tracking-widest">D8 Creative ©</p>
          </motion.div>
        ) : (
          <>
            {(estado === 'listo' || estado === 'abriendo') && (
              <motion.div
                key="sobre"
                initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 1.5, opacity: 0 }}
                onClick={abrirRegalo}
                className="cursor-pointer z-10 flex flex-col items-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/Carta.png" alt="Abrir" className="w-64 md:w-80 drop-shadow-[0_0_25px_rgba(255,215,0,0.4)]" />
                <p className="mt-8 text-xl text-yellow-400 font-bold tracking-[0.3em] animate-pulse uppercase">Toca para abrir</p>
              </motion.div>
            )}

            {estado === 'video' && (
              <motion.div key="vid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center bg-black">
                <video 
                  ref={videoRef} 
                  src={varianteActual.video} 
                  autoPlay 
                  playsInline 
                  onEnded={() => { setEstado('final'); lanzarConfeti(); }} 
                  className="w-full h-full object-cover md:object-contain" 
                />
              </motion.div>
            )}

            {estado === 'final' && (
              <motion.div
                key="modal" initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                className="z-20 max-w-sm w-full bg-white text-black p-6 pt-12 rounded-3xl shadow-2xl text-center border-b-8 border-r-8 border-yellow-400 relative"
              >
                <div className="absolute -top-16 left-1/2 transform -translate-x-1/2">
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img src={varianteActual.img} alt="D8" className="w-32 h-32 object-contain drop-shadow-xl" />
                </div>
                <h2 className="mt-12 text-2xl font-black text-gray-800 mb-2 italic">¡MI DESEO 2026!</h2>
                <div className="h-1.5 w-12 bg-yellow-400 mx-auto mb-6 rounded-full"></div>
                <p className="text-xl italic font-medium text-gray-700 leading-relaxed mb-8 px-2">&quot;{frase}&quot;</p>
                <button 
                  onClick={async () => {
                    const shareData = { title: 'D8 2026', text: `✨ Mi deseo: "${frase}"`, url: window.location.href };
                    if (navigator.share) await navigator.share(shareData);
                    else { 
                      await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`); 
                      alert("¡Copiado! ✨"); 
                    }
                  }}
                  className="bg-black text-white px-8 py-4 rounded-full font-bold shadow-lg flex items-center gap-2 mx-auto text-xs tracking-widest uppercase"
                >
                  Compartir Deseo
                </button>
                <p className="mt-6 text-[10px] text-gray-400 font-mono uppercase tracking-widest">D8 Creative</p>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
      {errorMsg && <p className="absolute bottom-4 text-red-500 text-xs font-mono">{errorMsg}</p>}
    </div>
  );
}
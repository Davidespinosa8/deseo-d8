const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
const frases = require('./frases.json');

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function subirFrases() {
  const batch = db.batch();
  const collectionRef = db.collection('frases');

  console.log(`🚀 Preparando ${frases.length} frases para subir...`);

  frases.forEach((frase) => {
    // Usamos el ID numérico como ID del documento para que sea fácil de encontrar
    const docRef = collectionRef.doc(frase.id.toString());
    batch.set(docRef, {
      ...frase,
      veces_asignada: 0 // Contador inicial en 0
    });
  });

  try {
    await batch.commit();
    console.log('✅ ¡Éxito! Todas las frases han sido subidas a Firestore.');
  } catch (error) {
    console.error('❌ Error subiendo frases:', error);
  }
}

subirFrases();
// =====================================================
// REVISIÓN PERIÓDICA DE ÓRDENES RETRASADAS — REQ004-004
// Se importa una sola vez desde server.js
// =====================================================

const ctrl = require('../controllers/ordenesProduccionController');

const INTERVALO_MS = 60 * 1000;   // cada 1 minuto
const PRIMERA_PASADA_MS = 5 * 1000; // 5 segundos después de arrancar

async function ejecutarRevision() {
    try {
        const cantidad = await ctrl.revisarRetrasos();
        if (cantidad > 0) {
            console.log(`⚠️  Se generaron ${cantidad} alerta(s) de retraso en producción`);
        }
    } catch (e) {
        console.error('Error revisando retrasos de producción:', e.message);
    }
}

function iniciarRevisionRetrasos() {
    // Primera pasada rápida al arrancar (no esperar al primer minuto)
    setTimeout(ejecutarRevision, PRIMERA_PASADA_MS);

    // Revisión periódica
    setInterval(ejecutarRevision, INTERVALO_MS);

    console.log(`🕐 Revisión automática de retrasos activa (cada ${INTERVALO_MS / 60000} min)`);
}

module.exports = { iniciarRevisionRetrasos };
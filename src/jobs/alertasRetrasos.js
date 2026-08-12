// Revisión periódica de órdenes retrasadas — REQ004-004
// Se importa una sola vez desde el archivo principal del servidor (app.js / index.js)

const ctrl = require('../controllers/ordenesProduccionController');

const INTERVALO_MS = 5 * 60 * 1000; // cada 5 minutos

function iniciarRevisionRetrasos() {
    setInterval(async () => {
        try {
            const cantidad = await ctrl.revisarRetrasos();
            if (cantidad > 0) {
                console.log(`⚠️  Se generaron ${cantidad} alerta(s) de retraso en producción`);
            }
        } catch (e) {
            console.error('Error revisando retrasos de producción:', e.message);
        }
    }, INTERVALO_MS);

    console.log(`🕐 Revisión automática de retrasos activa (cada ${INTERVALO_MS / 60000} min)`);
}

module.exports = { iniciarRevisionRetrasos };

import * as dotenv from 'dotenv';
import { config } from './src/config';
import { BCVService } from './src/services/bcv.service';

// Configurar axios para ignorar errores de certificado SSL (solo para desarrollo/pruebas)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Cargar variables de entorno
dotenv.config();

async function testBCVScraping() {
  try {
    // Validar configuración
    if (!config.bcvWebsiteUrl) {
      console.error(
        '❌ ERROR: No se encontró la URL del sitio del BCV en la configuración'
      );
      return;
    }
    const bcvService = new BCVService(config.bcvWebsiteUrl);
    const rateData = await bcvService.getCurrentRate();

    if (rateData) {
      // Mostrar todas las tasas de cambio obtenidas
      if (rateData.rates && rateData.rates.length > 0) {
        for (const rate of rateData.rates) {
          // Verificar si el número parece tener un formato inusual (demasiados decimales)
          let _displayRate = rate.rate;
          let _adjusted = false;

          // Si el número parece tener demasiados decimales, podría ser un problema de parsing
          if (rate.rate > 1000000) {
            // Número inusualmente alto (como 23304580000)
            _displayRate = rate.rate / 100000000; // Ajustar si es un número con demasiados decimales
            _adjusted = true;
          }
        }
      } else {
        // Si no hay tasas detalladas, mostrar la tasa general
        let _displayRate = rateData.rate;
        let _adjusted = false;

        if (rateData.rate > 1000000) {
          // Número inusualmente alto
          _displayRate = rateData.rate / 100000000;
          _adjusted = true;
        }
      }
    } else {
    }
  } catch (error: any) {
    console.error('💥 ERROR FATAL en la prueba:');
    if (error.code === 'ENOTFOUND') {
      console.error(
        `   No se puede conectar al sitio: ${config.bcvWebsiteUrl}`
      );
      console.error('   Verifica tu conexión a Internet o la URL del sitio');
    } else if (error.code === 'ECONNABORTED') {
      console.error(
        '   La solicitud al sitio del BCV tardó demasiado (timeout)'
      );
      console.error('   Puede que el sitio esté lento o temporalmente caído');
    } else if (error.response) {
      console.error(
        `   Error HTTP ${error.response.status} al acceder al sitio`
      );
      console.error(`   Mensaje: ${error.response.statusText}`);
    } else {
      console.error(`   Error: ${error.message || error}`);
    }
  }
}

// Ejecutar la prueba
testBCVScraping();

export { testBCVScraping };

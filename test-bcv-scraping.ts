import * as dotenv from 'dotenv';
import * as https from 'https';
import { BCVService } from './src/services/bcv.service';
import { config } from './src/config';

// Configurar axios para ignorar errores de certificado SSL (solo para desarrollo/pruebas)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Cargar variables de entorno
dotenv.config();

async function testBCVScraping() {
  console.log('🔍 Iniciando prueba de scraping del BCV...');
  console.log('🌐 URL del sitio: ', config.bcvWebsiteUrl);
  console.log('💾 Modo consola (sin DB): ', !config.saveToDatabase);
  console.log('');

  try {
    // Validar configuración
    if (!config.bcvWebsiteUrl) {
      console.error('❌ ERROR: No se encontró la URL del sitio del BCV en la configuración');
      console.log('   Verifica que BCV_WEBSITE_URL esté definido en tu archivo .env');
      return;
    }

    console.log('⏳ Creando instancia del servicio BCV...');
    const bcvService = new BCVService(config.bcvWebsiteUrl);
    
    console.log('⏳ Obteniendo tasa de cambio del BCV...');
    const rateData = await bcvService.getCurrentRate();
    
    if (rateData) {
      console.log('✅ ÉXITO: Se obtuvieron las tasas de cambio');
      console.log(`📅 Fecha: ${rateData.date}`);
      console.log('');
      
      // Mostrar todas las tasas de cambio obtenidas
      if (rateData.rates && rateData.rates.length > 0) {
        console.log('💱 Tasas de cambio obtenidas:');
        for (const rate of rateData.rates) {
          // Verificar si el número parece tener un formato inusual (demasiados decimales)
          let displayRate = rate.rate;
          let adjusted = false;
          
          // Si el número parece tener demasiados decimales, podría ser un problema de parsing
          if (rate.rate > 1000000) { // Número inusualmente alto (como 23304580000)
            displayRate = rate.rate / 100000000; // Ajustar si es un número con demasiados decimales
            adjusted = true;
          }
          
          console.log(`   ${rate.currency} (${rate.name}): ${rate.rate}${adjusted ? ` (ajustado de ${rate.rate})` : ''}`);
        }
      } else {
        // Si no hay tasas detalladas, mostrar la tasa general
        let displayRate = rateData.rate;
        let adjusted = false;
        
        if (rateData.rate > 1000000) { // Número inusualmente alto
          displayRate = rateData.rate / 100000000;
          adjusted = true;
        }
        
        console.log(`📈 Tasa general: ${rateData.rate}${adjusted ? ` (ajustado de ${rateData.rate})` : ''}`);
      }
      
      console.log('');
      console.log('🎉 Prueba completada exitosamente');
      console.log('   El scraping del sitio del BCV está funcionando correctamente');
    } else {
      console.log('❌ ADVERTENCIA: No se pudo obtener la tasa de cambio');
      console.log('   Puede ser que:');
      console.log('   - El sitio web del BCV esté temporalmente caído');
      console.log('   - La estructura del sitio haya cambiado');
      console.log('   - No haya conexión a Internet');
      console.log('   - No haya datos disponibles en este momento');
    }
  } catch (error: any) {
    console.error('💥 ERROR FATAL en la prueba:');
    if (error.code === 'ENOTFOUND') {
      console.error(`   No se puede conectar al sitio: ${config.bcvWebsiteUrl}`);
      console.error('   Verifica tu conexión a Internet o la URL del sitio');
    } else if (error.code === 'ECONNABORTED') {
      console.error('   La solicitud al sitio del BCV tardó demasiado (timeout)');
      console.error('   Puede que el sitio esté lento o temporalmente caído');
    } else if (error.response) {
      console.error(`   Error HTTP ${error.response.status} al acceder al sitio`);
      console.error(`   Mensaje: ${error.response.statusText}`);
    } else {
      console.error(`   Error: ${error.message || error}`);
    }
  }
}

// Ejecutar la prueba
testBCVScraping();

export { testBCVScraping };
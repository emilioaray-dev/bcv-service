import * as path from 'path';
import { config as loadEnv } from 'dotenv';
import * as fs from 'fs/promises';
import { MongoClient } from 'mongodb';

// Cargar variables de entorno
loadEnv();

/**
 * Script para hacer backup completo de la base de datos MongoDB
 * y analizar la estructura de datos históricos
 */

interface BackupConfig {
  mongoUri: string;
  outputDir: string;
  includeAnalysis: boolean;
}

interface DataAnalysis {
  totalRecords: number;
  dateRange: {
    earliest: string;
    latest: string;
  };
  uniqueFields: Set<string>;
  fieldTypes: Record<string, Set<string>>;
  sampleRecords: {
    earliest: unknown;
    latest: unknown;
    random: unknown[];
  };
  uniqueSources: Set<string>;
  recordsByYear: Record<string, number>;
}

async function backupDatabase(config: BackupConfig): Promise<void> {
  const client = new MongoClient(config.mongoUri);

  try {
    console.log('🔌 Conectando a MongoDB...');
    await client.connect();
    console.log('✅ Conexión establecida');

    const db = client.db();
    const collection = db.collection('rates');

    // Obtener todos los documentos
    console.log('📦 Extrayendo todos los documentos...');
    const allRates = await collection.find({}).sort({ createdAt: 1 }).toArray();
    console.log(`✅ ${allRates.length} documentos extraídos`);

    // Crear directorio de salida si no existe
    await fs.mkdir(config.outputDir, { recursive: true });

    // Guardar backup completo
    const backupPath = path.join(
      config.outputDir,
      `rates-backup-${new Date().toISOString().split('T')[0]}.json`
    );
    await fs.writeFile(backupPath, JSON.stringify(allRates, null, 2), 'utf-8');
    console.log(`💾 Backup guardado en: ${backupPath}`);

    if (config.includeAnalysis && allRates.length > 0) {
      console.log('\n📊 Analizando estructura de datos...');
      const analysis = analyzeData(allRates);

      // Guardar análisis
      const analysisPath = path.join(
        config.outputDir,
        `data-analysis-${new Date().toISOString().split('T')[0]}.json`
      );
      await fs.writeFile(
        analysisPath,
        JSON.stringify(
          {
            ...analysis,
            uniqueFields: Array.from(analysis.uniqueFields),
            uniqueSources: Array.from(analysis.uniqueSources),
            fieldTypes: Object.fromEntries(
              Object.entries(analysis.fieldTypes).map(([key, value]) => [
                key,
                Array.from(value),
              ])
            ),
          },
          null,
          2
        ),
        'utf-8'
      );
      console.log(`📋 Análisis guardado en: ${analysisPath}`);

      // Imprimir resumen en consola
      printAnalysisSummary(analysis);
    }

    console.log('\n✨ Proceso completado exitosamente');
  } catch (error) {
    console.error('❌ Error durante el backup:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Conexión cerrada');
  }
}

function analyzeData(records: unknown[]): DataAnalysis {
  const analysis: DataAnalysis = {
    totalRecords: records.length,
    dateRange: {
      earliest: '',
      latest: '',
    },
    uniqueFields: new Set<string>(),
    fieldTypes: {},
    sampleRecords: {
      earliest: null,
      latest: null,
      random: [],
    },
    uniqueSources: new Set<string>(),
    recordsByYear: {},
  };

  if (records.length === 0) return analysis;

  // Analizar cada registro
  records.forEach((record, index) => {
    if (typeof record !== 'object' || record === null) return;

    const rec = record as Record<string, unknown>;

    // Recopilar campos únicos
    Object.keys(rec).forEach((field) => {
      analysis.uniqueFields.add(field);

      // Analizar tipos de campos
      if (!analysis.fieldTypes[field]) {
        analysis.fieldTypes[field] = new Set<string>();
      }

      const fieldType = Array.isArray(rec[field]) ? 'array' : typeof rec[field];
      analysis.fieldTypes[field].add(fieldType);
    });

    // Recopilar sources únicos
    if (rec.source && typeof rec.source === 'string') {
      analysis.uniqueSources.add(rec.source);
    }

    // Agrupar por año
    if (rec.date && typeof rec.date === 'string') {
      const year = rec.date.substring(0, 4);
      analysis.recordsByYear[year] = (analysis.recordsByYear[year] || 0) + 1;
    }

    // Guardar muestras
    if (index === 0) {
      analysis.sampleRecords.earliest = record;
      if (rec.date && typeof rec.date === 'string') {
        analysis.dateRange.earliest = rec.date;
      }
    }
    if (index === records.length - 1) {
      analysis.sampleRecords.latest = record;
      if (rec.date && typeof rec.date === 'string') {
        analysis.dateRange.latest = rec.date;
      }
    }
  });

  // Tomar 5 muestras aleatorias
  const sampleIndices = Array.from(
    { length: Math.min(5, records.length) },
    () => Math.floor(Math.random() * records.length)
  );
  analysis.sampleRecords.random = sampleIndices.map((i) => records[i]);

  return analysis;
}

function printAnalysisSummary(analysis: DataAnalysis): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DEL ANÁLISIS DE DATOS');
  console.log('='.repeat(60));

  console.log(`\n📈 Total de registros: ${analysis.totalRecords}`);

  console.log(
    `\n📅 Rango de fechas: ${analysis.dateRange.earliest} → ${analysis.dateRange.latest}`
  );

  console.log('\n📋 Campos encontrados:');
  Array.from(analysis.uniqueFields).forEach((field) => {
    const types = analysis.fieldTypes[field];
    console.log(`  - ${field}: ${Array.from(types).join(', ')}`);
  });

  console.log('\n🏢 Sources únicos:');
  Array.from(analysis.uniqueSources).forEach((source) => {
    console.log(`  - ${source}`);
  });

  console.log('\n📊 Registros por año:');
  Object.entries(analysis.recordsByYear)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([year, count]) => {
      console.log(`  - ${year}: ${count} registros`);
    });

  console.log('\n' + '='.repeat(60));
}

// Configuración
const config: BackupConfig = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/bcvdb',
  outputDir: path.join(process.cwd(), 'backups'),
  includeAnalysis: true,
};

// Ejecutar
backupDatabase(config)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });

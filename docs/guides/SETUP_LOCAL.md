# Configuración Local del Entorno

Guía para configurar el entorno de desarrollo local del servicio BCV.

## 📋 Prerrequisitos

- Node.js 18+ instalado
- pnpm instalado (`npm install -g pnpm`)
- MongoDB instalado localmente o acceso a instancia remota
- Git configurado

## 🚀 Setup Inicial

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd app-services/bcv-service
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar variables de entorno

**IMPORTANTE**: El archivo `.env` NO está en el repositorio por seguridad. Cada desarrollador debe crear el suyo.

```bash
# Copiar la plantilla
cp .env.example .env
```

### 4. Editar .env con tus credenciales

Abrir `.env` y configurar:

```bash
# Editar con tu editor preferido
nano .env
# o
code .env
# o
vim .env
```

**Configuración mínima requerida**:

```env
# Puerto del servidor
PORT=3000

# Modo de ambiente
NODE_ENV=development

# MongoDB - CAMBIAR con tus credenciales
MONGODB_URI=mongodb://TU_USER:TU_PASSWORD@TU_HOST:27017/bcvdb?authSource=bcvdb

# Modo de operación (false = solo consola, true = guarda en DB)
SAVE_TO_DATABASE=false

# URL del BCV (no cambiar a menos que sea necesario)
BCV_WEBSITE_URL=https://www.bcv.org.ve/

# Programación de scraping (2am, 10am, 6pm)
CRON_SCHEDULE=0 2,10,18 * * *
```

### 5. Configurar MongoDB (si usas local)

**Opción A: MongoDB local con Docker**:

```bash
docker run -d \
  --name mongodb-bcv \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=admin123 \
  mongo:latest

# Crear usuario y base de datos
docker exec -it mongodb-bcv mongosh admin -u admin -p admin123 --eval "
  db.createUser({
    user: 'bcv_user',
    pwd: 'tu_password_seguro',
    roles: [{role: 'readWrite', db: 'bcvdb'}]
  })
"
```

Luego en tu `.env`:
```env
MONGODB_URI=mongodb://bcv_user:tu_password_seguro@localhost:27017/bcvdb?authSource=admin
SAVE_TO_DATABASE=true
```

**Opción B: Sin MongoDB (modo consola)**:

```env
SAVE_TO_DATABASE=false
# MONGODB_URI puede quedar vacío o con valor dummy
```

### 6. Verificar configuración

```bash
# Verificar que el .env existe
ls -la .env

# Verificar que .env NO aparece en git
git status  # No debe aparecer .env

# Verificar que .env.example SÍ está trackeado
git ls-files | grep .env.example  # Debe aparecer
```

## ✅ Ejecutar el Proyecto

### Modo desarrollo (recomendado)

```bash
pnpm dev
```

Deberías ver:
```
[MODO CONSOLA] No se inicializa conexión a MongoDB (SAVE_TO_DATABASE=false)
Servidor BCV corriendo en puerto 3000
Tasa inicial obtenida: 36.15 (2025-11-11)
```

### Modo producción

```bash
# Compilar TypeScript
pnpm build

# Ejecutar build
pnpm start
```

## 🧪 Verificar que Funciona

### 1. Servidor corriendo
```bash
curl http://localhost:3000
# {"message":"Microservicio BCV Tasa de Cambio","status":"running"}
```

### 2. API endpoints (solo si SAVE_TO_DATABASE=true)
```bash
# Última tasa
curl http://localhost:3000/api/rate/latest

# Historial
curl http://localhost:3000/api/rate/history?limit=10

# Tasa por fecha
curl http://localhost:3000/api/rate/2025-11-11
```

### 3. WebSocket (opcional)
```javascript
const ws = new WebSocket('ws://localhost:3000');
ws.onmessage = (event) => {
  console.log('Rate update:', JSON.parse(event.data));
};
```

## 🔒 Seguridad - MUY IMPORTANTE

### ⚠️ NUNCA hagas esto:

```bash
# ❌ NUNCA agregar .env al repo
git add .env

# ❌ NUNCA commitear credenciales
git commit -m "add env"

# ❌ NUNCA compartir tu .env por email/slack/etc.
```

### ✅ Sí puedes hacer esto:

```bash
# ✅ Compartir .env.example actualizado
git add .env.example
git commit -m "docs: update env example with new variables"

# ✅ Documentar nuevas variables en README
# ✅ Usar gestores de secretos en producción
```

### 🛡️ Si accidentalmente commiteas .env:

```bash
# 1. Remover del staging
git reset HEAD .env

# 2. Si ya hiciste commit (NO PUSH)
git reset HEAD~1
git checkout .env

# 3. Si ya hiciste PUSH (CRÍTICO)
# Contactar al líder del equipo INMEDIATAMENTE
# Se deben rotar TODAS las credenciales
```

## 🐛 Troubleshooting

### Error: "Puerto 3000 ya en uso"

```bash
# Ver qué proceso usa el puerto
lsof -i :3000

# Matar el proceso
kill -9 <PID>

# O cambiar el puerto en .env
PORT=3001
```

### Error: "Cannot connect to MongoDB"

```bash
# Verificar que MongoDB está corriendo
docker ps | grep mongo
# o
mongosh --eval "db.version()"

# Verificar credenciales en .env
cat .env | grep MONGODB_URI

# Modo consola si no tienes MongoDB
echo "SAVE_TO_DATABASE=false" >> .env
```

### Error: "SSL Certificate verification failed"

Este error ya está resuelto en el código. Verifica:

```bash
# Debe estar en development
echo $NODE_ENV  # development

# En el .env
NODE_ENV=development  # permite certificados auto-firmados
```

### Error: "Module not found"

```bash
# Limpiar y reinstalar
rm -rf node_modules dist
pnpm install

# Verificar versión de Node
node --version  # debe ser 18+
```

## 📚 Recursos Adicionales

- **README.md**: Documentación completa del proyecto
- **MEJORAS.md**: Plan de mejoras y roadmap
- **QUICK_START.md**: Comandos rápidos
- **BRANCH_STRATEGY.md**: Estrategia de desarrollo

## 🤝 Contribuir

1. Lee **BRANCH_STRATEGY.md** para entender el workflow
2. Crea feature branch desde la fase correspondiente
3. Sigue las convenciones de commits semánticos
4. Ejecuta tests y linter antes de PR
5. Documenta cambios en variables de entorno en `.env.example`

## 📞 Ayuda

Si tienes problemas:
1. Revisa este documento completo
2. Verifica que tu `.env` tiene todas las variables de `.env.example`
3. Consulta el README.md
4. Pregunta al equipo

---

**Última actualización**: 2025-11-11
**Mantenido por**: Equipo BCV Service

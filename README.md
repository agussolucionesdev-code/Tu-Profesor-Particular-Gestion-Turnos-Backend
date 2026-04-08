# Tu Profesor Particular - Backend

API REST para reservas, portal del alumno y panel administrativo.

## Stack

- Node.js + Express
- MongoDB + Mongoose
- JWT para autenticacion admin
- Google Sheets opcional para respaldo operativo
- Nodemailer/Gmail opcional para emails

## Scripts

```bash
npm install
npm run dev
npm test
npm run create-admin
```

## Variables de entorno

Tomar como base `backend/.env.example`.

Obligatorias para produccion:

- `MONGO_URI`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

Opcionales:

- `GOOGLE_SHEET_ID`
- `GOOGLE_SHEET_TITLE`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `EMAIL_USER`
- `EMAIL_PASS`

Notas:

- `TRUST_PROXY=1` deja Express listo para Render u otro proxy.
- `/health` devuelve `503` si MongoDB no esta conectado.
- Si no configuras Google Sheets o Gmail, la API sigue funcionando.

## Despliegue recomendado

1. Crear un cluster en MongoDB Atlas y copiar la URI `mongodb+srv://...`.
2. Agregar en Atlas una IP Access List compatible con el hosting de la API.
3. Crear un repo GitHub solo para esta carpeta `backend`.
4. En Render crear un `Web Service` conectado a ese repo.
5. Usar:
   - Build Command: `npm ci`
   - Start Command: `npm start`
   - Health Check Path: `/health`
6. Cargar las variables de entorno del `.env.example`.
7. Configurar `CORS_ORIGIN` con la URL final del frontend.

Archivo incluido:

- `render.yaml`: deja listo runtime, health check y variables esperadas para Render Blueprint.

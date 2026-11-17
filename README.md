# Demo en Vivo: SignalR (ASP.NET Core) + React

Proyecto práctico para la exposición de **IS-912 Sistemas Expertos (Programación Web)** — **Grupo #3**.

## Requisitos
- **.NET SDK 10+** (`dotnet --version`)
- **Node.js 18+** y `npm`

## Cómo ejecutar la demo

### 1. Iniciar el Backend (.NET + SignalR)
```powershell
cd backend/SignalRDemo.Api
dotnet run
```
El servidor escuchará en `http://localhost:5000` y expondrá el Hub en `http://localhost:5000/hubs/notificaciones`.

### 2. Iniciar el Frontend (React + Vite)
En otra terminal:
```powershell
cd frontend
npm install
npm run dev
```
Se abrirá en `http://localhost:5173`.

## Cómo realizar la demostración en vivo (2 navegadores simultáneos)
1. Abrir **dos ventanas** en paralelo apuntando a `http://localhost:5173` (**Navegador A** y **Navegador B**, ej. Chrome normal + Ventana Incógnito o Edge).
2. Cambiar el campo **Nombre del cliente** en la primera ventana a `Navegador A` y en la segunda a `Navegador B`.
3. Abrir DevTools (`F12` → pestaña **Network**) en el Navegador B para evidenciar que no hay peticiones `GET` repetitivas (solo el `GET` inicial y la conexión WebSocket `/hubs/notificaciones`).
4. En el **Navegador A**, crear un nuevo hábito o presionar **Disparar Alerta a Todos los Clientes**.
5. Observar en el **Navegador B** cómo aparece el **Toast visual** y se actualiza la tabla y el monitor de eventos en milisegundos sin recargar la página.

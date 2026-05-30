# LocalChat

Sistema de chat privado para redes locales, diseñado para comunicación rápida sin depender de internet. Ideal para casas, oficinas, LAN parties o usar con Hamachi/ZeroTier.

## Instalación

### Requisitos
- Node.js 18+
- Navegador moderno (Chrome, Firefox, Edge)

### Pasos
```bash
git clone <repo> localchat
cd localchat
cd client && npm install && cd ../server && npm install && cd ..
```

### Ejecutar
```
iniciar.bat
```

O manualmente:
```bash
cd server && npm start
```

Luego abre `http://localhost:3000/app` o la IP local que se muestra en la consola.

## Funcionalidades

### Chat global
Todos los usuarios conectados se ven en el canal **General**. Los mensajes de usuarios registrados se guardan al reconectar.

### Chat privado
Haz clic en cualquier usuario de la lista **Conectados** para abrir un chat 1:1. Solo tú y el destinatario ven los mensajes. Si ambos son usuarios registrados, el historial se conserva.

### Canales (grupos) 🔒
Canales de chat grupales separados del chat global. El creador es admin y puede invitar a otros usuarios. Soporta contraseña opcional. Los canales protegidos se indican con un candado 🔒 y piden la contraseña al unirse.

### Salas de dados 🎲
Salas multijugador con tirada de dados (D20, D12, D10, D8, D6, D4, D100), chat integrado, turnos, reordenamiento de jugadores y sistema de invitación. Soporta contraseña opcional. Límite de 20 jugadores por sala.

### Sistema de iniciativa ⚔️
Integrado en las salas de dados. Usa una baraja de póker (52 cartas + 2 comodines) para determinar el orden de iniciativa. Cada jugador puede configurar opciones (Rápido, Temple, Temple Mejorado, Dubitativo, Terreno Predilecto) con exclusiones mutuas. Soporta NPCs/monstruos (prefijo `NPC:`) manejados por el admin. Al repartir, los jugadores con bonos pueden elegir carta. Al terminar la ronda, el turno avanza en round-robin hasta la siguiente ronda de iniciativa. Si sale un comodín, la baraja se baraja de nuevo.

### Indicadores de no leídos
- **Badge rojo** en el canal General al recibir mensajes globales.
- **Badge rojo** junto a un usuario cuando recibes un mensaje privado.
- **Badge rojo** junto a un canal/grupo al recibir mensajes de grupo.
- **Badge en pestañas Chats/Salas** cuando hay actividad en la sección que no estás viendo.

### Barra lateral colapsable
La sidebar puede ocultarse/mostrarse con el botón ◀/▶ fijo en el lateral. Útil en pantallas pequeñas o cuando necesitas más espacio para el chat.

### Estado de conexión
- Indicador verde/rojo en la sidebar
- Latencia en milisegundos (ping)

### Indicador "escribiendo..."
Cuando un usuario está escribiendo, aparece un aviso sobre el área de entrada.

### Avatares
- **Usuarios registrados**: pueden subir una imagen de avatar o elegir un color de una paleta.
- **Invitados**: avatar generado automáticamente con la inicial del nombre y un color basado en el nombre.
- Los avatares se muestran en la lista de usuarios, en cada mensaje y en las salas de dados.

### Configuración
Accesible desde el botón ⚙️ en la sidebar:
- **Sonido**: activar/desactivar sonido al recibir mensajes (Web Audio API, contexto único reutilizable).
- **Notificaciones**: activar/desactivar notificaciones de escritorio.
- **Avatar**: cambiar imagen o color (solo usuarios registrados).

### Archivos 📎
Arrastra, peza o sube archivos. Límite: 50MB. Tipos permitidos: imágenes, PDF, documentos, audio, video, comprimidos, texto y más. Solo usuarios registrados pueden subir archivos.

### Emojis
Selector de emojis integrado en el input de mensajes.

### Panel de Administración
Visible solo para el admin (el primer usuario registrado obtiene el rol automáticamente). Muestra la lista de usuarios registrados con su rol (Admin/Usuario/Invitado) y permite expulsarlos.

### Copia de seguridad de mensajes
Los usuarios registrados tienen persistencia de mensajes globales, privados y de grupo. Los invitados pierden el historial al reconectar.

### Búsqueda de mensajes 🔍
Campo de búsqueda en el encabezado del chat para filtrar mensajes por contenido en tiempo real, con botón de limpieza.

### Descubrimiento mDNS 📡
El servidor se anuncia automáticamente como `localchat.local` en la red.

## Seguridad

- **Autenticación**: JWT con expiración de 24h. Los tokens se invalidan al reiniciar el servidor si no hay `JWT_SECRET` configurado.
- **Contraseñas de salas/canales**: hasheadas con SHA-256 (no texto plano).
- **IDs de sala**: generadas con `crypto.randomBytes` (no predecibles).
- **Archivos**: validación de tipo MIME, autenticación requerida para subir, nombres aleatorios (sin path traversal).
- **CORS**: solo orígenes permitidos (localhost e IP local).
- **Headers de seguridad**: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`.
- **Validación**: username (3-20 chars, solo letras/números/guion bajo), contenido de mensajes acotado, límite de dados por tirada (100).
- **Error Boundary**: captura errores de renderizado en el cliente sin pantalla blanca.

## Tecnologías

- **Frontend**: React 18, Vite, Socket.IO Client
- **Backend**: Node.js, Express, Socket.IO, JWT, bcrypt, crypto
- **Almacenamiento**: JSON file (db.json), subida de archivos a disco
- **Estilos**: Inline styles, tema oscuro, animaciones CSS

## Archivos clave

```
server/
  src/
    server.js              # Servidor Express + Socket.IO + seguridad
    sockets/chat.js        # Eventos de socket (chat, typing, grupos, archivos)
    sockets/rooms.js       # Salas de dados con control de acceso
    db/database.js         # Base de datos JSON
    routes/avatar.js       # Subida y servicio de avatares
    routes/files.js        # Subida y descarga de archivos (con auth)
    auth/auth.js           # Autenticación (registro, login, admin automático)
    middleware/auth.js     # Middleware JWT
client/
  src/
    App.jsx                # Punto de entrada con ErrorBoundary
    pages/
      Login.jsx            # Pantalla de login/registro/invitado
      Chat.jsx             # Pantalla principal del chat
    components/
      Avatar.jsx           # Componente de avatar reutilizable
      MessageList.jsx      # Lista de mensajes (React.memo)
      UserList.jsx         # Lista de usuarios conectados
      ChatInput.jsx        # Input con emojis, archivos y typing
      ChannelsPanel.jsx    # Panel de canales (General + grupos)
      RoomsPanel.jsx       # Panel de salas de dados
      RoomView.jsx         # Vista de sala de dados
      DiceRoller.jsx       # Tirador de dados
      SettingsPanel.jsx    # Panel de configuración
      InitiativePanel.jsx  # Sistema de iniciativa
      EmojiPicker.jsx      # Selector de emojis
      ErrorBoundary.jsx    # Captura de errores de renderizado
      panelStyles.js       # Estilos compartidos entre paneles
    services/
      config.js            # Configuración centralizada (SERVER_URL)
      socket.js            # Conexión Socket.IO con ping
      socketEvents.js      # Eventos de socket (extraídos de Chat.jsx)
      avatar.js            # Utilidades de avatar
      theme.js             # Tema claro/oscuro
```

## Solución de problemas

**Error de conexión**: verifica que el servidor esté corriendo y que el puerto 3000 esté accesible.

**Archivos grandes**: el límite es 50MB. Si necesitas más, cambia `limits.fileSize` y `ALLOWED_MIMES` en `server/src/routes/files.js`.

**Subida de archivos**: solo usuarios registrados pueden subir archivos. Los invitados verán un mensaje pidiendo que se registren.

**Variables de entorno** (opcionales):
- `JWT_SECRET`: clave secreta para tokens JWT. Si no se define, se genera una automática al arrancar.
- `PORT`: puerto del servidor (por defecto 3000).
- `VITE_SERVER_URL`: URL del servidor para el cliente (útil si el frontend se sirve desde otro puerto).

**IP local**: edita `server/config.json` con la IP correcta de tu red local.

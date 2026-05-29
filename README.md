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
Haz clic en cualquier usuario de la lista para abrir un chat 1:1. Solo tú y el destinatario ven los mensajes. Si ambos son usuarios registrados, el historial se conserva.

### Salas de dados 🎲
Salas multijugador con tirada de dados (D20, D12, D10, D8, D6, D4, D100, D2), chat integrado, turnos, reordenamiento drag & drop y sistema de invitación.

### Grupos privados 💬
Canales de chat grupales separados del chat global. El creador es admin y puede invitar a otros usuarios. Los miembros pueden enviar y recibir mensajes en el grupo. Ideal para conversaciones paralelas.

### Estado de conexión
- Indicador verde/rojo en la sidebar
- Latencia en milisegundos (ping)

### Indicador "escribiendo..."
Cuando un usuario está escribiendo, aparece un aviso "X está escribiendo..." sobre el área de entrada.

### Avatares
- **Usuarios registrados**: pueden subir una imagen de avatar o elegir un color de una paleta.
- **Invitados**: avatar generado automáticamente con la inicial del nombre y un color basado en el nombre.
- Los avatares se muestran en la lista de usuarios, en cada mensaje y en las salas de dados.

### Configuración
Accesible desde el botón ⚙️ en la sidebar:
- **Sonido**: activar/desactivar sonido al recibir mensajes (generado vía Web Audio API).
- **Notificaciones**: activar/desactivar notificaciones de escritorio (Notification API).
- **Avatar**: cambiar imagen o color (solo usuarios registrados).

### Archivos
Arrastra, pega o sube archivos usando el botón 📎. Los archivos se almacenan en el servidor y se comparten en el chat. Límite: 100MB.

### Emojis
Selector de emojis integrado en el input de mensajes.

### Panel de Administración
Los usuarios con rol `admin` ven un panel en la sidebar para gestionar usuarios: listar todos los usuarios registrados y expulsarlos.

### Copia de seguridad de mensajes
Los usuarios registrados tienen persistencia de mensajes globales, privados y de grupo. Los invitados pierden el historial al reconectar.

### Portapapeles compartido 📋
Comparte el contenido de tu portapapeles con todos los usuarios de la red con un solo clic. Los items compartidos aparecen en un panel lateral y pueden copiarse al portapapeles local con un clic.

### Búsqueda de mensajes 🔍
Campo de búsqueda en el encabezado del chat para filtrar mensajes por contenido en tiempo real.

### Descubrimiento mDNS 📡
El servidor se anuncia automáticamente como `localchat.local` en la red. Los clientes compatibles pueden descubrirlo sin necesidad de saber la IP.

## Tecnologías

- **Frontend**: React 18, Vite, Socket.IO Client
- **Backend**: Node.js, Express, Socket.IO, JWT, bcrypt
- **Almacenamiento**: JSON file (db.json), subida de archivos a disco
- **Estilos**: Inline styles (tema oscuro)

## Archivos clave
```
server/
  src/
    server.js          # Servidor Express + Socket.IO
    sockets/chat.js    # Eventos de socket (chat, typing, grupos)
    sockets/rooms.js   # Salas de dados
    db/database.js     # Base de datos JSON
    routes/avatar.js   # Subida y servicio de avatares
    routes/files.js    # Subida y descarga de archivos
    auth/auth.js       # Autenticación (registro, login)
client/
  src/
    App.jsx            # Punto de entrada
    pages/
      Login.jsx        # Pantalla de login/registro/invitado
      Chat.jsx         # Pantalla principal del chat
    components/
      Avatar.jsx       # Componente de avatar reutilizable
      MessageList.jsx  # Lista de mensajes con avatares
      UserList.jsx     # Lista de usuarios con avatares
      ChatInput.jsx    # Input con emojis, archivos y typing
      SettingsPanel.jsx # Panel de configuración
      GroupsPanel.jsx  # Panel de grupos privados
      RoomsPanel.jsx   # Panel de salas de dados
      RoomView.jsx     # Vista de sala de dados
      DiceRoller.jsx   # Tirador de dados
      EmojiPicker.jsx  # Selector de emojis
      ClipboardPanel.jsx  # Portapapeles compartido
    services/
      socket.js        # Conexión Socket.IO con ping
      avatar.js        # Utilidades de avatar
```

## Solución de problemas

**Error de conexión**: verifica que el servidor esté corriendo y que el puerto 3000 esté accesible.

**Archivos grandes**: el límite es 100MB. Si necesitas más, cambia `limits.fileSize` en `server/src/routes/files.js`.

**Variables de entorno** (opcionales):
- `JWT_SECRET`: clave secreta para tokens JWT. Si no se define, se genera una automática al arrancar.
- `PORT`: puerto del servidor (por defecto 3000).
- `VITE_SERVER_URL`: URL del servidor para el cliente (útil si el frontend se sirve desde otro puerto).

**IP local**: edita `server/config.json` con la IP correcta de tu red local.

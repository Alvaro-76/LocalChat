const spec = {
  openapi: '3.0.0',
  info: {
    title: 'LocalChat API',
    version: '1.0.0',
    description: 'API del servidor de chat local. Proporciona autenticación, subida de archivos y avatares.',
    contact: { name: 'LocalChat' }
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Servidor local' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { error: { type: 'string' } }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          username: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'user'] },
          avatar: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['color', 'image'] },
              color: { type: 'string' },
              path: { type: 'string' }
            }
          }
        }
      },
      AuthResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'JWT (expira 24h)' },
          user: { '$ref': '#/components/schemas/User' }
        }
      },
      RegisterRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 20 },
          password: { type: 'string', minLength: 4 }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string' }
        }
      },
      AvatarUploadResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          avatar: {
            type: 'object',
            properties: {
              type: { type: 'string', example: 'image' },
              path: { type: 'string', example: 'a1b2c3d4-1717200000000.jpg' }
            }
          }
        }
      },
      FileUploadResponse: {
        type: 'object',
        properties: {
          fileId: { type: 'string', example: 'ae1955dd0539c48b' },
          fileName: { type: 'string', example: 'documento.pdf' },
          fileSize: { type: 'integer', example: 65895 },
          mimeType: { type: 'string', example: 'application/pdf' }
        }
      }
    }
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Autenticación'],
        summary: 'Registrar un nuevo usuario',
        description: 'El primer usuario registrado obtiene rol "admin". Los siguientes obtienen rol "user".',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/RegisterRequest' },
              example: { username: 'usuario1', password: 'miPassword123' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Usuario registrado exitosamente',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/AuthResponse' } } }
          },
          '400': {
            description: 'Datos inválidos',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } }
          },
          '409': {
            description: 'El usuario ya existe',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } }
          },
          '500': {
            description: 'Error del servidor',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } }
          }
        }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Autenticación'],
        summary: 'Iniciar sesión',
        description: 'Autentica un usuario existente y devuelve un token JWT.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/LoginRequest' },
              example: { username: 'usuario1', password: 'miPassword123' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Inicio de sesión exitoso',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/AuthResponse' } } }
          },
          '400': {
            description: 'Datos incompletos',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } }
          },
          '401': {
            description: 'Credenciales inválidas',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } }
          },
          '500': {
            description: 'Error del servidor',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } }
          }
        }
      }
    },
    '/api/avatar/upload': {
      post: {
        tags: ['Avatares'],
        summary: 'Subir avatar',
        description: 'Sube una imagen de avatar para el usuario autenticado. Máx 5 MB. Extensiones: jpg, png, gif, webp.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  avatar: { type: 'string', format: 'binary', description: 'Archivo de imagen' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Avatar subido exitosamente',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/AvatarUploadResponse' } } }
          },
          '400': {
            description: 'No se envió ningún archivo',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } }
          },
          '401': {
            description: 'Token requerido o inválido',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } }
          }
        }
      }
    },
    '/api/avatar/{username}': {
      get: {
        tags: ['Avatares'],
        summary: 'Obtener avatar de un usuario',
        description: 'Devuelve la imagen del avatar de un usuario.',
        parameters: [
          { in: 'path', name: 'username', required: true, schema: { type: 'string' }, description: 'Nombre de usuario' }
        ],
        responses: {
          '200': {
            description: 'Imagen del avatar',
            content: { 'image/*': { schema: { type: 'string', format: 'binary' } } }
          },
          '404': {
            description: 'No avatar',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } }
          }
        }
      }
    },
    '/api/files/upload': {
      post: {
        tags: ['Archivos'],
        summary: 'Subir archivo',
        description: 'Sube un archivo adjunto. Máx 50 MB. Tipos: imágenes, documentos, audio, video.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: { type: 'string', format: 'binary', description: 'Archivo a subir' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Archivo subido exitosamente',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/FileUploadResponse' } } }
          },
          '400': {
            description: 'No se envió ningún archivo o tipo no permitido',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } }
          },
          '401': {
            description: 'Token requerido o inválido',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } }
          }
        }
      }
    },
    '/api/files/{id}/{filename}': {
      get: {
        tags: ['Archivos'],
        summary: 'Ver archivo',
        description: 'Obtiene un archivo subido para visualizarlo (inline).',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'ID del archivo' },
          { in: 'path', name: 'filename', required: true, schema: { type: 'string' }, description: 'Nombre del archivo con extensión' }
        ],
        responses: {
          '200': { description: 'Contenido del archivo' },
          '400': {
            description: 'Parámetros inválidos',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } }
          },
          '404': {
            description: 'Archivo no encontrado',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } }
          }
        }
      }
    },
    '/api/files/{id}/{filename}/download': {
      get: {
        tags: ['Archivos'],
        summary: 'Descargar archivo',
        description: 'Fuerza la descarga de un archivo (Content-Disposition: attachment).',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'ID del archivo' },
          { in: 'path', name: 'filename', required: true, schema: { type: 'string' }, description: 'Nombre del archivo con extensión' }
        ],
        responses: {
          '200': { description: 'Archivo descargado' },
          '400': {
            description: 'Parámetros inválidos',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } }
          },
          '404': {
            description: 'Archivo no encontrado',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } }
          }
        }
      }
    },
    '/api/webdownload': {
      get: {
        tags: ['Otros'],
        summary: 'Redirigir a la app',
        description: 'Redirige al cliente web en /app.',
        responses: {
          '302': { description: 'Redirección a /app' }
        }
      }
    }
  }
};

module.exports = spec;

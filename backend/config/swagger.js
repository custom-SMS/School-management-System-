const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'School Management System API',
      version: '1.0.0',
      description: 'API Documentation for the School Management System Backend',
    },
    servers: [
      {
        url: 'http://localhost:8000/api',
        description: 'Local Development Server',
      },
      {
        url: 'http://localhost:5000/api',
        description: 'Alternative Local Port',
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Provide your JWT token here. Alternatively, the application relies on an httpOnly cookie (token) set upon login.',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
          description: 'Automatically set when you log in via /auth/login'
        }
      },
    },
    security: [
      {
        bearerAuth: [],
      },
      {
        cookieAuth: [],
      }
    ],
  },
  apis: ['./routes/*.js'], // Scan all route files for OpenAPI annotations
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

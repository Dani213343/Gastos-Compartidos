# 💰 Gastos Compartidos

## Descripción

Gastos Compartidos es una aplicación web desarrollada como proyecto académico, cuyo propósito es facilitar la gestión y organización de gastos compartidos entre diferentes usuarios.

La aplicación permite a los usuarios registrarse, iniciar sesión, crear y gestionar grupos, registrar gastos y consultar información relacionada con los gastos propios y de los grupos a los que pertenecen.

El sistema está compuesto por un frontend y un backend que se comunican mediante servicios y APIs para gestionar la información de la aplicación.

## Objetivo

Desarrollar una aplicación web que permita gestionar de manera organizada los gastos compartidos entre diferentes usuarios, centralizando la información relacionada con grupos, gastos y otros elementos asociados.

## Funcionalidades

- Registro e inicio de sesión de usuarios.
- Creación y gestión de grupos.
- Registro de gastos.
- Actualización y eliminación de gastos.
- Consulta de gastos personales y grupales.
- Gestión de facturas.
- Gestión de tarjetas.
- Gestión de alertas.
- Autenticación y control de acceso.
- Gestión de roles dentro de los grupos.
- Interfaz web para la interacción con el sistema.

## Tecnologías utilizadas

### Frontend

- React
- JavaScript
- Tailwind CSS
- PostCSS

### Backend

- Node.js
- Express
- MongoDB
- Jest

## Estructura del proyecto

```text
Logeo/
│
├── backend/
│   ├── application/
│   ├── config/
│   ├── controllers/
│   ├── domain/
│   ├── infrastructure/
│   ├── kernel/
│   ├── middleware/
│   ├── models/
│   ├── plugins/
│   ├── routes/
│   ├── tests/
│   ├── utils/
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
│
└── .gitignore
````

## Arquitectura

El backend se encuentra organizado en diferentes componentes que permiten separar las responsabilidades del sistema.

### Application

Contiene los casos de uso relacionados con las principales operaciones de la aplicación, como la creación, actualización, eliminación y consulta de gastos.

### Domain

Contiene las entidades y repositorios relacionados con el dominio de la aplicación.

### Controllers

Gestiona las solicitudes realizadas por el frontend y coordina la ejecución de las operaciones correspondientes.

### Routes

Define las rutas y endpoints disponibles para la comunicación con el backend.

### Models

Contiene los modelos utilizados para representar la información gestionada por el sistema.

### Infrastructure

Contiene componentes relacionados con la persistencia de información y servicios externos.

### Middleware

Contiene funcionalidades utilizadas durante el procesamiento de las solicitudes, incluyendo autenticación, validaciones y manejo de errores.

## Instalación

### Requisitos

Para ejecutar el proyecto se requiere:

* Node.js
* npm
* MongoDB

### Clonar el repositorio

```bash
git clone https://github.com/Dani213343/Logeo.git
```

### Backend

Ingresar a la carpeta:

```bash
cd backend
```

Instalar las dependencias:

```bash
npm install
```

Configurar las variables de entorno necesarias en un archivo `.env`.

Iniciar el servidor:

```bash
npm start
```

### Frontend

Desde la carpeta principal:

```bash
cd frontend
```

Instalar las dependencias:

```bash
npm install
```

Ejecutar la aplicación:

```bash
npm start
```

## Pruebas

El backend cuenta con pruebas organizadas en diferentes niveles:

```text
backend/tests/
├── functional/
├── integration/
└── unit/
```

Para ejecutar las pruebas:

```bash
cd backend
npm test
```

## Contexto académico

Este proyecto fue desarrollado como parte de un proyecto académico, aplicando conceptos relacionados con el desarrollo de aplicaciones web, arquitectura de software, desarrollo frontend y backend, gestión de bases de datos y pruebas de software.

## Equipo de desarrollo

Proyecto desarrollado por:

* Ana Amador
* Alan Osorio
* Jefferson Gutiérrez
* Daniela López

## nformación académica

**Proyecto:** Gastos Compartidos

**Tipo de proyecto:** Proyecto académico

**Asignatura:** Arquitectura de Software

**Institución:** Universidad Sergio Arboleda

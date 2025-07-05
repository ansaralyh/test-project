# Automation Hub - Unified Repository

This repository contains the complete automation hub system with all components consolidated into a single repository structure.

## Project Structure

```
automation-hub-unified/
├── backend/                    # Go backend service
├── frontend/                   # Angular frontend application
├── gate/                      # API gateway configuration
├── idp/                       # Identity provider service
├── kafka/                     # Kafka configuration
├── nginx-config-manager/      # Nginx configuration manager
├── docs/                      # Documentation
├── generic-auto/              # Generic automation scripts
├── nginx-config/              # Nginx configurations
├── docker-compose.yml         # Main docker compose file
├── makefile                   # Build automation
└── init.sql                   # Database initialization

```

## Components

### Backend (`/backend`)
Go-based backend service providing the core API functionality.

### Frontend (`/frontend`) 
Angular-based web application providing the user interface.

### Gate (`/gate`)
API gateway configuration for routing and load balancing.

### Identity Provider (`/idp`)
Authentication and authorization service.

### Kafka (`/kafka`)
Message broker configuration for event-driven communication.

### Nginx Config Manager (`/nginx-config-manager`)
Service for managing nginx configurations dynamically.

## Getting Started

1. Clone this repository
2. Run `make` to see available build commands
3. Use `docker-compose up` to start all services
4. Access the application through the configured gateway

## Development

Each component maintains its own build configuration and can be developed independently while being part of the unified repository structure.

## License

See LICENSE file for details.


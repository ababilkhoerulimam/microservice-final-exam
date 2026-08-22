<div align="center">

# Academic Microservices System

![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Docker Compose](https://img.shields.io/badge/Docker_Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)

<p>A containerized academic microservices architecture built with Docker Compose, Nginx API Gateway, Node.js, Express, MongoDB, and JWT authentication.</p>

</div>

## System Architecture

```
                      +-----------------------------+
                      |   Client / Thunder Client   |
                      +-----------------------------+
                                     |
                                     | HTTP :8081
                                     v
                 +---------------------------------------+
                 |       api-gateway (Nginx Alpine)      |
                 |      Internal Port: 80 -> Host: 8081  |
                 +---------------------------------------+
                     |                               |
          /api/auth/ |                   /api/score/ |
                     v                               v
       +----------------------------+   +----------------------------+
       |   auth-service (Node.js)   |   |  score-service (Node.js)   |
       |         Port: 3001         |   |         Port: 3002         |
       |  Limit: 0.5 CPU, 512MB RAM |   +----------------------------+
       +----------------------------+
                     |
                     | mongodb://auth-db:27017/auth
                     v
       +----------------------------+
       |     auth-db (Mongo 6.0)    |
       | Volume: ./auth-data:/data/db|
       +----------------------------+
```

All containers communicate securely over an isolated internal bridge network (`academic-net`) with a custom subnet (`172.16.0.0/28`).

## Specifications & Requirements

### 1. Mandatory Requirements
- **Internal Networking:** Bridge network driver named `academic-net`.
- **Data Persistence (Volumes):** Host directory `./auth-data` mapped to `/data/db` for MongoDB data persistence.
- **API Gateway Service:**
  - Image: `nginx:alpine`
  - Container name: `api-gateway`
  - Read-only volume mount: `./nginx.conf` -> `/etc/nginx/nginx.conf:ro`
  - Dependency: `depends_on: [auth-service, score-service]`
  - Connected to `academic-net`.
- **Authentication Service:**
  - Container name: `auth-service`
  - Dependency: `depends_on: [auth-db]`
  - Connected to `academic-net`.
  - Environment variables: `NODE_ENV=development`, `PORT=3001`, `MONGO_URI=mongodb://auth-db:27017/auth`, and `JWT_SECRET`.
- **Authentication Database:**
  - Image: `mongo:6.0`
  - Container name: `auth-db`
  - Connected to `academic-net`.
  - Persistent volume mapping from `./auth-data` to `/data/db`.
- **Score Service:**
  - REST API on `score-service` calculating student Semester GPA (IPS) based on course credits and letter grades.

### 2. Optional / Bonus Requirements
- **Custom Subnet:** Isolated IPAM subnet `172.16.0.0/28`.
- **API Gateway Exposed Port:** Host port routed to `8081` (`"8081:80"`).
- **Resource Limits:** `auth-service` constrained to 0.5 virtual CPU cores and 512 MB RAM.
- **Database Auto-restart:** Configured with `restart: unless-stopped`.

## Getting Started

### Prerequisites
- Docker Engine and Docker Compose installed.

### 1. Start Services
Run the following command from the project root:
```bash
docker-compose up --build -d
```

### 2. Verify Container Status
```bash
docker-compose ps
```
All services (`api-gateway`, `auth-service`, `auth-db`, `score-service`) should be in the running / Up state.

### 3. Stop Services
```bash
docker-compose down
```

## API Documentation

All requests are routed through the API Gateway on host port `8081`.

### 1. Gateway Status
- **Method:** `GET`
- **URL:** `http://localhost:8081/`
- **Response:**
```json
{
  "status": "online",
  "gateway": "Academic Microservice API Gateway",
  "version": "1.0.0",
  "endpoints": {
    "auth": "/api/auth/",
    "score": "/api/score/"
  }
}
```

### 2. Authentication Service (`auth-service`)

#### A. Register Student Account
- **Method:** `POST`
- **URL:** `http://localhost:8081/api/auth/register`
- **Headers:** `Content-Type: application/json`
- **Body:**
```json
{
  "nim": "23051204001",
  "name": "Budi Santoso",
  "email": "budi@mhs.unesa.ac.id",
  "password": "passwordRahasia123"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "Registrasi berhasil!",
  "data": {
    "id": "66c7...",
    "nim": "23051204001",
    "name": "Budi Santoso",
    "email": "budi@mhs.unesa.ac.id",
    "role": "student",
    "createdAt": "2026-08-22T..."
  }
}
```

#### B. Login
- **Method:** `POST`
- **URL:** `http://localhost:8081/api/auth/login`
- **Headers:** `Content-Type: application/json`
- **Body:**
```json
{
  "nim": "23051204001",
  "password": "passwordRahasia123"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Login berhasil!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "id": "66c7...",
    "nim": "23051204001",
    "name": "Budi Santoso",
    "email": "budi@mhs.unesa.ac.id",
    "role": "student"
  }
}
```

#### C. User Profile (Protected Route)
- **Method:** `GET`
- **URL:** `http://localhost:8081/api/auth/me`
- **Headers:** `Authorization: Bearer <JWT_TOKEN_FROM_LOGIN>`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "66c7...",
    "nim": "23051204001",
    "name": "Budi Santoso",
    "email": "budi@mhs.unesa.ac.id",
    "role": "student",
    "createdAt": "2026-08-22T..."
  }
}
```

### 3. Score Service (`score-service`)

#### A. Grade Scale Reference
- **Method:** `GET`
- **URL:** `http://localhost:8081/api/score/grades-scale`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "A": 4.00,
    "A-": 3.75,
    "B+": 3.50,
    "B": 3.00,
    "B-": 2.75,
    "C+": 2.50,
    "C": 2.00,
    "D": 1.00,
    "E": 0.00
  }
}
```

#### B. Calculate Semester GPA (IPS)
- **Method:** `POST`
- **URL:** `http://localhost:8081/api/score/calculate-ips`
- **Headers:** `Content-Type: application/json`
- **Body:**
```json
{
  "nim": "23051204001",
  "student_name": "Budi Santoso",
  "semester": 3,
  "courses": [
    { "code": "DS101", "name": "Computer Architecture & Operating Systems", "sks": 3, "grade": "A" },
    { "code": "DS102", "name": "Database Systems", "sks": 3, "grade": "B+" },
    { "code": "DS103", "name": "Web & Microservice Programming", "sks": 3, "grade": "A" },
    { "code": "DS104", "name": "Computational Statistics", "sks": 3, "grade": "A-" },
    { "code": "DS105", "name": "Algorithms & Data Structures", "sks": 4, "grade": "B" },
    { "code": "DS106", "name": "Artificial Intelligence", "sks": 3, "grade": "B+" }
  ]
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Perhitungan IPS berhasil.",
  "data": {
    "student": {
      "nim": "23051204001",
      "name": "Budi Santoso"
    },
    "semester": 3,
    "summary": {
      "total_matakuliah": 6,
      "total_sks": 19,
      "total_sks_lulus": 19,
      "total_mutu": 69.75,
      "ips": 3.67,
      "predikat": "Dengan Pujian (Cumlaude)",
      "max_sks_semester_berikutnya": 24
    },
    "courses": [
      { "code": "DS101", "name": "Computer Architecture & Operating Systems", "sks": 3, "grade": "A", "point": 4, "mutu": 12, "is_passed": true },
      { "code": "DS102", "name": "Database Systems", "sks": 3, "grade": "B+", "point": 3.5, "mutu": 10.5, "is_passed": true },
      { "code": "DS103", "name": "Web & Microservice Programming", "sks": 3, "grade": "A", "point": 4, "mutu": 12, "is_passed": true },
      { "code": "DS104", "name": "Computational Statistics", "sks": 3, "grade": "A-", "point": 3.75, "mutu": 11.25, "is_passed": true },
      { "code": "DS105", "name": "Algorithms & Data Structures", "sks": 4, "grade": "B", "point": 3, "mutu": 12, "is_passed": true },
      { "code": "DS106", "name": "Artificial Intelligence", "sks": 3, "grade": "B+", "point": 3.5, "mutu": 10.5, "is_passed": true }
    ]
  }
}
```

## Testing with VS Code Extensions
1. **Thunder Client / Postman:** Send requests to `http://localhost:8081` using the documented payloads above.
2. **Docker Extension:** Monitor container lifecycles, view logs, or attach to container shells.
<div align="center">
  <h1>Academic Microservices System</h1>
  <p><strong>Containerized Multi-Service Academic Management and Evaluation Platform</strong></p>

  <p align="center">
    <img src="https://img.shields.io/badge/Architecture-Microservices-blue?style=flat-square" alt="Architecture">
    <img src="https://img.shields.io/badge/Language-Node.js_18-339933?style=flat-square&logo=node.js&logoColor=white" alt="Language">
    <img src="https://img.shields.io/badge/Database-MongoDB_6.0-47A248?style=flat-square&logo=mongodb&logoColor=white" alt="Database">
    <img src="https://img.shields.io/badge/Status-Active-success?style=flat-square" alt="Status">
  </p>

  <p align="center">
    A containerized academic microservices architecture built with Docker Compose, Nginx API Gateway, Node.js, Express, MongoDB, and JWT authentication.
  </p>
</div>

## Tech Stack

![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![Nginx](https://img.shields.io/badge/nginx-%23009639.svg?style=for-the-badge&logo=nginx&logoColor=white)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![Git](https://img.shields.io/badge/git-%23F05033.svg?style=for-the-badge&logo=git&logoColor=white)

## System Architecture

The application is structured into four containerized services orchestrated via Docker Compose:

1. **Client Layer:** External requests from browsers, Postman, or Thunder Client connect to the host port `8081`.
2. **API Gateway (`api-gateway`):** An Nginx Alpine reverse proxy running on container port `80` that routes traffic based on path prefixes:
   - Routes `/api/auth/` requests to `http://auth-service:3001/`
   - Routes `/api/score/` requests to `http://score-service:3002/`
   - Serves general gateway health information on the root path `/`
3. **Authentication Service (`auth-service`):** A Node.js and Express REST API operating on port `3001`. It handles student registration, credential hashing with bcrypt, user authentication, and JSON Web Token (JWT) generation. It is subject to resource limits of 0.5 CPU core and 512 MB RAM.
4. **Database (`auth-db`):** A MongoDB 6.0 instance operating on default port `27017` with data persistence mapped to the host directory `./auth-data`.
5. **Score Service (`score-service`):** An independent Node.js and Express REST API on port `3002` that calculates student Semester GPA (Indeks Prestasi Semester / IPS), determining course grade points, total credit weight, academic honors (predikat), and maximum credit allowance for subsequent semesters.
6. **Network Isolation (`academic-net`):** All containers communicate internally across a dedicated Docker bridge network with a custom IPAM subnet configuration (`172.16.0.0/28`).

## Specifications and Requirements

### 1. Mandatory Requirements
- **Internal Networking:** Bridge network driver named `academic-net`.
- **Data Persistence (Volumes):** Host directory `./auth-data` mapped to `/data/db` for MongoDB data persistence.
- **API Gateway Service:**
  - Image: `nginx:alpine`
  - Container name: `api-gateway`
  - Read-only volume mount: `./api-gateway/nginx.conf` to `/etc/nginx/nginx.conf:ro`
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

### 2. Optional and Bonus Requirements
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
All services (`api-gateway`, `auth-service`, `auth-db`, `score-service`) should show running status.

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
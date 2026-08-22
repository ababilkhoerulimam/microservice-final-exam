<div align="center">

# Microservice Academic System

![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Docker Compose](https://img.shields.io/badge/Docker_Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)

<p>Implementasi arsitektur microservices menggunakan Docker dan Docker Compose untuk sistem informasi akademik sederhana, mencakup autentikasi akun dan kalkulasi IPS (Indeks Prestasi Semester) mahasiswa.</p>

</div>

## Arsitektur Sistem

```
                      +-----------------------------+
                      |   Client / Thunder Client   |
                      +-----------------------------+
                                     |
                                     | HTTP :8081
                                     v
                 +---------------------------------------+
                 |       api-gateway (Nginx Alpine)      |
                 |      Port internal: 80 -> Host: 8081  |
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

Seluruh container terhubung dalam satu jaringan internal bridge (`academic-net`) dengan isolasi subnet `172.16.0.0/28`.

## Pemenuhan Spesifikasi Soal UAS

### 1. Task Wajib
- **Internal Networking:** Menggunakan driver `bridge` dengan nama kustom `academic-net`.
- **Volumes:** Persistensi data didefinisikan untuk folder `./auth-data` ke `/data/db`.
- **Sub-layanan API Gateway:**
  - Image: `nginx:alpine`
  - Nama container: `api-gateway`
  - Mapping volume: `./nginx.conf` -> `/etc/nginx/nginx.conf` dengan mode read-only (`:ro`).
  - Dependensi: `depends_on: [auth-service, score-service]`
  - Terhubung ke `academic-net`.
- **Sub-layanan Auth:**
  - Nama container: `auth-service`
  - Dependensi: `depends_on: [auth-db]`
  - Terhubung ke `academic-net`.
  - Environment variables: `NODE_ENV=development`, `PORT=3001`, `MONGO_URI=mongodb://auth-db:27017/auth`, `JWT_SECRET`.
- **Sub-layanan DB Auth:**
  - Image: `mongo:6.0`
  - Nama container: `auth-db`
  - Terhubung ke `academic-net`.
  - Mapping folder `./auth-data` ke `/data/db`.
- **Sub-layanan Penilaian:**
  - Pemrograman API pada `score-service` untuk menghitung IPS mahasiswa berdasarkan SKS dan nilai huruf.

### 2. Task Opsional (Bonus)
- **Internal Networking Subnet:** Subnet kustom `172.16.0.0/28` via konfigurasi IPAM.
- **API Gateway Exposed Port:** Port host diarahkan ke `8081` (`"8081:80"`).
- **Resource Limits Auth Service:** CPU dibatasi 0.5 virtual core dan RAM 512 MB.
- **Auto-restart DB Auth:** Kebijakan `restart: unless-stopped`.

## Panduan Menjalankan Layanan

### Prasyarat
- Docker Engine dan Docker Compose sudah terpasang di sistem.

### 1. Menjalankan Seluruh Service
Jalankan perintah berikut di direktori root proyek:
```bash
docker-compose up --build -d
```

### 2. Memeriksa Status Container
```bash
docker-compose ps
```
Semua container (`api-gateway`, `auth-service`, `auth-db`, `score-service`) harus berstatus running / Up.

### 3. Menghentikan Layanan
```bash
docker-compose down
```

## Dokumentasi API Endpoint

Seluruh request dikirim melalui API Gateway pada host port `8081`.

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

### 2. Sub-layanan Autentikasi (`auth-service`)

#### A. Registrasi Akun Mahasiswa
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

#### B. Login Mahasiswa
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

#### C. Profil Pengguna (Endpoint Terproteksi)
- **Method:** `GET`
- **URL:** `http://localhost:8081/api/auth/me`
- **Headers:** `Authorization: Bearer <TOKEN_JWT_DARI_LOGIN>`
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

### 3. Sub-layanan Penilaian (`score-service`)

#### A. Informasi Skala Bobot Nilai
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

#### B. Hitung IPS (Indeks Prestasi Semester) Mahasiswa
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
    { "code": "DS101", "name": "Arsitektur Komputer & Sistem Operasi", "sks": 3, "grade": "A" },
    { "code": "DS102", "name": "Basis Data", "sks": 3, "grade": "B+" },
    { "code": "DS103", "name": "Pemrograman Web & Microservice", "sks": 3, "grade": "A" },
    { "code": "DS104", "name": "Statistika Komputasi", "sks": 3, "grade": "A-" },
    { "code": "DS105", "name": "Algoritma & Struktur Data", "sks": 4, "grade": "B" },
    { "code": "DS106", "name": "Kecerdasan Buatan", "sks": 3, "grade": "B+" }
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
      { "code": "DS101", "name": "Arsitektur Komputer & Sistem Operasi", "sks": 3, "grade": "A", "point": 4, "mutu": 12, "is_passed": true },
      { "code": "DS102", "name": "Basis Data", "sks": 3, "grade": "B+", "point": 3.5, "mutu": 10.5, "is_passed": true },
      { "code": "DS103", "name": "Pemrograman Web & Microservice", "sks": 3, "grade": "A", "point": 4, "mutu": 12, "is_passed": true },
      { "code": "DS104", "name": "Statistika Komputasi", "sks": 3, "grade": "A-", "point": 3.75, "mutu": 11.25, "is_passed": true },
      { "code": "DS105", "name": "Algoritma & Struktur Data", "sks": 4, "grade": "B", "point": 3, "mutu": 12, "is_passed": true },
      { "code": "DS106", "name": "Kecerdasan Buatan", "sks": 3, "grade": "B+", "point": 3.5, "mutu": 10.5, "is_passed": true }
    ]
  }
}
```

## Pengujian dengan VS Code Extension
1. **Thunder Client / Postman:** Kirim request ke `http://localhost:8081` sesuai rincian payload di atas.
2. **Docker Extension:** Pantau container lifecycle, logs, atau gunakan fitur Exec untuk inspeksi container.
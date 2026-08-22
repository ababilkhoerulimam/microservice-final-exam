# Microservice Academic System (UAS Arsitektur Komputer & Sistem Operasi)

Proyek ini merupakan implementasi arsitektur **Microservices** menggunakan **Docker & Docker Compose** untuk sistem akademik sederhana (Otentikasi Akun & Perhitungan IPS Mahasiswa).

---

## 🏛️ Arsitektur Sistem

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

Seluruh *container* terhubung dalam satu jaringan internal bridge (`academic-net`) dengan isolasi subnet khusus `172.16.0.0/28`.

---

## ✅ Ketercapaian Spesifikasi Soal UAS

### 1. Task Wajib (Mandatory Tasks - 30%)
* [x] **Internal Networking:** Menggunakan driver `bridge` dengan nama kustom `academic-net`.
* [x] **Volumes:** Persistensi data didefinisikan untuk folder `./auth-data` ke `/data/db`.
* [x] **Sub-layanan API Gateway:**
  * Image: `nginx:alpine`
  * Nama container: `api-gateway`
  * Mapping volume: `./nginx.conf` $\rightarrow$ `/etc/nginx/nginx.conf` dengan mode **read-only** (`:ro`).
  * Dependensi: `depends_on: [auth-service, score-service]`
  * Terhubung ke `academic-net`.
* [x] **Sub-layanan Auth:**
  * Nama container: `auth-service`
  * Dependensi: `depends_on: [auth-db]`
  * Terhubung ke `academic-net`.
  * Environment variables: `NODE_ENV=development`, `PORT=3001`, `MONGO_URI=mongodb://auth-db:27017/auth`, dan `JWT_SECRET`.
* [x] **Sub-layanan DB Auth:**
  * Image: `mongo:6.0`
  * Nama container: `auth-db`
  * Terhubung ke `academic-net`.
  * Mapping folder `./auth-data` ke `/data/db`.
* [x] **Pemrograman API Perhitungan IPS:**
  * Sub-layanan `score-service` mengimplementasikan kalkulasi Indeks Prestasi Semester secara dinamis berdasarkan SKS dan bobot nilai mata kuliah.

### 2. Task Opsional (Bonus Tasks - 10%)
* [x] **Internal Networking Subnet:** Mendefinisikan subnet `172.16.0.0/28` via IPAM configuration.
* [x] **API Gateway Exposed Port:** Port host diarahkan ke `8081` (`"8081:80"`).
* [x] **Resource Limits Auth Service:** CPU dibatasi `0.5` virtual core dan RAM dibatasi `512M` (512 MegaBytes).
* [x] **Auto-restart DB Auth:** Dikonfigurasi dengan `restart: unless-stopped`.

---

## 🚀 Panduan Menjalankan Layanan

### Prasyarat:
* Docker & Docker Compose sudah terpasang di sistem.

### 1. Jalankan Seluruh Microservice
Cukup jalankan satu perintah berikut di root folder project:
```bash
docker-compose up --build -d
```

### 2. Memeriksa Status Container
```bash
docker-compose ps
```
Semua container (`api-gateway`, `auth-service`, `auth-db`, `score-service`) harus berstatus `running` / `Up`.

### 3. Menghentikan Layanan
```bash
docker-compose down
```

---

## 📚 Dokumentasi API Endpoint

Semua request diarahkan melalui **API Gateway** di port `8081`.

### 1. Gateway Health Status
* **URL:** `GET http://localhost:8081/`
* **Response:**
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

---

### 2. Sub-layanan Otentikasi (`auth-service`)

#### A. Registrasi Mahasiswa
* **URL:** `POST http://localhost:8081/api/auth/register`
* **Header:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "nim": "23051204001",
  "name": "Budi Santoso",
  "email": "budi@mhs.unesa.ac.id",
  "password": "passwordRahasia123"
}
```
* **Response (201 Created):**
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
* **URL:** `POST http://localhost:8081/api/auth/login`
* **Header:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "nim": "23051204001",
  "password": "passwordRahasia123"
}
```
* **Response (200 OK):**
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

#### C. Profil User (Protected Endpoint)
* **URL:** `GET http://localhost:8081/api/auth/me`
* **Header:** `Authorization: Bearer <TOKEN_JWT_DARI_LOGIN>`
* **Response (200 OK):**
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

---

### 3. Sub-layanan Penilaian (`score-service`)

#### A. Informasi Skala Bobot Nilai
* **URL:** `GET http://localhost:8081/api/score/grades-scale`
* **Response (200 OK):**
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
* **URL:** `POST http://localhost:8081/api/score/calculate-ips`
* **Header:** `Content-Type: application/json`
* **Request Body:**
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
* **Response (200 OK):**
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
      {
        "code": "DS101",
        "name": "Arsitektur Komputer & Sistem Operasi",
        "sks": 3,
        "grade": "A",
        "point": 4,
        "mutu": 12,
        "is_passed": true
      },
      {
        "code": "DS102",
        "name": "Basis Data",
        "sks": 3,
        "grade": "B+",
        "point": 3.5,
        "mutu": 10.5,
        "is_passed": true
      },
      {
        "code": "DS103",
        "name": "Pemrograman Web & Microservice",
        "sks": 3,
        "grade": "A",
        "point": 4,
        "mutu": 12,
        "is_passed": true
      },
      {
        "code": "DS104",
        "name": "Statistika Komputasi",
        "sks": 3,
        "grade": "A-",
        "point": 3.75,
        "mutu": 11.25,
        "is_passed": true
      },
      {
        "code": "DS105",
        "name": "Algoritma & Struktur Data",
        "sks": 4,
        "grade": "B",
        "point": 3,
        "mutu": 12,
        "is_passed": true
      },
      {
        "code": "DS106",
        "name": "Kecerdasan Buatan",
        "sks": 3,
        "grade": "B+",
        "point": 3.5,
        "mutu": 10.5,
        "is_passed": true
      }
    ]
  }
}
```

---

## 🛠️ Pengujian dengan Extension VS Code
1. **Thunder Client / Postman:**
   * Import endpoint URLs di atas dan kirim request ke `http://localhost:8081`.
2. **Docker Extension:**
   * Pantau log setiap container secara langsung atau gunakan menu *Exec* untuk masuk ke dalam shell container.
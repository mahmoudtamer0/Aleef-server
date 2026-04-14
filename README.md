# 🐾 Aleef Server

A powerful and scalable backend system for a full-featured pet care platform.  
Aleef aims to provide everything pet owners need in one place — from managing pets to booking veterinary appointments and shopping.

> 🚧 This project is currently under active development.

---

## 🚀 Overview

Aleef Server is a **Node.js + TypeScript backend** designed to handle real-world pet care services including:

- 🐶 Pet management
- 🏥 Veterinary appointment booking
- 🛒 Pet products e-commerce
- 📁 Medical records tracking
- 👨‍⚕️ Doctor & user system

Built with scalability and clean architecture in mind.

---

## ✨ Features

- 🔐 **Authentication & Authorization**
  - JWT-based authentication
  - Secure login & registration system

- 👥 **Role-Based Access Control**
  - User
  - Doctor
  - Admin

- 🐾 **Pet Management**
  - Add and manage pets
  - Store pet-related data

- 📅 **Appointment System**
  - Book veterinary appointments
  - Manage schedules

- 🛒 **E-commerce Module**
  - Browse and manage pet products *(in progress)*

- 📁 **Medical Records**
  - Track pet health and history

- ☁️ **Image Upload**
  - Integrated with Cloudinary

- 📧 **Email System**
  - Notifications using Brevo API

- ⚡ **Real-time Features**
  - Powered by Socket.io

---

## 🧠 Tech Stack

- **Backend:** Node.js, Express.js
- **Language:** TypeScript
- **Database:** MongoDB (Mongoose)
- **Real-time:** Socket.io
- **Cloud Storage:** Cloudinary
- **Email Service:** Brevo
- **Authentication:** JWT

---

## 🏗️ Project Structure

The project follows a **modular architecture** for better scalability and maintainability:

src/
│
├── modules/
│ ├── users/
│ ├── doctors/
│ ├── pets/
│ ├── appointments/
│ ├── shop/
│
├── utils/
├── middlewares/
├── server.ts/
└── app.ts



---

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

PORT=3000
NODE_ENV=development

DB_URL=your_database_url
JWT_SECRET=your_jwt_secret

BREVO_API=your_brevo_api_key

CLOUD_NAME=your_cloud_name
CLOUD_API_KEY=your_api_key
CLOUD_API_SECRET=your_api_secret


🛠️ Setup & Run
# Install dependencies
npm install

# Run in development mode
npm run dev

📌 Key Highlights
✅ Scalable modular architecture
✅ Clean and maintainable codebase
✅ Real-world backend features
✅ Designed for production use

## 📡 API Routes

postman collection: https://www.postman.com/mahmoudtamer0-8816438/default-workspace/collection/73p0l07/aleef?action=share&source=copy-link&creator=50295562

The system follows RESTful API design with role-based access control.

---

### 👤 Auth & User Routes

| Method | Endpoint | Description | Access |
|--------|--------|-------------|--------|
| POST | `api/v1/users/register` | Register new user with profile picture | Public |
| POST | `/api/v1/users/verify-email` | Verify email using OTP | Public |
| POST | `/api/v1/users/resend-otp` | Resend OTP | Public |
| POST | `/api/v1/users/login` | Login user | Public |
| GET | `/api/v1/users/me` | Get current logged-in user | Authenticated |
| PATCH | `/api/v1/users/edit-user-profile` | Edit user profile | Authenticated |
| POST | `/api/v1/users/logout` | Logout user | Authenticated |
| GET | `/api/v1/users/get-all-users` | Get all users | Admin |
| POST | `/api/v1/users/baan-user/:userId` | Ban a user | Admin |
| GET | `/api/v1/users/:userId` | Get user details | Admin |

---

### 👨‍⚕️ Doctor Routes

| Method | Endpoint | Description | Access |
|--------|--------|-------------|--------|
| POST | `api/v1/doctors/register` | Doctor registration with documents upload | Public |
| POST | `api/v1/doctors/verify-email` | Verify doctor email | Public |
| POST | `api/v1/doctors/resend-otp` | Resend OTP | Public |
| GET | `api/v1/doctors/get-doctors-requests` | Get pending doctor requests | Admin |
| GET | `api/v1/doctors/get-all-doctors` | Get all doctors | Admin |
| POST | `api/v1/doctors/approve-request/:doctorId` | Approve doctor request | Admin |
| GET | `api/v1/doctors/:doctorId` | Get doctor details | Authenticated |

---

### 🛒 Product Routes

| Method | Endpoint | Description | Access |
|--------|--------|-------------|--------|
| POST | `api/v1/products` | Add new product with images | Admin |
| GET | `api/v1/products` | Get all products | Authenticated |
| POST | `api/v1/products/many-products` | Add multiple products | Public |
| GET | `api/v1/products/:prodId` | Get single product | Authenticated |

---

## 🧠 Notes

- 🔐 Routes are protected using JWT authentication middleware
- 👮 Role-based authorization is implemented using `allowTo("ADMIN")`
- 📁 File uploads are handled using Multer
- ✅ Input validation is applied using validation schemas


👨‍💻 Author

Mahmoud Tamer
Backend Developer (Node.js)

📬 Contact
Email: mahmoud.tamer.developer@gmail.com

This project reflects my journey in building real-world backend systems using modern technologies.
I’m continuously improving and expanding it to reach production-level quality.

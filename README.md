# 🐾 Aleef Server

A powerful and scalable backend system for a full-featured pet care platform.
Aleef aims to provide everything pet owners need in one place — from managing pets to booking veterinary appointments and shopping.

> 🚧 This project is currently under active development.
> 📮 [Postman Collection](https://www.postman.com/mahmoudtamer0-8816438/default-workspace/collection/73p0l07/aleef?action=share&source=copy-link&creator=50295562)
> [online Server](https://aleef-server.vercel.app)

---

## 🚀 Overview

Aleef Server is a **Node.js + TypeScript** backend designed to handle real-world pet care services including:

- 🐶 Pet management
- 🏥 Veterinary appointment booking
- 🛒 Pet products e-commerce
- 📁 Medical records tracking
- 👨‍⚕️ Doctor & user system

Built with scalability and clean architecture in mind.

---

## ✨ Features

- 🔐 **Authentication & Authorization** — JWT-based auth with OTP email verification
- 👥 **Role-Based Access Control** — User / Doctor / Admin
- 🐾 **Pet Management** — Add and manage pets with profile pictures
- 📅 **Appointment System** — Book appointments, view doctor schedules & available slots
- 🛒 **E-commerce Module** — Products, cart calculation, and orders (upcoming & previous)
- ⭐ **Doctor Reviews** — Users can rate and review doctors
- ☁️ **Image Upload** — Integrated with Cloudinary (single & multiple uploads)
- 📧 **Email Notifications** — Powered by Brevo API
- ⚡ **Real-time Features** — Powered by Socket.io

---

## 🧠 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Language | TypeScript |
| Framework | Express.js |
| Database | MongoDB (Mongoose) |
| Auth | JWT |
| Real-time | Socket.io |
| File Upload | Multer + Cloudinary |
| Email | Brevo API |
| Validation | Custom schema validation |

---

## 🏗️ Project Structure

```
src/
├── modules/
│   ├── users/
│   ├── doctors/
│   ├── pets/
│   ├── appointments/
│   ├── shop/
│   └── orders/
├── middlewares/
├── utils/
├── app.ts
└── server.ts
```

---

## ⚙️ Environment Variables

Create a `.env` file based on `.env.example`:

```env
PORT=3000
NODE_ENV=development

DB_URL=your_database_url
JWT_SECRET=your_jwt_secret

BREVO_API=your_brevo_api_key

CLOUD_NAME=your_cloud_name
CLOUD_API_KEY=your_api_key
CLOUD_API_SECRET=your_api_secret
```

---

## 🛠️ Setup & Run

```bash
# 1. Clone the repository
git clone https://github.com/your-username/aleef-server

# 2. Navigate to the project
cd aleef-server

# 3. Install dependencies
npm install

# 4. Setup environment variables
cp .env.example .env

# 5. Run in development mode
npm run dev
```

---

## 📡 API Routes

> 📮 [Postman Collection](https://www.postman.com/mahmoudtamer0-8816438/default-workspace/collection/73p0l07/aleef?action=share&source=copy-link&creator=50295562)

### 👤 User Routes
| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/v1/users/register` | Register new user with profile picture | Public |
| POST | `/api/v1/users/verify-email` | Verify email using OTP | Public |
| POST | `/api/v1/users/resend-otp` | Resend OTP | Public |
| POST | `/api/v1/users/login` | Login user | Public |
| GET | `/api/v1/users/me` | Get current logged-in user | Authenticated |
| PATCH | `/api/v1/users/edit-user-profile` | Edit user profile | Authenticated |
| POST | `/api/v1/users/logout` | Logout user | Authenticated |
| GET | `/api/v1/users/get-all-users` | Get all users | Admin |
| POST | `/api/v1/users/ban-user/:userId` | Ban a user | Admin |
| GET | `/api/v1/users/:userId` | Get user details | Admin |

### 👨‍⚕️ Doctor Routes
| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/v1/doctors/register` | Doctor registration with documents | Public |
| POST | `/api/v1/doctors/verify-email` | Verify doctor email | Public |
| POST | `/api/v1/doctors/resend-otp` | Resend OTP | Public |
| GET | `/api/v1/doctors/get-doctors-requests` | Get pending doctor requests | Admin |
| GET | `/api/v1/doctors/get-all-doctors` | Get all doctors | Admin |
| GET | `/api/v1/doctors/get-available-doctors` | Get available doctors | Authenticated |
| POST | `/api/v1/doctors/approve-request/:doctorId` | Approve doctor request | Admin |
| GET | `/api/v1/doctors/:doctorId` | Get doctor details | Authenticated |
| GET | `/api/v1/doctors/:doctorId/schedual` | Get doctor schedule | Authenticated |
| GET | `/api/v1/doctors/:doctorId/slots` | Get doctor available slots | Authenticated |
| POST | `/api/v1/doctors/:doctorId/add-review` | Add review to doctor | Authenticated |

### 🐾 Pet Routes
| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/v1/pets` | Add new pet with profile picture | Authenticated |
| GET | `/api/v1/pets/get-my-pets` | Get my pets | Authenticated |
| GET | `/api/v1/pets/:petId` | Get pet profile | Authenticated |

### 🛒 Product Routes
| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/v1/products` | Add new product with images | Admin |
| GET | `/api/v1/products` | Get all products | Authenticated |
| POST | `/api/v1/products/calculate-cart` | Calculate cart total | Authenticated |
| GET | `/api/v1/products/:prodId` | Get single product | Authenticated |

### 📦 Order Routes
| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/v1/orders` | Create new order | Authenticated |
| GET | `/api/v1/orders/my-upcoming-orders` | Get upcoming orders | Authenticated |
| GET | `/api/v1/orders/my-previous-orders` | Get previous orders | Authenticated |

### 📅 Appointment Routes
| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/v1/appointments` | Book a new appointment | Authenticated |
| GET | `/api/v1/appointments/get-my-active-appointment` | Get active appointment | Authenticated |

---

## 🧠 Technical Notes

- 🔐 Routes protected using JWT authentication middleware
- 👮 Role-based authorization via `allowTo("ADMIN")`
- 📁 File uploads handled with Multer (single & multiple fields)
- ✅ Input validation applied using custom validation schemas
- 📧 OTP email verification on registration for both users and doctors

---

## 👨‍💻 Author

**Mahmoud Tamer** — Backend Developer (Node.js / TypeScript)

📬 mahmoud.tamer.developer@gmail.com

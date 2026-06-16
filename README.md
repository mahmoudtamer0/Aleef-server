# 🐾 Aleef — Veterinary & Pet Care Platform

> A production-grade REST API for a full-featured pet care platform — built end-to-end by a full-stack developer, covering system design, database architecture, real-time features, and third-party integrations.

📮 **[Postman Collection](https://www.postman.com/mahmoudtamer0-8816438/default-workspace/collection/73p0l07/aleef?action=share&source=copy-link&creator=50295562)** · 🌐 **[Live API](https://aleef-server-production.up.railway.app)**

---

## What is Aleef?

Aleef is a veterinary platform where pet owners can manage their pets, book appointments with verified doctors, shop for pet products, and receive real-time notifications — all through a single backend that also serves a Flutter mobile app.

This repository is the **Node.js/TypeScript backend**, designed and implemented independently as the primary portfolio project accompanying my graduation.

---

## Technical Highlights

### Database Architecture — PostgreSQL with Raw SQL
Migrated the entire data layer from MongoDB/Mongoose to **PostgreSQL with raw parameterized queries** — no ORM — as a deliberate architectural decision for performance and control.



### Real-time Notification System
Built a **layered notification system** combining three delivery strategies:

| Layer | Technology | Use Case |
|---|---|---|
| Persistent | PostgreSQL | Notification history & unread counts |
| Real-time | Socket.IO | Instant delivery when user is online |
| Offline push | Firebase Cloud Messaging (FCM) | Push notifications when user is offline |

The system detects whether a user has an active socket connection before deciding which path to use, ensuring no notification is lost.

### Authentication & Identity
- JWT-based auth with OTP email verification via **Brevo API**
- **Google Sign-In** integration (OAuth 2.0 token verification)
- Role-based access control: `User / Doctor / Admin / Moderator`
- Doctor registration flow with document upload and admin approval step

### File Uploads
Multi-strategy upload system using **Multer + Cloudinary** supporting single profile images, multiple document uploads, and product galleries.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Language | TypeScript |
| Framework | Express.js |
| Database | PostgreSQL (raw SQL, no ORM) |
| Real-time | Socket.IO |
| Push Notifications | Firebase Cloud Messaging |
| Auth | JWT + Google OAuth 2.0 |
| File Uploads | Multer + Cloudinary |
| Email | Brevo API |
| Hosting | Railway |

---

## Project Structure

```
src/
├── modules/
│   ├── users/
│   ├── doctors/
│   ├── pets/
│   ├── appointments/
│   ├── notifications/
│   ├── shop/
│   └── orders/
├── middlewares/
├── utils/
│   ├── cache.ts         # In-memory Map cache
│   ├── socket.ts        # Socket.IO setup & helpers
│   └── notifications.ts # FCM + DB + Socket dispatch logic
├── app.ts
└── server.ts
```

---

## API Overview

> Full request/response documentation available in the **[Postman Collection](https://www.postman.com/mahmoudtamer0-8816438/default-workspace/collection/73p0l07/aleef?action=share&source=copy-link&creator=50295562)**.

### 👤 Users
| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/v1/users/register` | Public |
| POST | `/api/v1/users/verify-email` | Public |
| POST | `/api/v1/users/login` | Public |
| POST | `/api/v1/users/google-login` | Public |
| GET | `/api/v1/users/me` | Authenticated |
| PATCH | `/api/v1/users/edit-user-profile` | Authenticated |
| GET | `/api/v1/users/get-all-users` | Admin |
| POST | `/api/v1/users/ban-user/:userId` | Admin |

### 👨‍⚕️ Doctors
| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/v1/doctors/register` | Public |
| GET | `/api/v1/doctors/get-available-doctors` | Authenticated |
| GET | `/api/v1/doctors/:doctorId` | Authenticated |
| GET | `/api/v1/doctors/:doctorId/slots` | Authenticated |
| POST | `/api/v1/doctors/:doctorId/add-review` | Authenticated |
| GET | `/api/v1/doctors/get-doctors-requests` | Admin |
| POST | `/api/v1/doctors/approve-request/:doctorId` | Admin |

### 🐾 Pets
| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/v1/pets` | Authenticated |
| GET | `/api/v1/pets/get-my-pets` | Authenticated |
| GET | `/api/v1/pets/:petId` | Authenticated |

### 🛒 Products & Orders
| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/v1/products` | Authenticated |
| POST | `/api/v1/products/calculate-cart` | Authenticated |
| POST | `/api/v1/orders` | Authenticated |
| GET | `/api/v1/orders/my-upcoming-orders` | Authenticated |
| GET | `/api/v1/orders/my-previous-orders` | Authenticated |

### 🔔 Notifications
| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/v1/notifications` | Authenticated |
| PATCH | `/api/v1/notifications/:id/read` | Authenticated |
| POST | `/api/v1/notifications/register-token` | Authenticated |

### 📅 Appointments
| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/v1/appointments` | Authenticated |
| GET | `/api/v1/appointments/get-my-active-appointment` | Authenticated |

---

## Setup & Run

```bash
# 1. Clone the repository
git clone https://github.com/mahmoudtamer0/aleef-server
cd aleef-server

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env

# 4. Run in development
npm run dev
```

### Environment Variables

```env
PORT=3000
NODE_ENV=development

DATABASE_URL=your_postgres_connection_string

JWT_SECRET=your_jwt_secret

BREVO_API=your_brevo_api_key

CLOUD_NAME=your_cloudinary_cloud_name
CLOUD_API_KEY=your_cloudinary_api_key
CLOUD_API_SECRET=your_cloudinary_api_secret

GOOGLE_CLIENT_ID=your_google_client_id

FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY=your_firebase_private_key
```

---

## Author

**Mahmoud Tamer** — Full-Stack Developer (Node.js / TypeScript / React.js / PostgreSQL)

📬 mahmoud.tamer.developer@gmail.com · 🌐 [Portfolio](https://mahmoud-tamer-portfolio.vercel.app/) · 💻 [GitHub](https://github.com/mahmoudtamer0)
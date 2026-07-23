# Startup Tech Co. - Sample App 

This document outlines the current state of the application architecture, including our decoupled PostgreSQL database setup, security improvements, and instructions for local testing and secure database inspection.

This serves as a handover document for the Kubernetes/Infrastructure team to inform them of the stateful requirements.

---

## 🏗️ Architectural Setup

1. **Database Architecture (PostgreSQL):**
   - The application relies on an industry-standard **PostgreSQL** database.
   - **Justification:** In Kubernetes, we separate compute from storage. By migrating to PostgreSQL, the Kubernetes team can provision a dedicated `StatefulSet` for the database attached to a `PersistentVolumeClaim` to ensure user records are safely persisted. *(Note: The Node.js application itself is also being transitioned to a `StatefulSet` by the infrastructure team to maintain predictable, sticky network identities and allow for potential future volume attachments).*

2. **Jenkins Pipeline Security (`Jenkinsfile`):**
   - The private registry IP is strictly protected. It is injected dynamically at build time using Jenkins Credentials (`credentials('private-registry-ip')`), ensuring internal network structure is not exposed in the source code.

3. **Frontend Dashboard:**
   - Features a modern, glassmorphic UI.
   - Includes full user registration, login, and note-taking capabilities via AJAX (`fetch`).
   - Dynamically displays real-time CI/CD injected environment variables (Build Version, Environment, Hostname)..

---

## 💻 Code Explanations (`app.js`)

The application is built to securely communicate with PostgreSQL:

- **`pg` Driver:** We use the official `pg` Node.js library to manage a connection pool. It automatically connects via standard environment variables: `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, and `PGPORT`.
- **Automatic Initialization:** On startup, the app gracefully runs `CREATE TABLE IF NOT EXISTS` to ensure the `users` and `notes` tables exist, and seeds a default `admin` user if necessary.
- **Security:** We use `bcrypt` to hash all user passwords. All API endpoints utilize **parameterized SQL queries** (e.g., `WHERE username = $1`) to guarantee protection against SQL Injection attacks.

---

## 🐳 Local Docker Testing Setup

To run this application locally, you must simulate the production Kubernetes environment by running both the Application and the Database on a shared internal Docker network.

Run these exact commands in order:

### 1. Create the Local Network
```bash
docker network create sample-network
```

### 2. Start the PostgreSQL Container
```bash
docker run -d --name local-postgres --network sample-network \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -e POSTGRES_DB=sampleapp \
  -p 5432:5432 \
  postgres:15-alpine
```

### 3. Build the Application Image
```bash
docker build -t sample-app-local .
```

### 4. Run the Application Container
```bash
docker run -d --name sample-app-container --network sample-network \
  -p 3000:3000 \
  -e PGHOST=local-postgres \
  -e PGUSER=postgres \
  -e PGPASSWORD=mysecretpassword \
  -e PGDATABASE=sampleapp \
  sample-app-local
```
*The app is now fully functional and available at `http://localhost:3000`.*

---

## 🔍 Secure Database Inspection

We do **not** expose public API endpoints to view database records. Instead, we securely execute the `psql` command-line tool directly inside the running database container.

### Local Docker Inspection
To run a query directly from your terminal:
```bash
docker exec local-postgres psql -U postgres -d sampleapp -c "SELECT * FROM users;"
docker exec local-postgres psql -U postgres -d sampleapp -c "SELECT * FROM notes;"
```

To enter the interactive PostgreSQL shell:
```bash
docker exec -it local-postgres psql -U postgres -d sampleapp
```

### Kubernetes (Production) Inspection
Once deployed to the cluster, the Kubernetes administrator can securely access the records without exposing ports by using `kubectl exec`:
```bash
kubectl exec -it postgres-pod-name -- psql -U postgres -d sampleapp
```
*(Replace `postgres-pod-name` with the exact name of the running database pod).*
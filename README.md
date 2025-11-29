# MediBook

![Python](https://img.shields.io/badge/Python-3.10%2B-blue)
![Django](https://img.shields.io/badge/Django-4.2%2B-green)
![DRF](https://img.shields.io/badge/DRF-Latest-red)
![License](https://img.shields.io/badge/License-MIT-grey)

## 1. Project Overview

**MediBook** is a Django web application for booking medical appointments and managing doctor and patient profiles.  
It provides a **web interface** with templates and static assets, plus **REST APIs** with JWT authentication.  
Dashboards are available for **Admins, Doctors, and Patients**, with optional Cloudinary support for media storage.

## 2. Main Features

-   User accounts with JWT authentication and password management
-   Doctor & patient profiles with photos and metadata
-   Appointment booking, tracking, and history
-   Role-based dashboards and admin APIs
-   REST APIs for core resources
-   Templates and static assets for frontend

## 3. Tech Stack

-   **Framework:** Django 5.x
-   **API:** Django REST Framework + SimpleJWT
-   **Database:** MySQL (via `mysqlclient`) or SQLite
-   **Storage:** Cloudinary (optional)
-   **Frontend:** Django templates, CSS, JS

## 4. Installation & Setup

1.  **Clone the repository:**

    ```powershell
    git clone https://github.com/thinhgangg/medibook.git
    cd medibook
    ```

2.  **Create & activate virtual environment:**

    ```powershell
    python -m venv .venv
    .venv\Scripts\activate
    ```

3.  **Install dependencies:**
    ```powershell
    pip install --upgrade pip
    pip install -r requirements.txt
    ```
4.  **Create `.env` in project root::**

    ```ini
    SECRET_KEY=your-secret-key-here
    DEBUG=True
    DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

    DB_NAME=medibook
    DB_USER=root
    DB_PASSWORD=your_password
    DB_HOST=127.0.0.1
    DB_PORT=3306

    # Cloudinary (Optional)
    CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
    ```

## 5. Database & Run

1. Apply migrations:

    ```powershell
    python manage.py migrate
    ```

2. Create Superuser:

    ```powershell
    python manage.py createsuperuser
    ```

3. Run development server:

    ```powershell
    python manage.py runserver 8000
    ```

    Visit: http://127.0.0.1:8000

## 6. Project Structure

    manage.py
    medibook/       # settings, URLs
    accounts/       # user/auth
    patients/       # patient profiles
    doctors/        # doctor profiles
    appointments/   # booking logic
    dashboard/      # dashboards & admin APIs
    core/           # miscellaneous views
    templates/      # HTML templates
    static/         # CSS/JS/images
    media/          # media utilities
    requirements.txt

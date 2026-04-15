# Summer Salsa Fest - Ticketing & Management Platform

(Българската версия на ръководството се намира по-долу / Bulgarian version below)

A full-stack, real-time web application built to handle ticket sales, user management, and gate check-ins for the Summer Salsa Fest. This platform provides a seamless purchasing experience for attendees and a powerful, real-time dashboard for event administrators and gate staff.

---

## English Documentation

### Core Features

* Ticketing & Checkout: Secure ticket purchasing integration using Stripe, supporting various pass types (Full Pass, Party Pass, Day Pass). Automatically handles pricing tiers based on the current date.
* Gate Scanner: Built-in, mobile-optimized QR code scanner for staff to check in guests instantly at the door. Communicates directly with Firestore to prevent double-scanning in real-time and includes a manual ID fallback.
* Admin Dashboard: A comprehensive, persistent control panel featuring:
  - Analytics: Real-time metrics on ticket sales and revenue generation.
  - Live Data Tables: Manage users, tickets, and artists with instant Firebase syncing. Includes a local Undo/Redo staging engine that protects live data until changes are explicitly saved.
  - Inbox Manager: Handle ambassador requests and contact form submissions directly from the platform.
  - Dev Tools & Time Machine: A developer panel that allows administrators to simulate future dates to test pricing schedules, toggle global ticket sales on/off, and run live system diagnostics.
* Ambassador System: Allows designated users to generate tracking links, promote the event, and manage their specific guest lists.
* Internationalization (i18n): Full multi-language support (English and Bulgarian) implemented throughout the application.

### Tech Stack

* Framework: Next.js (App Router)
* Database & Authentication: Firebase (Firestore, Firebase Auth)
* Payments: Stripe
* Styling: Tailwind CSS
* Icons: Lucide React
* QR Scanning: HTML5-QRCode
* Internationalization: next-intl

### Getting Started

#### 1. Prerequisites
Ensure you have Node.js installed (v18.x or later is recommended).

#### 2. Installation
Clone the repository and install the required dependencies:

    git clone <your-repository-url>
    cd summer-salsa-fest
    npm install

#### 3. Environment Setup
The project requires keys for Firebase and Stripe to function locally.
1. Duplicate the .env.example file located in the root directory.
2. Rename the duplicated file to .env.local.
3. Fill in your actual API keys, database URLs, and email credentials.

    cp .env.example .env.local

#### 4. Run the Development Server
Start the local Next.js server:

    npm run dev

Open http://localhost:3000 in your browser. The application will hot-reload as you make changes to the code.

### Deployment
This application is optimized for deployment on Vercel. Ensure all environment variables from your .env.local file are manually added to your Vercel project settings (Settings > Environment Variables) before deploying to production.

---
---

## Български (Bulgarian Documentation)

Пълнофункционално уеб приложение в реално време, създадено за управление на продажбите на билети, потребителите и достъпа (чекирането) за Summer Salsa Fest. Платформата осигурява безпроблемен процес на покупка за посетителите и мощен контролен панел за администраторите и персонала на входа.

### Основни Функции

* Продажба на Билети (Ticketing): Сигурно закупуване на билети чрез интеграция със Stripe. Поддръжка на различни видове пасове (Full Pass, Party Pass, Day Pass). Цените се актуализират автоматично спрямо текущата дата.
* Скенер на Входа (Gate Scanner): Вграден, оптимизиран за мобилни устройства QR скенер за бързо чекиране на гостите от персонала. Комуникира директно с Firestore, за да предотврати повторно сканиране в реално време.
* Административен Панел (Admin Dashboard): Изчерпателен контролен панел, включващ:
  - Анализи (Analytics): Статистика в реално време за продажби и приходи.
  - Таблици с данни на живо: Управление на потребители, билети и артисти с мигновена синхронизация с Firebase. Включва локална система за отмяна/връщане на промените (Undo/Redo), която предпазва базата данни до окончателно запазване.
  - Управление на съобщения (Inbox): Обработка на заявки от посланици (ambassadors) и контактни форми.
  - Инструменти за разработка (Dev Tools): Панел, който позволява симулиране на бъдещи дати за тестване на ценовите периоди, глобално спиране/пускане на продажбите и диагностика на системата.
* Посланическа Система (Ambassador System): Позволява на определени потребители да генерират проследяващи линкове и да управляват своите списъци с гости.
* Многоезичност (i18n): Пълна поддръжка на английски и български език в цялото приложение.

### Технологичен Стек

* Рамка (Framework): Next.js (App Router)
* База данни и Идентификация: Firebase (Firestore, Firebase Auth)
* Плащания: Stripe
* Стайлинг: Tailwind CSS
* Икони: Lucide React
* QR Сканиране: HTML5-QRCode
* Многоезичност: next-intl

### Първи Стъпки

#### 1. Изисквания
Уверете се, че имате инсталиран Node.js (препоръчва се версия 18.x или по-нова).

#### 2. Инсталация
Клонирайте хранилището и инсталирайте нужните пакети:

    git clone <your-repository-url>
    cd summer-salsa-fest
    npm install

#### 3. Променливи на средата (Environment Setup)
За да стартирате проекта локално, трябва да конфигурирате ключовете за Firebase и Stripe.
1. Копирайте файла .env.example, който се намира в главната директория.
2. Преименувайте копирания файл на .env.local (този файл се игнорира от Git).
3. Попълнете липсващите стойности с вашите реални API ключове.

    cp .env.example .env.local

#### 4. Стартиране на сървъра за разработка
Стартирайте локалния сървър:

    npm run dev

Отворете http://localhost:3000 във вашия браузър. Приложението ще се обновява автоматично при промяна на кода.

### Внедряване (Deployment)
Това приложение е оптимизирано за публикуване чрез платформата Vercel. Уверете се, че всички променливи на средата от вашия .env.local файл са ръчно добавени в настройките на проекта във Vercel (Settings > Environment Variables) преди да стартирате внедряването.
# 🌸 Yomi-AI | The Smart Way to Learn Japanese

![Yomi-AI Banner](https://yomi-ai-cyan.vercel.app/)

Yomi-AI is an advanced, AI-powered platform designed to make learning Japanese engaging, intuitive, and highly effective. By combining dynamic flashcards, personalized AI-generated stories, and high-fidelity text-to-speech, Yomi-AI offers a complete language immersion experience.

## ✨ Key Features

* **🧠 AI-Powered Content Generation:** Dynamically generates Japanese stories, vocabulary lists, and grammar explanations tailored to the user's level.
* **🗣️ Neural Text-to-Speech (TTS):** Integrates Google Cloud TTS (Neural2 models) for flawless, native-sounding Japanese pronunciation.
* **🎴 Smart Flashcards:** Interactive flashcards with spaced repetition concepts for robust vocabulary retention.
* **👑 Pro Subscription Model:** Secure payment gateway integration using Lemon Squeezy as the Merchant of Record (MoR), including fully automated webhook handling for subscription lifecycles.
* **🔐 Secure Authentication:** Seamless user authentication and session management powered by Supabase.

## 🛠️ Tech Stack

### Frontend (`/yomi-frontend`)
* **Framework:** Next.js (React)
* **Styling:** Tailwind CSS
* **Icons:** Lucide React
* **Deployment:** Vercel

### Backend (`/yomi-backend`)
* **Environment:** Node.js & Express
* **Cloud TTS:** Google Cloud Text-to-Speech API
* **Deployment:** Render

### Database & Auth
* **BaaS:** Supabase (PostgreSQL, Authentication, Storage)

### Payments & Monetization
* **Payment Gateway:** Lemon Squeezy (Webhooks: `order_created`, `subscription_expired`, etc.)

## 📂 Project Structure

This repository is structured as a monorepo containing both the client and server applications:

```bash
Yomi-ai/
├── yomi-frontend/      # Next.js client application
└── yomi-backend/       # Node.js/Express server handling APIs & Webhooks
# PageMind AI

PageMind AI is a full-stack AI education app where users upload textbook pages and get structured learning outputs: short notes, key points, flowcharts, mindmaps, simplified explanations, and exam notes.

It is not a chatbot. The first action is always file upload.

## What You Need To Do

Only one main task is left for you: add API keys.

Create a file named `.env.local` in the project root and paste this:

```bash
JWT_SECRET=make_a_long_random_secret

HF_API_KEY=your_huggingface_api_key
HF_MODEL=mistralai/Mistral-7B-Instruct-v0.3

SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

FREE_UPLOADS_PER_DAY=5
PAID_UPLOADS_PER_DAY=1000
```

No local AI is needed. You do not need a powerful PC.

## One-Time Supabase Setup

1. Create a free Supabase project.
2. Open the Supabase SQL Editor.
3. Copy everything from `supabase-schema.sql`.
4. Paste it into Supabase SQL Editor and run it.
5. Copy your Supabase URL and service role key into `.env.local`.

That creates:

- `users`
- `uploads`
- `results`
- `usage`
- `logs`
- public `uploads` storage bucket

## AI Model

The app uses Hugging Face hosted inference with open-source models.

Recommended default:

```bash
HF_MODEL=mistralai/Mistral-7B-Instruct-v0.3
```

You only need a Hugging Face API key. The AI key is used only on the backend.

## Run Locally

```bash
npm.cmd install
npm.cmd run dev
```

Open:

```bash
http://localhost:3000
```

## Publish

Deploy to Vercel and add the same `.env.local` values in Vercel Environment Variables.

Then run:

```bash
npm.cmd run build
```

## Stack

- Next.js
- React
- Tailwind CSS
- Framer Motion
- Mermaid.js
- JWT auth
- Tesseract OCR for images
- PDF text extraction
- Hugging Face open-source model inference
- Supabase database and storage

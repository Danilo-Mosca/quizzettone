# 🧠 Quizzettone

**Quizzettone** è una web-app per quiz dal vivo che sostituisce la classica pulsantiera fisica con il browser.

Il **backend** (Node.js + WebSocket) gestisce in tempo reale lo stato del quiz e la comunicazione con tutti i dispositivi connessi.  
Il **frontend** (React + Vite) offre una UI gamificata con due sezioni: pagina giocatore e pannello amministratore.

## 🎯 Scopo dell’applicazione

**Quizzettone** è pensata per:
- quiz dal vivo
- giochi a squadre o individuali
- contesti educativi o ricreativi
- eventi in cui non si vogliono usare dispositivi hardware dedicati

## 🌐 Accessibilità

Quizzettone è utilizzabile senza installare app dedicate ed è compatibile con:

- 📱 Smartphone  
- 📱 Tablet  
- 💻 PC e Notebook  

È sufficiente un browser moderno e una connessione alla rete.

## 🚀 Funzionalità

- 🔌 Comunicazione in tempo reale tramite WebSocket
- 🧑‍🤝‍🧑 Gestione di più giocatori contemporaneamente
- 🛎️ Pulsante BUZZ con feedback immediato
- 🔐 Pannello admin protetto da password
- 🎛️ Admin: reset quiz, abilita/blocca buzz per giocatore, reset identità
- 🏆 **Classifica** con punteggi persistenti (➕/➖ per giocatore, reset globale)
- 🎨 UI gamificata (gradiente scuro, animazioni, card, responsive mobile-first)
- 🌐 Funziona su qualsiasi rete LAN senza configurazione IP

## Struttura del progetto

```
quizzettone/
├── backend-quizzettone/     ← Server WebSocket (Node.js)
│   ├── .env                 ← Password admin (gitignored)
│   ├── .env.example         ← Template per .env
│   ├── server.js            ← Entry point (porta 3000)
│   └── package.json
├── frontend-quizzettone/    ← Client React (Vite)
│   ├── src/
│   │   ├── main.jsx         ← Entry point
│   │   ├── App.jsx          ← Routes: / e /admin
│   │   ├── components/      ← QuizButton, Admin, AdminLogin
│   │   ├── hooks/           ← useQuizSocket, useAdminAuth
│   │   └── utils/           ← playerIdentity
│   └── package.json
├── AGENTS.md                ← Istruzioni per l'agente AI
└── implementation_plan.md   ← Documento di design
```

## Requisiti

- Node.js 20.6+ (per `--env-file` e `--watch`)

## 📦 Avvio del progetto

```bash
# 1. Clona la repository:
git clone https://github.com/danilo-mosca/quizzettone.git
```

```bash
# 2. Backend: installa dipendenze e avvia
cd backend-quizzettone
npm install
cp .env.example .env          # configura la password admin
npm run dev                   # server su ws://localhost:3000

# 3. Frontend (nuovo terminale)
cd frontend-quizzettone
npm install
npm run dev                   # http://localhost:5173

# 4. Per accesso da altri dispositivi sulla stessa rete avviare il frontend con il comando:
npm run dev -- --host
```

## Utilizzo

1. Apri `http://localhost:5173` — i giocatori inseriscono il nome e premono BUZZ
2. Apri `http://localhost:5173/admin` — l'amministratore gestisce il quiz
3. I dispositivi sulla stessa rete usano l'IP del server al posto di `localhost`

## Tecnologie

- **Backend:** Node.js, `ws` (WebSocket)
- **Frontend:** React 19, Vite, react-router-dom v7
- **Stile:** CSS vanilla con design system custom
- **Persistenza:** localStorage (identità player, auth admin) / server RAM (stato gioco, punteggi)

# 🧠 Quizzettone

**Quizzettone** è una WepApp

Il **backend** realizzato con **Node.js** utilizza i **WebSocket** per comunicare in tempo reale con i client frontend.  
Il server riceve e invia messaggi ai browser dei partecipanti, gestendo le risposte e gli eventi del quiz in modo immediato.

Il **frontend** realizzato con **React** è costituito da una rotta comune per i **players** e da una rotta "/admin" riservata agli amministratori.

L’app nasce con l’obiettivo di **sostituire la classica pulsantiera fisica dei quiz**, permettendo ai giocatori di partecipare semplicemente utilizzando il **browser web**.

## 🌐 Accessibilità

Quizzettone è utilizzabile senza installare app dedicate ed è compatibile con:

- 📱 Smartphone  
- 📱 Tablet  
- 💻 PC e Notebook  

È sufficiente un browser moderno e una connessione alla rete.

## 🚀 Funzionalità principali

- 🔌 Comunicazione in tempo reale tramite **WebSocket**
- 🧑‍🤝‍🧑 Gestione di più client connessi contemporaneamente
- 🛎️ Invio e ricezione immediata delle risposte
- 🎮 Simulazione della pulsantiera dei quiz tramite browser
- 🏆 Gestione della logica di gioco lato server

## 🎯 Scopo dell’applicazione

**Quizzettone** è pensata per:
- quiz dal vivo
- giochi a squadre o individuali
- contesti educativi o ricreativi
- eventi in cui non si vogliono usare dispositivi hardware dedicati

## 🛠️ Tecnologie utilizzate

- **Node.js**
- **WebSocket**
- **React** per il Frontend web (ovviamente insieme ad HTML / CSS / JavaScript)
- Browser come interfaccia utente

## 📦 Avvio del progetto

1. Clona il repository:
   ```bash
   git clone https://github.com/danilo-mosca/quizzettone.git
   ```

2. Installa le dipendenze (se necessarie):
   ```bash
   npm install
   ```

4. Avvia il server:
   ```bash
   npm run dev
   ```
5. Avvia il frontend per permettere l'accesso a tutti i dispositivi della rete locale (per i vari test):
   ```bash
   npm run dev -- --host
   ```

## ▶️ Utilizzo

- Avvia il server **Quizzettone**
- I partecipanti si collegano tramite **browser**
- Ogni dispositivo funge da **pulsantiera**
- Il server gestisce gli **eventi del quiz in tempo reale**

## 📌 Stato del progetto

Il progetto è in evoluzione e può essere esteso con:

- classifiche
- statistiche di gioco
- interfaccia grafica avanzata

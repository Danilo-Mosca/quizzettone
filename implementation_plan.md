# Piano di Implementazione — Password .env + Classifica Admin

---

## 1. Password Admin in `.env`

### Come funzionerà

Useremo la funzionalità nativa `--env-file` di **Node.js 20.6+**, senza installare pacchetti aggiuntivi come `dotenv`. Questo ci permette di caricare variabili d'ambiente da un file `.env` semplicemente aggiornando lo script di avvio.

> [!IMPORTANT]
> Il file `.env` verrà aggiunto a `.gitignore` per non finire mai nel repository Git. Verrà creato un file `.env.example` come modello di riferimento da committare al suo posto.

### File coinvolti

#### [MODIFY] [package.json](file:///c:/Users/Danko/Documents/GitHub/quizzettone/backend-quizzettone/package.json)
- Script `dev` aggiornato: `node --env-file=.env --watch server.js`

#### [NEW] `.env` (backend-quizzettone/.env)
```
ADMIN_PASSWORD=quiz123
```

#### [NEW] `.env.example` (backend-quizzettone/.env.example)
```
# File di esempio. Copiare come .env e inserire la password reale.
ADMIN_PASSWORD=your_password_here
```

#### [MODIFY] [.gitignore](file:///c:/Users/Danko/Documents/GitHub/quizzettone/backend-quizzettone/.gitignore)
- Aggiunta la riga `.env` per escluderlo da Git.

#### [MODIFY] [server.js](file:///c:/Users/Danko/Documents/GitHub/quizzettone/backend-quizzettone/server.js)
- `const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;` al posto del valore hardcoded.
- Aggiunto un check di avvio che lancia un errore se la variabile non è definita.

---

## 2. Classifica nel Pannello Admin

### Come funzionerà

I punteggi vengono gestiti **lato server** in una `Map` (`scores`), esattamente come avviene per `connectedPlayers` e `registeredPlayers`. Questo garantisce:
- **Persistenza al refresh dell'admin**: i punteggi non sono salvati nel client.
- **Aggiornamento in tempo reale**: ogni modifica viene broadcastata a tutti i client.

### Flusso dati

```
Admin clicca [+] o [-]
  └─▶ socket.adjustScore(playerId, +1 o -1)    [frontend]
        └─▶ { type: 'ADMIN_ADJUST_SCORE', playerId, delta }   [WebSocket]
              └─▶ server aggiorna scores Map
                    └─▶ broadcastScores()
                          └─▶ { type: 'SCORES_UPDATE', scores: [...] }
                                └─▶ Admin.jsx aggiorna stato → UI si aggiorna

Admin clicca [Resetta Classifica]
  └─▶ socket.resetScores()
        └─▶ { type: 'ADMIN_RESET_SCORES' }
              └─▶ server azzera tutti i punteggi
                    └─▶ broadcastScores()
```

### Regole punteggio
- Ogni player parte con punteggio **0** al momento della prima registrazione.
- Il punteggio sopravvive a refresh del player e dell'admin.
- "Resetta Classifica" azzera tutti i punteggi a 0 senza rimuovere i player.
- "Reset Player" (esistente) rimuove il player e il suo punteggio.

### File coinvolti

#### [MODIFY] [server.js](file:///c:/Users/Danko/Documents/GitHub/quizzettone/backend-quizzettone/server.js)
- Nuova `Map` globale: `const scores = new Map();`
- Alla registrazione HELLO (nuovo player): `scores.set(playerId, 0)`
- Alla registrazione HELLO (reconnect): non modifica il punteggio esistente
- Alla disconnessione (`close`): il punteggio **non** viene cancellato
- All'autenticazione `ADMIN_LOGIN`: chiama `broadcastScores()` insieme a `broadcastPlayers()`
- Nuovo handler `ADMIN_ADJUST_SCORE`: aggiorna `scores` e fa `broadcastScores()`
- Nuovo handler `ADMIN_RESET_SCORES`: azzera tutti i valori in `scores` e fa `broadcastScores()`
- `ADMIN_FORCE_RESET_PLAYER`: cancella anche il punteggio del player rimosso
- Nuova funzione `broadcastScores()`: invia `{ type: 'SCORES_UPDATE', scores: [{id, name, score}] }`

#### [MODIFY] [useQuizSocket.jsx](file:///c:/Users/Danko/Documents/GitHub/quizzettone/frontend-quizzettone/src/hooks/useQuizSocket.jsx)
- Nuova funzione `adjustScore(playerId, delta)`: invia `ADMIN_ADJUST_SCORE`
- Nuova funzione `resetScores()`: invia `ADMIN_RESET_SCORES`
- Entrambe esportate nell'oggetto di ritorno

#### [MODIFY] [Admin.jsx](file:///c:/Users/Danko/Documents/GitHub/quizzettone/frontend-quizzettone/src/components/Admin.jsx)
- Nuovo stato `scores` (array di `{id, name, score}`)
- Gestione del messaggio `SCORES_UPDATE`
- Nuova sezione UI "🏆 Classifica" con:
  - Tabella con nome player, punteggio attuale, pulsanti **[−]** e **[+]**
  - Pulsante **"Resetta Classifica"** in fondo

---

## Verifica

1. Creare il file `.env` e avviare il server con `npm run dev` → deve partire senza errori.
2. Entrare come player, aprire l'admin, premere **[+]** → punteggio sale a 1.
3. Refreshare l'admin → punteggio rimane a 1 ✅
4. Refreshare il player → si riconnette con lo stesso stato ✅
5. Premere **"Resetta Classifica"** → tutti i punteggi tornano a 0 ✅
6. Premere **"Reset Player"** → il player e il suo punteggio scompaiono ✅

/**
 * Restituisce l'ID univoco del player.
 * Se non esiste nel localStorage, lo crea e lo salva.
 */
function getOrCreatedPlayerId() {
    // 1️⃣ Proviamo a recuperare l'ID dal localStorage:
    let id = localStorage.getItem('quiz_player_id');    // Controllo se nel localStorage ho già salvato un UUID per quel client che si è connesso

    // 2️⃣ Se NON esiste ancora un ID salvato
    if (!id) {
        // 3️⃣ Controlla se il browser supporta crypto.randomUUID(). Fallback compatibile con TUTTI i browser:
        // E' come se stessi dicendo: “Il browser supporta l’API moderna e sicura?” 
        // window.crypto → API crittografiche del browser
        // crypto.randomUUID() → standard UUID v4
        if (window.crypto && crypto.randomUUID) {
            /* Se non è già presente creo un UUID = Universally Unique Identifier per il giocatore.l'UUID è una stringa del tipo: 550e8400-e29b-41d4-a716-446655440000
            Ed è unico a livello mondiale, non si ripete praticamente mai, non dipende da server, database o contatori, si può generare 
            direttamente nel browser. In pratica è una targa permanente del giocatore. 
            Risolve i problemi di refresh pagina, chiusura del tab della scheda del browser, crash del browser, nuova connessione
            al WebSocket. Senza UUID nei casi appena citati il server vede un "nuovo player" perdendo l'identità del player e rischiando
            anche eventuali duplicati.
            Con l'UUID: l’utente si riconnette, mantiene la stessa identità, l’admin vede sempre lo stesso giocatore */
            id = crypto.randomUUID();   // 3️⃣ Caso moderno: il browser supporta crypto.randomUUID() e gli assegno così la UUID
        } else {
            // 4️⃣ Se il browser non supporta la "crypto.randomUUID" la genero manualmente:
            // fallback manuale UUID v4
            id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                // Sostituisce ogni x e y con numeri esadecimali random:
                const r = Math.random() * 16 | 0;           // numero random 0–15
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
        // 5️⃣ Salviamo l'ID nel localStorage di quel browser per quell'utente di quella "identità" finché non verrà cancellato
        localStorage.setItem('quiz_player_id', id);     // Salvo l'UUID nel localStorage
    }

    // 6️⃣ Ritorniamo sempre l'ID (nuovo o esistente)
    return id;
}

/**
 * Salva il nome del giocatore
 */
function setPlayerName(name) {
    localStorage.setItem('quiz_player_name', name);     // salva il nome nel localStorage
}

/**
 * Restituisce il nome salvato del giocatore
 */
function getPlayerName() {
    return localStorage.getItem('quiz_player_name') || '';  // ritorna il nome salvato o stringa vuota
}

/**
 * Reset dell'identità: cancella sia UUID che nome quando si vuole ricominciare
 */
function resetPlayerId() {
    localStorage.removeItem('quiz_player_id');      // Funzione che rimuove l'UUID associato a quel client dal localStorage
    localStorage.removeItem('quiz_player_name');
}

export { getOrCreatedPlayerId, getPlayerName, setPlayerName, resetPlayerId };
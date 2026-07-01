/**
 * Hook per gestire autenticazione Admin
 * Persistente tramite localStorage
 * 
 * 🔐 La verifica della password è ora delegata interamente al server (WebSocket).
 * Il login è ottimistico: non controlla la password lato client, ma imposta subito
 * isAdmin = true. Se il server rifiuta (ADMIN_DENIED), Admin.jsx chiama logout().
 */
import { useState } from 'react';

const STORAGE_KEY = 'quiz_admin_logged';

export function useAdminAuth() {
    const [isAdmin, setIsAdmin] = useState(localStorage.getItem(STORAGE_KEY) === 'true');

    /**
     * restituisce un valore booleano: true se l'utente ha inserito la password di admin corretta, false se l'utente inserisce una password errata
     * login() è OTTIMISTICO:
     * - salva la password in localStorage per il re-automatico al refresh
     * - imposta isAdmin = true immediatamente
     * - la verifica reale avviene lato server tramite WebSocket (ADMIN_LOGIN → ADMIN_OK / ADMIN_DENIED)
     * - se il server rifiuta, Admin.jsx gestisce il logout forzato e mostra l'errore
     */
    function login(password) {
        localStorage.setItem(STORAGE_KEY, 'true');
        localStorage.setItem('quiz_admin_password', password);
        setIsAdmin(true);
        return true;
    }
    // Funzione logout() che rimuove dal local storage la chiave e il valore di STORAGE_KEY:
    function logout() {
        localStorage.removeItem(STORAGE_KEY);
        // MODIFICA: Rimuoviamo la password dell'admin dal localStorage al momento del logout
        // per evitare che rimanga memorizzata sul dispositivo.
        localStorage.removeItem('quiz_admin_password');
        setIsAdmin(false);
    }

    return { isAdmin, login, logout };
}
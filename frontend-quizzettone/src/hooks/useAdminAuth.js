/**
 * Hook per gestire autenticazione Admin
 * Persistente tramite localStorage
 */
import { useState } from 'react';

const STORAGE_KEY = 'quiz_admin_logged';

export function useAdminAuth() {
    const [isAdmin, setIsAdmin] = useState(localStorage.getItem(STORAGE_KEY) === 'true');

    // Funzione login() che restituisce un valore booleano: true se l'utente ha inserito la password di admin corretta, false se l'utente inserisce una password errata
    function login(password) {
        // 🔐 Password hardcoded TEMPORANEA
        // (più avanti la spostiamo su server)
        if (password === 'quiz123') {
            localStorage.setItem(STORAGE_KEY, 'true');
            // MODIFICA: Salviamo la password dell'admin nel localStorage.
            // Questo ci permetterà di ri-autenticare automaticamente la connessione WebSocket
            // in caso di refresh della pagina senza richiedere all'utente di reinserire la password.
            localStorage.setItem('quiz_admin_password', password);
            setIsAdmin(true);
            return true;
        }
        return false;
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
import './App.css'
import QuizButton from "./components/QuizButton.jsx"
import Admin from "./components/Admin.jsx";
import Footer from "./components/Footer.jsx";
import { Routes, Route } from 'react-router-dom';  // Importo i componenti Routes e Route da react router

// INFO: Utilizziamo il componente <Routes> per raggruppare tutte le nostre rotte. Inseriamo poi un componente <Route> per ogni singola rotta che vogliamo gestire!

function App() {
  return (
    <div className="app-layout">
        <Routes>
          <Route path="/" element={<QuizButton />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
        <Footer />
    </div>
  )
}

export default App

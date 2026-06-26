export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="footer__content">
        <span className="footer__copyright">
          &copy; {year} Danilo Mosca
        </span>
        <span className="footer__separator" aria-hidden="true">&bull;</span>
        <span className="footer__rights">
          Tutti i diritti riservati
        </span>
      </div>
    </footer>
  );
}

export default function LandingFooter() {
  return (
    <footer className="bg-surface-container-highest border-t border-outline-variant">
      <div className="flex flex-col md:flex-row justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-10 max-w-container-max mx-auto gap-6">
        <div className="flex flex-col items-center md:items-start gap-1">
          <span className="font-montserrat text-lg font-black text-primary tracking-tight">IpponId</span>
          <p className="text-on-surface-variant text-xs">© 2024 IpponId. Tous droits réservés.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-on-surface-variant text-xs">
          <a href="#" className="hover:text-secondary transition-colors">Mentions légales</a>
          <a href="#" className="hover:text-secondary transition-colors">Politique de confidentialité</a>
          <a href="#" className="hover:text-secondary transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  )
}

const Footer = () => {
  return (
    <footer id="contact" className="border-t border-glass-border/50 bg-glass/40 backdrop-blur-xl mt-12 sm:mt-20 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-600 via-brand-600 to-violet-600 grid place-items-center text-white text-xs font-black">
              911
            </span>
            <span className="font-bold text-base text-foreground">911</span>
          </div>
          <p className="text-muted mt-3 text-xs leading-relaxed">
            Hospital-grade healthcare delivered to your home in minutes.
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm text-foreground">Services</h4>
          <ul className="text-xs text-muted space-y-2">
            <li>Nurse visits</li>
            <li>Doctor consults</li>
            <li>Physiotherapy</li>
            <li>Emergency response</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm text-foreground">Company</h4>
          <ul className="text-xs text-muted space-y-2">
            <li>About</li>
            <li>Careers</li>
            <li>Press</li>
            <li>Blog</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm text-foreground">Contact</h4>
          <ul className="text-xs text-muted space-y-2">
            <li>support@nursecare.app</li>
            <li>+91 80 0000 0000</li>
            <li>Bengaluru, India</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-glass-border/40 py-4 text-center text-[11px] text-muted">
        © {new Date().getFullYear()} 911 by Alchemy Techsol. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;

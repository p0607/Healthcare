import { APP_COMPANY, APP_NAME, APP_TAGLINE } from '@nursecare/shared';
import BrandLogo from './BrandLogo.jsx';

const Footer = () => {
  return (
    <footer id="contact" className="border-t border-glass-border/50 bg-glass/40 backdrop-blur-xl mt-12 sm:mt-20 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10">
        <div>
          <BrandLogo size="md" />
          <p className="text-muted mt-3 text-xs leading-relaxed">{APP_TAGLINE}</p>
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
        © {new Date().getFullYear()} {APP_NAME} by {APP_COMPANY}. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;

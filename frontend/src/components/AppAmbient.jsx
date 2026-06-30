/** Subtle ambient glow on dark canvas (glassmorphism depth). */
const AppAmbient = () => (
  <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
    <div className="absolute -top-[28%] left-1/2 h-[55vh] w-[120vw] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.18),transparent_68%)] blur-3xl dark:opacity-100 opacity-0" />
    <div className="absolute top-[18%] right-[-8%] h-72 w-72 rounded-full bg-violet-600/8 blur-[100px] dark:opacity-100 opacity-0" />
    <div className="absolute bottom-0 left-[-5%] h-64 w-64 rounded-full bg-cyan-500/6 blur-[90px] dark:opacity-100 opacity-0" />
  </div>
);

export default AppAmbient;

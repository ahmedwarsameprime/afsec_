import { Logo } from "@/components/Logo";

export default function Home() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#141414] to-[#0a0a0a]" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, rgba(201,165,106,0.15), transparent 40%), radial-gradient(circle at 80% 70%, rgba(201,165,106,0.10), transparent 50%)",
        }}
      />
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(201,165,106,1) 1px, transparent 1px), linear-gradient(90deg, rgba(201,165,106,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="px-6 sm:px-12 py-6 flex items-center justify-between">
          <Logo size={42} />
          <a
            href="mailto:info@soc-afsec.com"
            className="hidden sm:inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-md border border-[#c9a56a]/30 text-[#c9a56a] hover:bg-[#c9a56a]/10 transition"
          >
            Contact us
          </a>
        </header>

        <section className="flex-1 flex items-center justify-center px-6 sm:px-12">
          <div className="max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#c9a56a]/30 bg-[#c9a56a]/5 mb-8">
              <span className="w-2 h-2 rounded-full bg-[#c9a56a] animate-pulse" />
              <span className="text-xs font-medium uppercase tracking-wider text-[#c9a56a]">
                Coming Soon
              </span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05]">
              Integrated
              <br />
              <span className="text-[#c9a56a]">Security Solutions</span>
              <br />
              for a Safer Tomorrow.
            </h1>

            <p className="mt-8 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              SOC-AFSEC Industries protects personnel, property and facilities
              across Somalia and the Horn of Africa. Our digital experience is
              launching shortly.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-2">
              {[
                "Personal Protection",
                "Critical Infrastructure",
                "Mobile Security",
                "Cyber Security",
                "Technical Security",
                "Canine Solutions",
              ].map((s) => (
                <span
                  key={s}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-zinc-300"
                >
                  {s}
                </span>
              ))}
            </div>

            <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:info@soc-afsec.com"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md bg-[#c9a56a] text-black font-semibold hover:bg-[#e0c490] transition"
              >
                Request a Briefing
              </a>
              <a
                href="tel:+252615594141"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md border border-white/20 text-white font-semibold hover:bg-white/5 transition"
              >
                +252 61 5 594 141
              </a>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/10 bg-black/40 backdrop-blur">
          <div className="px-6 sm:px-12 py-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#c9a56a]/10 flex items-center justify-center text-[#c9a56a]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </div>
              <div>
                <div className="text-zinc-500 text-xs uppercase tracking-wider">Phone</div>
                <div className="text-white">+252 61 5 594 141</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#c9a56a]/10 flex items-center justify-center text-[#c9a56a]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </div>
              <div>
                <div className="text-zinc-500 text-xs uppercase tracking-wider">Email</div>
                <div className="text-white">info@soc-afsec.com</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#c9a56a]/10 flex items-center justify-center text-[#c9a56a]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
              <div>
                <div className="text-zinc-500 text-xs uppercase tracking-wider">Address</div>
                <div className="text-white">
                  Marina Hub, Marine Road, Airport Zone
                  <br />
                  Mogadishu, 0100, Banadir, Somalia
                </div>
              </div>
            </div>
          </div>
          <div className="px-6 sm:px-12 py-4 border-t border-white/5 text-xs text-zinc-500 flex flex-col sm:flex-row justify-between gap-2">
            <div>© {new Date().getFullYear()} SOC-AFSEC Industries. All rights reserved.</div>
            <div>www.soc-afsec.com</div>
          </div>
        </footer>
      </div>
    </main>
  );
}

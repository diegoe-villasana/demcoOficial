import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Smartphone,
  HandCoins,
  TriangleAlert,
  Zap,
  MessageCircle,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const navLinks = [
    'About Us',
    'My Account',
    'Residential',
    'Business',
    'Energy Solutions',
    'Reliability',
    'Community',
  ];

  const quickActions = [
    {
      icon: Smartphone,
      title: 'Log In / Register',
      onClick: () => navigate('/login'),
    },
    {
      icon: HandCoins,
      title: 'Pay Now',
      onClick: () => navigate('/pay'),
    },
    {
      icon: TriangleAlert,
      title: 'Report Outage',
      onClick: () => navigate('/report-outage'),
    },
    {
      icon: Zap,
      title: 'Apply/Stop Service',
      onClick: () => navigate('/apply-stop-service'),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="w-full bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-8 py-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#008751] flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-semibold text-[#1f2421] tracking-wide">
              DEMCO
            </span>
          </div>

          {/* Nav */}
          <nav className="hidden lg:flex items-center gap-8 text-[#1f2421] font-medium">
            {navLinks.map((link) => (
              <a key={link} href="#" className="hover:text-[#008751] transition-colors">
                {link}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-6">
            <a href="#" className="text-[#1f2421] font-medium hover:text-[#008751]">
              News &amp; Blog
            </a>
            <button aria-label="Buscar" className="text-[#1f2421] hover:text-[#008751]">
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative w-full h-[420px] bg-[#3a7ca5] overflow-hidden flex items-center">
        <img
          src="/hero-lineman.jpg"
          alt="Trabajador de DEMCO en un poste eléctrico"
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#3a7ca5]/40 to-[#3a7ca5]/10" />

        <div className="relative z-10 max-w-7xl mx-auto w-full px-8 flex items-center justify-end">
          <div className="text-right text-white">
            <p className="text-2xl font-light">welcome to</p>
            <h1 className="text-6xl font-bold italic -mt-1">MyDEMCO</h1>
            <p className="text-lg mt-1">a guide to your online experience</p>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="max-w-7xl mx-auto px-8 -mt-16 relative z-10 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map(({ icon: Icon, title, onClick }) => (
            <button
              key={title}
              onClick={onClick}
              className="bg-white border-2 border-[#008751] rounded-md py-10 px-6 flex flex-col items-center gap-4 hover:shadow-lg transition-shadow"
            >
              <Icon className="w-12 h-12 text-[#1f2421]" strokeWidth={1.5} />
              <span className="text-2xl text-[#1f2421] text-center">{title}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Chat flotante */}
      <button className="fixed bottom-6 right-6 bg-[#008751] hover:bg-green-700 text-white rounded-full px-5 py-3 flex items-center gap-2 shadow-lg z-20">
        <MessageCircle className="w-5 h-5" />
        <span className="font-medium">Chat Now</span>
      </button>
    </div>
  );
};

import React from 'react';

const Footer = () => {
  return (
    <footer className="w-full bg-white border-t border-slate-100 py-4 px-6 mt-auto">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        {/* Copyright notice */}
        <p>
          &copy; {new Date().getFullYear()}{' '}
          <span className="font-semibold text-slate-800">Herbal Creations</span>
          . Nurtured by Nature.
        </p>

        {/* Navigation links */}
        <nav aria-label="Footer Navigation">
          <ul className="flex items-center gap-6">
            <li>
              <a
                href="#"
                className="hover:text-[#316AFF] transition-colors font-medium"
              >
                Home
              </a>
            </li>
            <li>
              <a
                href="#"
                className="hover:text-[#316AFF] transition-colors font-medium"
              >
                FAQ's
              </a>
            </li>
            <li>
              <a
                href="#"
                className="hover:text-[#316AFF] transition-colors font-medium"
              >
                Support
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
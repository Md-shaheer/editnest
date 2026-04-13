import React from 'react';

export default function Footer() {
  return (
    <footer className="relative border-t border-white/10 bg-[#020817]/80 backdrop-blur-lg pt-16 pb-8 px-6 mt-24 overflow-hidden">
      
      {/* പുറകിലെ നീല ഗ്ലോ ഇഫക്റ്റ് */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1/2 bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          {/* 1. Brand Section */}
          <div className="col-span-1 md:col-span-1">
            <span className="text-3xl font-bold tracking-tight">
              <span className="text-white">edit</span>
              <span className="text-yellow-400">nest</span>
            </span>
            <p className="mt-4 text-gray-400 text-sm leading-relaxed">
              Professional-grade AI tools. Remove backgrounds, create passport photos, and enhance images instantly right from your browser.
            </p>
          </div>

          {/* 2. Product Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 tracking-wide">Tools</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors duration-200">Background Remover</a></li>
              <li><a href="#" className="hover:text-white transition-colors duration-200">Passport Photo Maker</a></li>
              <li><a href="#" className="hover:text-white transition-colors duration-200">Image Upscaler</a></li>
              <li><a href="#" className="hover:text-white transition-colors duration-200">Pricing</a></li>
            </ul>
          </div>

          {/* 3. Resources Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 tracking-wide">Resources</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors duration-200">Help Center</a></li>
              <li><a href="#" className="hover:text-white transition-colors duration-200">API Documentation</a></li>
              <li><a href="#" className="hover:text-white transition-colors duration-200">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors duration-200">Community</a></li>
            </ul>
          </div>

          {/* 4. Legal Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 tracking-wide">Legal</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors duration-200">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors duration-200">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors duration-200">Cookie Policy</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar (Copyright & Social Links) */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} EditNest. All rights reserved.</p>
          
          <div className="flex items-center space-x-6">
            
            {/* Instagram Link with Direct SVG Icon */}
            <a 
              href="https://instagram.com/editnest99?igsh=MXVvdWZvd2Q4bDRwbQ==" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-2 hover:text-[#E1306C] transition-colors duration-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "#E1306C", filter: "drop-shadow(0 0 8px rgba(225, 48, 108, 0.35))" }}
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
              <span className="font-medium">Instagram @editnest99</span>
            </a>

            {/* Twitter Link with Direct SVG Icon */}
            <a 
              href="#" 
              className="flex items-center gap-2 hover:text-blue-400 transition-colors duration-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
              </svg>
              <span className="font-medium hidden sm:inline">Twitter</span>
            </a>

            {/* Support Link with Direct SVG Icon */}
            <a 
              href="#" 
              className="flex items-center gap-2 hover:text-white transition-colors duration-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span className="font-medium hidden sm:inline">Support</span>
            </a>

          </div>
        </div>
      </div>
    </footer>
  );
}

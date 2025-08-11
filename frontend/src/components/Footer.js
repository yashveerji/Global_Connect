import React from "react";

const Footer = () => {
  return (
    <footer className="text-center py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 text-sm animate-fadeIn">
      © {new Date().getFullYear()} <span className="text-blue-600">GNCIPL AITD Team- G5</span> — All rights reserved.
    </footer>
  );
};

export default Footer;

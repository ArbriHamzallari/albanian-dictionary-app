const Footer = () => {
  return (
    <footer className="bg-dark text-white">
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold">Shkolla 7 Marsi - Tiranë</p>
          <p className="text-sm text-gray-300">© 2025 Të gjitha të drejtat e rezervuara</p>
        </div>
        <div className="flex gap-4 text-sm">
          <span>Facebook</span>
          <span>Instagram</span>
          <span>Email</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

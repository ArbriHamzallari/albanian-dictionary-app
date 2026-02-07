import { NavLink } from 'react-router-dom';

const Header = () => {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Shkolla 7 Marsi - Fjalor Shqip</h1>
          <p className="text-sm text-gray-600">Tiranë, Shqipëri</p>
        </div>
        <nav className="flex flex-wrap gap-4 text-sm font-medium">
          <NavLink className="hover:text-primary" to="/">
            Kryefaqja
          </NavLink>
          <NavLink className="hover:text-primary" to="/fjala-e-dites">
            Fjala e Ditës
          </NavLink>
          <NavLink className="hover:text-primary" to="/propozo">
            Propozo Fjalë
          </NavLink>
          <NavLink className="hover:text-primary" to="/admin">
            Hyrje Admin
          </NavLink>
        </nav>
      </div>
    </header>
  );
};

export default Header;

import { LogOut, User } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

interface HeaderProps {
  className?: string;
}

export function Header({ className = '' }: HeaderProps) {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
  };

  return (
    <header
      role="banner"
      className={`h-[60px] bg-white border-b border-gray-200 flex items-center justify-between px-6 ${className}`}
    >
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-blue-600">TourWorld</h1>
        <span className="text-sm text-gray-500">CMS</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-gray-700">
          <User className="w-5 h-5" />
          <span>{user?.name || '사용자'}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
          aria-label="로그아웃"
        >
          <LogOut className="w-4 h-4" />
          <span>로그아웃</span>
        </button>
      </div>
    </header>
  );
}

export default Header;

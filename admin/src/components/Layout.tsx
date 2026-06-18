import { NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

const navItems = [
  { path: '/', label: '仪表盘', icon: '📊' },
  { path: '/schema', label: 'Schema浏览器', icon: '📋' },
  { path: '/playground', label: 'GraphQL Playground', icon: '🎮' },
  { path: '/logs', label: '请求日志', icon: '📝' },
  { path: '/saved', label: '已保存查询', icon: '💾' },
];

export default function Layout() {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">GraphQL 管理台</h1>
          <p className="text-sm text-gray-500 mt-1">API 管理平台</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className="sidebar-link"
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          {user && (
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-700 font-semibold">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{user.username}</p>
                <p className="text-xs text-gray-500">{user.role}</p>
              </div>
            </div>
          )}
          <button onClick={logout} className="btn btn-secondary w-full">
            退出登录
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

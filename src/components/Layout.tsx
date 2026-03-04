import { Outlet, NavLink } from 'react-router-dom'
import { Activity, LayoutDashboard, Dumbbell, Apple, Moon, Brain, Pill, TestTube, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', active: true },
  { to: '/exercise', icon: Dumbbell, label: 'Exercise', active: false },
  { to: '/nutrition', icon: Apple, label: 'Nutrition', active: false },
  { to: '/sleep', icon: Moon, label: 'Sleep', active: false },
  { to: '/emotional', icon: Brain, label: 'Emotional', active: false },
  { to: '/molecules', icon: Pill, label: 'Molecules', active: false },
  { to: '/bloodwork', icon: TestTube, label: 'Bloodwork', active: false },
  { to: '/settings', icon: Settings, label: 'Settings', active: true },
]

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <nav className="fixed left-0 top-0 bottom-0 w-16 lg:w-56 flex flex-col border-r border-white/5 bg-[#0a0d17] z-50">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold font-mono text-white">P</span>
          </div>
          <div className="hidden lg:block">
            <div className="text-sm font-bold tracking-tight text-gray-200">PHARMA</div>
            <div className="text-[10px] text-gray-500 tracking-widest uppercase">Healthspan</div>
          </div>
        </div>

        {/* Nav Links */}
        <div className="flex-1 py-4 px-2 space-y-1">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.active ? item.to : '#'}
              onClick={e => { if (!item.active) e.preventDefault() }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  !item.active
                    ? 'text-gray-600 cursor-not-allowed'
                    : isActive
                    ? 'bg-brand-500/15 text-brand-300 border border-brand-500/20'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`
              }
            >
              <item.icon size={18} className="flex-shrink-0" />
              <span className="hidden lg:block">{item.label}</span>
              {!item.active && (
                <span className="hidden lg:block ml-auto text-[9px] uppercase tracking-wider text-gray-600 bg-white/5 px-1.5 py-0.5 rounded">Soon</span>
              )}
            </NavLink>
          ))}
        </div>

        {/* Footer */}
        <div className="hidden lg:block px-4 py-4 border-t border-white/5">
          <div className="text-[10px] text-gray-600 leading-relaxed">
            Medicine 3.0 Framework<br />
            Summit Software Solutions
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 ml-16 lg:ml-56">
        <Outlet />
      </main>
    </div>
  )
}

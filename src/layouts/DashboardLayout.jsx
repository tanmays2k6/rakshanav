import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  LogOut, Home, Navigation, Bot, Map, ShieldAlert, 
  History, MapPin, Users, Bell, User, Settings, 
  Search, Sun, Moon, Phone, Menu, ChevronLeft,
  Activity, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { notificationService } from '../services/notificationService';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import Logo from '../components/Logo';

export default function DashboardLayout({ children, title, showRightSidebar = false, rightSidebarContent }) {
  const { role, user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(false);
  
  // Organization Context for Enterprise Users
  const [organization, setOrganization] = useState(null);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const res = await notificationService.fetchNotifications(user.id);
      if (res.success) {
        setHasUnreadNotifs(res.data.some(n => !n.is_read));
      }
    };
    fetchUnread();
    
    // Fetch Organization if Enterprise or Government
    if (role === 'enterprise' || role === 'government') {
      const fetchOrganization = async () => {
        try {
          if (role === 'enterprise') {
            const { data: memberData, error: memberError } = await supabase
              .from('organization_members')
              .select('org_id, role, organizations(name, short_id)')
              .eq('user_id', user.id)
              .single();
              
            if (!memberError && memberData) {
              setOrganization({
                ...memberData.organizations,
                memberRole: memberData.role
              });
            }
          } else {
            const { data: memberData, error: memberError } = await supabase
              .from('government_members')
              .select('org_id, role, department, designation, government_organizations(name, jurisdiction)')
              .eq('user_id', user.id)
              .single();
              
            if (!memberError && memberData) {
              setOrganization({
                ...memberData.government_organizations,
                memberRole: memberData.role,
                department: memberData.department,
                designation: memberData.designation
              });
            }
          }
        } catch (err) {
          console.error("Error fetching organization:", err);
        }
      };
      fetchOrganization();
    }
    
    notificationService.startRealtime(user.id);
    const unsub = notificationService.subscribe(newData => {
      setHasUnreadNotifs(newData.some(n => !n.is_read));
    });
    
    return () => {
      unsub();
    };
  }, [user, role]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle window resize for auto-collapse
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Init
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const menuItems = {
    citizen: [
      { label: 'Dashboard', icon: Home, path: '/dashboard' },
      { label: 'Safe Navigation', icon: Navigation, path: '/dashboard/navigation' },
      { label: 'AI Safety Assistant', icon: Bot, path: '/dashboard/ai' },
      { label: 'Live Tracking', icon: Map, path: '/dashboard/tracking' },
      { label: 'Report Hazard', icon: ShieldAlert, path: '/dashboard/report' },
      { label: 'Trip History', icon: History, path: '/dashboard/history' },
      { label: 'Saved Places', icon: MapPin, path: '/dashboard/places' },
      { label: 'Emergency Contacts', icon: Phone, path: '/dashboard/emergency' },
      { label: 'Community', icon: Users, path: '/dashboard/community' },
      { label: 'Notifications', icon: Bell, path: '/dashboard/notifications' },
      { label: 'Profile', icon: User, path: '/dashboard/profile' }
    ],
    enterprise: [
      { label: 'Overview', icon: Home, path: '/enterprise' },
      { label: 'Live Operations', icon: Navigation, path: '/enterprise/live' },
      { label: 'Employees', icon: Users, path: '/enterprise/employees' },
      { label: 'Commute Analytics', icon: Activity, path: '/enterprise/analytics' },
      { label: 'Routes & Hotspots', icon: MapPin, path: '/enterprise/routes' },
      { label: 'Safety Alerts', icon: ShieldAlert, path: '/enterprise/alerts' },
      { label: 'Incidents', icon: AlertTriangle, path: '/enterprise/incidents' },
      { label: 'Reports', icon: History, path: '/enterprise/reports' },
      { label: 'Notifications', icon: Bell, path: '/enterprise/notifications' },
      { label: 'Emergency Policies', icon: ShieldCheck, path: '/enterprise/emergency' },
      // Admin dividers are handled visually if needed, we can just append them here
      { label: 'Organization Settings', icon: Settings, path: '/enterprise/settings' },
      { label: 'Team & Roles', icon: Users, path: '/enterprise/team' },
      { label: 'Audit Logs', icon: History, path: '/enterprise/audit' }
    ],
    government: [
      { label: 'Command Center', icon: Map, path: '/government' },
      { label: 'Live Reports', icon: ShieldAlert, path: '/government/reports' },
      { label: 'Ward Monitoring', icon: Users, path: '/government/ward' },
      { label: 'Infrastructure', icon: Bot, path: '/government/infrastructure' },
      { label: 'Notifications', icon: Bell, path: '/government/notifications' },
      { label: 'Crime Analytics', icon: History, path: '/government/analytics' }
    ],
    admin: [
      { label: 'System Overview', icon: Activity, path: '/admin' },
      { label: 'User Management', icon: Users, path: '/admin/users' },
      { label: 'Global Reports', icon: ShieldAlert, path: '/admin/reports' },
      { label: 'Audit Logs', icon: History, path: '/admin/audit' },
      { label: 'Platform Settings', icon: Settings, path: '/admin/settings' }
    ]
  };

  const links = menuItems[role] || [];
  
  // Format Date for Topbar
  const today = new Date();
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = today.toLocaleDateString('en-US', dateOptions);

  return (
    <div className={`flex h-[100dvh] overflow-hidden ${isDarkMode ? 'bg-[#080c10] text-white' : 'bg-gray-50 text-gray-900'} transition-colors duration-300 font-sans`}>
      
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isCollapsed && window.innerWidth >= 1024 ? 80 : 256 }}
        className={`fixed lg:relative inset-y-0 left-0 z-50 lg:z-20 shrink-0 flex flex-col transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          ${isDarkMode ? 'glass-panel bg-[#080c10]/95 lg:bg-[rgba(8,12,18,0.6)]' : 'glass-panel-light bg-white/95 lg:bg-[rgba(255,255,255,0.85)]'} 
          lg:m-4 m-0 h-[100dvh] lg:h-auto w-64 lg:w-auto
        `}
      >
        {/* Collapse Toggle (Desktop Only) */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`hidden lg:flex absolute -right-3 top-8 w-6 h-6 rounded-full items-center justify-center border ${isDarkMode ? 'bg-[#080c10] border-white/10 text-gray-400 hover:text-white' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900'} z-30 transition-colors`}
        >
          {isCollapsed ? <Menu className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>

        {/* Branding Logo */}
        <div className={`pt-6 pb-2 flex items-center justify-center ${isCollapsed ? 'px-2' : 'px-6'}`}>
          <Logo size={isCollapsed ? 'sm' : 'lg'} />
        </div>

        {/* User Profile / Organization Summary */}
        <div className={`p-5 flex items-center ${isCollapsed ? 'justify-center' : 'gap-4'} h-24`}>
          <div className="relative">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${role === 'enterprise' ? 'from-brand-orange to-yellow-500' : 'from-brand-blue to-brand-neonGreen'} p-[2px] shrink-0`}>
              <div className={`w-full h-full rounded-[10px] flex items-center justify-center overflow-hidden ${isDarkMode ? 'bg-brand-dark' : 'bg-white'}`}>
                {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
                  <img src={profile?.avatar_url || user?.user_metadata?.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon isDarkMode={isDarkMode} />
                )}
              </div>
            </div>
            {/* Online Indicator */}
            <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 ${role === 'enterprise' ? 'bg-brand-orange' : 'bg-brand-neonGreen'} border-2 border-[#080c10] rounded-full`}></div>
          </div>
          
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div 
                initial={{ opacity: 0, width: 0 }} 
                animate={{ opacity: 1, width: 'auto' }} 
                exit={{ opacity: 0, width: 0 }}
                className="min-w-0 overflow-hidden flex flex-col"
              >
                {role === 'enterprise' || role === 'government' ? (
                  <>
                    <h1 className="font-display font-bold text-sm truncate">{organization?.name || profile?.full_name || (role === 'enterprise' ? 'Enterprise Admin' : 'Gov Official')}</h1>
                    <p className={`text-[10px] uppercase tracking-wider font-mono truncate ${role === 'enterprise' ? 'text-brand-orange' : 'text-blue-400'}`}>
                      {role === 'enterprise' ? 
                        (organization?.short_id ? `ORG ID: ${organization.short_id}` : 'ENTERPRISE') :
                        (organization?.department || 'GOVERNMENT')
                      }
                    </p>
                  </>
                ) : (
                  <>
                    <h1 className="font-display font-bold text-sm truncate">{profile?.full_name || user?.email || 'User'}</h1>
                    <p className="text-xs text-brand-neonGreen uppercase tracking-wider font-mono truncate">{role}</p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-2 space-y-1 custom-scrollbar">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            
            // Render a divider for admin settings if it's the first admin item
            const isAdminSection = role === 'enterprise' && link.label === 'Organization Settings';
            
            return (
              <React.Fragment key={link.path}>
                {isAdminSection && (
                  <div className={`my-4 border-t ${isDarkMode ? 'border-white/10' : 'border-gray-200'} pt-4`}>
                    {!isCollapsed && <p className="px-3 text-[10px] uppercase font-mono tracking-wider text-gray-500 mb-2">Administration</p>}
                  </div>
                )}
                <Link
                  to={link.path}
                  title={isCollapsed ? link.label : ""}
                  className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-[12px] transition-all duration-200 group relative
                    ${isActive 
                      ? (isDarkMode ? 'bg-brand-blue/5 text-white shadow-[0_0_20px_rgba(59,130,246,0.1)] border border-white/5' : 'bg-blue-50/50 text-brand-blue font-medium border border-transparent')
                      : (isDarkMode ? 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-transparent')
                    }
                  `}
                >
                  {isActive && (
                     <motion.div layoutId="activeNav" className={`absolute left-0 w-[3px] h-5 rounded-r-full shadow-[0_0_12px_rgba(59,130,246,0.8)] ${role === 'enterprise' ? 'bg-brand-orange shadow-[0_0_12px_rgba(249,115,22,0.8)]' : (role === 'government' ? 'bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.8)]' : 'bg-brand-blue')}`} />
                  )}
                  <Icon className={`w-[18px] h-[18px] ${isActive ? (role === 'enterprise' ? 'text-brand-orange drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]' : (role === 'government' ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]' : 'text-brand-blue drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]')) : (role === 'enterprise' ? 'group-hover:text-brand-orange' : (role === 'government' ? 'group-hover:text-blue-400' : 'group-hover:text-brand-blue'))} transition-colors shrink-0`} />
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span 
                        initial={{ opacity: 0, width: 0 }} 
                        animate={{ opacity: 1, width: 'auto' }} 
                        exit={{ opacity: 0, width: 0 }}
                        className="text-[13px] font-medium whitespace-nowrap overflow-hidden"
                      >
                        {link.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 space-y-1 shrink-0">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={isCollapsed ? (isDarkMode ? 'Light Mode' : 'Dark Mode') : ""}
            className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-3 rounded-xl transition-colors w-full text-[13px] font-medium
              ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
          >
            {isDarkMode ? <Sun className="w-[18px] h-[18px] shrink-0" /> : <Moon className="w-[18px] h-[18px] shrink-0" />}
            {!isCollapsed && <span className="whitespace-nowrap">Theme</span>}
          </button>
          
          <Link 
            to={role === 'enterprise' ? '/enterprise/settings' : '/dashboard/settings'}
            title={isCollapsed ? 'Settings' : ""}
            className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-3 rounded-xl transition-colors w-full text-[13px] font-medium
              ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
          >
            <Settings className="w-[18px] h-[18px] shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap">Settings</span>}
          </Link>

          <button 
            onClick={handleSignOut}
            title={isCollapsed ? 'Logout' : ""}
            className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-3 rounded-xl transition-colors w-full text-[13px] font-medium
              ${isDarkMode ? 'hover:bg-red-500/10 hover:text-red-400 text-gray-400' : 'hover:bg-red-50 text-red-600'}`}
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap">Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative h-[100dvh] min-w-0">
        
        {/* Mobile Top Header (Visible only on lg:hidden) */}
        <header className="lg:hidden h-16 flex items-center justify-between px-4 z-30 shrink-0 border-b border-white/5 bg-black/20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className={`p-2 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-white border-gray-200 text-gray-600'}`}
            >
              <Menu className="w-5 h-5" />
            </button>
            <Logo size="sm" />
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard/notifications')} className="relative">
              <Bell className={`w-5 h-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} />
              {hasUnreadNotifs && <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-neonRed rounded-full border border-[#080c10]"></span>}
            </button>
            <button onClick={() => navigate('/dashboard/profile')} className="w-8 h-8 rounded-full overflow-hidden border border-white/10">
              {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
                <img src={profile?.avatar_url || user?.user_metadata?.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserIcon isDarkMode={isDarkMode} />
              )}
            </button>
          </div>
        </header>

        {/* Desktop Top Header - Perfect Alignment */}
        <header className="hidden lg:flex h-20 items-center justify-between px-10 z-10 shrink-0 border-b border-white/5">
          
          {/* Left: Greeting & Date */}
          <div className="flex flex-col justify-center pt-2">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold font-display tracking-tight leading-tight truncate max-w-[300px] xl:max-w-md">
                Hello, {profile?.full_name ? profile.full_name.split(' ')[0] : (role === 'enterprise' ? 'Admin' : (role === 'admin' ? 'Super Admin' : 'Tanmay'))}
              </h2>
              {role === 'enterprise' && (
                <div className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border ${isDarkMode ? 'bg-brand-orange/10 border-brand-orange/30 text-brand-orange' : 'bg-orange-100 border-orange-300 text-orange-700'}`}>
                  Enterprise Operations
                </div>
              )}
              {role === 'government' && (
                <div className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border ${isDarkMode ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-blue-100 border-blue-300 text-blue-700'}`}>
                  Municipal Command Center
                </div>
              )}
              {role === 'admin' && (
                <div className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border ${isDarkMode ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-purple-100 border-purple-300 text-purple-700'}`}>
                  System Administration
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className={`text-[12px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} font-mono uppercase tracking-wider`}>
                {formattedDate}
              </p>
              <span className={`w-1 h-1 rounded-full ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></span>
              <p className={`text-[12px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} font-mono tracking-wider flex items-center gap-1`}>
                <MapPin className="w-3 h-3" />
                Bengaluru, IN
              </p>
            </div>
          </div>
          
          {/* Center: Search */}
          <div className="flex-1 flex justify-center max-w-xl px-8 hidden md:flex">
             <motion.div 
               animate={{ width: isSearchFocused ? '100%' : '80%' }}
               className="relative w-full"
             >
                <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <input 
                  type="text" 
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder={role === 'government' ? "Search reports, locations, wards..." : "Search places, trips, reports..."} 
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-[13px] outline-none transition-all shadow-sm
                    ${isDarkMode 
                      ? 'bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-brand-blue/50 focus:bg-white/10' 
                      : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20'}`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-500'} font-mono`}>⌘</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-500'} font-mono`}>K</span>
                </div>
             </motion.div>
          </div>

          {/* Right: GPS, Notification, Profile */}
          <div className="flex items-center gap-6 shrink-0">
            {/* System Status / GPS Badge in Header */}
            {role === 'government' ? (
              <div className={`hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full border ${isDarkMode ? 'bg-brand-neonGreen/5 border-brand-neonGreen/20 text-brand-neonGreen' : 'bg-green-50 border-green-200 text-green-700'}`}>
                <div className="w-2 h-2 rounded-full bg-brand-neonGreen animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.9)]"></div>
                <span className="text-[12px] font-mono font-bold tracking-wide uppercase">System Operational</span>
              </div>
            ) : (
              <div className={`hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full border ${isDarkMode ? 'bg-brand-neonGreen/5 border-brand-neonGreen/20 text-brand-neonGreen' : 'bg-green-50 border-green-200 text-green-700'}`}>
                <div className="w-2 h-2 rounded-full bg-brand-neonGreen animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.9)]"></div>
                <span className="text-[12px] font-mono font-bold tracking-wide uppercase">GPS Active</span>
              </div>
            )}

            <button onClick={() => navigate('/dashboard/notifications')} className={`w-10 h-10 rounded-xl flex items-center justify-center relative transition-colors group
              ${isDarkMode ? 'bg-white/5 hover:bg-white/10 border border-white/10' : 'bg-white hover:bg-gray-50 border border-gray-200 shadow-sm'}`}>
              <Bell className={`w-[18px] h-[18px] ${isDarkMode ? 'text-gray-300 group-hover:text-white' : 'text-gray-600'}`} />
              {hasUnreadNotifs && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-brand-neonRed rounded-full border-2 border-[#080c10]"></span>}
            </button>
            
            <button className={`w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden transition-all hover:ring-2 hover:ring-brand-blue/50 ring-offset-2 ring-offset-[#080c10]
              ${isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200 shadow-sm'}`}>
              {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
                <img src={profile?.avatar_url || user?.user_metadata?.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserIcon isDarkMode={isDarkMode} />
              )}
            </button>
          </div>
        </header>

        {/* Content Area with 12-Column Grid Ready Container */}
        <div className={`flex-1 relative overflow-y-auto overflow-x-hidden custom-scrollbar px-4 lg:px-8 pb-[100px] lg:pb-8 flex flex-col gap-6 pt-4 lg:pt-0`}>
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation for Citizens */}
      {role === 'citizen' && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080c10]/95 backdrop-blur-xl border-t border-white/10 pb-safe px-2">
          <div className="flex items-center justify-around h-16">
            <Link to="/dashboard" className={`flex flex-col items-center justify-center w-full h-full gap-1 ${location.pathname === '/dashboard' ? 'text-brand-blue' : 'text-gray-500 hover:text-gray-400'}`}>
              <Home className="w-[22px] h-[22px]" />
              <span className="text-[10px] font-medium">Home</span>
            </Link>
            <Link to="/dashboard/navigation" className={`flex flex-col items-center justify-center w-full h-full gap-1 ${location.pathname === '/dashboard/navigation' ? 'text-brand-blue' : 'text-gray-500 hover:text-gray-400'}`}>
              <Navigation className="w-[22px] h-[22px]" />
              <span className="text-[10px] font-medium">Navigate</span>
            </Link>
            <div className="relative -top-4 w-[60px] flex justify-center">
              {/* Center SOS/Map Action if needed, we'll use a large map icon */}
              <Link to="/dashboard/tracking" className="w-12 h-12 rounded-full bg-brand-blue/20 flex items-center justify-center border border-brand-blue/30 text-brand-blue shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                <Map className="w-5 h-5" />
              </Link>
            </div>
            <Link to="/dashboard/ai" className={`flex flex-col items-center justify-center w-full h-full gap-1 ${location.pathname === '/dashboard/ai' ? 'text-[#a855f7]' : 'text-gray-500 hover:text-gray-400'}`}>
              <Bot className="w-[22px] h-[22px]" />
              <span className="text-[10px] font-medium">AI Agent</span>
            </Link>
            <Link to="/dashboard/profile" className={`flex flex-col items-center justify-center w-full h-full gap-1 ${location.pathname === '/dashboard/profile' ? 'text-brand-blue' : 'text-gray-500 hover:text-gray-400'}`}>
              <User className="w-[22px] h-[22px]" />
              <span className="text-[10px] font-medium">Profile</span>
            </Link>
          </div>
        </div>
      )}

      {/* Floating Emergency SOS Button */}
      {role === 'citizen' && (
        <button 
          onClick={() => navigate('/dashboard/emergency', { state: { autoTrigger: true } })}
          className="fixed bottom-[88px] lg:bottom-8 right-4 lg:right-8 w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-brand-neonRed flex flex-col items-center justify-center shadow-[0_8px_32px_rgba(239,68,68,0.4)] hover:scale-105 active:scale-95 transition-all z-50 group border border-red-400/50"
          title="Emergency SOS"
        >
          <ShieldAlert className="w-6 h-6 text-white mb-0.5 group-hover:animate-bounce" />
          <span className="text-[9px] font-black tracking-widest text-white/90 leading-none">SOS</span>
        </button>
      )}

    </div>
  );
}

function UserIcon({ isDarkMode }) {
  return (
    <svg className={`w-5 h-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

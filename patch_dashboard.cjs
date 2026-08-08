const fs = require('fs');

const path = 'e:/rakshanav-main/rakshanav-main/rakshanav/src/layouts/DashboardLayout.jsx';
let c = fs.readFileSync(path, 'utf8');

if (!c.includes('import { notificationService }')) {
  c = c.replace(
    "import { Link, useLocation, useNavigate } from 'react-router-dom';",
    "import { Link, useLocation, useNavigate } from 'react-router-dom';\nimport { notificationService } from '../services/notificationService';"
  );
}

// Add state for unread notifications
c = c.replace(
  '  const [isSidebarOpen, setIsSidebarOpen] = useState(false);',
  `  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const res = await notificationService.fetchNotifications(user.id);
      if (res.success) {
        setHasUnreadNotifs(res.data.some(n => !n.is_read));
      }
    };
    fetchUnread();
    
    // Subscribe to changes globally
    notificationService.startRealtime(user.id);
    const unsub = notificationService.subscribe(newData => {
      setHasUnreadNotifs(newData.some(n => !n.is_read));
    });
    
    return () => {
      unsub();
      // Only stop realtime if we aren't in Notifications view (handling this carefully)
      // Actually, since DashboardLayout wraps everything, it can safely keep it open.
    };
  }, [user]);`
);

// Replace button dot
c = c.replace(
  '<span className="absolute top-2.5 right-2.5 w-2 h-2 bg-brand-neonRed rounded-full border-2 border-[#080c10]"></span>',
  `{hasUnreadNotifs && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-brand-neonRed rounded-full border-2 border-[#080c10]"></span>}`
);

// Add onClick to navigate
c = c.replace(
  '<button className={`w-10 h-10 rounded-xl flex items-center justify-center relative transition-colors group',
  '<button onClick={() => navigate(\'/dashboard/notifications\')} className={`w-10 h-10 rounded-xl flex items-center justify-center relative transition-colors group'
);

fs.writeFileSync(path, c, 'utf8');
console.log('Patched DashboardLayout.jsx');

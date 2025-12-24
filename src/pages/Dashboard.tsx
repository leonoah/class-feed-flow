import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Users, MessageSquare, CheckSquare, Moon, Sun } from 'lucide-react';
import OnlineStudents from '@/components/OnlineStudents';
import AnnouncementsBoard from '@/components/AnnouncementsBoard';
import TasksBoard from '@/components/TasksBoard';
import { toast } from 'sonner';

export default function Dashboard() {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('online');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = window.localStorage.getItem('theme');
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = stored === 'dark' || (!stored && prefersDark);

    if (shouldUseDark) {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    }
  }, []);

  const toggleTheme = () => {
    if (typeof window === 'undefined') return;

    const next = !isDark;
    setIsDark(next);

    if (next) {
      document.documentElement.classList.add('dark');
      window.localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      window.localStorage.setItem('theme', 'light');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('להתראות!');
    } catch (error) {
      toast.error('שגיאה בהתנתקות');
    }
  };

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-primary-foreground"
              style={{ backgroundColor: profile?.avatar_color || 'hsl(200, 70%, 50%)' }}
            >
              {profile?.name ? getInitial(profile.name) : '?'}
            </div>
            <div>
              <p className="font-semibold text-foreground">{profile?.name || 'טוען...'}</p>
              <p className="text-xs text-muted-foreground">מחובר/ת</p>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <h1 className="text-xl font-bold font-rubik text-gradient hidden sm:block">
              VIBE CODING
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="relative"
              aria-label={isDark ? 'מצב בהיר' : 'מצב כהה'}
            >
              {isDark ? (
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all" />
              ) : (
                <Moon className="h-5 w-5 rotate-0 scale-100 transition-all" />
              )}
            </Button>

            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="online" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">מחוברים</span>
            </TabsTrigger>
            <TabsTrigger value="announcements" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">מודעות</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2">
              <CheckSquare className="h-4 w-4" />
              <span className="hidden sm:inline">מטלות</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="online" className="animate-fade-in">
            <OnlineStudents />
          </TabsContent>

          <TabsContent value="announcements" className="animate-fade-in">
            <AnnouncementsBoard />
          </TabsContent>

          <TabsContent value="tasks" className="animate-fade-in">
            <TasksBoard />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

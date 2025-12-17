import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { Users, Wifi, WifiOff } from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  avatar_color: string;
  last_seen_at: string;
  created_at: string;
}

export default function OnlineStudents() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('last_seen_at', { ascending: false });
    
    if (data) {
      setProfiles(data as Profile[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => fetchProfiles()
      )
      .subscribe();

    // Refresh every 30 seconds
    const interval = setInterval(fetchProfiles, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const isOnline = (lastSeen: string) => {
    const diff = Date.now() - new Date(lastSeen).getTime();
    return diff < 60000; // Less than 1 minute ago
  };

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const onlineCount = profiles.filter(p => isOnline(p.last_seen_at)).length;

  if (loading) {
    return (
      <Card className="card-shadow">
        <CardContent className="py-8 text-center text-muted-foreground">
          טוען...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      <Card className="gradient-primary text-primary-foreground">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-foreground/80 text-sm">סטודנטים מחוברים</p>
              <p className="text-4xl font-bold font-rubik">{onlineCount}</p>
            </div>
            <Users className="h-12 w-12 opacity-50" />
          </div>
        </CardContent>
      </Card>

      {/* Students List */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            כל הסטודנטים ({profiles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile, index) => {
              const online = isOnline(profile.last_seen_at);
              return (
                <div
                  key={profile.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 card-hover animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="relative">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-primary-foreground"
                      style={{ backgroundColor: profile.avatar_color }}
                    >
                      {getInitial(profile.name)}
                    </div>
                    <div
                      className={`absolute -bottom-0.5 -left-0.5 w-4 h-4 rounded-full border-2 border-card ${
                        online ? 'bg-online' : 'bg-offline'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{profile.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {online ? (
                        <>
                          <Wifi className="h-3 w-3 text-online" />
                          <span className="text-online">מחובר/ת עכשיו</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="h-3 w-3" />
                          <span>
                            נראה/תה {formatDistanceToNow(new Date(profile.last_seen_at), { addSuffix: true, locale: he })}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {profiles.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              אין סטודנטים רשומים עדיין
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

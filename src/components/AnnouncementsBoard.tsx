import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { Plus, MessageSquare, Trash2, Tag } from 'lucide-react';
import { toast } from 'sonner';

interface Announcement {
  id: string;
  user_id: string;
  title: string;
  body: string;
  tags: string[];
  created_at: string;
  profiles?: { name: string; avatar_color: string };
}

const TAG_OPTIONS = ['שאלה', 'טיפ', 'בעיה', 'לינק'];

export default function AnnouncementsBoard() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from('announcements')
      .select('*, profiles(name, avatar_color)')
      .order('created_at', { ascending: false });
    
    if (data) {
      setAnnouncements(data as unknown as Announcement[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAnnouncements();

    const channel = supabase
      .channel('announcements-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        () => fetchAnnouncements()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('נא למלא כותרת ותוכן');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('announcements').insert({
      user_id: user?.id,
      title: title.trim(),
      body: body.trim(),
      tags: selectedTags,
    });

    if (error) {
      toast.error('שגיאה ביצירת ההודעה');
    } else {
      toast.success('ההודעה פורסמה!');
      setTitle('');
      setBody('');
      setSelectedTags([]);
      setIsDialogOpen(false);
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) {
      toast.error('שגיאה במחיקה');
    } else {
      toast.success('ההודעה נמחקה');
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  const getTagColor = (tag: string) => {
    switch (tag) {
      case 'שאלה': return 'bg-info/20 text-info border-info/30';
      case 'טיפ': return 'bg-success/20 text-success border-success/30';
      case 'בעיה': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'לינק': return 'bg-warning/20 text-warning-foreground border-warning/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

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
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-rubik flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          לוח מודעות
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              הודעה חדשה
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>פרסם הודעה חדשה</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Input
                  placeholder="כותרת"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-right"
                />
              </div>
              <div>
                <Textarea
                  placeholder="תוכן ההודעה..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="text-right min-h-[100px]"
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  תגיות (אופציונלי)
                </p>
                <div className="flex flex-wrap gap-2">
                  {TAG_OPTIONS.map(tag => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className={`cursor-pointer transition-all ${
                        selectedTags.includes(tag) ? getTagColor(tag) : 'opacity-50 hover:opacity-100'
                      }`}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                {submitting ? 'מפרסם...' : 'פרסם'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Announcements list */}
      <div className="space-y-4">
        {announcements.map((announcement, index) => (
          <Card 
            key={announcement.id} 
            className="card-shadow card-hover animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground flex-shrink-0"
                  style={{ backgroundColor: announcement.profiles?.avatar_color || 'hsl(200, 70%, 50%)' }}
                >
                  {announcement.profiles?.name ? getInitial(announcement.profiles.name) : '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-lg">{announcement.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {announcement.profiles?.name} • {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true, locale: he })}
                      </p>
                    </div>
                    {announcement.user_id === user?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(announcement.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="mt-2 text-foreground whitespace-pre-wrap">{announcement.body}</p>
                  {announcement.tags && announcement.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {announcement.tags.map(tag => (
                        <Badge key={tag} variant="outline" className={getTagColor(tag)}>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {announcements.length === 0 && (
          <Card className="card-shadow">
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">אין הודעות עדיין</p>
              <p className="text-sm text-muted-foreground">היה הראשון לפרסם!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

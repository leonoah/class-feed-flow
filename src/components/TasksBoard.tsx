import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format, isPast, isToday } from 'date-fns';
import { he } from 'date-fns/locale';
import { Plus, CheckSquare, Trash2, Calendar, Circle, Clock, CheckCircle2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables, Enums } from '@/integrations/supabase/types';

type TaskStatus = Enums<'task_status'>;

type Task = Tables<'tasks'> & {
  profiles?: { name: string; avatar_color: string | null };
};

const STATUS_CONFIG = {
  todo: { label: 'לביצוע', icon: Circle, color: 'bg-status-todo text-foreground' },
  doing: { label: 'בתהליך', icon: Clock, color: 'bg-status-doing text-warning-foreground' },
  done: { label: 'הושלם', icon: CheckCircle2, color: 'bg-status-done text-success-foreground' },
};

export default function TasksBoard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [submitting, setSubmitting] = useState(false);

  const fetchTasks = async () => {
    try {
      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
      
      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        toast.error('שגיאה בטעינת המטלות');
        setTasks([]);
        setLoading(false);
        return;
      }

      if (!tasksData || tasksData.length === 0) {
        setTasks([]);
        setLoading(false);
        return;
      }

      // Fetch profiles for all unique user_ids
      const userIds = [...new Set(tasksData.map(t => t.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, avatar_color')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Continue without profiles data
      }

      // Create a map of user_id -> profile
      const profilesMap = new Map(
        (profilesData || []).map(p => [p.user_id, { name: p.name, avatar_color: p.avatar_color }])
      );

      // Combine tasks with profiles
      const tasksWithProfiles: Task[] = tasksData.map(task => ({
        ...task,
        profiles: profilesMap.get(task.user_id) || undefined,
      }));

      setTasks(tasksWithProfiles);
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('שגיאה בטעינת המטלות');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();

    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => fetchTasks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setStatus('todo');
    setEditingTask(null);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('נא להזין שם למשימה');
      return;
    }

    if (!editingTask && !user?.id) {
      toast.error('נא להתחבר למערכת');
      return;
    }

    setSubmitting(true);
    
    if (editingTask) {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          due_date: dueDate || null,
          status,
        })
        .eq('id', editingTask.id);

      if (error) {
        console.error('Error updating task:', error);
        toast.error('שגיאה בעדכון המשימה');
      } else {
        toast.success('המשימה עודכנה!');
        resetForm();
        setIsDialogOpen(false);
      }
    } else {
      const { error } = await supabase.from('tasks').insert({
        user_id: user!.id,
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate || null,
        status,
      });

      if (error) {
        console.error('Error creating task:', error);
        toast.error('שגיאה ביצירת המשימה');
      } else {
        toast.success('המשימה נוצרה!');
        resetForm();
        setIsDialogOpen(false);
      }
    }
    setSubmitting(false);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setDueDate(task.due_date || '');
    setStatus(task.status);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      console.error('Error deleting task:', error);
      toast.error('שגיאה במחיקה');
    } else {
      toast.success('המשימה נמחקה');
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId);

    if (error) {
      console.error('Error updating task status:', error);
      toast.error('שגיאה בעדכון הסטטוס');
    }
  };

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  const filteredTasks = filterStatus === 'all' 
    ? tasks 
    : tasks.filter(t => t.status === filterStatus);

  const taskCounts = {
    todo: tasks.filter(t => t.status === 'todo').length,
    doing: tasks.filter(t => t.status === 'doing').length,
    done: tasks.filter(t => t.status === 'done').length,
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
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map(key => {
          const config = STATUS_CONFIG[key];
          const Icon = config.icon;
          return (
            <Card 
              key={key} 
              className={`card-shadow cursor-pointer transition-all ${filterStatus === key ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}
            >
              <CardContent className="py-4 text-center">
                <Icon className={`h-6 w-6 mx-auto mb-2 ${key === 'done' ? 'text-status-done' : key === 'doing' ? 'text-status-doing' : 'text-status-todo'}`} />
                <p className="text-2xl font-bold font-rubik">{taskCounts[key]}</p>
                <p className="text-xs text-muted-foreground">{config.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-rubik flex items-center gap-2">
          <CheckSquare className="h-6 w-6 text-primary" />
          לוח מטלות
          {filterStatus !== 'all' && (
            <Badge variant="secondary" className="mr-2">
              {STATUS_CONFIG[filterStatus].label}
            </Badge>
          )}
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              משימה חדשה
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'עריכת משימה' : 'יצירת משימה חדשה'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Input
                  placeholder="שם המשימה"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-right"
                />
              </div>
              <div>
                <Textarea
                  placeholder="תיאור (אופציונלי)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-right min-h-[80px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">תאריך יעד</label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">סטטוס</label>
                  <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map(key => (
                        <SelectItem key={key} value={key}>
                          {STATUS_CONFIG[key].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                {submitting ? 'שומר...' : editingTask ? 'עדכן' : 'צור משימה'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tasks list */}
      <div className="space-y-3">
        {filteredTasks.map((task, index) => {
          const config = STATUS_CONFIG[task.status];
          const Icon = config.icon;
          const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'done';
          const isDueToday = task.due_date && isToday(new Date(task.due_date));

          return (
            <Card 
              key={task.id} 
              className={`card-shadow card-hover animate-slide-up ${task.status === 'done' ? 'opacity-70' : ''}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <Select 
                    value={task.status} 
                    onValueChange={(v) => handleStatusChange(task.id, v as TaskStatus)}
                  >
                    <SelectTrigger className="w-auto border-0 p-0 h-auto">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map(key => (
                        <SelectItem key={key} value={key}>
                          {STATUS_CONFIG[key].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className={`font-semibold ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-primary-foreground"
                            style={{ backgroundColor: task.profiles?.avatar_color || 'hsl(200, 70%, 50%)' }}
                          >
                            {task.profiles?.name ? getInitial(task.profiles.name) : '?'}
                          </div>
                          <span>{task.profiles?.name}</span>
                        </div>
                      </div>
                      
                      {task.user_id === user?.id && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => handleEdit(task)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(task.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {task.description && (
                      <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                        {task.description}
                      </p>
                    )}
                    
                    {task.due_date && (
                      <div className={`flex items-center gap-1 mt-2 text-xs ${
                        isOverdue ? 'text-destructive' : isDueToday ? 'text-warning' : 'text-muted-foreground'
                      }`}>
                        <Calendar className="h-3 w-3" />
                        <span>
                          {isOverdue ? 'פג תוקף: ' : isDueToday ? 'היום: ' : ''}
                          {format(new Date(task.due_date), 'dd/MM/yyyy', { locale: he })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredTasks.length === 0 && (
          <Card className="card-shadow">
            <CardContent className="py-12 text-center">
              <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {filterStatus === 'all' ? 'אין משימות עדיין' : `אין משימות בסטטוס "${STATUS_CONFIG[filterStatus].label}"`}
              </p>
              {filterStatus === 'all' && (
                <p className="text-sm text-muted-foreground">צור את המשימה הראשונה!</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

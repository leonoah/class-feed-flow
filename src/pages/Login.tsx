import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Users, BookOpen, CheckSquare } from 'lucide-react';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        if (!name.trim()) {
          toast.error('נא להזין שם');
          setLoading(false);
          return;
        }
        await signUp(email, password, name);
        toast.success('נרשמת בהצלחה! ברוך הבא לכיתה');
      } else {
        await signIn(email, password);
        toast.success('התחברת בהצלחה!');
      }
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'אירעה שגיאה');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Users, title: 'סטודנטים מחוברים', desc: 'ראה מי עכשיו בכיתה' },
    { icon: BookOpen, title: 'לוח מודעות', desc: 'שתף והתעדכן' },
    { icon: CheckSquare, title: 'לוח מטלות', desc: 'נהל משימות יחד' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Left side - Features */}
      <div className="lg:w-1/2 gradient-primary p-8 lg:p-16 flex flex-col justify-center">
        <div className="max-w-md mx-auto text-center lg:text-right">
          <h1 className="text-3xl lg:text-4xl font-bold text-primary-foreground mb-4 font-rubik">
            VIBE CODING
          </h1>
          <p className="text-xl text-primary-foreground/90 mb-8">
            לוח הכיתה שלנו
          </p>
          
          <div className="space-y-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="flex items-center gap-4 bg-primary-foreground/10 rounded-lg p-4 backdrop-blur-sm animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="text-right">
                  <h3 className="font-semibold text-primary-foreground">{feature.title}</h3>
                  <p className="text-sm text-primary-foreground/80">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="lg:w-1/2 p-8 lg:p-16 flex items-center justify-center">
        <Card className="w-full max-w-md card-shadow animate-slide-up">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-rubik">
              {isSignUp ? 'הצטרף לכיתה' : 'התחבר'}
            </CardTitle>
            <CardDescription>
              {isSignUp ? 'צור חשבון חדש להצטרפות' : 'ברוך שובך!'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="name">השם שלך</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="ישראל ישראלי"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-right"
                    required
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">אימייל</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-right"
                  dir="ltr"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">סיסמה</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-right"
                  dir="ltr"
                  minLength={6}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'רגע...' : isSignUp ? 'הצטרף לכיתה' : 'התחבר'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {isSignUp ? 'כבר יש לך חשבון? התחבר' : 'אין לך חשבון? הצטרף'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

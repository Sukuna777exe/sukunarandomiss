import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { signIn, signUp } from '../services/firebase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Shield, Lock, Mail, User, Eye, EyeOff, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

// List of allowed email domains
const ALLOWED_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'proton.me',
  'icloud.com'
];

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [emailError, setEmailError] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'login';

  const validateEmail = (email: string) => {
    if (!email) return false;
    const domain = email.split('@')[1];
    if (!domain) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    if (!ALLOWED_EMAIL_DOMAINS.includes(domain)) {
      setEmailError('This email domain is not allowed. Please use a common email provider.');
      return false;
    }
    setEmailError('');
    return true;
  };

  const checkPasswordStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 8) strength++;
    if (pass.match(/[A-Z]/)) strength++;
    if (pass.match(/[0-9]/)) strength++;
    if (pass.match(/[^A-Za-z0-9]/)) strength++;
    setPasswordStrength(strength);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(email)) {
      toast({
        title: "Invalid Email",
        description: emailError,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      toast({
        title: "Welcome Back! 👋",
        description: "You've been logged in successfully.",
      });
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "Authentication Failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !displayName) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(email)) {
      toast({
        title: "Invalid Email",
        description: emailError,
        variant: "destructive",
      });
      return;
    }

    if (passwordStrength < 3) {
      toast({
        title: "Weak Password",
        description: "Please choose a stronger password with at least 8 characters, including uppercase, numbers, and special characters.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, displayName);
      toast({
        title: "Welcome to Randomiss! 🎉",
        description: "Your account has been created successfully. Let's get started!",
      });
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background/50 to-background p-4">
      {/* Enhanced Background Effects */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
          className="w-full text-center mb-8"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="inline-flex items-center justify-center mb-4"
          >
            <div className="relative">
              <Shield className="w-16 h-16 text-primary animate-pulse" />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-2 border-primary/20"
              />
            </div>
          </motion.div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
          Welcome to Randomiss
        </h1>
        <p className="text-muted-foreground mt-2">
            Secure video chat platform for connecting worldwide
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="glass-card border-border/50 backdrop-blur-xl shadow-xl">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                {defaultTab === 'login' ? 'Welcome Back' : 'Join Randomiss'}
              </CardTitle>
              <CardDescription>
                {defaultTab === 'login' 
                  ? 'Sign in securely to your account'
                  : 'Create your secure account today'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        Email
                      </Label>
                      <div className="relative">
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your email address"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            validateEmail(e.target.value);
                          }}
                          required
                          className={cn(
                            "bg-white/5 border-white/10 focus:border-primary/50 pl-10 pr-10",
                            emailError && "border-destructive"
                          )}
                        />
                        <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                        <AnimatePresence>
                          {email && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute right-3 top-3"
                            >
                              {emailError ? (
                                <XCircle className="w-4 h-4 text-destructive" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      {emailError && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs text-destructive mt-1"
                        >
                          {emailError}
                        </motion.p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="bg-white/5 border-white/10 focus:border-primary/50 pl-10 pr-10"
                        />
                        <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-muted-foreground hover:text-primary transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full btn-3d bg-gradient-purple" 
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Sign In Securely
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="register">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="displayName" className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        Display Name
                      </Label>
                      <div className="relative">
                        <Input
                          id="displayName"
                          type="text"
                          placeholder="Choose your display name"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          required
                          className="bg-white/5 border-white/10 focus:border-primary/50 pl-10"
                        />
                        <User className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        Email
                      </Label>
                      <div className="relative">
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your email address"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            validateEmail(e.target.value);
                          }}
                          required
                          className={cn(
                            "bg-white/5 border-white/10 focus:border-primary/50 pl-10 pr-10",
                            emailError && "border-destructive"
                          )}
                        />
                        <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                        <AnimatePresence>
                          {email && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute right-3 top-3"
                            >
                              {emailError ? (
                                <XCircle className="w-4 h-4 text-destructive" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      {emailError && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs text-destructive mt-1"
                        >
                          {emailError}
                        </motion.p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            checkPasswordStrength(e.target.value);
                          }}
                          required
                          className="bg-white/5 border-white/10 focus:border-primary/50 pl-10 pr-10"
                        />
                        <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-muted-foreground hover:text-primary transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {/* Enhanced Password strength indicator */}
                      <div className="space-y-2">
                        <div className="flex gap-1">
                          {[...Array(4)].map((_, i) => (
                            <motion.div
                              key={i}
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: 1 }}
                              transition={{ duration: 0.2, delay: i * 0.1 }}
                              className={cn(
                                "h-1 w-full rounded-full transition-all duration-300",
                                i < passwordStrength
                                  ? passwordStrength <= 2
                                    ? "bg-destructive"
                                    : passwordStrength === 3
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                                  : "bg-muted"
                              )}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Password must be at least 8 characters with uppercase, numbers, and symbols
                        </p>
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full btn-3d bg-gradient-purple"
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
                      ) : (
                        <>
                          <Shield className="w-4 h-4 mr-2" />
                          Create Secure Account
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
      </motion.div>
      </div>
    </div>
  );
};

export default Auth;

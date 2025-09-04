import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { z } from "zod";

// Authentication schemas
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  university: z.string().optional(),
  graduationYear: z.number().min(2020).max(2030).optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ login?: string; register?: string }>({});

  // Check for redirect after auth
  useEffect(() => {
    if (user && !authLoading) {
      const redirect = sessionStorage.getItem('redirectAfterAuth');
      if (redirect) {
        sessionStorage.removeItem('redirectAfterAuth');
        // Don't redirect to create-event, go home instead
        const destination = redirect === '/create-event' ? '/' : redirect;
        toast({
          title: "Welcome back!",
          description: "You're now signed in.",
        });
        setLocation(destination);
      } else {
        setLocation('/');
      }
    }
  }, [user, authLoading, setLocation, toast]);

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      university: "",
      graduationYear: new Date().getFullYear() + 4,
    },
  });

  const handleLogin = async (data: LoginData) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrors({ login: undefined });

    try {
      await loginMutation.mutateAsync({
        email: data.email,
        password: data.password,
      });

      // Success
      toast({
        title: "Success!",
        description: "You're now signed in.",
      });

      // The auth hook should update automatically
      // Check for redirect
      const redirect = sessionStorage.getItem('redirectAfterAuth');
      if (redirect) {
        sessionStorage.removeItem('redirectAfterAuth');
        setLocation(redirect === '/create-event' ? '/' : redirect);
      } else {
        setLocation('/');
      }

    } catch (error: any) {
      console.error('Login error:', error);
      setErrors({ login: error.message || 'Invalid email or password' });

      toast({
        title: "Login Failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (data: RegisterData) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrors({ register: undefined });

    try {
      // Remove confirmPassword before sending to backend
      const { confirmPassword, ...registerData } = data;

      await registerMutation.mutateAsync(registerData);

      // Success - might auto-login or need manual login
      toast({
        title: "Account Created!",
        description: "Welcome to What's the Move!",
      });

      // Success - user should be logged in automatically
      // Let the useEffect handle the redirect

    } catch (error: any) {
      console.error('Registration error:', error);

      // Handle specific error cases
      if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
        setErrors({ register: 'An account with this email already exists' });
      } else {
        setErrors({ register: error.message || 'Registration failed. Please try again.' });
      }

      toast({
        title: "Registration Failed",
        description: error.message || "Please try again with different information.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while checking auth status
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Redirect if already authenticated
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            What's the Move?
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
            Discover and create campus events
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="register">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Welcome Back</CardTitle>
                <CardDescription>
                  Sign in to your account to continue
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  {errors.login && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{errors.login}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@university.edu"
                      autoComplete="email"
                      disabled={isSubmitting}
                      {...loginForm.register("email")}
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-sm text-red-500">
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        disabled={isSubmitting}
                        {...loginForm.register("password")}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-0 h-full"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-red-500">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        Signing In...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>

                  <p className="text-center text-sm text-gray-600">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => setActiveTab("register")}
                    >
                      Sign up
                    </button>
                  </p>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Create Account</CardTitle>
                <CardDescription>
                  Join the campus event community
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                  {errors.register && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{errors.register}</AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        disabled={isSubmitting}
                        {...registerForm.register("firstName")}
                      />
                      {registerForm.formState.errors.firstName && (
                        <p className="text-sm text-red-500">
                          {registerForm.formState.errors.firstName.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        disabled={isSubmitting}
                        {...registerForm.register("lastName")}
                      />
                      {registerForm.formState.errors.lastName && (
                        <p className="text-sm text-red-500">
                          {registerForm.formState.errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="you@university.edu"
                      autoComplete="email"
                      disabled={isSubmitting}
                      {...registerForm.register("email")}
                    />
                    {registerForm.formState.errors.email && (
                      <p className="text-sm text-red-500">
                        {registerForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Min 6 chars, 1 uppercase, 1 number"
                      autoComplete="new-password"
                      disabled={isSubmitting}
                      {...registerForm.register("password")}
                    />
                    {registerForm.formState.errors.password && (
                      <p className="text-sm text-red-500">
                        {registerForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      disabled={isSubmitting}
                      {...registerForm.register("confirmPassword")}
                    />
                    {registerForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-red-500">
                        {registerForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="university">University (Optional)</Label>
                    <Input
                      id="university"
                      placeholder="University of Cincinnati"
                      disabled={isSubmitting}
                      {...registerForm.register("university")}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>

                  <p className="text-center text-sm text-gray-600">
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => setActiveTab("login")}
                    >
                      Sign in
                    </button>
                  </p>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
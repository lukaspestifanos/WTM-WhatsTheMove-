import { useState, useEffect, useCallback, useMemo } from "react";
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

// Constants
const PASSWORD_MIN_LENGTH = 6;
const CURRENT_YEAR = new Date().getFullYear();
const MIN_GRAD_YEAR = CURRENT_YEAR;
const MAX_GRAD_YEAR = CURRENT_YEAR + 6;

// Enhanced validation schemas
const loginSchema = z.object({
  email: z.string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  email: z.string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .toLowerCase(),
  password: z.string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  firstName: z.string()
    .min(1, "First name is required")
    .max(50, "First name is too long")
    .trim(),
  lastName: z.string()
    .min(1, "Last name is required")
    .max(50, "Last name is too long")
    .trim(),
  university: z.string()
    .max(100, "University name is too long")
    .trim()
    .optional(),
  graduationYear: z.number()
    .int()
    .min(MIN_GRAD_YEAR, `Graduation year must be ${MIN_GRAD_YEAR} or later`)
    .max(MAX_GRAD_YEAR, `Graduation year must be ${MAX_GRAD_YEAR} or earlier`)
    .optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

interface AuthError {
  login?: string;
  register?: string;
}

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<AuthError>({});

  // Clear errors when switching tabs
  const handleTabChange = useCallback((tab: "login" | "register") => {
    setActiveTab(tab);
    setErrors({});
    setShowPassword(false);
  }, []);

  // Initialize forms
  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur",
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
      graduationYear: CURRENT_YEAR + 4,
    },
    mode: "onBlur",
  });

  // Handle successful authentication
  useEffect(() => {
    if (user && !authLoading) {
      const redirectPath = sessionStorage.getItem('redirectAfterAuth') || '/';
      sessionStorage.removeItem('redirectAfterAuth');

      toast({
        title: "Welcome!",
        description: "You're now signed in.",
      });

      setLocation(redirectPath);
    }
  }, [user, authLoading, setLocation, toast]);

  // Login handler
  const handleLogin = useCallback(async (data: LoginData) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrors(prev => ({ ...prev, login: undefined }));

    try {
      await loginMutation.mutateAsync({
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });

      // Success handling is done in useEffect
    } catch (error: any) {
      const errorMessage = error.message || 'Invalid email or password';

      setErrors(prev => ({ ...prev, login: errorMessage }));
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, loginMutation, toast]);

  // Register handler
  const handleRegister = useCallback(async (data: RegisterData) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrors(prev => ({ ...prev, register: undefined }));

    try {
      // Clean and prepare data
      const { confirmPassword, ...registerData } = data;
      const cleanedData = {
        ...registerData,
        email: registerData.email.trim().toLowerCase(),
        firstName: registerData.firstName.trim(),
        lastName: registerData.lastName.trim(),
        university: registerData.university?.trim() || undefined,
      };

      await registerMutation.mutateAsync(cleanedData);

      toast({
        title: "Account Created!",
        description: "Welcome to What's the Move!",
      });

      // Success handling is done in useEffect
    } catch (error: any) {
      let errorMessage = error.message || 'Registration failed. Please try again.';

      // Handle specific error cases
      if (errorMessage.toLowerCase().includes('already exists') || 
          errorMessage.toLowerCase().includes('duplicate')) {
        errorMessage = 'An account with this email already exists';
      }

      setErrors(prev => ({ ...prev, register: errorMessage }));
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, registerMutation, toast]);

  // Password strength indicator
  const passwordStrength = useMemo(() => {
    const password = registerForm.watch("password") || "";
    if (password.length === 0) return null;

    const criteria = [
      password.length >= PASSWORD_MIN_LENGTH,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /[0-9]/.test(password),
    ];

    const score = criteria.filter(Boolean).length;
    const strength = score <= 1 ? 'weak' : score <= 2 ? 'fair' : score <= 3 ? 'good' : 'strong';

    return { score, strength, criteria };
  }, [registerForm.watch("password")]);

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Already authenticated - show redirect message
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            What's the Move?
          </h1>
          <p className="text-lg text-muted-foreground">
            Discover and create campus events
          </p>
        </div>

        {/* Auth Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="register">Sign Up</TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login" className="mt-0">
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
                      <p className="text-sm text-destructive">
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
                        className="absolute right-2 top-0 h-full w-10"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-destructive">
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

                  <p className="text-center text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      className="text-primary hover:underline font-medium"
                      onClick={() => handleTabChange("register")}
                    >
                      Sign up
                    </button>
                  </p>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Register Tab */}
          <TabsContent value="register" className="mt-0">
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
                        autoComplete="given-name"
                        disabled={isSubmitting}
                        {...registerForm.register("firstName")}
                      />
                      {registerForm.formState.errors.firstName && (
                        <p className="text-sm text-destructive">
                          {registerForm.formState.errors.firstName.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        autoComplete="family-name"
                        disabled={isSubmitting}
                        {...registerForm.register("lastName")}
                      />
                      {registerForm.formState.errors.lastName && (
                        <p className="text-sm text-destructive">
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
                      <p className="text-sm text-destructive">
                        {registerForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Create a strong password"
                      autoComplete="new-password"
                      disabled={isSubmitting}
                      {...registerForm.register("password")}
                    />
                    {registerForm.formState.errors.password && (
                      <p className="text-sm text-destructive">
                        {registerForm.formState.errors.password.message}
                      </p>
                    )}

                    {/* Password Strength Indicator */}
                    {passwordStrength && (
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div
                              className={`h-full rounded-full transition-all ${
                                passwordStrength.strength === 'weak' ? 'bg-red-500 w-1/4' :
                                passwordStrength.strength === 'fair' ? 'bg-orange-500 w-2/4' :
                                passwordStrength.strength === 'good' ? 'bg-yellow-500 w-3/4' :
                                'bg-green-500 w-full'
                              }`}
                            />
                          </div>
                          <span className={`text-xs font-medium ${
                            passwordStrength.strength === 'weak' ? 'text-red-500' :
                            passwordStrength.strength === 'fair' ? 'text-orange-500' :
                            passwordStrength.strength === 'good' ? 'text-yellow-500' :
                            'text-green-500'
                          }`}>
                            {passwordStrength.strength}
                          </span>
                        </div>
                      </div>
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
                      <p className="text-sm text-destructive">
                        {registerForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="university">University (Optional)</Label>
                    <Input
                      id="university"
                      placeholder="University of Cincinnati"
                      autoComplete="organization"
                      disabled={isSubmitting}
                      {...registerForm.register("university")}
                    />
                    {registerForm.formState.errors.university && (
                      <p className="text-sm text-destructive">
                        {registerForm.formState.errors.university.message}
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
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="text-primary hover:underline font-medium"
                      onClick={() => handleTabChange("login")}
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
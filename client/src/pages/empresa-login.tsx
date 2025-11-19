import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginCredentials } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Lock, Mail, Loader2, Building2 } from "lucide-react";
import { useLocation, Link } from "wouter";

interface CompanyLoginResponse {
  message: string;
  company: {
    id: string;
    name: string;
    email: string;
  };
}

export default function EmpresaLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const savedEmail = typeof window !== "undefined" ? localStorage.getItem("savedCompanyEmail") : null;
  const shouldRemember = typeof window !== "undefined" ? localStorage.getItem("rememberCompany") === "true" : false;

  const form = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: savedEmail || "",
      password: "",
    },
  });

  useEffect(() => {
    setRememberMe(shouldRemember);
  }, [shouldRemember]);

  const loginMutation = useMutation<CompanyLoginResponse, Error, LoginCredentials>({
    mutationFn: async (credentials: LoginCredentials) => {
      const res = await apiRequest("POST", "/api/empresa/auth/login", credentials);
      return await res.json();
    },
    onSuccess: async (data) => {
      if (rememberMe) {
        localStorage.setItem("rememberCompany", "true");
        localStorage.setItem("savedCompanyEmail", data.company.email);
      } else {
        localStorage.removeItem("rememberCompany");
        localStorage.removeItem("savedCompanyEmail");
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/empresa/auth/me"] });
      toast({
        title: "Login bem-sucedido!",
        description: `Bem-vindo de volta, ${data.company.name}`,
      });
      setLocation("/empresa/dashboard");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao fazer login",
        description: error.message || "Credenciais inválidas. Tente novamente.",
      });
    },
  });

  const onSubmit = (data: LoginCredentials) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary mb-4">
            <Building2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Acesso Empresa</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Entre com suas credenciais empresariais
          </p>
        </div>

        <Card className="shadow-lg border-card-border">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-xl font-semibold">Entrar</CardTitle>
            <CardDescription>
              Acesse o painel da sua empresa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Mail className="w-5 h-5" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      placeholder="empresa@email.com"
                      className="pl-10 h-12 text-base border-2 transition-all duration-200"
                      {...form.register("email")}
                      disabled={loginMutation.isPending}
                    />
                  </div>
                  {form.formState.errors.email && (
                    <p className="text-sm font-medium text-destructive mt-2">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Senha
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Lock className="w-5 h-5" />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Digite sua senha"
                      className="pl-10 pr-12 h-12 text-base border-2 transition-all duration-200"
                      {...form.register("password")}
                      disabled={loginMutation.isPending}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover-elevate active-elevate-2 p-2 rounded-md transition-colors"
                      disabled={loginMutation.isPending}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {form.formState.errors.password && (
                    <p className="text-sm font-medium text-destructive mt-2">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    disabled={loginMutation.isPending}
                  />
                  <Label
                    htmlFor="remember"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Lembrar-me
                  </Label>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold transition-all duration-150"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                Ainda não tem uma conta?{" "}
                <Link href="/empresa/register" className="text-primary font-medium hover:underline">
                  Cadastre sua empresa
                </Link>
              </p>
              <p className="text-center text-sm text-muted-foreground">
                Problemas para acessar?{" "}
                <span className="text-primary font-medium">
                  Entre em contato com o suporte
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

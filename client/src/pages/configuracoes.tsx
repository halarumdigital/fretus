import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings, Save } from "lucide-react";

const configuracaoSchema = z.object({
  // Driver Assignment
  driverAssignmentType: z.enum(["one_by_one", "all"]),
  driverSearchRadius: z.number().min(1),
  minTimeToFindDriver: z.number().min(1),
  driverAcceptanceTimeout: z.number().min(1),
  autoCancelTimeout: z.number().min(5),

  // Pricing
  canRoundTripValues: z.boolean(),
  adminCommissionPercentage: z.number().min(0).max(100),

  // OTP Settings
  enableOtpForLogin: z.boolean(),
  enableOtpForRegistration: z.boolean(),

  // Payment Gateway
  paymentGateway: z.enum(["asaas", "efi"]).nullable().optional(),
  asaasApiKey: z.string().nullable().optional(),
  asaasEnvironment: z.enum(["sandbox", "production"]).nullable().optional(),
  efiClientId: z.string().nullable().optional(),
  efiClientSecret: z.string().nullable().optional(),
  efiCertificate: z.string().nullable().optional(),
  efiEnvironment: z.enum(["sandbox", "production"]).nullable().optional(),

  // Referral System
  enableReferralSystem: z.boolean(),
  referralBonusAmount: z.number().min(0).nullable().optional(),
  referralMinimumTrips: z.number().min(0).nullable().optional(),

  // Map Configuration
  mapProvider: z.enum(["google", "openstreet"]),
  googleMapsApiKey: z.string().nullable().optional(),

  // Firebase Configuration
  firebaseProjectId: z.string().nullable().optional(),
  firebaseClientEmail: z.string().nullable().optional(),
  firebasePrivateKey: z.string().nullable().optional(),
  firebaseDatabaseUrl: z.string().nullable().optional(),

  // SMTP Configuration
  smtpHost: z.string().nullable().optional(),
  smtpPort: z.number().nullable().optional(),
  smtpUser: z.string().nullable().optional(),
  smtpPassword: z.string().nullable().optional(),
  smtpFromEmail: z.string().nullable().optional(),
  smtpFromName: z.string().nullable().optional(),
  smtpSecure: z.boolean().nullable().optional(),
});

type ConfiguracaoForm = z.infer<typeof configuracaoSchema>;

const mockSettings: ConfiguracaoForm = {
  driverAssignmentType: "one_by_one",
  driverSearchRadius: 10,
  minTimeToFindDriver: 120,
  driverAcceptanceTimeout: 30,
  autoCancelTimeout: 30,
  canRoundTripValues: true,
  adminCommissionPercentage: 20,
  enableOtpForLogin: false,
  enableOtpForRegistration: false,
  paymentGateway: null,
  asaasApiKey: null,
  asaasEnvironment: null,
  efiClientId: null,
  efiClientSecret: null,
  efiCertificate: null,
  efiEnvironment: null,
  enableReferralSystem: false,
  referralBonusAmount: null,
  referralMinimumTrips: null,
  mapProvider: "google",
  googleMapsApiKey: null,
  firebaseProjectId: null,
  firebaseClientEmail: null,
  firebasePrivateKey: null,
  firebaseDatabaseUrl: null,
  smtpHost: null,
  smtpPort: null,
  smtpUser: null,
  smtpPassword: null,
  smtpFromEmail: null,
  smtpFromName: null,
  smtpSecure: null,
};

export default function Configuracoes() {
  const { toast } = useToast();

  // Buscar configurações do servidor
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/settings"],
    retry: 1,
  });

  const form = useForm<ConfiguracaoForm>({
    resolver: zodResolver(configuracaoSchema),
    defaultValues: mockSettings,
  });

  // Atualizar formulário quando os dados chegarem
  useEffect(() => {
    if (settings) {
      // Converter strings numéricas do banco para números
      const formattedSettings = {
        ...settings,
        driverSearchRadius: typeof settings.driverSearchRadius === 'string'
          ? parseFloat(settings.driverSearchRadius)
          : settings.driverSearchRadius,
        minTimeToFindDriver: typeof settings.minTimeToFindDriver === 'string'
          ? parseInt(settings.minTimeToFindDriver)
          : settings.minTimeToFindDriver,
        driverAcceptanceTimeout: typeof settings.driverAcceptanceTimeout === 'string'
          ? parseInt(settings.driverAcceptanceTimeout)
          : settings.driverAcceptanceTimeout,
        autoCancelTimeout: typeof settings.autoCancelTimeout === 'string'
          ? parseInt(settings.autoCancelTimeout)
          : settings.autoCancelTimeout,
        adminCommissionPercentage: typeof settings.adminCommissionPercentage === 'string'
          ? parseFloat(settings.adminCommissionPercentage)
          : settings.adminCommissionPercentage,
        referralBonusAmount: settings.referralBonusAmount && typeof settings.referralBonusAmount === 'string'
          ? parseFloat(settings.referralBonusAmount)
          : settings.referralBonusAmount,
        referralMinimumTrips: settings.referralMinimumTrips && typeof settings.referralMinimumTrips === 'string'
          ? parseInt(settings.referralMinimumTrips)
          : settings.referralMinimumTrips,
        smtpPort: settings.smtpPort && typeof settings.smtpPort === 'string'
          ? parseInt(settings.smtpPort)
          : settings.smtpPort,
      };
      form.reset(formattedSettings);
    }
  }, [settings, form]);

  // Mutation para salvar configurações
  const saveMutation = useMutation({
    mutationFn: async (data: ConfiguracaoForm) => {
      console.log("🚀 Enviando dados para salvar:");
      console.log("   autoCancelTimeout:", data.autoCancelTimeout, typeof data.autoCancelTimeout);
      console.log("   driverAcceptanceTimeout:", data.driverAcceptanceTimeout, typeof data.driverAcceptanceTimeout);
      console.log("   minTimeToFindDriver:", data.minTimeToFindDriver, typeof data.minTimeToFindDriver);
      return await apiRequest("PUT", "/api/settings", data);
    },
    onSuccess: (data) => {
      console.log("✅ Resposta do servidor após salvar:");
      console.log("   autoCancelTimeout:", data.autoCancelTimeout, typeof data.autoCancelTimeout);
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Sucesso!",
        description: "Configurações salvas com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar configurações",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ConfiguracaoForm) => {
    saveMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-10">
            <div className="text-center">Carregando configurações...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-6 w-6" />
                Configurações do Sistema
              </CardTitle>
              <CardDescription>
                Gerencie todas as configurações da plataforma
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Tabs defaultValue="geral" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="geral">Geral</TabsTrigger>
                  <TabsTrigger value="precos">Preços</TabsTrigger>
                  <TabsTrigger value="integracao">Integrações</TabsTrigger>
                  <TabsTrigger value="referral">Indicação</TabsTrigger>
                  <TabsTrigger value="smtp">E-mail</TabsTrigger>
                </TabsList>

                {/* Configurações Gerais */}
                <TabsContent value="geral" className="space-y-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Atribuição de Motoristas</h3>

                    <FormField
                      control={form.control}
                      name="driverAssignmentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Chamada</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="one_by_one">Um por um</SelectItem>
                              <SelectItem value="all">Todos ao mesmo tempo</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Como as corridas são oferecidas aos motoristas
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="driverSearchRadius"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Raio de Pesquisa (km)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="10"
                              value={field.value}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                            />
                          </FormControl>
                          <FormDescription>
                            Raio em quilômetros para buscar motoristas disponíveis
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="minTimeToFindDriver"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tempo Mínimo para Encontrar Motorista (segundos)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="120"
                              value={field.value}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                            />
                          </FormControl>
                          <FormDescription>
                            Tempo máximo de busca antes de cancelar automaticamente
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="driverAcceptanceTimeout"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tempo de Aceitação do Motorista (segundos)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="30"
                              value={field.value}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                            />
                          </FormControl>
                          <FormDescription>
                            Tempo que o motorista tem para aceitar a corrida
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="autoCancelTimeout"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tempo para Cancelamento Automático (minutos)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="30"
                              value={field.value}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                            />
                          </FormControl>
                          <FormDescription>
                            Tempo em minutos para cancelar automaticamente entregas não aceitas
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <h3 className="text-lg font-semibold mt-6">Autenticação</h3>

                    <FormField
                      control={form.control}
                      name="enableOtpForLogin"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">OTP no Login</FormLabel>
                            <FormDescription>
                              Ativar código OTP para login no aplicativo móvel
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="enableOtpForRegistration"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">OTP no Cadastro</FormLabel>
                            <FormDescription>
                              Ativar código OTP para cadastro no aplicativo móvel
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Preços e Comissões */}
                <TabsContent value="precos" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="canRoundTripValues"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Arredondar Valores</FormLabel>
                          <FormDescription>
                            Permitir arredondar os valores das corridas
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="adminCommissionPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comissão Admin (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="20"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Porcentagem de comissão cobrada pela plataforma
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Integrações */}
                <TabsContent value="integracao" className="space-y-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Gateway de Pagamento</h3>

                    <FormField
                      control={form.control}
                      name="paymentGateway"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gateway</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o gateway" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="asaas">Asaas</SelectItem>
                              <SelectItem value="efi">Efi (Gerencianet)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch("paymentGateway") === "asaas" && (
                      <>
                        <FormField
                          control={form.control}
                          name="asaasApiKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Asaas API Key</FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="$aapk_..."
                                  value={field.value || ""}
                                  onChange={(e) => field.onChange(e.target.value || null)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="asaasEnvironment"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ambiente</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || undefined}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o ambiente" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="sandbox">Sandbox (Teste)</SelectItem>
                                  <SelectItem value="production">Produção</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    {form.watch("paymentGateway") === "efi" && (
                      <>
                        <FormField
                          control={form.control}
                          name="efiClientId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Efi Client ID</FormLabel>
                              <FormControl>
                                <Input
                                  value={field.value || ""}
                                  onChange={(e) => field.onChange(e.target.value || null)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="efiClientSecret"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Efi Client Secret</FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  value={field.value || ""}
                                  onChange={(e) => field.onChange(e.target.value || null)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="efiEnvironment"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ambiente</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || undefined}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o ambiente" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="sandbox">Sandbox (Teste)</SelectItem>
                                  <SelectItem value="production">Produção</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    <h3 className="text-lg font-semibold mt-6">Mapas</h3>

                    <FormField
                      control={form.control}
                      name="mapProvider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Provedor de Mapas</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="google">Google Maps</SelectItem>
                              <SelectItem value="openstreet">OpenStreetMap</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch("mapProvider") === "google" && (
                      <FormField
                        control={form.control}
                        name="googleMapsApiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Google Maps API Key</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value || null)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <h3 className="text-lg font-semibold mt-6">Firebase (Notificações Push)</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Configure o Firebase Admin SDK usando os dados do arquivo JSON da conta de serviço.
                      Baixe em: Firebase Console → Configurações do Projeto → Contas de Serviço → Gerar Nova Chave Privada
                    </p>

                    <FormField
                      control={form.control}
                      name="firebaseProjectId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project ID</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="seu-projeto-firebase"
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value || null)}
                            />
                          </FormControl>
                          <FormDescription>
                            Campo "project_id" do arquivo JSON da conta de serviço
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="firebaseClientEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Email</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="firebase-adminsdk-xxxxx@seu-projeto.iam.gserviceaccount.com"
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value || null)}
                            />
                          </FormControl>
                          <FormDescription>
                            Campo "client_email" do arquivo JSON da conta de serviço (e-mail da service account)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="firebasePrivateKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Private Key (Chave Privada)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="-----BEGIN PRIVATE KEY-----&#10;MIIEvQIBADANBgkqhkiG9w0BAQEF...&#10;-----END PRIVATE KEY-----"
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value || null)}
                              rows={8}
                              className="font-mono text-xs"
                            />
                          </FormControl>
                          <FormDescription>
                            Campo "private_key" do arquivo JSON da conta de serviço. Cole a chave completa incluindo as linhas BEGIN e END.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="firebaseDatabaseUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Database URL (Opcional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://seu-projeto.firebaseio.com"
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value || null)}
                            />
                          </FormControl>
                          <FormDescription>
                            URL do Realtime Database (opcional, necessário apenas se usar Realtime Database)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Sistema de Indicação */}
                <TabsContent value="referral" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="enableReferralSystem"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Ativar Sistema de Indicação</FormLabel>
                          <FormDescription>
                            Permitir que usuários indiquem outras pessoas
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch("enableReferralSystem") && (
                    <>
                      <FormField
                        control={form.control}
                        name="referralBonusAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor do Bônus (R$)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="10"
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                              />
                            </FormControl>
                            <FormDescription>
                              Valor creditado para quem indica e para o indicado
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="referralMinimumTrips"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mínimo de Corridas</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="1"
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                              />
                            </FormControl>
                            <FormDescription>
                              Número mínimo de corridas para liberar o bônus
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </TabsContent>

                {/* Configurações SMTP */}
                <TabsContent value="smtp" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="smtpHost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Host SMTP</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="smtp.gmail.com"
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="smtpPort"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Porta</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="587"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="smtpUser"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Usuário</FormLabel>
                        <FormControl>
                          <Input
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="smtpPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="smtpFromEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail de Envio</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="noreply@fretus.com"
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="smtpFromName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome de Envio</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Fretus"
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="smtpSecure"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Conexão Segura (TLS)</FormLabel>
                          <FormDescription>Usar TLS para conexão SMTP</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

              <div className="mt-6 flex justify-end">
                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saveMutation.isPending ? "Salvando..." : "Salvar Configurações"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

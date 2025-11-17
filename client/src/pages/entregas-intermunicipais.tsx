import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlusCircle, Package, Trash2, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import "@/styles/google-maps-fix.css";

// Declaração do tipo Google Maps
declare global {
  interface Window {
    google: typeof google;
  }
}

type EntregaIntermunicipal = {
  id: string;
  rotaId: string;
  rotaNome: string;
  numeroPedido: string;
  dataAgendada: string;
  enderecoColetaCompleto: string;
  enderecoEntregaCompleto: string;
  destinatarioNome: string;
  destinatarioTelefone: string;
  quantidadePacotes: number;
  pesoTotalKg: string;
  valorTotal: string;
  status: string;
  viagemId?: string;
  createdAt: string;
};

type RotaIntermunicipal = {
  id: string;
  nomeRota: string;
  cidadeOrigemNome: string;
  cidadeDestinoNome: string;
  distanciaKm: string;
  tempoMedioMinutos: number;
  ativa: boolean;
};

type CityPrice = {
  id: string;
  rotaIntermunicipalId: string;
  rotaIntermunicipalNome: string;
  vehicleTypeName: string;
  basePrice: string;
  pricePerDistance: string;
  stopPrice: string;
  active: boolean;
};

const entregaSchema = z.object({
  rotaId: z.string().min(1, "Rota é obrigatória"),
  precoId: z.string().min(1, "Configuração de preço é obrigatória"),
  dataAgendada: z.string().min(1, "Data é obrigatória"),

  // Endereço de coleta (campos separados - preenchido automaticamente)
  enderecoColetaLogradouro: z.string().min(1, "Logradouro é obrigatório"),
  enderecoColetaNumero: z.string().min(1, "Número é obrigatório"),
  enderecoColetaBairro: z.string().min(1, "Bairro é obrigatório"),
  enderecoColetaCidade: z.string().optional(),
  enderecoColetaCep: z.string().optional(),
  enderecoColetaPontoReferencia: z.string().optional(),
  enderecoColetaLatitude: z.string().optional(),
  enderecoColetaLongitude: z.string().optional(),

  // Endereço de entrega (campos separados)
  enderecoEntregaLogradouro: z.string().min(3, "Logradouro é obrigatório"),
  enderecoEntregaNumero: z.string().min(1, "Número é obrigatório"),
  enderecoEntregaBairro: z.string().min(2, "Bairro é obrigatório"),
  enderecoEntregaCidade: z.string().min(2, "Cidade é obrigatória"),
  enderecoEntregaCep: z.string().min(8, "CEP é obrigatório"),
  enderecoEntregaPontoReferencia: z.string().optional(),
  enderecoEntregaLatitude: z.string().optional(),
  enderecoEntregaLongitude: z.string().optional(),

  // Destinatário
  destinatarioNome: z.string().min(3, "Nome do destinatário é obrigatório"),
  destinatarioTelefone: z.string().min(10, "Telefone do destinatário é obrigatório"),

  // Informações do pacote
  quantidadePacotes: z.coerce.number().min(1, "Quantidade deve ser maior que zero"),
  descricaoConteudo: z.string().optional(),
  observacoes: z.string().optional(),
});

type EntregaForm = z.infer<typeof entregaSchema>;

const statusColors: Record<string, string> = {
  aguardando_motorista: "secondary",
  motorista_aceito: "default",
  em_coleta: "default",
  coletado: "default",
  em_transito: "default",
  em_entrega: "default",
  entregue: "default",
};

const statusLabels: Record<string, string> = {
  aguardando_motorista: "Aguardando Motorista",
  motorista_aceito: "Motorista Aceitou",
  em_coleta: "Em Coleta",
  coletado: "Coletado",
  em_transito: "Em Trânsito",
  em_entrega: "Em Entrega",
  entregue: "Entregue",
};

export default function EntregasIntermunicipais() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRota, setSelectedRota] = useState<string>("");
  const enderecoEntregaInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Buscar dados da empresa logada
  const { data: empresa } = useQuery<any>({
    queryKey: ["/api/empresa/auth/me"],
  });

  // Buscar configuração do Google Maps
  const { data: googleMapsConfig } = useQuery<any>({
    queryKey: ["/api/config/google-maps"],
  });

  // Buscar entregas
  const { data: entregas = [], isLoading } = useQuery<EntregaIntermunicipal[]>({
    queryKey: ["/api/entregas-intermunicipais"],
  });

  // Buscar rotas ativas
  const { data: rotas = [] } = useQuery<RotaIntermunicipal[]>({
    queryKey: ["/api/rotas-intermunicipais"],
    select: (data) => data.filter((r) => r.ativa),
  });

  // Buscar preços para rota selecionada
  const { data: precos = [] } = useQuery<CityPrice[]>({
    queryKey: ["/api/city-prices"],
    select: (data) =>
      data.filter((p) => p.active && p.rotaIntermunicipalId === selectedRota),
    enabled: !!selectedRota,
  });

  // Mutation para criar entrega
  const createMutation = useMutation({
    mutationFn: async (data: EntregaForm) => {
      return await apiRequest("POST", "/api/entregas-intermunicipais", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entregas-intermunicipais"] });
      toast({ title: "Sucesso!", description: "Entrega agendada com sucesso" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao agendar entrega",
        variant: "destructive"
      });
    },
  });

  // Mutation para cancelar entrega
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/entregas-intermunicipais/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entregas-intermunicipais"] });
      toast({ title: "Sucesso!", description: "Entrega cancelada com sucesso" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao cancelar entrega",
        variant: "destructive"
      });
    },
  });

  const form = useForm<EntregaForm>({
    resolver: zodResolver(entregaSchema),
    defaultValues: {
      rotaId: "",
      precoId: "",
      dataAgendada: "",
      enderecoColetaLogradouro: "",
      enderecoColetaNumero: "",
      enderecoColetaBairro: "",
      enderecoColetaCidade: "",
      enderecoColetaCep: "",
      enderecoColetaPontoReferencia: "",
      enderecoEntregaLogradouro: "",
      enderecoEntregaNumero: "",
      enderecoEntregaBairro: "",
      enderecoEntregaCidade: "",
      enderecoEntregaCep: "",
      enderecoEntregaPontoReferencia: "",
      destinatarioNome: "",
      destinatarioTelefone: "",
      quantidadePacotes: 1,
    },
  });

  const rotaId = form.watch("rotaId");

  const handleOpenDialog = () => {
    // Preencher endereço de coleta com dados da empresa (campos separados)
    form.reset({
      rotaId: "",
      precoId: "",
      dataAgendada: "",
      enderecoColetaLogradouro: empresa?.street || "",
      enderecoColetaNumero: empresa?.number || "",
      enderecoColetaBairro: empresa?.neighborhood || "",
      enderecoColetaCidade: empresa?.city || "",
      enderecoColetaCep: empresa?.cep || "",
      enderecoColetaPontoReferencia: empresa?.reference || "",
      enderecoEntregaLogradouro: "",
      enderecoEntregaNumero: "",
      enderecoEntregaBairro: "",
      enderecoEntregaCidade: "",
      enderecoEntregaCep: "",
      enderecoEntregaPontoReferencia: "",
      destinatarioNome: "",
      destinatarioTelefone: "",
      quantidadePacotes: 1,
    });
    setSelectedRota("");
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    form.reset();
    setSelectedRota("");
  };

  const onSubmit = (data: EntregaForm) => {
    // Montar endereço completo de coleta a partir dos campos separados
    const enderecoColetaCompleto = `${data.enderecoColetaLogradouro}, ${data.enderecoColetaNumero}, ${data.enderecoColetaBairro}${data.enderecoColetaCidade ? `, ${data.enderecoColetaCidade}` : ''}${data.enderecoColetaCep ? `, CEP: ${data.enderecoColetaCep}` : ''}${data.enderecoColetaPontoReferencia ? ` - Ref: ${data.enderecoColetaPontoReferencia}` : ''}`;

    // Montar endereço completo de entrega a partir dos campos separados
    const enderecoEntregaCompleto = `${data.enderecoEntregaLogradouro}, ${data.enderecoEntregaNumero}, ${data.enderecoEntregaBairro}, ${data.enderecoEntregaCidade}, CEP: ${data.enderecoEntregaCep}${data.enderecoEntregaPontoReferencia ? ` - Ref: ${data.enderecoEntregaPontoReferencia}` : ''}`;

    const payload = {
      ...data,
      enderecoColetaCompleto,
      enderecoEntregaCompleto,
    };

    createMutation.mutate(payload as any);
  };

  const handleDelete = async (id: string, status: string, viagemId?: string) => {
    if (viagemId) {
      toast({
        title: "Atenção",
        description: "Esta entrega já foi aceita por um motorista. Entre em contato com o suporte para cancelamento.",
        variant: "destructive",
      });
      return;
    }

    if (confirm("Tem certeza que deseja cancelar esta entrega?")) {
      deleteMutation.mutate(id);
    }
  };

  // Load Google Maps script
  useEffect(() => {
    if (!googleMapsConfig?.apiKey) return;

    const scriptId = "google-maps-script";
    if (document.getElementById(scriptId)) return;

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsConfig.apiKey}&libraries=places,geometry`;
    script.async = true;
    document.head.appendChild(script);
  }, [googleMapsConfig]);

  // Setup Google Places Autocomplete
  useEffect(() => {
    if (!window.google?.maps?.places || !isDialogOpen || !enderecoEntregaInputRef.current) {
      // Limpar autocomplete quando o modal fecha
      if (!isDialogOpen && autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
      return;
    }

    // Aguardar um pouco para o input ser renderizado
    const timer = setTimeout(() => {
      if (!enderecoEntregaInputRef.current) return;

      // Limpar autocomplete anterior
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }

      // Criar novo autocomplete
      const autocomplete = new google.maps.places.Autocomplete(enderecoEntregaInputRef.current, {
        componentRestrictions: { country: "br" },
        fields: ["address_components", "formatted_address", "geometry"],
        types: ["address"],
      });

      autocompleteRef.current = autocomplete;

      // Listener para quando o usuário seleciona um endereço
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.address_components) return;

        let street = "";
        let number = "";
        let neighborhood = "";
        let postalCode = "";
        let city = "";
        let state = "";

        place.address_components.forEach((component) => {
          const types = component.types;
          if (types.includes("route")) street = component.long_name;
          if (types.includes("street_number")) number = component.long_name;
          if (types.includes("sublocality") || types.includes("sublocality_level_1"))
            neighborhood = component.long_name;
          if (types.includes("postal_code")) postalCode = component.long_name;
          if (types.includes("administrative_area_level_2")) city = component.long_name;
          if (types.includes("administrative_area_level_1")) state = component.short_name;
        });

        // Atualizar o formulário com os dados do endereço
        form.setValue("enderecoEntregaLogradouro", street);
        form.setValue("enderecoEntregaNumero", number);
        form.setValue("enderecoEntregaBairro", neighborhood);
        form.setValue("enderecoEntregaCidade", city);
        form.setValue("enderecoEntregaCep", postalCode);
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [isDialogOpen, form]);

  // Atualizar selectedRota quando rotaId mudar
  if (rotaId && rotaId !== selectedRota) {
    setSelectedRota(rotaId);
  }

  const rotaSelecionada = rotas.find((r) => r.id === rotaId);

  return (
    <div className="p-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Package className="h-6 w-6" />
              Entregas Intermunicipais
            </CardTitle>
            <CardDescription>
              Agende entregas entre cidades através de nossas rotas intermunicipais
            </CardDescription>
          </div>
          <Button onClick={handleOpenDialog}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Entrega
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando entregas...</div>
          ) : entregas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma entrega agendada ainda
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Pedido</TableHead>
                  <TableHead>Rota</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Destinatário</TableHead>
                  <TableHead>Pacotes</TableHead>
                  <TableHead>Peso</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entregas.map((entrega) => (
                  <TableRow key={entrega.id}>
                    <TableCell className="font-medium">{entrega.numeroPedido}</TableCell>
                    <TableCell>{entrega.rotaNome}</TableCell>
                    <TableCell>
                      {format(new Date(entrega.dataAgendada), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{entrega.destinatarioNome}</TableCell>
                    <TableCell>{entrega.quantidadePacotes}</TableCell>
                    <TableCell>{entrega.pesoTotalKg} kg</TableCell>
                    <TableCell>R$ {parseFloat(entrega.valorTotal).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[entrega.status] as any}>
                        {statusLabels[entrega.status] || entrega.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {entrega.status === "aguardando_motorista" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(entrega.id, entrega.status, entrega.viagemId)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog para nova entrega */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agendar Nova Entrega Intermunicipal</DialogTitle>
            <DialogDescription>
              Preencha os dados da entrega entre cidades
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Seleção de Rota e Data */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rotaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rota</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a rota" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {rotas.map((rota) => (
                            <SelectItem key={rota.id} value={rota.id}>
                              {rota.nomeRota}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dataAgendada"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data da Entrega</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Informações da rota selecionada */}
              {rotaSelecionada && (
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-5 w-5 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {rotaSelecionada.cidadeOrigemNome} → {rotaSelecionada.cidadeDestinoNome}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Distância: {rotaSelecionada.distanciaKm} km •
                        Tempo médio: {rotaSelecionada.tempoMedioMinutos} min
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Categoria/Preço */}
              {selectedRota && precos.length > 0 && (
                <FormField
                  control={form.control}
                  name="precoId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria do Veículo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {precos.map((preco) => (
                            <SelectItem key={preco.id} value={preco.id}>
                              {preco.vehicleTypeName} - R$ {preco.basePrice} + R$ {preco.pricePerDistance}/km
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        O valor final será calculado automaticamente
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Endereço de Coleta */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Endereço de Retirada
                </h3>
                <p className="text-sm text-muted-foreground">
                  Endereço da sua empresa (preenchido automaticamente)
                </p>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="enderecoColetaLogradouro"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Endereço</FormLabel>
                        <FormControl>
                          <Input
                            className="bg-muted"
                            readOnly
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enderecoColetaNumero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input
                            className="bg-muted"
                            readOnly
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="enderecoColetaBairro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bairro</FormLabel>
                        <FormControl>
                          <Input
                            className="bg-muted"
                            readOnly
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enderecoColetaPontoReferencia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Referência</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="(vazio)"
                            className="bg-muted"
                            readOnly
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Endereço de Entrega */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Endereço de Entrega</h3>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="enderecoEntregaLogradouro"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Logradouro</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Rua, Avenida, etc..."
                            {...field}
                            ref={enderecoEntregaInputRef}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enderecoEntregaNumero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input placeholder="123" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="enderecoEntregaBairro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bairro</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do bairro" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enderecoEntregaCidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome da cidade" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="enderecoEntregaCep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <Input placeholder="00000-000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enderecoEntregaPontoReferencia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ponto de Referência (Opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Próximo ao mercado" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Dados do Destinatário */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Dados do Destinatário</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="destinatarioNome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome completo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="destinatarioTelefone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="(00) 00000-0000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Informações do Pacote */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Informações do Pacote</h3>

                <FormField
                  control={form.control}
                  name="quantidadePacotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade de Pacotes</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descricaoConteudo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição do Conteúdo (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Eletrônicos, roupas, documentos..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="observacoes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Informações adicionais sobre a entrega..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending
                    ? "Agendando..."
                    : "Agendar Entrega"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

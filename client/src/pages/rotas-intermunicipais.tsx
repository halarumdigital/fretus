import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlusCircle, Edit2, Trash2, MapPin, Clock, Ruler } from "lucide-react";

type Rota = {
  id: string;
  nomeRota: string;
  cidadeOrigemId: string;
  cidadeOrigemNome: string;
  cidadeDestinoId: string;
  cidadeDestinoNome: string;
  distanciaKm: string;
  tempoEstimadoMinutos: number;
  ativo: boolean;
};

type Cidade = {
  id: string;
  name: string;
};

const rotaSchema = z.object({
  cidadeOrigemId: z.string().min(1, "Cidade de origem é obrigatória"),
  cidadeDestinoId: z.string().min(1, "Cidade de destino é obrigatória"),
  distanciaKm: z.string().min(1, "Distância é obrigatória"),
  tempoEstimadoMinutos: z.coerce.number().min(1, "Tempo estimado deve ser maior que zero"),
  ativo: z.boolean().default(true),
}).refine((data) => data.cidadeOrigemId !== data.cidadeDestinoId, {
  message: "Cidade de origem e destino devem ser diferentes",
  path: ["cidadeDestinoId"],
});

type RotaForm = z.infer<typeof rotaSchema>;

export default function RotasIntermunicipais() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRota, setEditingRota] = useState<Rota | null>(null);

  // Buscar rotas
  const { data: rotas = [], isLoading } = useQuery<Rota[]>({
    queryKey: ["/api/rotas-intermunicipais"],
  });

  // Buscar cidades
  const { data: cidades = [] } = useQuery<Cidade[]>({
    queryKey: ["/api/cities"],
  });

  // Mutation para criar rota
  const createMutation = useMutation({
    mutationFn: async (data: RotaForm) => {
      return await apiRequest("POST", "/api/rotas-intermunicipais", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rotas-intermunicipais"] });
      toast({ title: "Sucesso!", description: "Rota criada com sucesso" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  // Mutation para atualizar rota
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RotaForm }) => {
      return await apiRequest("PUT", `/api/rotas-intermunicipais/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rotas-intermunicipais"] });
      toast({ title: "Sucesso!", description: "Rota atualizada com sucesso" });
      setIsDialogOpen(false);
      setEditingRota(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  // Mutation para excluir rota
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/rotas-intermunicipais/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rotas-intermunicipais"] });
      toast({ title: "Sucesso!", description: "Rota excluída com sucesso" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<RotaForm>({
    resolver: zodResolver(rotaSchema),
    defaultValues: {
      cidadeOrigemId: "",
      cidadeDestinoId: "",
      distanciaKm: "",
      tempoEstimadoMinutos: 0,
      ativo: true,
    },
  });

  const onSubmit = (data: RotaForm) => {
    if (editingRota) {
      updateMutation.mutate({ id: editingRota.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (rota: Rota) => {
    setEditingRota(rota);
    form.reset({
      cidadeOrigemId: rota.cidadeOrigemId,
      cidadeDestinoId: rota.cidadeDestinoId,
      distanciaKm: rota.distanciaKm,
      tempoEstimadoMinutos: rota.tempoEstimadoMinutos,
      ativo: rota.ativo,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta rota?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewRota = () => {
    setEditingRota(null);
    form.reset({
      cidadeOrigemId: "",
      cidadeDestinoId: "",
      distanciaKm: "",
      tempoEstimadoMinutos: 0,
      ativo: true,
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Rotas Intermunicipais</CardTitle>
              <CardDescription>
                Gerencie as rotas entre cidades para entregas intermunicipais
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <Button onClick={handleNewRota}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nova Rota
              </Button>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingRota ? "Editar Rota" : "Nova Rota"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingRota
                      ? "Atualize as informações da rota intermunicipal"
                      : "Configure uma nova rota entre cidades"}
                  </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* Cidades */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="cidadeOrigemId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cidade de Origem</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione a origem" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {cidades.map((cidade) => (
                                  <SelectItem key={cidade.id} value={cidade.id}>
                                    {cidade.name}
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
                        name="cidadeDestinoId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cidade de Destino</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o destino" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {cidades.map((cidade) => (
                                  <SelectItem key={cidade.id} value={cidade.id}>
                                    {cidade.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Distância e Tempo */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="distanciaKm"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Distância (km)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.1"
                                placeholder="Ex: 85.5"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Distância total da rota em quilômetros
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tempoEstimadoMinutos"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tempo Estimado (minutos)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Ex: 90"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormDescription>
                              Tempo médio de viagem em minutos
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Status */}
                    <FormField
                      control={form.control}
                      name="ativo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value === "true")}
                            value={field.value ? "true" : "false"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="true">Ativa</SelectItem>
                              <SelectItem value="false">Inativa</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Rotas inativas não aparecem para empresas e motoristas
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsDialogOpen(false);
                          setEditingRota(null);
                          form.reset();
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                      >
                        {editingRota ? "Atualizar" : "Criar"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-10">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rota</TableHead>
                  <TableHead>Distância</TableHead>
                  <TableHead>Tempo Estimado</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rotas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10">
                      Nenhuma rota cadastrada
                    </TableCell>
                  </TableRow>
                ) : (
                  rotas.map((rota) => (
                    <TableRow key={rota.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {rota.cidadeOrigemNome} → {rota.cidadeDestinoNome}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Ruler className="h-4 w-4 text-muted-foreground" />
                          <span>{parseFloat(rota.distanciaKm).toFixed(1)} km</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{rota.tempoEstimadoMinutos} min</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={rota.ativo ? "default" : "secondary"}>
                          {rota.ativo ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(rota)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(rota.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Package, MapPin, Building2, Calendar, Trash2, User, Truck, Eye, Phone } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

type Entrega = {
  id: string;
  numeroPedido: string;
  empresaNome: string;
  rotaNome: string;
  dataAgendada: string;
  enderecoColetaCompleto: string;
  enderecoEntregaCompleto: string;
  destinatarioNome: string;
  quantidadePacotes: number;
  pesoTotalKg: string;
  valorTotal: string;
  status: string;
  createdAt: string;
};

type Viagem = {
  id: string;
  entregadorNome: string;
  rotaNome: string;
  dataViagem: string;
  status: string;
  capacidadePacotesTotal: number;
  capacidadePesoKgTotal: string;
  pacotesAceitos: number;
  pesoAceitoKg: string;
  horarioSaidaPlanejado: string;
  horarioSaidaReal: string | null;
  createdAt: string;
};

type Parada = {
  id: string;
  ordem: number;
  destinatarioNome: string;
  destinatarioTelefone: string;
  enderecoCompleto: string;
  observacoes: string | null;
};

type EntregaDetalhes = Entrega & {
  paradas: Parada[];
  viagem: {
    id: string;
    dataViagem: string;
    viagemStatus: string;
    horarioSaidaPlanejado: string;
    horarioSaidaReal: string | null;
  } | null;
  entregador: {
    id: string;
    name: string;
    phone: string;
  } | null;
};

const statusColors: Record<string, string> = {
  aguardando_motorista: "secondary",
  motorista_aceito: "default",
  agendada: "secondary",
  em_coleta: "default",
  coletado: "default",
  em_transito: "default",
  em_entrega: "default",
  entregue: "default",
  concluida: "default",
  cancelada: "destructive",
};

const statusLabels: Record<string, string> = {
  aguardando_motorista: "Aguardando Motorista",
  motorista_aceito: "Motorista Aceito",
  agendada: "Agendada",
  em_coleta: "Em Coleta",
  coletado: "Coletado",
  em_transito: "Em Trânsito",
  em_entrega: "Em Entrega",
  entregue: "Entregue",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export default function AdminEntregasIntermunicipais() {
  const { toast } = useToast();
  const [selectedEntregaId, setSelectedEntregaId] = useState<string | null>(null);

  const { data: entregas = [], isLoading: loadingEntregas } = useQuery<Entrega[]>({
    queryKey: ["/api/entregas-intermunicipais"],
  });

  const { data: entregaDetalhes, isLoading: loadingDetalhes } = useQuery<EntregaDetalhes>({
    queryKey: ["/api/entregas-intermunicipais", selectedEntregaId],
    enabled: !!selectedEntregaId,
  });

  const { data: viagens = [], isLoading: loadingViagens } = useQuery<Viagem[]>({
    queryKey: ["/api/admin/viagens-intermunicipais"],
  });

  const cancelarMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/entregas-intermunicipais/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entregas-intermunicipais"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/viagens-intermunicipais"] });
      toast({
        title: "Sucesso!",
        description: "Entrega cancelada com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao cancelar entrega",
        variant: "destructive",
      });
    },
  });

  const handleCancelar = (id: string, numeroPedido: string, status: string) => {
    if (status === "cancelada") {
      toast({
        title: "Atenção",
        description: "Esta entrega já está cancelada",
        variant: "destructive",
      });
      return;
    }

    if (confirm(`Tem certeza que deseja cancelar a entrega ${numeroPedido}?`)) {
      cancelarMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Entregas Intermunicipais</CardTitle>
          <CardDescription>
            Gerencie entregas e viagens intermunicipais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="entregas" className="w-full">
            <TabsList>
              <TabsTrigger value="entregas">Entregas</TabsTrigger>
              <TabsTrigger value="viagens">Viagens</TabsTrigger>
            </TabsList>

            {/* ABA DE ENTREGAS */}
            <TabsContent value="entregas" className="mt-6">
          {loadingEntregas ? (
            <div className="text-center py-10">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Rota</TableHead>
                  <TableHead>Data Agendada</TableHead>
                  <TableHead>Destinatário</TableHead>
                  <TableHead>Pacotes/Peso</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entregas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10">
                      Nenhuma entrega cadastrada
                    </TableCell>
                  </TableRow>
                ) : (
                  entregas.map((entrega) => (
                    <TableRow key={entrega.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          {entrega.numeroPedido}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {entrega.empresaNome}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {entrega.rotaNome}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(entrega.dataAgendada), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </div>
                      </TableCell>
                      <TableCell>{entrega.destinatarioNome}</TableCell>
                      <TableCell>
                        {entrega.quantidadePacotes} pacote(s) / {parseFloat(entrega.pesoTotalKg).toFixed(2)} kg
                      </TableCell>
                      <TableCell>R$ {parseFloat(entrega.valorTotal).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={statusColors[entrega.status] as any}>
                          {statusLabels[entrega.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedEntregaId(entrega.id)}
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCancelar(entrega.id, entrega.numeroPedido, entrega.status)}
                            disabled={entrega.status === "cancelada" || cancelarMutation.isPending}
                            title={entrega.status === "cancelada" ? "Entrega já cancelada" : "Cancelar entrega"}
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
            </TabsContent>

            {/* ABA DE VIAGENS */}
            <TabsContent value="viagens" className="mt-6">
              {loadingViagens ? (
                <div className="text-center py-10">Carregando...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Motorista</TableHead>
                      <TableHead>Rota</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Capacidade</TableHead>
                      <TableHead>Ocupação</TableHead>
                      <TableHead>Horário Saída</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viagens.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10">
                          Nenhuma viagem cadastrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      viagens.map((viagem) => {
                        const ocupacaoPacotes = viagem.capacidadePacotesTotal > 0
                          ? ((viagem.pacotesAceitos / viagem.capacidadePacotesTotal) * 100).toFixed(0)
                          : 0;
                        const ocupacaoPeso = parseFloat(viagem.capacidadePesoKgTotal) > 0
                          ? ((parseFloat(viagem.pesoAceitoKg) / parseFloat(viagem.capacidadePesoKgTotal)) * 100).toFixed(0)
                          : 0;

                        return (
                          <TableRow key={viagem.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                {viagem.entregadorNome}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                {viagem.rotaNome}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {format(new Date(viagem.dataViagem), "dd/MM/yyyy", {
                                  locale: ptBR,
                                })}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{viagem.capacidadePacotesTotal} pacotes</div>
                                <div className="text-muted-foreground">
                                  {parseFloat(viagem.capacidadePesoKgTotal).toFixed(2)} kg
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className="flex items-center gap-2">
                                  <Package className="h-3 w-3 text-muted-foreground" />
                                  {viagem.pacotesAceitos} ({ocupacaoPacotes}%)
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Truck className="h-3 w-3" />
                                  {parseFloat(viagem.pesoAceitoKg).toFixed(2)} kg ({ocupacaoPeso}%)
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>Planejado: {viagem.horarioSaidaPlanejado}</div>
                                {viagem.horarioSaidaReal && (
                                  <div className="text-muted-foreground">
                                    Real: {format(new Date(viagem.horarioSaidaReal), "HH:mm", { locale: ptBR })}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusColors[viagem.status] as any}>
                                {statusLabels[viagem.status]}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* MODAL DE DETALHES DA ENTREGA */}
      <Dialog open={!!selectedEntregaId} onOpenChange={(open) => !open && setSelectedEntregaId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Entrega</DialogTitle>
            <DialogDescription>
              Informações completas sobre a entrega intermunicipal
            </DialogDescription>
          </DialogHeader>

          {loadingDetalhes ? (
            <div className="text-center py-10">Carregando detalhes...</div>
          ) : entregaDetalhes ? (
            <div className="space-y-6">
              {/* INFORMAÇÕES PRINCIPAIS */}
              <div className="border-b pb-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Número do Pedido</label>
                  <p className="text-2xl font-bold">{entregaDetalhes.numeroPedido}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="mt-2">
                      <Badge variant={statusColors[entregaDetalhes.status] as any} className="text-base px-3 py-1">
                        {statusLabels[entregaDetalhes.status]}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Rota</label>
                    <p className="flex items-center gap-2 mt-2 text-base font-semibold">
                      <MapPin className="h-5 w-5 text-blue-600" />
                      {entregaDetalhes.rotaNome}
                    </p>
                  </div>
                </div>
              </div>

              {/* INFORMAÇÕES SECUNDÁRIAS */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Empresa</label>
                  <p className="flex items-center gap-2 mt-1">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {entregaDetalhes.empresaNome}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data Agendada</label>
                  <p className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {format(new Date(entregaDetalhes.dataAgendada), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Valor Total</label>
                  <p className="text-lg font-semibold text-green-600">
                    R$ {parseFloat(entregaDetalhes.valorTotal).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* INFORMAÇÕES DO MOTORISTA */}
              {entregaDetalhes.entregador && (
                <div className="border rounded-lg p-4 bg-muted/50">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Motorista
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nome</label>
                      <p className="mt-1">{entregaDetalhes.entregador.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                      <p className="flex items-center gap-2 mt-1">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {entregaDetalhes.entregador.phone}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ENDEREÇO DE COLETA */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  Endereço de Coleta
                </h3>
                <p className="text-sm">{entregaDetalhes.enderecoColetaCompleto}</p>
              </div>

              {/* PARADAS DE ENTREGA */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Package className="h-5 w-5 text-green-600" />
                  Paradas de Entrega ({entregaDetalhes.paradas.length})
                </h3>
                <div className="space-y-4">
                  {entregaDetalhes.paradas.sort((a, b) => a.ordem - b.ordem).map((parada, index) => (
                    <div key={parada.id} className="border-l-4 border-green-500 pl-4 py-2 bg-muted/30 rounded-r">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">Parada {parada.ordem} - {parada.destinatarioNome}</p>
                          <p className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Phone className="h-3 w-3" />
                            {parada.destinatarioTelefone}
                          </p>
                        </div>
                      </div>
                      <p className="flex items-start gap-2 text-sm mt-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        {parada.enderecoCompleto}
                      </p>
                      {parada.observacoes && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          Obs: {parada.observacoes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* INFORMAÇÕES DO PACOTE */}
              <div className="grid grid-cols-2 gap-4 border rounded-lg p-4 bg-muted/30">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Quantidade de Pacotes</label>
                  <p className="text-lg font-semibold">{entregaDetalhes.quantidadePacotes}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Peso Total</label>
                  <p className="text-lg font-semibold">{parseFloat(entregaDetalhes.pesoTotalKg).toFixed(2)} kg</p>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

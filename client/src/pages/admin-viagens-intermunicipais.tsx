import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Truck, User, MapPin, Calendar, Package, RefreshCw } from "lucide-react";

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
  horarioChegadaPrevisto: string | null;
  horarioChegadaReal: string | null;
  createdAt: string;
};

const statusColors: Record<string, string> = {
  agendada: "secondary",
  em_coleta: "default",
  em_transito: "default",
  em_entrega: "default",
  concluida: "default",
  cancelada: "destructive",
};

const statusLabels: Record<string, string> = {
  agendada: "Agendada",
  em_coleta: "Em Coleta",
  em_transito: "Em Trânsito",
  em_entrega: "Em Entrega",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export default function AdminViagensIntermunicipais() {
  const { data: viagens = [], isLoading, refetch } = useQuery<Viagem[]>({
    queryKey: ["/api/admin/viagens-intermunicipais"],
  });

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/admin/viagens-intermunicipais"] });
    refetch();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Viagens Intermunicipais</CardTitle>
            <CardDescription>
              Visualize todas as viagens de motoristas para entregas intermunicipais
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
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
        </CardContent>
      </Card>
    </div>
  );
}

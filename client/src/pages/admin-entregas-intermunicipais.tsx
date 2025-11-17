import { useQuery } from "@tanstack/react-query";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Package, MapPin, Building2, Calendar } from "lucide-react";

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

const statusColors: Record<string, string> = {
  aguardando_motorista: "secondary",
  motorista_aceito: "default",
  em_coleta: "default",
  em_transito: "default",
  em_entrega: "default",
  entregue: "default",
};

const statusLabels: Record<string, string> = {
  aguardando_motorista: "Aguardando Motorista",
  motorista_aceito: "Motorista Aceito",
  em_coleta: "Em Coleta",
  em_transito: "Em Trânsito",
  em_entrega: "Em Entrega",
  entregue: "Entregue",
};

export default function AdminEntregasIntermunicipais() {
  const { data: entregas = [], isLoading } = useQuery<Entrega[]>({
    queryKey: ["/api/entregas-intermunicipais"],
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Entregas Intermunicipais</CardTitle>
          <CardDescription>
            Visualize todas as entregas intermunicipais do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {entregas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10">
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

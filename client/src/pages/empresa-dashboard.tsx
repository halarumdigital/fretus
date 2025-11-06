import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Clock, CheckCircle2, XCircle } from "lucide-react";

interface CompanyStats {
  totalTrips: number;
  pendingTrips: number;
  completedTrips: number;
  cancelledTrips: number;
}

export default function EmpresaDashboard() {
  const { data: companyInfo } = useQuery({
    queryKey: ["/api/empresa/auth/me"],
  });

  // TODO: Fetch real stats from API
  const stats: CompanyStats = {
    totalTrips: 0,
    pendingTrips: 0,
    completedTrips: 0,
    cancelledTrips: 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Bem-vindo, {companyInfo?.name || "Empresa"}!
        </h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas corridas e acompanhe o status das solicitações
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Corridas</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTrips}</div>
            <p className="text-xs text-muted-foreground">
              Todas as corridas solicitadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingTrips}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando motorista
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedTrips}</div>
            <p className="text-xs text-muted-foreground">
              Corridas finalizadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Canceladas</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cancelledTrips}</div>
            <p className="text-xs text-muted-foreground">
              Corridas canceladas
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Começar</CardTitle>
          <CardDescription>
            Use o menu lateral para navegar pelas funcionalidades
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            • <strong>Dashboard:</strong> Visualize estatísticas das suas corridas
          </p>
          <p className="text-sm text-muted-foreground">
            • <strong>Nova Corrida:</strong> Solicite uma nova corrida para sua empresa
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

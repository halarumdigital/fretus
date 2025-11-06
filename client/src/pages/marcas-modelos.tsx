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
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlusCircle, Edit, Trash2, CarFront } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Brand = {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type VehicleModel = {
  id: string;
  brandId: string;
  brandName?: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

const brandSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
});

const modelSchema = z.object({
  brandId: z.string().min(1, "Marca é obrigatória"),
  name: z.string().min(1, "Nome é obrigatório"),
});

type BrandForm = z.infer<typeof brandSchema>;
type ModelForm = z.infer<typeof modelSchema>;

export default function MarcasModelos() {
  const { toast } = useToast();
  const [isBrandDialogOpen, setIsBrandDialogOpen] = useState(false);
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [editingModel, setEditingModel] = useState<VehicleModel | null>(null);

  // Buscar marcas da API
  const { data: brands = [], isLoading: brandsLoading, error: brandsError } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });

  // Buscar modelos da API
  const { data: models = [], isLoading: modelsLoading, error: modelsError } = useQuery<VehicleModel[]>({
    queryKey: ["/api/vehicle-models"],
  });

  // Debug logs
  console.log("Brands data:", brands, "Loading:", brandsLoading, "Error:", brandsError);
  console.log("Models data:", models, "Loading:", modelsLoading, "Error:", modelsError);

  // ========== MARCAS ==========

  // Mutation para criar marca
  const createBrandMutation = useMutation({
    mutationFn: async (data: BrandForm) => {
      return await apiRequest("POST", "/api/brands", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      toast({ title: "Sucesso!", description: "Marca criada com sucesso" });
      setIsBrandDialogOpen(false);
      brandForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  // Mutation para atualizar marca
  const updateBrandMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: BrandForm }) => {
      return await apiRequest("PUT", `/api/brands/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      toast({ title: "Sucesso!", description: "Marca atualizada com sucesso" });
      setIsBrandDialogOpen(false);
      setEditingBrand(null);
      brandForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  // Mutation para excluir marca
  const deleteBrandMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/brands/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      toast({ title: "Sucesso!", description: "Marca excluída com sucesso" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const brandForm = useForm<BrandForm>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: "",
    },
  });

  const onBrandSubmit = (data: BrandForm) => {
    if (editingBrand) {
      updateBrandMutation.mutate({ id: editingBrand.id, data });
    } else {
      createBrandMutation.mutate(data);
    }
  };

  const handleEditBrand = (brand: Brand) => {
    setEditingBrand(brand);
    brandForm.reset({ name: brand.name });
    setIsBrandDialogOpen(true);
  };

  const handleNewBrand = () => {
    setEditingBrand(null);
    brandForm.reset({ name: "" });
    setIsBrandDialogOpen(true);
  };

  const handleDeleteBrand = (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir a marca "${name}"?`)) {
      deleteBrandMutation.mutate(id);
    }
  };

  // ========== MODELOS ==========

  // Mutation para criar modelo
  const createModelMutation = useMutation({
    mutationFn: async (data: ModelForm) => {
      return await apiRequest("POST", "/api/vehicle-models", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-models"] });
      toast({ title: "Sucesso!", description: "Modelo criado com sucesso" });
      setIsModelDialogOpen(false);
      modelForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  // Mutation para atualizar modelo
  const updateModelMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ModelForm }) => {
      return await apiRequest("PUT", `/api/vehicle-models/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-models"] });
      toast({ title: "Sucesso!", description: "Modelo atualizado com sucesso" });
      setIsModelDialogOpen(false);
      setEditingModel(null);
      modelForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  // Mutation para excluir modelo
  const deleteModelMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/vehicle-models/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-models"] });
      toast({ title: "Sucesso!", description: "Modelo excluído com sucesso" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const modelForm = useForm<ModelForm>({
    resolver: zodResolver(modelSchema),
    defaultValues: {
      brandId: "",
      name: "",
    },
  });

  const onModelSubmit = (data: ModelForm) => {
    if (editingModel) {
      updateModelMutation.mutate({ id: editingModel.id, data });
    } else {
      createModelMutation.mutate(data);
    }
  };

  const handleEditModel = (model: VehicleModel) => {
    setEditingModel(model);
    modelForm.reset({
      brandId: model.brandId,
      name: model.name,
    });
    setIsModelDialogOpen(true);
  };

  const handleNewModel = () => {
    setEditingModel(null);
    modelForm.reset({
      brandId: "",
      name: "",
    });
    setIsModelDialogOpen(true);
  };

  const handleDeleteModel = (id: string, brandName: string, modelName: string) => {
    if (confirm(`Tem certeza que deseja excluir o modelo "${brandName} ${modelName}"?`)) {
      deleteModelMutation.mutate(id);
    }
  };

  if (brandsLoading || modelsLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-10">
            <div className="text-center">Carregando...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CarFront className="h-6 w-6" />
            Marcas e Modelos de Veículos
          </CardTitle>
          <CardDescription>
            Gerencie as marcas e modelos de veículos disponíveis no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="brands" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="brands">Marcas</TabsTrigger>
              <TabsTrigger value="models">Modelos</TabsTrigger>
            </TabsList>

            {/* TAB MARCAS */}
            <TabsContent value="brands" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={handleNewBrand}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Nova Marca
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brands.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-10">
                        Nenhuma marca cadastrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    brands.map((brand) => (
                      <TableRow key={brand.id}>
                        <TableCell className="font-medium">{brand.name}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              brand.active
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {brand.active ? "Ativo" : "Inativo"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEditBrand(brand)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDeleteBrand(brand.id, brand.name)}
                              disabled={deleteBrandMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            {/* TAB MODELOS */}
            <TabsContent value="models" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={handleNewModel}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Novo Modelo
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Marca</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10">
                        Nenhum modelo cadastrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    models.map((model) => (
                      <TableRow key={model.id}>
                        <TableCell className="font-medium">
                          {model.brandName || "-"}
                        </TableCell>
                        <TableCell>{model.name}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              model.active
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {model.active ? "Ativo" : "Inativo"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEditModel(model)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() =>
                                handleDeleteModel(
                                  model.id,
                                  model.brandName || "Marca",
                                  model.name
                                )
                              }
                              disabled={deleteModelMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>

          {/* DIALOG MARCA */}
          <Dialog open={isBrandDialogOpen} onOpenChange={setIsBrandDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingBrand ? "Editar Marca" : "Nova Marca"}
                </DialogTitle>
                <DialogDescription>
                  {editingBrand
                    ? "Atualize as informações da marca"
                    : "Cadastre uma nova marca de veículo"}
                </DialogDescription>
              </DialogHeader>

              <Form {...brandForm}>
                <form onSubmit={brandForm.handleSubmit(onBrandSubmit)} className="space-y-4">
                  <FormField
                    control={brandForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Marca</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Honda" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={
                        createBrandMutation.isPending || updateBrandMutation.isPending
                      }
                    >
                      {editingBrand
                        ? updateBrandMutation.isPending
                          ? "Atualizando..."
                          : "Atualizar"
                        : createBrandMutation.isPending
                        ? "Criando..."
                        : "Criar"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* DIALOG MODELO */}
          <Dialog open={isModelDialogOpen} onOpenChange={setIsModelDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingModel ? "Editar Modelo" : "Novo Modelo"}
                </DialogTitle>
                <DialogDescription>
                  {editingModel
                    ? "Atualize as informações do modelo"
                    : "Cadastre um novo modelo de veículo"}
                </DialogDescription>
              </DialogHeader>

              <Form {...modelForm}>
                <form onSubmit={modelForm.handleSubmit(onModelSubmit)} className="space-y-4">
                  <FormField
                    control={modelForm.control}
                    name="brandId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marca</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a marca" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {brands.map((brand) => (
                              <SelectItem key={brand.id} value={brand.id}>
                                {brand.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={modelForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Modelo</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: CG 160" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={
                        createModelMutation.isPending || updateModelMutation.isPending
                      }
                    >
                      {editingModel
                        ? updateModelMutation.isPending
                          ? "Atualizando..."
                          : "Atualizar"
                        : createModelMutation.isPending
                        ? "Criando..."
                        : "Criar"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}

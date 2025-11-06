import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type React from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlusCircle, Edit, Trash2, Car } from "lucide-react";

const categoriaSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
});

type CategoriaForm = z.infer<typeof categoriaSchema>;

type VehicleType = {
  id: string;
  name: string;
  capacity: number;
  icon?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function Categorias() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<VehicleType | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Buscar categorias da API
  const { data: categorias = [], isLoading } = useQuery<VehicleType[]>({
    queryKey: ["/api/vehicle-types"],
  });

  // Mutation para excluir categoria
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/vehicle-types/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-types"] });
      toast({ title: "Sucesso!", description: "Categoria excluída com sucesso" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  // Mutation para criar categoria
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; icon?: string }) => {
      return await apiRequest("POST", "/api/vehicle-types", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-types"] });
      toast({ title: "Sucesso!", description: "Categoria criada com sucesso" });
      setIsDialogOpen(false);
      form.reset();
      setSelectedFile(null);
      setIconPreview(null);
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  // Mutation para atualizar categoria
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; icon?: string } }) => {
      return await apiRequest("PUT", `/api/vehicle-types/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-types"] });
      toast({ title: "Sucesso!", description: "Categoria atualizada com sucesso" });
      setIsDialogOpen(false);
      setEditingCategoria(null);
      form.reset();
      setSelectedFile(null);
      setIconPreview(null);
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<CategoriaForm>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: {
      name: "",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setIconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: CategoriaForm) => {
    setIsUploading(true);

    try {
      let iconPath = editingCategoria?.icon;

      // Upload do arquivo se selecionado
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const uploadResponse = await fetch("http://localhost:5000/api/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!uploadResponse.ok) {
          throw new Error("Erro ao fazer upload do arquivo");
        }

        const uploadData = await uploadResponse.json();
        iconPath = uploadData.path;
      }

      if (editingCategoria) {
        await updateMutation.mutateAsync({
          id: editingCategoria.id,
          data: { name: data.name, icon: iconPath },
        });
      } else {
        await createMutation.mutateAsync({ name: data.name, icon: iconPath });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar categoria",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = (categoria: VehicleType) => {
    setEditingCategoria(categoria);
    form.reset({
      name: categoria.name,
    });
    setIconPreview(categoria.icon ? `http://localhost:5000${categoria.icon}` : null);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir a categoria "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewCategoria = () => {
    setEditingCategoria(null);
    setSelectedFile(null);
    setIconPreview(null);
    form.reset({
      name: "",
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-10">
            <div className="text-center">Carregando categorias...</div>
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
                <Car className="h-6 w-6" />
                Categorias de Veículos
              </CardTitle>
              <CardDescription>
                Gerencie os tipos de veículos disponíveis
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleNewCategoria}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Nova Categoria
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCategoria ? "Editar Categoria" : "Nova Categoria"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingCategoria
                      ? "Atualize as informações da categoria"
                      : "Adicione uma nova categoria de veículo"}
                  </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome da Categoria</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Econômico" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormItem>
                      <FormLabel>Ícone da Categoria</FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          <Input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/svg+xml"
                            onChange={handleFileChange}
                          />
                          {iconPreview && (
                            <div className="flex items-center gap-4">
                              <img
                                src={iconPreview}
                                alt="Preview"
                                className="w-20 h-20 object-contain border rounded"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedFile(null);
                                  setIconPreview(null);
                                }}
                              >
                                Remover
                              </Button>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>

                    <DialogFooter>
                      <Button type="submit" disabled={isUploading}>
                        {isUploading ? "Salvando..." : editingCategoria ? "Atualizar" : "Criar"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Ícone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categorias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">
                    Nenhuma categoria cadastrada
                  </TableCell>
                </TableRow>
              ) : (
                categorias.map((categoria) => (
                  <TableRow key={categoria.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-gray-500" />
                      {categoria.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    {categoria.icon ? (
                      <img
                        src={`http://localhost:5000${categoria.icon}`}
                        alt={categoria.name}
                        className="w-10 h-10 object-contain"
                      />
                    ) : (
                      <span className="text-gray-400 text-sm">Sem ícone</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      categoria.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {categoria.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(categoria)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(categoria.id, categoria.name)}
                        disabled={deleteMutation.isPending}
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
        </CardContent>
      </Card>
    </div>
  );
}

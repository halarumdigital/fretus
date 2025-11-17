# 📱 API Mobile - Motorista Fretus

Documentação completa dos endpoints da API para o aplicativo mobile dos motoristas.

**Base URL:** `https://seu-servidor.com`

**Autenticação:** Todas as rotas requerem cookie de sessão após login.

---

## 📋 Índice

1. [Configuração de Rotas](#1-configuração-de-rotas)
2. [Entregas Disponíveis](#2-entregas-disponíveis)
3. [Gestão de Viagens](#3-gestão-de-viagens)
4. [Gestão de Coletas](#4-gestão-de-coletas)
5. [Gestão de Entregas](#5-gestão-de-entregas)
6. [Exemplos Flutter/Dart](#6-exemplos-flutterdart)

---

## 1. Configuração de Rotas

### 1.1. Listar Rotas Disponíveis

**GET** `/api/entregador/rotas-disponiveis`

Lista todas as rotas intermunicipais disponíveis para configuração.

**Headers:**
```
Cookie: session=<session-id>
Content-Type: application/json
```

**Response 200:**
```json
[
  {
    "id": "uuid",
    "nomeRota": "Cidade A → Cidade B",
    "cidadeOrigemId": "uuid",
    "cidadeOrigemNome": "Cidade A",
    "cidadeDestinoId": "uuid",
    "cidadeDestinoNome": "Cidade B",
    "distanciaKm": "85.5",
    "tempoEstimadoMinutos": 90,
    "ativo": true
  }
]
```

**Exemplo Flutter:**
```dart
Future<List<Rota>> getRotasDisponiveis() async {
  final response = await http.get(
    Uri.parse('$baseUrl/api/entregador/rotas-disponiveis'),
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': 'application/json',
    },
  );

  if (response.statusCode == 200) {
    final List<dynamic> data = json.decode(response.body);
    return data.map((json) => Rota.fromJson(json)).toList();
  }
  throw Exception('Erro ao buscar rotas');
}
```

---

### 1.2. Listar Minhas Rotas Configuradas

**GET** `/api/entregador/minhas-rotas`

Lista as rotas que o motorista já configurou com capacidade.

**Headers:**
```
Cookie: session=<session-id>
Content-Type: application/json
```

**Response 200:**
```json
[
  {
    "id": "uuid",
    "rotaId": "uuid",
    "rotaNome": "Cidade A → Cidade B",
    "cidadeOrigemNome": "Cidade A",
    "cidadeDestinoNome": "Cidade B",
    "distanciaKm": "85.5",
    "tempoEstimadoMinutos": 90,
    "capacidadePacotes": 50,
    "capacidadePesoKg": "500.00",
    "horarioSaidaPadrao": "08:00",
    "ativo": true
  }
]
```

**Exemplo Flutter:**
```dart
Future<List<MinhaRota>> getMinhasRotas() async {
  final response = await http.get(
    Uri.parse('$baseUrl/api/entregador/minhas-rotas'),
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': 'application/json',
    },
  );

  if (response.statusCode == 200) {
    final List<dynamic> data = json.decode(response.body);
    return data.map((json) => MinhaRota.fromJson(json)).toList();
  }
  throw Exception('Erro ao buscar minhas rotas');
}
```

---

### 1.3. Configurar Capacidade para Rota

**POST** `/api/entregador/rotas`

Configura a capacidade do motorista para uma rota específica.

**Headers:**
```
Cookie: session=<session-id>
Content-Type: application/json
```

**Request Body:**
```json
{
  "rotaId": "uuid",
  "capacidadePacotes": 50,
  "capacidadePesoKg": "500.00",
  "horarioSaidaPadrao": "08:00",
  "ativo": true
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "entregadorId": "uuid",
  "rotaId": "uuid",
  "capacidadePacotes": 50,
  "capacidadePesoKg": "500.00",
  "horarioSaidaPadrao": "08:00",
  "ativo": true,
  "createdAt": "2025-11-17T10:00:00Z",
  "updatedAt": "2025-11-17T10:00:00Z"
}
```

**Exemplo Flutter:**
```dart
Future<MinhaRota> configurarRota({
  required String rotaId,
  required int capacidadePacotes,
  required double capacidadePesoKg,
  required String horarioSaidaPadrao,
}) async {
  final response = await http.post(
    Uri.parse('$baseUrl/api/entregador/rotas'),
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': 'application/json',
    },
    body: json.encode({
      'rotaId': rotaId,
      'capacidadePacotes': capacidadePacotes,
      'capacidadePesoKg': capacidadePesoKg.toString(),
      'horarioSaidaPadrao': horarioSaidaPadrao,
      'ativo': true,
    }),
  );

  if (response.statusCode == 201) {
    return MinhaRota.fromJson(json.decode(response.body));
  }
  throw Exception(json.decode(response.body)['message']);
}
```

---

### 1.4. Atualizar Configuração de Rota

**PUT** `/api/entregador/rotas/:id`

Atualiza a capacidade ou horário de uma rota configurada.

**Headers:**
```
Cookie: session=<session-id>
Content-Type: application/json
```

**Request Body:**
```json
{
  "capacidadePacotes": 60,
  "capacidadePesoKg": "600.00",
  "horarioSaidaPadrao": "09:00",
  "ativo": true
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "entregadorId": "uuid",
  "rotaId": "uuid",
  "capacidadePacotes": 60,
  "capacidadePesoKg": "600.00",
  "horarioSaidaPadrao": "09:00",
  "ativo": true,
  "updatedAt": "2025-11-17T11:00:00Z"
}
```

**Exemplo Flutter:**
```dart
Future<MinhaRota> atualizarRota({
  required String rotaId,
  int? capacidadePacotes,
  double? capacidadePesoKg,
  String? horarioSaidaPadrao,
  bool? ativo,
}) async {
  final Map<String, dynamic> body = {};

  if (capacidadePacotes != null) body['capacidadePacotes'] = capacidadePacotes;
  if (capacidadePesoKg != null) body['capacidadePesoKg'] = capacidadePesoKg.toString();
  if (horarioSaidaPadrao != null) body['horarioSaidaPadrao'] = horarioSaidaPadrao;
  if (ativo != null) body['ativo'] = ativo;

  final response = await http.put(
    Uri.parse('$baseUrl/api/entregador/rotas/$rotaId'),
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': 'application/json',
    },
    body: json.encode(body),
  );

  if (response.statusCode == 200) {
    return MinhaRota.fromJson(json.decode(response.body));
  }
  throw Exception('Erro ao atualizar rota');
}
```

---

### 1.5. Remover Configuração de Rota

**DELETE** `/api/entregador/rotas/:id`

Remove a configuração de uma rota.

**Headers:**
```
Cookie: session=<session-id>
```

**Response 200:**
```json
{
  "message": "Rota removida com sucesso"
}
```

**Exemplo Flutter:**
```dart
Future<void> removerRota(String rotaId) async {
  final response = await http.delete(
    Uri.parse('$baseUrl/api/entregador/rotas/$rotaId'),
    headers: {'Cookie': sessionCookie},
  );

  if (response.statusCode != 200) {
    throw Exception(json.decode(response.body)['message']);
  }
}
```

---

## 2. Entregas Disponíveis

### 2.1. Listar Entregas Disponíveis

**GET** `/api/entregador/entregas-disponiveis?dataViagem=YYYY-MM-DD`

Lista entregas aguardando motorista nas rotas configuradas pelo motorista.

**Headers:**
```
Cookie: session=<session-id>
Content-Type: application/json
```

**Query Parameters:**
- `dataViagem` (required): Data da viagem no formato YYYY-MM-DD

**Response 200:**
```json
[
  {
    "id": "uuid",
    "numeroPedido": "INT-2025-001",
    "empresaId": "uuid",
    "empresaNome": "Empresa XYZ Ltda",
    "rotaId": "uuid",
    "rotaNome": "Cidade A → Cidade B",
    "dataAgendada": "2025-12-01",
    "enderecoColetaCompleto": "Rua ABC, 123, Centro, Cidade A, CEP: 12345-678",
    "enderecoEntregaCompleto": "Av. XYZ, 456, Bairro Novo, Cidade B, CEP: 87654-321",
    "destinatarioNome": "João Silva",
    "destinatarioTelefone": "(11) 98765-4321",
    "quantidadePacotes": 5,
    "pesoTotalKg": "25.50",
    "valorTotal": "150.00",
    "status": "aguardando_motorista",
    "descricaoConteudo": "Eletrônicos",
    "createdAt": "2025-11-17T10:00:00Z"
  }
]
```

**Exemplo Flutter:**
```dart
Future<List<EntregaDisponivel>> getEntregasDisponiveis(DateTime data) async {
  final dataStr = '${data.year}-${data.month.toString().padLeft(2, '0')}-${data.day.toString().padLeft(2, '0')}';

  final response = await http.get(
    Uri.parse('$baseUrl/api/entregador/entregas-disponiveis?dataViagem=$dataStr'),
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': 'application/json',
    },
  );

  if (response.statusCode == 200) {
    final List<dynamic> data = json.decode(response.body);
    return data.map((json) => EntregaDisponivel.fromJson(json)).toList();
  }
  throw Exception('Erro ao buscar entregas disponíveis');
}
```

---

### 2.2. Aceitar Entrega

**POST** `/api/entregador/entregas/:id/aceitar`

Aceita uma entrega. O sistema automaticamente:
- Cria uma viagem para aquela data/rota (se não existir)
- Atualiza a capacidade da viagem
- Atualiza o status da entrega para "motorista_aceito"
- Cria registros de coleta e entrega

**Headers:**
```
Cookie: session=<session-id>
Content-Type: application/json
```

**Response 200:**
```json
{
  "message": "Entrega aceita com sucesso",
  "viagemId": "uuid"
}
```

**Possíveis Erros:**
- `400`: Entrega não está mais disponível
- `403`: Motorista não tem essa rota configurada
- `400`: Capacidade insuficiente

**Exemplo Flutter:**
```dart
Future<String> aceitarEntrega(String entregaId) async {
  final response = await http.post(
    Uri.parse('$baseUrl/api/entregador/entregas/$entregaId/aceitar'),
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': 'application/json',
    },
  );

  if (response.statusCode == 200) {
    final data = json.decode(response.body);
    return data['viagemId']; // Retorna ID da viagem
  }
  throw Exception(json.decode(response.body)['message']);
}
```

---

### 2.3. Rejeitar Entrega

**POST** `/api/entregador/entregas/:id/rejeitar`

Rejeita uma entrega (apenas registra a rejeição para métricas).

**Headers:**
```
Cookie: session=<session-id>
Content-Type: application/json
```

**Request Body:**
```json
{
  "motivo": "Horário incompatível"
}
```

**Response 200:**
```json
{
  "message": "Entrega rejeitada"
}
```

**Exemplo Flutter:**
```dart
Future<void> rejeitarEntrega(String entregaId, {String? motivo}) async {
  final response = await http.post(
    Uri.parse('$baseUrl/api/entregador/entregas/$entregaId/rejeitar'),
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': 'application/json',
    },
    body: json.encode({
      'motivo': motivo ?? 'Não informado',
    }),
  );

  if (response.statusCode != 200) {
    throw Exception('Erro ao rejeitar entrega');
  }
}
```

---

## 3. Gestão de Viagens

### 3.1. Listar Minhas Viagens

**GET** `/api/entregador/viagens`

Lista todas as viagens do motorista.

**Headers:**
```
Cookie: session=<session-id>
Content-Type: application/json
```

**Response 200:**
```json
[
  {
    "id": "uuid",
    "rotaNome": "Cidade A → Cidade B",
    "dataViagem": "2025-12-01",
    "status": "agendada",
    "capacidadePacotesTotal": 50,
    "capacidadePesoKgTotal": "500.00",
    "pacotesAceitos": 15,
    "pesoAceitoKg": "150.00",
    "horarioSaidaPlanejado": "08:00",
    "horarioSaidaReal": null,
    "createdAt": "2025-11-17T10:00:00Z",
    "updatedAt": "2025-11-17T10:00:00Z"
  }
]
```

**Status possíveis:**
- `agendada`: Viagem criada, aguardando início
- `em_coleta`: Motorista iniciou coletas
- `em_transito`: Todas coletas feitas, em trânsito para destino
- `em_entrega`: Chegou no destino, fazendo entregas
- `concluida`: Todas entregas concluídas
- `cancelada`: Viagem cancelada

**Exemplo Flutter:**
```dart
Future<List<Viagem>> getMinhasViagens() async {
  final response = await http.get(
    Uri.parse('$baseUrl/api/entregador/viagens'),
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': 'application/json',
    },
  );

  if (response.statusCode == 200) {
    final List<dynamic> data = json.decode(response.body);
    return data.map((json) => Viagem.fromJson(json)).toList();
  }
  throw Exception('Erro ao buscar viagens');
}
```

---

### 3.2. Detalhes de uma Viagem

**GET** `/api/entregador/viagens/:id`

Retorna detalhes completos de uma viagem específica.

**Headers:**
```
Cookie: session=<session-id>
Content-Type: application/json
```

**Response 200:**
```json
{
  "id": "uuid",
  "entregadorId": "uuid",
  "rotaId": "uuid",
  "entregadorRotaId": "uuid",
  "dataViagem": "2025-12-01",
  "status": "agendada",
  "capacidadePacotesTotal": 50,
  "capacidadePesoKgTotal": "500.00",
  "pacotesAceitos": 15,
  "pesoAceitoKg": "150.00",
  "horarioSaidaPlanejado": "08:00",
  "horarioSaidaReal": null,
  "horarioChegadaPrevisto": null,
  "horarioChegadaReal": null,
  "createdAt": "2025-11-17T10:00:00Z",
  "updatedAt": "2025-11-17T10:00:00Z"
}
```

**Exemplo Flutter:**
```dart
Future<Viagem> getViagemDetalhes(String viagemId) async {
  final response = await http.get(
    Uri.parse('$baseUrl/api/entregador/viagens/$viagemId'),
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': 'application/json',
    },
  );

  if (response.statusCode == 200) {
    return Viagem.fromJson(json.decode(response.body));
  }
  throw Exception('Erro ao buscar detalhes da viagem');
}
```

---

### 3.3. Iniciar Viagem

**POST** `/api/entregador/viagens/:id/iniciar`

Inicia uma viagem, mudando status para "em_coleta".

**Headers:**
```
Cookie: session=<session-id>
Content-Type: application/json
```

**Response 200:**
```json
{
  "message": "Viagem iniciada com sucesso"
}
```

**Possíveis Erros:**
- `400`: Viagem já foi iniciada ou concluída

**Exemplo Flutter:**
```dart
Future<void> iniciarViagem(String viagemId) async {
  final response = await http.post(
    Uri.parse('$baseUrl/api/entregador/viagens/$viagemId/iniciar'),
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': 'application/json',
    },
  );

  if (response.statusCode != 200) {
    throw Exception(json.decode(response.body)['message']);
  }
}
```

---

## 4. Gestão de Coletas

### 4.1. Listar Coletas da Viagem

**GET** `/api/entregador/viagens/:viagemId/coletas`

Lista todas as coletas de uma viagem (ordenadas por `ordem_coleta`).

**Headers:**
```
Cookie: session=<session-id>
Content-Type: application/json
```

**Response 200:**
```json
[
  {
    "id": "uuid",
    "viagemId": "uuid",
    "entregaId": "uuid",
    "enderecoColeta": "Rua ABC, 123, Centro, Cidade A",
    "latitude": "-23.5505",
    "longitude": "-46.6333",
    "status": "pendente",
    "ordemColeta": 1,
    "horarioPrevisto": null,
    "horarioChegada": null,
    "horarioColeta": null,
    "observacoes": null,
    "motivoFalha": null,
    "fotoComprovanteUrl": null,
    "createdAt": "2025-11-17T10:00:00Z",
    "updatedAt": "2025-11-17T10:00:00Z"
  }
]
```

**Status possíveis:**
- `pendente`: Aguardando coleta
- `coletado`: Pacote coletado com sucesso
- `falha`: Falha na coleta

**Exemplo Flutter:**
```dart
Future<List<Coleta>> getColetas(String viagemId) async {
  final response = await http.get(
    Uri.parse('$baseUrl/api/entregador/viagens/$viagemId/coletas'),
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': 'application/json',
    },
  );

  if (response.statusCode == 200) {
    final List<dynamic> data = json.decode(response.body);
    return data.map((json) => Coleta.fromJson(json)).toList();
  }
  throw Exception('Erro ao buscar coletas');
}
```

---

### 4.2. Atualizar Status da Coleta

**PUT** `/api/entregador/coletas/:id/status`

Atualiza o status de uma coleta.

**Headers:**
```
Cookie: session=<session-id>
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "coletado",
  "observacoes": "Pacote em bom estado"
}
```

**Para status "falha":**
```json
{
  "status": "falha",
  "motivoFalha": "Destinatário ausente",
  "observacoes": "Tentei contato telefônico"
}
```

**Response 200:**
```json
{
  "message": "Status da coleta atualizado com sucesso"
}
```

**Exemplo Flutter:**
```dart
Future<void> atualizarStatusColeta({
  required String coletaId,
  required String status, // "coletado" ou "falha"
  String? motivoFalha,
  String? observacoes,
}) async {
  final body = {'status': status};

  if (motivoFalha != null) body['motivoFalha'] = motivoFalha;
  if (observacoes != null) body['observacoes'] = observacoes;

  final response = await http.put(
    Uri.parse('$baseUrl/api/entregador/coletas/$coletaId/status'),
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': 'application/json',
    },
    body: json.encode(body),
  );

  if (response.statusCode != 200) {
    throw Exception(json.decode(response.body)['message']);
  }
}
```

---

### 4.3. Upload de Foto da Coleta

**POST** `/api/entregador/coletas/:id/foto`

Faz upload de foto comprovante da coleta.

**Headers:**
```
Cookie: session=<session-id>
Content-Type: multipart/form-data
```

**Form Data:**
- `foto`: File (imagem JPEG/PNG, máx 5MB)

**Response 200:**
```json
{
  "message": "Foto enviada com sucesso",
  "url": "https://r2.cloudflare.com/coletas/uuid-timestamp.jpg"
}
```

**Exemplo Flutter:**
```dart
import 'package:http_parser/http_parser.dart';
import 'dart:io';

Future<String> uploadFotoColeta(String coletaId, File imagemFile) async {
  var request = http.MultipartRequest(
    'POST',
    Uri.parse('$baseUrl/api/entregador/coletas/$coletaId/foto'),
  );

  request.headers['Cookie'] = sessionCookie;

  request.files.add(
    await http.MultipartFile.fromPath(
      'foto',
      imagemFile.path,
      contentType: MediaType('image', 'jpeg'),
    ),
  );

  final streamedResponse = await request.send();
  final response = await http.Response.fromStream(streamedResponse);

  if (response.statusCode == 200) {
    final data = json.decode(response.body);
    return data['url']; // URL da imagem
  }
  throw Exception(json.decode(response.body)['message']);
}
```

---

## 5. Gestão de Entregas

### 5.1. Listar Entregas da Viagem

**GET** `/api/entregador/viagens/:viagemId/entregas`

Lista todas as entregas de uma viagem (ordenadas por `ordem_entrega`).

**Headers:**
```
Cookie: session=<session-id>
Content-Type: application/json
```

**Response 200:**
```json
[
  {
    "id": "uuid",
    "viagemId": "uuid",
    "entregaId": "uuid",
    "coletaId": "uuid",
    "enderecoEntrega": "Av. XYZ, 456, Bairro Novo, Cidade B",
    "latitude": "-23.6505",
    "longitude": "-46.7333",
    "destinatarioNome": "João Silva",
    "destinatarioTelefone": "(11) 98765-4321",
    "status": "pendente",
    "ordemEntrega": 1,
    "horarioPrevisto": null,
    "horarioChegada": null,
    "horarioEntrega": null,
    "nomeRecebedor": null,
    "cpfRecebedor": null,
    "observacoes": null,
    "motivoFalha": null,
    "fotoComprovanteUrl": null,
    "assinaturaUrl": null,
    "avaliacaoEstrelas": null,
    "avaliacaoComentario": null,
    "createdAt": "2025-11-17T10:00:00Z",
    "updatedAt": "2025-11-17T10:00:00Z"
  }
]
```

**Status possíveis:**
- `pendente`: Aguardando entrega
- `entregue`: Entregue com sucesso
- `falha`: Falha na entrega

**Exemplo Flutter:**
```dart
Future<List<EntregaViagem>> getEntregas(String viagemId) async {
  final response = await http.get(
    Uri.parse('$baseUrl/api/entregador/viagens/$viagemId/entregas'),
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': 'application/json',
    },
  );

  if (response.statusCode == 200) {
    final List<dynamic> data = json.decode(response.body);
    return data.map((json) => EntregaViagem.fromJson(json)).toList();
  }
  throw Exception('Erro ao buscar entregas');
}
```

---

### 5.2. Atualizar Status da Entrega

**PUT** `/api/entregador/entregas-viagem/:id/status`

Atualiza o status de uma entrega.

**Headers:**
```
Cookie: session=<session-id>
Content-Type: application/json
```

**Request Body (entregue):**
```json
{
  "status": "entregue",
  "nomeRecebedor": "João Silva",
  "cpfRecebedor": "123.456.789-00",
  "observacoes": "Entrega realizada no portão"
}
```

**Request Body (falha):**
```json
{
  "status": "falha",
  "motivoFalha": "Endereço não encontrado",
  "observacoes": "Número inexistente na rua"
}
```

**Response 200:**
```json
{
  "message": "Status da entrega atualizado com sucesso"
}
```

**Exemplo Flutter:**
```dart
Future<void> atualizarStatusEntrega({
  required String entregaId,
  required String status, // "entregue" ou "falha"
  String? motivoFalha,
  String? nomeRecebedor,
  String? cpfRecebedor,
  String? observacoes,
}) async {
  final body = {'status': status};

  if (status == 'entregue') {
    body['nomeRecebedor'] = nomeRecebedor ?? '';
    body['cpfRecebedor'] = cpfRecebedor ?? '';
  }

  if (motivoFalha != null) body['motivoFalha'] = motivoFalha;
  if (observacoes != null) body['observacoes'] = observacoes;

  final response = await http.put(
    Uri.parse('$baseUrl/api/entregador/entregas-viagem/$entregaId/status'),
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': 'application/json',
    },
    body: json.encode(body),
  );

  if (response.statusCode != 200) {
    throw Exception(json.decode(response.body)['message']);
  }
}
```

---

### 5.3. Upload de Foto Comprovante

**POST** `/api/entregador/entregas-viagem/:id/foto`

Faz upload de foto comprovante da entrega.

**Headers:**
```
Cookie: session=<session-id>
Content-Type: multipart/form-data
```

**Form Data:**
- `foto`: File (imagem JPEG/PNG, máx 5MB)

**Response 200:**
```json
{
  "message": "Foto enviada com sucesso",
  "url": "https://r2.cloudflare.com/entregas/uuid-timestamp.jpg"
}
```

**Exemplo Flutter:**
```dart
Future<String> uploadFotoEntrega(String entregaId, File imagemFile) async {
  var request = http.MultipartRequest(
    'POST',
    Uri.parse('$baseUrl/api/entregador/entregas-viagem/$entregaId/foto'),
  );

  request.headers['Cookie'] = sessionCookie;

  request.files.add(
    await http.MultipartFile.fromPath(
      'foto',
      imagemFile.path,
      contentType: MediaType('image', 'jpeg'),
    ),
  );

  final streamedResponse = await request.send();
  final response = await http.Response.fromStream(streamedResponse);

  if (response.statusCode == 200) {
    final data = json.decode(response.body);
    return data['url'];
  }
  throw Exception(json.decode(response.body)['message']);
}
```

---

### 5.4. Upload de Assinatura

**POST** `/api/entregador/entregas-viagem/:id/assinatura`

Faz upload da assinatura digital do destinatário.

**Headers:**
```
Cookie: session=<session-id>
Content-Type: multipart/form-data
```

**Form Data:**
- `assinatura`: File (imagem PNG, máx 5MB)

**Response 200:**
```json
{
  "message": "Assinatura enviada com sucesso",
  "url": "https://r2.cloudflare.com/assinaturas/uuid-timestamp.png"
}
```

**Exemplo Flutter:**
```dart
Future<String> uploadAssinatura(String entregaId, File assinaturaFile) async {
  var request = http.MultipartRequest(
    'POST',
    Uri.parse('$baseUrl/api/entregador/entregas-viagem/$entregaId/assinatura'),
  );

  request.headers['Cookie'] = sessionCookie;

  request.files.add(
    await http.MultipartFile.fromPath(
      'assinatura',
      assinaturaFile.path,
      contentType: MediaType('image', 'png'),
    ),
  );

  final streamedResponse = await request.send();
  final response = await http.Response.fromStream(streamedResponse);

  if (response.statusCode == 200) {
    final data = json.decode(response.body);
    return data['url'];
  }
  throw Exception(json.decode(response.body)['message']);
}
```

---

### 5.5. Avaliar Entrega

**POST** `/api/entregador/entregas-viagem/:id/avaliar`

Permite o motorista avaliar a entrega (experiência com a empresa/destinatário).

**Headers:**
```
Cookie: session=<session-id>
Content-Type: application/json
```

**Request Body:**
```json
{
  "avaliacaoEstrelas": 5,
  "avaliacaoComentario": "Ótima experiência, destinatário muito educado"
}
```

**Validação:**
- `avaliacaoEstrelas`: Número inteiro de 1 a 5
- `avaliacaoComentario`: String opcional

**Response 200:**
```json
{
  "message": "Avaliação registrada com sucesso"
}
```

**Exemplo Flutter:**
```dart
Future<void> avaliarEntrega({
  required String entregaId,
  required int estrelas, // 1 a 5
  String? comentario,
}) async {
  if (estrelas < 1 || estrelas > 5) {
    throw Exception('Avaliação deve ser entre 1 e 5 estrelas');
  }

  final response = await http.post(
    Uri.parse('$baseUrl/api/entregador/entregas-viagem/$entregaId/avaliar'),
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': 'application/json',
    },
    body: json.encode({
      'avaliacaoEstrelas': estrelas,
      'avaliacaoComentario': comentario,
    }),
  );

  if (response.statusCode != 200) {
    throw Exception(json.decode(response.body)['message']);
  }
}
```

---

## 6. Exemplos Flutter/Dart

### 6.1. Service Class Completo

```dart
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'dart:convert';
import 'dart:io';

class EntregadorService {
  final String baseUrl;
  final String sessionCookie;

  EntregadorService({
    required this.baseUrl,
    required this.sessionCookie,
  });

  Map<String, String> get _headers => {
    'Cookie': sessionCookie,
    'Content-Type': 'application/json',
  };

  // ===== ROTAS =====

  Future<List<Rota>> getRotasDisponiveis() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/entregador/rotas-disponiveis'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return (json.decode(response.body) as List)
          .map((json) => Rota.fromJson(json))
          .toList();
    }
    throw Exception('Erro ao buscar rotas');
  }

  Future<List<MinhaRota>> getMinhasRotas() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/entregador/minhas-rotas'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return (json.decode(response.body) as List)
          .map((json) => MinhaRota.fromJson(json))
          .toList();
    }
    throw Exception('Erro ao buscar minhas rotas');
  }

  Future<MinhaRota> configurarRota({
    required String rotaId,
    required int capacidadePacotes,
    required double capacidadePesoKg,
    required String horarioSaidaPadrao,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/entregador/rotas'),
      headers: _headers,
      body: json.encode({
        'rotaId': rotaId,
        'capacidadePacotes': capacidadePacotes,
        'capacidadePesoKg': capacidadePesoKg.toString(),
        'horarioSaidaPadrao': horarioSaidaPadrao,
        'ativo': true,
      }),
    );
    if (response.statusCode == 201) {
      return MinhaRota.fromJson(json.decode(response.body));
    }
    throw Exception(json.decode(response.body)['message']);
  }

  // ===== ENTREGAS DISPONÍVEIS =====

  Future<List<EntregaDisponivel>> getEntregasDisponiveis(DateTime data) async {
    final dataStr = '${data.year}-${data.month.toString().padLeft(2, '0')}-${data.day.toString().padLeft(2, '0')}';
    final response = await http.get(
      Uri.parse('$baseUrl/api/entregador/entregas-disponiveis?dataViagem=$dataStr'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return (json.decode(response.body) as List)
          .map((json) => EntregaDisponivel.fromJson(json))
          .toList();
    }
    throw Exception('Erro ao buscar entregas');
  }

  Future<String> aceitarEntrega(String entregaId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/entregador/entregas/$entregaId/aceitar'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return json.decode(response.body)['viagemId'];
    }
    throw Exception(json.decode(response.body)['message']);
  }

  // ===== VIAGENS =====

  Future<List<Viagem>> getMinhasViagens() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/entregador/viagens'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return (json.decode(response.body) as List)
          .map((json) => Viagem.fromJson(json))
          .toList();
    }
    throw Exception('Erro ao buscar viagens');
  }

  Future<void> iniciarViagem(String viagemId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/entregador/viagens/$viagemId/iniciar'),
      headers: _headers,
    );
    if (response.statusCode != 200) {
      throw Exception(json.decode(response.body)['message']);
    }
  }

  // ===== COLETAS =====

  Future<List<Coleta>> getColetas(String viagemId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/entregador/viagens/$viagemId/coletas'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return (json.decode(response.body) as List)
          .map((json) => Coleta.fromJson(json))
          .toList();
    }
    throw Exception('Erro ao buscar coletas');
  }

  Future<void> finalizarColeta(String coletaId) async {
    await atualizarStatusColeta(coletaId: coletaId, status: 'coletado');
  }

  Future<void> atualizarStatusColeta({
    required String coletaId,
    required String status,
    String? motivoFalha,
    String? observacoes,
  }) async {
    final body = {'status': status};
    if (motivoFalha != null) body['motivoFalha'] = motivoFalha;
    if (observacoes != null) body['observacoes'] = observacoes;

    final response = await http.put(
      Uri.parse('$baseUrl/api/entregador/coletas/$coletaId/status'),
      headers: _headers,
      body: json.encode(body),
    );
    if (response.statusCode != 200) {
      throw Exception(json.decode(response.body)['message']);
    }
  }

  Future<String> uploadFotoColeta(String coletaId, File foto) async {
    var request = http.MultipartRequest(
      'POST',
      Uri.parse('$baseUrl/api/entregador/coletas/$coletaId/foto'),
    );
    request.headers['Cookie'] = sessionCookie;
    request.files.add(await http.MultipartFile.fromPath(
      'foto',
      foto.path,
      contentType: MediaType('image', 'jpeg'),
    ));

    final response = await http.Response.fromStream(await request.send());
    if (response.statusCode == 200) {
      return json.decode(response.body)['url'];
    }
    throw Exception(json.decode(response.body)['message']);
  }

  // ===== ENTREGAS =====

  Future<List<EntregaViagem>> getEntregas(String viagemId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/entregador/viagens/$viagemId/entregas'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return (json.decode(response.body) as List)
          .map((json) => EntregaViagem.fromJson(json))
          .toList();
    }
    throw Exception('Erro ao buscar entregas');
  }

  Future<void> finalizarEntrega({
    required String entregaId,
    required String nomeRecebedor,
    required String cpfRecebedor,
  }) async {
    await atualizarStatusEntrega(
      entregaId: entregaId,
      status: 'entregue',
      nomeRecebedor: nomeRecebedor,
      cpfRecebedor: cpfRecebedor,
    );
  }

  Future<void> atualizarStatusEntrega({
    required String entregaId,
    required String status,
    String? motivoFalha,
    String? nomeRecebedor,
    String? cpfRecebedor,
    String? observacoes,
  }) async {
    final body = {'status': status};
    if (status == 'entregue') {
      body['nomeRecebedor'] = nomeRecebedor ?? '';
      body['cpfRecebedor'] = cpfRecebedor ?? '';
    }
    if (motivoFalha != null) body['motivoFalha'] = motivoFalha;
    if (observacoes != null) body['observacoes'] = observacoes;

    final response = await http.put(
      Uri.parse('$baseUrl/api/entregador/entregas-viagem/$entregaId/status'),
      headers: _headers,
      body: json.encode(body),
    );
    if (response.statusCode != 200) {
      throw Exception(json.decode(response.body)['message']);
    }
  }

  Future<String> uploadFotoEntrega(String entregaId, File foto) async {
    var request = http.MultipartRequest(
      'POST',
      Uri.parse('$baseUrl/api/entregador/entregas-viagem/$entregaId/foto'),
    );
    request.headers['Cookie'] = sessionCookie;
    request.files.add(await http.MultipartFile.fromPath(
      'foto',
      foto.path,
      contentType: MediaType('image', 'jpeg'),
    ));

    final response = await http.Response.fromStream(await request.send());
    if (response.statusCode == 200) {
      return json.decode(response.body)['url'];
    }
    throw Exception(json.decode(response.body)['message']);
  }

  Future<String> uploadAssinatura(String entregaId, File assinatura) async {
    var request = http.MultipartRequest(
      'POST',
      Uri.parse('$baseUrl/api/entregador/entregas-viagem/$entregaId/assinatura'),
    );
    request.headers['Cookie'] = sessionCookie;
    request.files.add(await http.MultipartFile.fromPath(
      'assinatura',
      assinatura.path,
      contentType: MediaType('image', 'png'),
    ));

    final response = await http.Response.fromStream(await request.send());
    if (response.statusCode == 200) {
      return json.decode(response.body)['url'];
    }
    throw Exception(json.decode(response.body)['message']);
  }

  Future<void> avaliarEntrega({
    required String entregaId,
    required int estrelas,
    String? comentario,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/entregador/entregas-viagem/$entregaId/avaliar'),
      headers: _headers,
      body: json.encode({
        'avaliacaoEstrelas': estrelas,
        'avaliacaoComentario': comentario,
      }),
    );
    if (response.statusCode != 200) {
      throw Exception(json.decode(response.body)['message']);
    }
  }
}
```

---

### 6.2. Models (Classes de Dados)

```dart
// models/rota.dart
class Rota {
  final String id;
  final String nomeRota;
  final String cidadeOrigemNome;
  final String cidadeDestinoNome;
  final double distanciaKm;
  final int tempoEstimadoMinutos;
  final bool ativo;

  Rota({
    required this.id,
    required this.nomeRota,
    required this.cidadeOrigemNome,
    required this.cidadeDestinoNome,
    required this.distanciaKm,
    required this.tempoEstimadoMinutos,
    required this.ativo,
  });

  factory Rota.fromJson(Map<String, dynamic> json) {
    return Rota(
      id: json['id'],
      nomeRota: json['nomeRota'],
      cidadeOrigemNome: json['cidadeOrigemNome'],
      cidadeDestinoNome: json['cidadeDestinoNome'],
      distanciaKm: double.parse(json['distanciaKm']),
      tempoEstimadoMinutos: json['tempoEstimadoMinutos'],
      ativo: json['ativo'],
    );
  }
}

// models/minha_rota.dart
class MinhaRota {
  final String id;
  final String rotaId;
  final String rotaNome;
  final String cidadeOrigemNome;
  final String cidadeDestinoNome;
  final int capacidadePacotes;
  final double capacidadePesoKg;
  final String horarioSaidaPadrao;
  final bool ativo;

  MinhaRota({
    required this.id,
    required this.rotaId,
    required this.rotaNome,
    required this.cidadeOrigemNome,
    required this.cidadeDestinoNome,
    required this.capacidadePacotes,
    required this.capacidadePesoKg,
    required this.horarioSaidaPadrao,
    required this.ativo,
  });

  factory MinhaRota.fromJson(Map<String, dynamic> json) {
    return MinhaRota(
      id: json['id'],
      rotaId: json['rotaId'],
      rotaNome: json['rotaNome'],
      cidadeOrigemNome: json['cidadeOrigemNome'],
      cidadeDestinoNome: json['cidadeDestinoNome'],
      capacidadePacotes: json['capacidadePacotes'],
      capacidadePesoKg: double.parse(json['capacidadePesoKg'].toString()),
      horarioSaidaPadrao: json['horarioSaidaPadrao'],
      ativo: json['ativo'],
    );
  }
}

// models/entrega_disponivel.dart
class EntregaDisponivel {
  final String id;
  final String numeroPedido;
  final String empresaNome;
  final String rotaNome;
  final String enderecoColetaCompleto;
  final String enderecoEntregaCompleto;
  final String destinatarioNome;
  final String destinatarioTelefone;
  final int quantidadePacotes;
  final double pesoTotalKg;
  final double valorTotal;
  final String? descricaoConteudo;

  EntregaDisponivel({
    required this.id,
    required this.numeroPedido,
    required this.empresaNome,
    required this.rotaNome,
    required this.enderecoColetaCompleto,
    required this.enderecoEntregaCompleto,
    required this.destinatarioNome,
    required this.destinatarioTelefone,
    required this.quantidadePacotes,
    required this.pesoTotalKg,
    required this.valorTotal,
    this.descricaoConteudo,
  });

  factory EntregaDisponivel.fromJson(Map<String, dynamic> json) {
    return EntregaDisponivel(
      id: json['id'],
      numeroPedido: json['numeroPedido'],
      empresaNome: json['empresaNome'],
      rotaNome: json['rotaNome'],
      enderecoColetaCompleto: json['enderecoColetaCompleto'],
      enderecoEntregaCompleto: json['enderecoEntregaCompleto'],
      destinatarioNome: json['destinatarioNome'],
      destinatarioTelefone: json['destinatarioTelefone'],
      quantidadePacotes: json['quantidadePacotes'],
      pesoTotalKg: double.parse(json['pesoTotalKg'].toString()),
      valorTotal: double.parse(json['valorTotal'].toString()),
      descricaoConteudo: json['descricaoConteudo'],
    );
  }
}

// models/viagem.dart
class Viagem {
  final String id;
  final String rotaNome;
  final String dataViagem;
  final String status;
  final int capacidadePacotesTotal;
  final double capacidadePesoKgTotal;
  final int pacotesAceitos;
  final double pesoAceitoKg;
  final String horarioSaidaPlanejado;
  final DateTime? horarioSaidaReal;

  Viagem({
    required this.id,
    required this.rotaNome,
    required this.dataViagem,
    required this.status,
    required this.capacidadePacotesTotal,
    required this.capacidadePesoKgTotal,
    required this.pacotesAceitos,
    required this.pesoAceitoKg,
    required this.horarioSaidaPlanejado,
    this.horarioSaidaReal,
  });

  factory Viagem.fromJson(Map<String, dynamic> json) {
    return Viagem(
      id: json['id'],
      rotaNome: json['rotaNome'],
      dataViagem: json['dataViagem'],
      status: json['status'],
      capacidadePacotesTotal: json['capacidadePacotesTotal'],
      capacidadePesoKgTotal: double.parse(json['capacidadePesoKgTotal'].toString()),
      pacotesAceitos: json['pacotesAceitos'],
      pesoAceitoKg: double.parse(json['pesoAceitoKg'].toString()),
      horarioSaidaPlanejado: json['horarioSaidaPlanejado'],
      horarioSaidaReal: json['horarioSaidaReal'] != null
        ? DateTime.parse(json['horarioSaidaReal'])
        : null,
    );
  }
}

// models/coleta.dart
class Coleta {
  final String id;
  final String viagemId;
  final String entregaId;
  final String enderecoColeta;
  final String? latitude;
  final String? longitude;
  final String status;
  final int ordemColeta;
  final DateTime? horarioChegada;
  final DateTime? horarioColeta;
  final String? observacoes;
  final String? motivoFalha;
  final String? fotoComprovanteUrl;

  Coleta({
    required this.id,
    required this.viagemId,
    required this.entregaId,
    required this.enderecoColeta,
    this.latitude,
    this.longitude,
    required this.status,
    required this.ordemColeta,
    this.horarioChegada,
    this.horarioColeta,
    this.observacoes,
    this.motivoFalha,
    this.fotoComprovanteUrl,
  });

  factory Coleta.fromJson(Map<String, dynamic> json) {
    return Coleta(
      id: json['id'],
      viagemId: json['viagemId'],
      entregaId: json['entregaId'],
      enderecoColeta: json['enderecoColeta'],
      latitude: json['latitude'],
      longitude: json['longitude'],
      status: json['status'],
      ordemColeta: json['ordemColeta'],
      horarioChegada: json['horarioChegada'] != null
        ? DateTime.parse(json['horarioChegada'])
        : null,
      horarioColeta: json['horarioColeta'] != null
        ? DateTime.parse(json['horarioColeta'])
        : null,
      observacoes: json['observacoes'],
      motivoFalha: json['motivoFalha'],
      fotoComprovanteUrl: json['fotoComprovanteUrl'],
    );
  }
}

// models/entrega_viagem.dart
class EntregaViagem {
  final String id;
  final String viagemId;
  final String entregaId;
  final String coletaId;
  final String enderecoEntrega;
  final String? latitude;
  final String? longitude;
  final String destinatarioNome;
  final String destinatarioTelefone;
  final String status;
  final int ordemEntrega;
  final DateTime? horarioChegada;
  final DateTime? horarioEntrega;
  final String? nomeRecebedor;
  final String? cpfRecebedor;
  final String? observacoes;
  final String? motivoFalha;
  final String? fotoComprovanteUrl;
  final String? assinaturaUrl;
  final int? avaliacaoEstrelas;
  final String? avaliacaoComentario;

  EntregaViagem({
    required this.id,
    required this.viagemId,
    required this.entregaId,
    required this.coletaId,
    required this.enderecoEntrega,
    this.latitude,
    this.longitude,
    required this.destinatarioNome,
    required this.destinatarioTelefone,
    required this.status,
    required this.ordemEntrega,
    this.horarioChegada,
    this.horarioEntrega,
    this.nomeRecebedor,
    this.cpfRecebedor,
    this.observacoes,
    this.motivoFalha,
    this.fotoComprovanteUrl,
    this.assinaturaUrl,
    this.avaliacaoEstrelas,
    this.avaliacaoComentario,
  });

  factory EntregaViagem.fromJson(Map<String, dynamic> json) {
    return EntregaViagem(
      id: json['id'],
      viagemId: json['viagemId'],
      entregaId: json['entregaId'],
      coletaId: json['coletaId'],
      enderecoEntrega: json['enderecoEntrega'],
      latitude: json['latitude'],
      longitude: json['longitude'],
      destinatarioNome: json['destinatarioNome'],
      destinatarioTelefone: json['destinatarioTelefone'],
      status: json['status'],
      ordemEntrega: json['ordemEntrega'],
      horarioChegada: json['horarioChegada'] != null
        ? DateTime.parse(json['horarioChegada'])
        : null,
      horarioEntrega: json['horarioEntrega'] != null
        ? DateTime.parse(json['horarioEntrega'])
        : null,
      nomeRecebedor: json['nomeRecebedor'],
      cpfRecebedor: json['cpfRecebedor'],
      observacoes: json['observacoes'],
      motivoFalha: json['motivoFalha'],
      fotoComprovanteUrl: json['fotoComprovanteUrl'],
      assinaturaUrl: json['assinaturaUrl'],
      avaliacaoEstrelas: json['avaliacaoEstrelas'],
      avaliacaoComentario: json['avaliacaoComentario'],
    );
  }
}
```

---

## 🔐 Autenticação

Todas as rotas requerem autenticação via cookie de sessão. O cookie é obtido após o login:

**POST** `/api/driver/auth/login`

```json
{
  "mobile": "11987654321",
  "password": "senha123"
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "João Motorista",
  "mobile": "11987654321",
  "email": "joao@email.com"
}
```

O cookie `session` é retornado nos headers da resposta e deve ser incluído em todas as requisições subsequentes.

---

## 📝 Notas Importantes

1. **Triggers Automáticos**: O sistema possui triggers que atualizam automaticamente:
   - Capacidade da viagem quando entrega é aceita
   - Status da viagem baseado em coletas/entregas
   - Criação automática de registros de coleta/entrega

2. **Ordem de Execução**: Respeite a ordem natural:
   - Configure rotas → Aceite entregas → Inicie viagem → Execute coletas → Execute entregas

3. **Fotos e Assinaturas**: São armazenadas no Cloudflare R2 e retornam URLs públicas

4. **Status da Viagem**: É atualizado automaticamente pelos triggers:
   - `agendada` → `em_coleta` (manual, via iniciar viagem)
   - `em_coleta` → `em_transito` (automático, quando todas coletas concluídas)
   - `em_transito` → `em_entrega` (automático, quando inicia primeira entrega)
   - `em_entrega` → `concluida` (automático, quando todas entregas concluídas)

5. **Capacidade**: O sistema verifica automaticamente se há capacidade disponível ao aceitar entregas

---

**Última atualização:** 17 de Novembro de 2025

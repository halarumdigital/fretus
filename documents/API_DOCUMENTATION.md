# Documentação Técnica Completa - API Ride-Hailing

## Índice
1. [Visão Geral da Aplicação](#visão-geral-da-aplicação)
2. [Arquitetura da API](#arquitetura-da-api)
3. [Sistema de Autenticação](#sistema-de-autenticação)
4. [Rotas da API Detalhadas](#rotas-da-api-detalhadas)
5. [Modelos de Dados](#modelos-de-dados)
6. [Sistema de Pagamentos](#sistema-de-pagamentos)
7. [Sistema de Geolocalização](#sistema-de-geolocalização)
8. [Sistema de Notificações](#sistema-de-notificações)
9. [Jobs e Processamento em Background](#jobs-e-processamento-em-background)
10. [Transformers e Serialização](#transformers-e-serialização)
11. [Serviços Customizados](#serviços-customizados)
12. [Fluxos Principais da Aplicação](#fluxos-principais-da-aplicação)

---

## Visão Geral da Aplicação

### Descrição
Sistema completo de gerenciamento de transporte tipo Uber/99, com suporte a:
- **Ride-Hailing** (corridas sob demanda)
- **Delivery Services** (entregas)
- **Rental Services** (aluguel por pacotes)
- **Outstation Rides** (viagens intermunicipais)
- **Scheduled Rides** (corridas agendadas)
- **Instant Rides** (criadas pelo motorista)
- **Bid Rides** (corridas com lances)

### Multi-tenancy
O sistema usa **database-level multi-tenancy** via `hyn/multi-tenant`:
- Cada tenant (empresa) tem seu próprio banco de dados isolado
- Identificação do tenant via hostname
- Sistema central mantém metadados dos tenants
- Suporta múltiplas empresas no mesmo servidor

### Roles do Sistema
```php
// app/Base/Constants/Auth/Role.php
- SUPER_ADMIN     // Super administrador do sistema
- ADMIN           // Administrador da empresa
- DISPATCHER      // Despachante (cria corridas para usuários)
- DRIVER          // Motorista
- OWNER           // Proprietário de frota
- USER            // Passageiro/Cliente
```

---

## Arquitetura da API

### Estrutura Base
```
Base URL: /api/v1
Authentication: Laravel Passport (OAuth2) + Sanctum
Versioning: URL-based (/v1)
Response Format: JSON via Fractal Transformers
```

### Organização de Rotas
As rotas são modularizadas em arquivos separados:

#### routes/api/v1/
- **auth.php** - Autenticação e registro
- **user.php** - Operações do usuário/passageiro
- **driver.php** - Operações do motorista
- **request.php** - Gerenciamento de corridas
- **payment.php** - Pagamentos e carteira
- **dispatcher.php** - Operações do despachante
- **common.php** - Endpoints comuns (marcas de carro, FAQ, SOS)

### Middleware Stack
```php
// Middleware aplicados nas rotas da API
'auth'           // Autenticação via Passport/Sanctum
'role'           // Verificação de roles específicas
'tenancy.db'     // Identificação de tenant
'throttle:api'   // Rate limiting
'cors'           // CORS headers
```

### Padrão de Response
```json
{
  "success": true,
  "message": "Success message",
  "data": {
    // Dados transformados via Fractal
  },
  "meta": {
    "pagination": {
      "total": 100,
      "count": 15,
      "per_page": 15,
      "current_page": 1,
      "total_pages": 7
    }
  }
}
```

---

## Sistema de Autenticação

### OAuth2 Flow (Laravel Passport)

#### 1. Login de Usuário
**Endpoint:** `POST /api/v1/user/login`

**Request:**
```json
{
  "mobile": "1234567890",
  "password": "senha123",
  "device_token": "fcm_token_here",
  "login_by": "android"
}
```

**Response:**
```json
{
  "token_type": "Bearer",
  "expires_in": 1296000,
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "def5020045b028faaca589..."
}
```

#### 2. Login de Motorista
**Endpoint:** `POST /api/v1/driver/login`

**Request:**
```json
{
  "mobile": "1234567890",
  "password": "senha123",
  "device_token": "fcm_token_here",
  "apn_token": "apn_token_ios",
  "login_by": "ios",
  "role": "driver"  // ou "owner"
}
```

#### 3. Sistema de OTP
**Enviar OTP:**
```
POST /api/v1/mobile-otp
Body: { "mobile": "1234567890" }
```

**Validar OTP:**
```
POST /api/v1/validate-otp
Body: { "mobile": "1234567890", "otp": "123456" }
```

#### 4. Registro de Usuário
**Endpoint:** `POST /api/v1/user/register`

**Request:**
```json
{
  "name": "João Silva",
  "mobile": "1234567890",
  "email": "joao@email.com",
  "password": "senha123",
  "password_confirmation": "senha123",
  "country": "BR",
  "device_token": "fcm_token"
}
```

#### 5. Social Authentication
**Endpoint:** `POST /api/v1/social-auth/{provider}`
Suporta: Google, Facebook, Apple

**Request:**
```json
{
  "access_token": "social_access_token",
  "device_token": "fcm_token"
}
```

### Autorização por Roles

**Middleware personalizado:**
```php
// Uso nas rotas
Route::middleware(role_middleware([Role::USER, Role::DISPATCHER]))

// Exemplo prático
Route::prefix('request')->middleware('auth')->group(function () {
    Route::middleware(role_middleware([Role::USER, Role::DISPATCHER]))
        ->group(function () {
            Route::post('create', 'CreateNewRequestController@createRequest');
        });
});
```

---

## Rotas da API Detalhadas

### 1. Autenticação e Registro

#### Login Endpoints
```
POST /api/v1/user/login              - Login de passageiro
POST /api/v1/driver/login            - Login de motorista
POST /api/v1/admin/login             - Login de admin
POST /api/v1/dispatcher/login        - Login de despachante
POST /api/v1/logout                  - Logout (revoga token)
```

#### Registro Endpoints
```
POST /api/v1/user/register           - Registro de passageiro
POST /api/v1/driver/register         - Registro de motorista
POST /api/v1/owner/register          - Registro de proprietário de frota
POST /api/v1/user/validate-mobile    - Valida número de telefone
```

#### OTP e Reset de Senha
```
POST /api/v1/user/register/send-otp     - Envia OTP para registro
POST /api/v1/user/register/validate-otp - Valida OTP
POST /api/v1/mobile-otp                  - Envia OTP (teste)
POST /api/v1/validate-otp                - Valida OTP (teste)
POST /api/v1/reset-password              - Reset de senha via OTP
POST /api/v1/password/forgot             - Esqueci senha (email)
POST /api/v1/password/reset              - Reset senha
```

#### Referral System
```
POST /api/v1/update/user/referral    - Atualiza código de indicação
POST /api/v1/update/driver/referral  - Atualiza código de indicação (motorista)
GET  /api/v1/get/referral            - Obtém dados de indicação
```

### 2. User/Passenger Endpoints

**Base:** `/api/v1/user` (requer autenticação)

```
GET  /api/v1/user/                           - Dados do usuário logado
POST /api/v1/user/profile                    - Atualiza perfil
POST /api/v1/user/password                   - Atualiza senha
POST /api/v1/user/update-my-lang             - Atualiza idioma
POST /api/v1/user/delete-user-account        - Deleta conta

# Locais Favoritos
GET  /api/v1/user/list-favourite-location    - Lista locais favoritos
POST /api/v1/user/add-favourite-location     - Adiciona local favorito
GET  /api/v1/user/delete-favourite-location/{id} - Remove local favorito

# Informações Bancárias
POST /api/v1/user/update-bank-info           - Atualiza dados bancários
GET  /api/v1/user/get-bank-info              - Obtém dados bancários
```

### 3. Driver Endpoints

**Base:** `/api/v1/driver` (requer autenticação + role driver/owner)

```
# Documentos
GET  /api/v1/driver/documents/needed         - Lista documentos necessários
POST /api/v1/driver/upload/documents         - Upload de documentos

# Status Online/Offline
POST /api/v1/driver/online-offline           - Toggle online/offline

# Ganhos
GET  /api/v1/driver/today-earnings           - Ganhos do dia
GET  /api/v1/driver/weekly-earnings          - Ganhos da semana
GET  /api/v1/driver/all-earnings             - Todos os ganhos
GET  /api/v1/driver/earnings-report/{from}/{to} - Relatório de ganhos

# Leaderboard
GET  /api/v1/driver/leader-board/trips       - Ranking por viagens
GET  /api/v1/driver/leader-board/earnings    - Ranking por ganhos

# Rota Preferencial
POST /api/v1/driver/add-my-route-address     - Adiciona rota preferencial
POST /api/v1/driver/enable-my-route-booking  - Habilita corridas na rota
```

### 4. Request (Corrida) Endpoints

**Base:** `/api/v1/request` (requer autenticação)

#### Criar Corridas
```
POST /api/v1/request/create                  - Cria corrida normal
POST /api/v1/request/delivery/create         - Cria entrega
POST /api/v1/request/create-instant-ride     - Corrida instantânea (driver)
POST /api/v1/request/create-delivery-instant-ride - Entrega instantânea
```

**Request Body - Criar Corrida:**
```json
{
  "pick_lat": -23.5505,
  "pick_lng": -46.6333,
  "drop_lat": -23.5629,
  "drop_lng": -46.6544,
  "pick_address": "Av. Paulista, 1000",
  "drop_address": "Rua Augusta, 500",
  "vehicle_type": "zone_type_uuid",
  "payment_opt": 0,  // 0: cash, 1: card, 2: wallet
  "is_later": 0,     // 0: agora, 1: agendado
  "trip_start_time": "2024-01-15 14:30:00",  // se agendado
  "promo_id": "promo_uuid",  // opcional
  "stops": [  // paradas intermediárias
    {
      "latitude": -23.5555,
      "longitude": -46.6400,
      "address": "Parada intermediária"
    }
  ]
}
```

#### Gestão de Corrida - Usuário
```
POST /api/v1/request/cancel                  - Cancela corrida
POST /api/v1/request/change-drop-location    - Altera destino
POST /api/v1/request/respond-for-bid         - Responde a lance (bid ride)
POST /api/v1/request/user/payment-method     - Altera forma de pagamento
POST /api/v1/request/user/payment-confirm    - Confirma pagamento
POST /api/v1/request/user/driver-tip         - Dá gorjeta ao motorista
```

#### Gestão de Corrida - Motorista
```
POST /api/v1/request/respond                 - Aceita/Rejeita corrida
POST /api/v1/request/arrived                 - Marca que chegou ao local
POST /api/v1/request/ready-to-pickup         - Pronto para embarque
POST /api/v1/request/started                 - Inicia viagem
POST /api/v1/request/stop-complete           - Completa parada intermediária
POST /api/v1/request/end                     - Finaliza corrida
POST /api/v1/request/cancel/by-driver        - Cancela corrida (motorista)
POST /api/v1/request/upload-proof            - Upload de comprovante (delivery)
POST /api/v1/request/payment-method          - Define forma de pagamento
POST /api/v1/request/payment-confirm         - Confirma pagamento recebido
POST /api/v1/request/additional-charge       - Adiciona taxa extra
```

#### Histórico e Avaliações
```
GET  /api/v1/request/history                 - Histórico de corridas
GET  /api/v1/request/history/outstation      - Histórico de viagens intermunicipais
GET  /api/v1/request/history/{id}            - Detalhes de corrida específica
POST /api/v1/request/rating                  - Avalia corrida
```

#### Chat
```
GET  /api/v1/request/chat-history/{request}  - Histórico de chat da corrida
POST /api/v1/request/send                    - Envia mensagem
POST /api/v1/request/seen                    - Marca mensagens como lidas

# Chat com Admin
GET  /api/v1/request/admin-chat-history      - Inicia chat com admin
POST /api/v1/request/send-message            - Envia mensagem para admin
POST /api/v1/request/seen-message-update     - Marca mensagens como lidas
GET  /api/v1/request/update-notification-count - Atualiza contador
```

#### Cálculos e Estimativas
```
POST /api/v1/request/eta                     - Calcula ETA e preço
POST /api/v1/request/list-packages           - Lista pacotes de aluguel
GET  /api/v1/request/get-directions          - Obtém rotas do Google Maps
GET  /api/v1/request/promocode-list          - Lista códigos promocionais
GET  /api/v1/request/outstation_rides        - Viagens intermunicipais
```

**Request Body - ETA:**
```json
{
  "pick_lat": -23.5505,
  "pick_lng": -46.6333,
  "drop_lat": -23.5629,
  "drop_lng": -46.6544,
  "vehicle_type": "zone_type_uuid",
  "transport_type": "taxi",  // taxi, delivery
  "promo_code": "PROMO10"  // opcional
}
```

**Response ETA:**
```json
{
  "success": true,
  "data": {
    "distance": 5.2,
    "time": 15,  // minutos
    "price": 25.50,
    "base_fare": 8.00,
    "distance_fare": 15.00,
    "time_fare": 2.50,
    "surge_multiplier": 1.5,  // se houver surge
    "discount": 5.00,  // se houver promo code
    "final_price": 20.50
  }
}
```

### 5. Payment Endpoints

**Base:** `/api/v1/payment` (requer autenticação)

#### Cartões
```
POST /api/v1/payment/card/add                - Adiciona cartão
GET  /api/v1/payment/card/list               - Lista cartões
POST /api/v1/payment/card/make/default       - Define cartão padrão
DELETE /api/v1/payment/card/delete/{id}      - Remove cartão
GET  /api/v1/payment/client/token            - Token do cliente (Braintree)
```

#### Carteira Digital
```
POST /api/v1/payment/wallet/add/money                  - Adiciona dinheiro
GET  /api/v1/payment/wallet/history                    - Histórico de transações
GET  /api/v1/payment/wallet/withdrawal-requests        - Lista saques pendentes
POST /api/v1/payment/wallet/request-for-withdrawal     - Solicita saque
POST /api/v1/payment/wallet/transfer-money-from-wallet - Transfere dinheiro
```

#### Gateway Específicos

**Stripe:**
```
POST /api/v1/payment/stripe/intent           - Cria Payment Intent
POST /api/v1/payment/stripe/add/money        - Adiciona dinheiro via Stripe
POST /api/v1/payment/stripe/make-payment-for-ride - Paga corrida com Stripe
```

**Braintree:**
```
GET  /api/v1/payment/braintree/client/token  - Obtém token do cliente
POST /api/v1/payment/braintree/add/money     - Adiciona dinheiro
```

**Razorpay:**
```
POST /api/v1/payment/razerpay/add-money      - Adiciona dinheiro
GET  /api/v1/razorpay                        - Interface Razorpay
GET  /api/v1/payment-success                 - Callback de sucesso
```

**Paystack:**
```
POST /api/v1/payment/paystack/initialize     - Inicializa pagamento
POST /api/v1/payment/paystack/add-money      - Adiciona dinheiro
POST /api/v1/payment/paystack/make-recurring-charge - Cobrança recorrente
ANY  /api/v1/payment/paystack/web-hook       - Webhook (sem auth)
```

**Cashfree:**
```
POST /api/v1/payment/cashfree/generate-cftoken - Gera token Cashfree
ANY  /api/v1/payment/cashfree/add-money-to-wallet-webhooks - Webhook
```

**PayMob:**
```
POST /api/v1/payment/paymob/add/money        - Adiciona dinheiro
```

**FlutterWave:**
```
POST /api/v1/payment/flutter-wave/add-money  - Adiciona dinheiro
ANY  /api/v1/payment/flutter-wave/success    - Callback de sucesso (sem auth)
```

### 6. Vehicle Type Endpoints

```
GET /api/v1/types/{lat}/{lng}                          - Tipos por localização (old)
GET /api/v1/types/by-location/{lat}/{lng}              - Tipos com preços
GET /api/v1/types/{service_location_id}                - Tipos por service location
POST /api/v1/types/report                              - Relatório de tipos
```

### 7. Common Endpoints

**Base:** `/api/v1/common`

```
# Dados de Veículos
GET /api/v1/common/car/makes                 - Lista marcas de carros
GET /api/v1/common/car/models/{make_id}      - Lista modelos por marca
GET /api/v1/common/goods-types               - Tipos de mercadorias (delivery)

# FAQ e Suporte
GET /api/v1/common/faq/list/{lat}/{lng}      - Lista FAQs por localização
GET /api/v1/common/sos/list/{lat}/{lng}      - Lista contatos SOS
POST /api/v1/common/sos/store                - Adiciona contato SOS
POST /api/v1/common/sos/delete/{id}          - Remove contato SOS

# Reclamações
GET /api/v1/common/complaint-titles          - Lista tipos de reclamação
POST /api/v1/common/make-complaint           - Registra reclamação

# Cancelamento
GET /api/v1/common/cancallation/reasons      - Motivos de cancelamento

# Módulos e Configurações
GET /api/v1/common/modules                   - Módulos habilitados
GET /api/v1/common/admin-notify              - Notificações admin
GET /api/v1/common/test-api                  - Testa API
```

### 8. Dispatcher Endpoints

**Base:** `/api/v1/dispatcher` (requer autenticação + role admin/dispatcher)

```
POST /api/v1/dispatcher/request/create       - Cria corrida para usuário
POST /api/v1/dispatcher/request/find-user-data - Busca dados do usuário
GET  /api/v1/dispatcher/request/request-detail/{id} - Detalhes da corrida
POST /api/v1/dispatcher/request/cancel-ride  - Cancela corrida
POST /api/v1/dispatcher/request/eta          - Calcula ETA
GET  /api/v1/adhoc-request/history/{id}      - Histórico para dispatcher
```

### 9. Notification Endpoints

**Base:** `/api/v1/notifications` (requer autenticação)

```
GET /api/v1/notifications/get-notification   - Lista notificações
ANY /api/v1/notifications/delete-notification/{id} - Deleta notificação
```

---

## Modelos de Dados

### 1. User Model

**Tabela:** `users`

**Campos principais:**
```php
- id (uuid)
- name, username, email, mobile
- password (bcrypt)
- country (country_id)
- profile_picture
- email_confirmed, mobile_confirmed
- active
- fcm_token, apn_token  // Push notifications
- login_by (android, ios, web)
- timezone
- rating, rating_total, no_of_ratings
- refferal_code, referred_by
- social_* (campos para social login)
- company_key (tenant)
- lang (idioma)
- is_bid_app
- gender
```

**Relacionamentos:**
```php
roles()              -> belongsToMany(Role)
driver()             -> hasOne(Driver)
admin()              -> hasOne(AdminDetail)
owner()              -> hasOne(Owner)
userWallet()         -> hasOne(UserWallet)
driverWallet()       -> hasOne(DriverWallet)
requestDetail()      -> hasMany(Request)
favouriteLocations() -> hasMany(FavouriteLocation)
bankInfo()           -> hasOne(UserBankInfo)
withdrawalRequests() -> hasMany(WalletWithdrawalRequest)
accounts()           -> hasMany(LinkedSocialAccount) // Social accounts
```

**Traits:**
```php
HasApiTokens         // Laravel Passport
Notifiable           // Notificações
CanSendOTP           // Sistema de OTP
HasActive            // Ativar/Desativar
SearchableTrait      // Busca
UserAccessTrait      // Controle de acesso
DeleteOldFiles       // Limpa arquivos antigos
```

### 2. Driver Model

**Tabela:** `drivers`

**Campos principais:**
```php
- id (uuid)
- user_id (FK -> users)
- service_location_id (FK -> service_locations)
- owner_id (FK -> owners) // Se pertence a frota
- fleet_id (FK -> fleets)
- name, mobile, email
- profile_picture
- vehicle_type_id (FK -> zone_types)
- car_make, car_model, car_number
- car_color
- active, approve
- available // Online/Offline
- uploaded_documents
- is_company_driver
- rating, rating_total, no_of_ratings
- latitude, longitude (Point) // Localização atual
- timezone
- fcm_token, apn_token
- enable_my_route_booking
- my_route_lat, my_route_lng, my_route_address
```

**Relacionamentos:**
```php
user()                  -> belongsTo(User)
serviceLocation()       -> belongsTo(ServiceLocation)
owner()                 -> belongsTo(Owner)
fleetDetail()           -> belongsTo(Fleet)
driverDetail()          -> hasOne(DriverDetail)
driverDocuments()       -> hasMany(DriverDocument)
driverVehicleTypeDetail() -> hasOne(DriverVehicleType)
requests()              -> hasMany(Request)
driverWallet()          -> hasOne(DriverWallet)
enabledRoutes()         -> hasMany(DriverEnabledRoutes)
```

### 3. Request Model

**Tabela:** `requests`

**Campos principais:**
```php
- id (uuid)
- request_number (número único da corrida)
- user_id (FK -> users)
- driver_id (FK -> drivers)
- zone_type_id (FK -> zone_types) // Tipo de veículo
- service_location_id
- owner_id, fleet_id
- is_later (0: agora, 1: agendado)
- trip_start_time
- accepted_at, arrived_at, completed_at, cancelled_at
- is_driver_started, is_driver_arrived
- is_trip_start, is_completed, is_cancelled
- reason, cancel_method, custom_reason
- total_distance, total_time
- payment_opt (0: cash, 1: card, 2: wallet)
- is_paid
- user_rated, driver_rated
- promo_id
- timezone, unit
- if_dispatch (criado por dispatcher)
- dispatcher_id
- book_for_other, book_for_other_contact
- ride_otp (OTP para início da corrida)
- is_rental (corrida de aluguel por pacote)
- rental_package_id
- is_out_station (viagem intermunicipal)
- is_surge_applied
- request_eta_amount (preço estimado)
- goods_type_id, goods_type_quantity (delivery)
- is_bid_ride (corrida com lances)
- instant_ride (criada pelo motorista)
- offerred_ride_fare, accepted_ride_fare
- is_round_trip, return_time
- discounted_total
- web_booking
- poly_line (rota codificada)
- is_pet_available, is_luggage_available
- transport_type (taxi, delivery)
- additional_charges_amount, additional_charges_reason
```

**Relacionamentos:**
```php
userDetail()            -> belongsTo(User)
driverDetail()          -> belongsTo(Driver)
ownerDetail()           -> belongsTo(Owner)
zoneType()              -> belongsTo(ZoneType)
requestPlace()          -> hasOne(RequestPlace) // Pickup/Drop
requestBill()           -> hasOne(RequestBill)  // Cobrança
requestMeta()           -> hasMany(RequestMeta) // Metadados
requestRating()         -> hasMany(RequestRating)
adHocuserDetail()       -> hasOne(AdHocUser) // Usuário ad-hoc
rentalPackage()         -> belongsTo(PackageType)
requestStops()          -> hasMany(RequestStop) // Paradas
requestCancellationFee() -> hasOne(RequestCancellationFee)
requestDeliveryProof()  -> hasMany(RequestDeliveryProof)
```

**Appends (accessors):**
```php
- vehicle_type_name
- pick_lat, pick_lng
- drop_lat, drop_lng
- pick_address, drop_address
- vehicle_type_image, vehicle_type_id
- converted_* (datas convertidas para timezone)
```

### 4. RequestBill Model

**Tabela:** `request_bills`

**Campos:**
```php
- request_id (FK -> requests)
- base_price, base_distance
- price_per_distance, distance_price
- price_per_time, time_price
- cancellation_fee
- waiting_charge
- service_tax, service_tax_percentage
- promo_discount
- admin_commision, admin_commision_type
- driver_commision, driver_commision_type
- total_amount
- surge_price
- airport_surge_fee
- toll_charge
- round_of
```

### 5. Zone Model

**Tabela:** `zones`

**Campos:**
```php
- id (uuid)
- service_location_id
- name
- unit (km, miles)
- coordinates (Polygon/MultiPolygon) // MySQL Spatial
- lat, lng (centro da zona)
- default_vehicle_type
- default_vehicle_type_for_delivery
- active
- company_key
```

**Relacionamentos:**
```php
serviceLocation() -> belongsTo(ServiceLocation)
zoneType()        -> hasMany(ZoneType) // Tipos de veículo
```

**Uso de Spatial:**
```php
// Verifica se ponto está dentro da zona
$zone->coordinates->contains(new Point($lat, $lng));

// Query por proximidade
Zone::distanceSphere('coordinates', $point, $distance)->get();
```

### 6. ZoneType Model

**Tabela:** `zone_types`

**Campos principais:**
```php
- id (uuid)
- zone_id (FK -> zones)
- type_id (FK -> vehicle_types)
- payment_type (cash, card, wallet, all)
- base_price, price_per_distance, price_per_time
- cancellation_fee
- base_distance, price_per_minute_drive
- waiting_charge_per_minute
- free_waiting_time_in_mins_before_trip
- free_waiting_time_in_mins_after_trip
- admin_commision_type, admin_commision
- driver_commision_type, driver_commision
- service_tax
- surge_pricing (ativado/desativado)
- peak_hour_start, peak_hour_end
- peak_hour_multiplier
```

### 7. Payment Models

#### UserWallet
```php
- user_id
- amount_balance
- amount_added
- amount_spent
- currency_code
```

#### DriverWallet
```php
- user_id (FK -> users, driver)
- amount_balance
- amount_added
- amount_spent
- amount_for_trip
- total_commission
- currency_code
```

#### UserWalletHistory
```php
- user_id
- card_id
- amount
- transaction_id
- transaction_desc
- request_id (se for pagamento de corrida)
- merchant (stripe, braintree, etc.)
- is_withdrawal (se for saque)
```

---

## Sistema de Pagamentos

### Payment Gateways Suportados

1. **Stripe**
   - Payment Intents
   - Salvamento de cartões
   - Pagamentos recorrentes

2. **Braintree**
   - Client Token
   - Vault (cartões salvos)
   - PayPal integration

3. **Razorpay** (Índia)
   - UPI, Cards, Net Banking
   - Webhooks

4. **Paystack** (África)
   - Cards
   - Mobile Money
   - Recurring charges

5. **Cashfree** (Índia)
   - UPI, Cards
   - Payouts

6. **FlutterWave** (África)
   - Multiple payment methods

7. **PayMob** (Egito)

8. **VNPay** (Vietnã)

9. **CCAvenue** (Índia)

10. **Mercado Pago** (América Latina)

11. **PayPal**

### Arquitetura de Pagamentos

```
app/Base/Payment/
├── BrainTreeTasks/
│   ├── AddMoneyToWallet.php
│   └── SaveCard.php
├── PaymentInterface.php
└── Payment.php (Factory)

app/Http/Controllers/Api/V1/Payment/
├── PaymentController.php (Genérico)
├── Stripe/
│   └── StripeController.php
├── Braintree/
│   └── BraintreeController.php
├── Razerpay/
│   └── RazerpayController.php
└── [outros gateways...]
```

### Fluxo de Pagamento - Adicionar Dinheiro à Carteira

1. **Cliente solicita adicionar dinheiro**
   ```
   POST /api/v1/payment/stripe/add/money
   Body: { "amount": 100, "payment_method_id": "pm_xxx" }
   ```

2. **Backend processa:**
   - Valida amount e payment method
   - Cria transação no gateway
   - Registra em `user_wallet_history`
   - Atualiza saldo em `user_wallets`
   - Envia notificação

3. **Response:**
   ```json
   {
     "success": true,
     "message": "Money added successfully",
     "data": {
       "balance": 150.00,
       "transaction_id": "txn_xxx"
     }
   }
   ```

### Fluxo de Pagamento - Corrida

#### Opção 1: Cash
- `payment_opt = 0`
- Motorista recebe dinheiro
- Sistema registra dívida do motorista com admin
- Motorista paga comissão depois

#### Opção 2: Card
- `payment_opt = 1`
- Cobrança no cartão salvo ao fim da corrida
- Sistema retém comissão do admin
- Resto vai para carteira do motorista

#### Opção 3: Wallet
- `payment_opt = 2`
- Débito automático da carteira do usuário
- Sistema retém comissão do admin
- Resto vai para carteira do motorista

---

## Sistema de Geolocalização

### Tecnologias Utilizadas

1. **MySQL Spatial Extensions**
   - Armazena polígonos de zonas
   - Queries espaciais eficientes

2. **Google Maps API**
   - Geocoding
   - Directions
   - Distance Matrix
   - Places

3. **Firebase Realtime Database**
   - Tracking em tempo real
   - Localização de motoristas

### Estrutura de Zonas

```
ServiceLocation (Cidade)
  └── Zone (Região da cidade)
       └── ZoneType (Tipo de veículo + Preços)
            └── VehicleType (Carro, Moto, etc)
```

### Exemplo de Coordenadas de Zona

```php
// Polígono definindo uma zona
$coordinates = [
    [-23.5505, -46.6333],  // Ponto 1
    [-23.5555, -46.6400],  // Ponto 2
    [-23.5600, -46.6350],  // Ponto 3
    [-23.5505, -46.6333],  // Fecha o polígono
];

// Criar zona
Zone::create([
    'name' => 'Centro',
    'coordinates' => new Polygon([new LineString($coordinates)]),
    'lat' => -23.5555,  // Centro
    'lng' => -46.6366,
]);
```

### Cálculo de ETA e Preço

**Endpoint:** `POST /api/v1/request/eta`

**Lógica:**
```php
1. Identifica zona de pickup (Spatial query)
2. Busca tipos de veículo disponíveis na zona
3. Para cada tipo:
   - Calcula distância (Google Maps Distance Matrix)
   - Calcula tempo estimado
   - Aplica tabela de preços:
     * Base fare
     * Distance fare (price_per_km * distance)
     * Time fare (price_per_minute * time)
     * Surge pricing (se houver)
     * Airport fee (se pickup/drop for aeroporto)
   - Aplica desconto de promo code (se houver)
4. Retorna array de opções com preços
```

### Surge Pricing

**Ativação:**
- Horário de pico configurado
- Demanda vs Oferta
- Eventos especiais

**Cálculo:**
```php
$base_price = 20.00;
$surge_multiplier = 1.5;  // 50% a mais
$surge_price = $base_price * $surge_multiplier;  // R$ 30.00
```

### Airport Handling

Aeroportos têm regras especiais:
- Taxa fixa de aeroporto
- Filas de motoristas
- Validação de documentos especiais
- Zonas de pickup específicas

```php
// Verifica se é aeroporto
$airport = Airport::whereRaw("ST_Distance_Sphere(
    coordinates,
    POINT(?, ?)
) < ?", [$lng, $lat, 1000])->first();  // 1km

if ($airport) {
    $bill->airport_surge_fee = $airport->airport_surge_fee;
}
```

### Tracking em Tempo Real

**Firebase Structure:**
```json
{
  "drivers": {
    "driver_uuid": {
      "lat": -23.5505,
      "lng": -46.6333,
      "bearing": 45,
      "speed": 30,
      "updated_at": 1640000000
    }
  },
  "requests": {
    "request_uuid": {
      "status": "ongoing",
      "driver_lat": -23.5505,
      "driver_lng": -46.6333,
      "user_lat": -23.5629,
      "user_lng": -46.6544
    }
  }
}
```

---

## Sistema de Notificações

### Canais de Notificação

1. **Firebase Cloud Messaging (FCM)**
   - Push notifications Android/iOS
   - Via `laravel-notification-channels/fcm`

2. **Apple Push Notification (APN)**
   - Push notifications iOS nativo

3. **SMS**
   - Múltiplos providers
   - Via `app/Base/Libraries/SMS/`

4. **Email**
   - Laravel Mail + Queues

5. **Database Notifications**
   - Notificações in-app

6. **Socket/MQTT**
   - Real-time via WebSocket

### Arquitetura de Notificações

```
app/Jobs/
├── NotifyViaMqtt.php
├── NotifyViaSocket.php
├── NoDriverFoundNotifyJob.php
├── SendRequestToNextDriversJob.php
└── UserDriverNotificationSaveJob.php

app/Notifications/
├── IosPushNotification.php
└── Recipients/
    ├── UserNotification.php
    └── DriverNotification.php
```

### Tipos de Notificações

#### 1. Request Notifications (Corrida)
```php
# Para Motorista
- 'ride_request' : Nova corrida disponível
- 'trip_accepted_by_driver' : Corrida aceita
- 'arrived_at_pickup' : Motorista chegou
- 'trip_started' : Viagem iniciada
- 'trip_completed' : Viagem finalizada
- 'trip_cancelled_by_user' : Cancelada pelo usuário

# Para Usuário
- 'driver_assigned' : Motorista atribuído
- 'driver_accepted' : Motorista aceitou
- 'driver_arrived' : Motorista chegou
- 'trip_started' : Viagem iniciada
- 'trip_completed' : Viagem finalizada
- 'trip_cancelled_by_driver' : Cancelada pelo motorista
- 'no_driver_found' : Nenhum motorista disponível
```

#### 2. Payment Notifications
```php
- 'payment_received' : Pagamento recebido
- 'money_added_to_wallet' : Dinheiro adicionado
- 'withdrawal_approved' : Saque aprovado
- 'withdrawal_rejected' : Saque rejeitado
```

#### 3. Document Notifications
```php
- 'document_approved' : Documento aprovado
- 'document_rejected' : Documento rejeitado
- 'document_expiring_soon' : Documento vencendo
```

### Envio de Notificações

**Via Job (Recomendado):**
```php
use App\Jobs\Notifications\SendPushNotification;

dispatch(new SendPushNotification(
    $user->fcm_token,
    'Nova Corrida',
    'Você tem uma nova solicitação de corrida',
    [
        'type' => 'ride_request',
        'request_id' => $request->id,
        'data' => [...]
    ]
));
```

**Direto (Síncrono):**
```php
$user->notify(new DriverNotification($title, $body, $data));
```

### SMS Providers

```
app/Base/Libraries/SMS/Providers/
├── Twilio.php
├── TextLocal.php
├── Nexmo.php
├── FastToSms.php
└── Msg91.php
```

**Configuração:** `config/sms.php`

**Uso:**
```php
use App\Base\Libraries\SMS\Providers\Twilio;

$sms = new Twilio();
$sms->send($mobile, $message);
```

### Templates de SMS

```
app/Base/SMSTemplate/
├── OTP.php
├── TripStarted.php
├── TripCompleted.php
└── PaymentReceived.php
```

---

## Jobs e Processamento em Background

### Laravel Queue Configuration

**Driver:** Redis (recomendado) ou Database

**Queues:**
```php
- default    // Jobs gerais
- high       // Alta prioridade
- low        // Baixa prioridade
- emails     // Envio de emails
- push       // Push notifications
```

### Principais Jobs

#### 1. Driver Assignment Jobs

**AssignDriversForRegularRides.php**
```php
// app/Console/Commands/AssignDriversForRegularRides.php
// Executado a cada minuto via cron

Função: Atribui motoristas às corridas imediatas
Lógica:
1. Busca corridas pendentes (is_later = 0)
2. Busca motoristas disponíveis próximos
3. Ordena por proximidade
4. Envia notificação para motorista mais próximo
5. Se não aceitar em X segundos, envia para próximo
```

**AssignDriversForScheduledRides.php**
```php
// Executado a cada 5 minutos via cron

Função: Atribui motoristas às corridas agendadas
Lógica:
1. Busca corridas agendadas próximas (15 min antes)
2. Busca motoristas disponíveis
3. Envia notificação
4. Marca corrida como "em processo de atribuição"
```

#### 2. SendRequestToNextDriversJob

```php
// app/Jobs/SendRequestToNextDriversJob.php

Função: Envia corrida para próximo motorista se atual não aceitar
Parâmetros:
- $request (Request)
- $attempt (int) // Número da tentativa

Lógica:
1. Verifica se corrida ainda está pendente
2. Busca próximo motorista mais próximo (exclui rejeitados)
3. Envia notificação push
4. Agenda novo job para daqui a X segundos (se não aceitar)
5. Após Y tentativas, marca como "no driver found"
```

#### 3. NoDriverFoundNotifyJob

```php
// app/Jobs/NoDriverFoundNotifyJob.php

Função: Notifica usuário quando nenhum motorista foi encontrado
Lógica:
1. Envia push notification
2. Envia SMS
3. Marca corrida como cancelled
4. Processa reembolso se necessário
```

#### 4. Notification Jobs

**UserDriverNotificationSaveJob**
```php
Função: Salva notificação no banco e envia push
Lógica:
1. Salva em 'notifications' table
2. Envia FCM push notification
3. Envia APN (se iOS)
4. Incrementa badge count
```

**NotifyViaMqtt / NotifyViaSocket**
```php
Função: Envia notificações em tempo real
Lógica:
1. Conecta ao servidor MQTT/Socket
2. Publica mensagem no tópico do usuário
3. Frontend recebe via WebSocket
```

### Comandos Artisan Agendados

**app/Console/Kernel.php:**
```php
protected function schedule(Schedule $schedule)
{
    // Atribui motoristas a corridas regulares
    $schedule->command('assign:drivers-for-regular')
             ->everyMinute()
             ->withoutOverlapping();

    // Atribui motoristas a corridas agendadas
    $schedule->command('assign:drivers-for-scheduled')
             ->everyFiveMinutes()
             ->withoutOverlapping();

    // Cancela corridas antigas pendentes
    $schedule->command('cancel:requests')
             ->hourly();

    // Limpa OTPs expirados
    $schedule->command('clear:otp')
             ->daily();

    // Marca motoristas offline se sem atividade
    $schedule->command('offline:unavailable-drivers')
             ->everyThirtyMinutes();

    // Notifica motoristas sobre documentos expirando
    $schedule->command('notify:driver-document-expiry')
             ->weekly();
}
```

### Outros Comandos Importantes

**CancelRequests.php**
```php
php artisan cancel:requests

Função: Cancela corridas pendentes há muito tempo
Lógica:
1. Busca corridas criadas há > 30 minutos ainda pendentes
2. Marca como canceladas
3. Processa reembolso se já pago
4. Notifica usuário
```

**OfflineUnAvailableDrivers.php**
```php
php artisan offline:unavailable-drivers

Função: Marca motoristas como offline se sem atualização de localização
Lógica:
1. Busca motoristas marcados como available
2. Verifica última atualização de localização
3. Se > 15 minutos, marca como unavailable
```

**NotifyDriverDocumentExpiry.php**
```php
php artisan notify:driver-document-expiry

Função: Notifica motoristas sobre documentos expirando
Lógica:
1. Busca documentos expirando em 7 dias
2. Envia notificação push + SMS
3. Envia email com lista de documentos
```

---

## Transformers e Serialização

### Laravel Fractal

A API usa **Fractal** para transformação e serialização de dados.

**Configuração:** `config/laravel-fractal.php`

**Serializer:** `app/Base/Serializers/CustomSerializer.php`

### Estrutura dos Transformers

```
app/Transformers/
├── Transformer.php (Base)
├── User/
│   ├── UserTransformer.php
│   └── UserProfileTransformer.php
├── Driver/
│   ├── DriverTransformer.php
│   └── DriverDetailTransformer.php
├── Requests/
│   ├── RequestTransformer.php
│   ├── TripRequestTransformer.php
│   └── RequestBillTransformer.php
├── Payment/
│   ├── WalletTransformer.php
│   └── CardTransformer.php
└── Common/
    ├── VehicleTypeTransformer.php
    └── CancellationReasonTransformer.php
```

### Exemplo de Transformer

**UserTransformer.php:**
```php
namespace App\Transformers\User;

use App\Transformers\Transformer;
use App\Models\User;

class UserTransformer extends Transformer
{
    protected $availableIncludes = [
        'profile',
        'wallet',
        'roles'
    ];

    public function transform(User $user)
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'mobile' => $user->mobile,
            'profile_picture' => $user->profile_picture,
            'rating' => (float) $user->rating,
            'currency_code' => $user->countryDetail->currency_code ?? 'BRL',
            'created_at' => $user->created_at->toDateTimeString(),
        ];
    }

    public function includeProfile(User $user)
    {
        if ($user->userDetails) {
            return $this->item($user->userDetails, new UserProfileTransformer);
        }
    }

    public function includeWallet(User $user)
    {
        if ($user->userWallet) {
            return $this->item($user->userWallet, new WalletTransformer);
        }
    }
}
```

### Uso nos Controllers

```php
namespace App\Http\Controllers\Api\V1\User;

use App\Transformers\User\UserTransformer;

class AccountController extends Controller
{
    public function me()
    {
        $user = auth()->user();

        return fractal()
            ->item($user)
            ->transformWith(new UserTransformer)
            ->includeProfile()
            ->includeWallet()
            ->respond();
    }
}
```

### Response Padrão

```json
{
  "data": {
    "id": "uuid-here",
    "name": "João Silva",
    "email": "joao@email.com",
    "mobile": "11999999999",
    "profile_picture": "https://...",
    "rating": 4.8,
    "currency_code": "BRL",
    "created_at": "2024-01-15 10:30:00",
    "profile": {
      "data": {
        "address": "Rua XYZ, 123",
        "city": "São Paulo"
      }
    },
    "wallet": {
      "data": {
        "balance": 150.50,
        "currency": "BRL"
      }
    }
  }
}
```

---

## Serviços Customizados

### 1. OTP Service

**Localização:** `app/Base/Services/OTP/`

**Componentes:**
- `OTPGeneratorContract` - Interface
- `OTPGenerator` - Gerador de códigos
- `OTPHandlerContract` - Interface de manipulação
- `DatabaseOTPHandler` - Manipulador usando DB
- `CanSendOTP` - Trait para modelos

**Uso:**
```php
use App\Base\Services\OTP\Generator\OTPGenerator;

$otp = OTPGenerator::generate(); // Gera código de 6 dígitos

// Salva no banco
$user->generateOTP();

// Valida
$user->verifyOTP($otp);
```

### 2. Image Service

**Localização:** `app/Base/Services/ImageUploader/`

**Funções:**
- Upload de imagens
- Resize automático
- Encoding para JPG
- Armazenamento em S3/Local

**Uso:**
```php
use App\Base\Services\ImageUploader\ImageUploader;

$uploader = new ImageUploader();
$path = $uploader->upload($file, 'users/profiles');
```

### 3. PDF Service

**Localização:** `app/Base/Services/PDF/`

**Uso:**
```php
use App\Base\Services\PDF\Generator\PDFGenerator;

$pdf = new PDFGenerator();
$pdf->generate('invoices.invoice', $data, 'invoice.pdf');
```

### 4. Hash Service

**Localização:** `app/Base/Services/Hash/`

**Função:** Gera hashes únicos para entidades

**Uso:**
```php
$hash = app(HashGeneratorContract::class)->generate();
```

### 5. Setting Service

**Localização:** `app/Base/Services/Setting/`

**Função:** Gerencia configurações da aplicação por tenant

**Uso:**
```php
$settings = settings()->get('app_name');
settings()->set('app_name', 'My Taxi App');
```

---

## Fluxos Principais da Aplicação

### Fluxo 1: Criação de Corrida

```
1. User abre app
   └─> GET /api/v1/user/ (obtém dados do usuário)

2. User seleciona pickup e drop
   └─> POST /api/v1/request/eta
       Request: { pick_lat, pick_lng, drop_lat, drop_lng }
       Response: { distance, time, price, vehicle_types[] }

3. User seleciona tipo de veículo e confirma
   └─> POST /api/v1/request/create
       Request: {
         pick_lat, pick_lng, drop_lat, drop_lng,
         pick_address, drop_address,
         vehicle_type, payment_opt
       }
       Response: {
         request_id, request_number, status: "pending",
         searching_message: "Procurando motorista..."
       }

4. Backend: Job AssignDriversForRegularRides executa
   └─> Busca motoristas disponíveis próximos
   └─> Ordena por proximidade
   └─> Envia push notification para 1º motorista
       {
         type: "ride_request",
         request_id: "xxx",
         pick_address: "...",
         drop_address: "...",
         distance: "5.2 km",
         price: "R$ 25.50"
       }

5. Driver recebe notificação
   Opção A: Aceita
     └─> POST /api/v1/request/respond
         Request: { request_id, status: "accepted" }
         Response: { success: true, request_details }
     └─> Backend: Notifica User "Motorista encontrado"
     └─> User recebe dados do motorista

   Opção B: Rejeita ou ignora (timeout 30s)
     └─> Backend: Job SendRequestToNextDriversJob
     └─> Envia para próximo motorista
     └─> Repete até encontrar ou atingir limite

6. Driver aceita e vai até pickup
   └─> Driver app atualiza localização em Firebase
   └─> User app mostra motorista se aproximando
   └─> Quando próximo: POST /api/v1/request/arrived
   └─> User recebe notificação "Motorista chegou"

7. User entra no carro
   └─> Driver: POST /api/v1/request/started
       Request: { request_id, ride_otp }
   └─> Backend: Valida OTP, inicia trip
   └─> User recebe "Viagem iniciada"

8. Durante viagem
   └─> Driver atualiza localização constantemente
   └─> User vê rota no mapa
   └─> Se houver paradas:
       POST /api/v1/request/stop-complete

9. Chegada ao destino
   └─> Driver: POST /api/v1/request/end
       Request: { request_id, latitude, longitude }
   └─> Backend:
       - Calcula valores finais
       - Cria RequestBill
       - Processa pagamento
         * Se wallet: debita automaticamente
         * Se card: cobra no cartão
         * Se cash: registra dívida do driver
       - Notifica ambos "Viagem finalizada"
   └─> Response: {
         request_details,
         bill: {
           base_fare, distance_fare, time_fare,
           total_amount, payment_method
         }
       }

10. Avaliação
    └─> User: POST /api/v1/request/rating
        Request: {
          request_id, rating: 5, comment: "Ótimo!"
        }
    └─> Driver: POST /api/v1/request/rating
        Request: {
          request_id, rating: 5, comment: "Passageiro educado"
        }
```

### Fluxo 2: Motorista fica Online

```
1. Driver abre app
   └─> GET /api/v1/user/ (obtém dados + perfil driver)

2. Driver toca "Ficar Online"
   └─> POST /api/v1/driver/online-offline
       Request: { availability: 1 }
   └─> Backend:
       - Atualiza drivers.available = 1
       - Ativa listener para novas corridas
   └─> Response: { success: true, status: "online" }

3. Driver app inicia tracking de localização
   └─> A cada 10 segundos:
       - Obtém lat/lng do GPS
       - Atualiza Firebase Realtime Database
         firebase.database().ref('drivers/' + driver_id).set({
           lat: -23.5505,
           lng: -46.6333,
           bearing: 45,
           updated_at: timestamp
         })

4. Driver aguarda corridas
   └─> Firebase listener detecta nova corrida
   └─> Mostra notificação + alert sonoro
   └─> Driver tem 30s para aceitar/rejeitar
```

### Fluxo 3: Pagamento com Carteira

```
1. User decide adicionar dinheiro
   └─> GET /api/v1/payment/stripe/intent
       Request: { amount: 100 }
       Response: {
         client_secret: "pi_xxx_secret_yyy",
         payment_intent_id: "pi_xxx"
       }

2. Frontend (Stripe.js):
   stripe.confirmCardPayment(client_secret, {
     payment_method: {
       card: cardElement,
       billing_details: { ... }
     }
   }).then(result => {
     if (result.error) {
       // Mostra erro
     } else {
       // Pagamento bem-sucedido
       // Chama backend para confirmar
     }
   });

3. Backend recebe confirmação
   └─> POST /api/v1/payment/stripe/add/money
       Request: {
         payment_intent_id: "pi_xxx",
         amount: 100
       }
   └─> Backend:
       - Valida payment intent no Stripe
       - Cria registro em user_wallet_history
       - Atualiza user_wallets.amount_balance += 100
       - Envia notificação "R$ 100 adicionados"
   └─> Response: {
         success: true,
         new_balance: 250.00,
         transaction_id: "txn_xxx"
       }

4. User usa carteira em corrida
   └─> Ao criar corrida: payment_opt = 2 (wallet)
   └─> Ao finalizar:
       - Backend verifica saldo >= valor da corrida
       - Debita: user_wallets.amount_balance -= total
       - Credita motorista: driver_wallets.amount_balance += (total - comissão)
       - Cria histórico de transação
```

### Fluxo 4: Dispatcher cria corrida para cliente

```
1. Dispatcher busca cliente
   └─> POST /api/v1/dispatcher/request/find-user-data
       Request: { mobile: "11999999999" }
       Response: {
         user_id: "uuid",
         name: "João",
         mobile: "11999999999"
       }

2. Dispatcher obtém ETA
   └─> POST /api/v1/dispatcher/request/eta
       Request: { pick_lat, pick_lng, drop_lat, drop_lng }
       Response: { price, time, distance, vehicle_types[] }

3. Dispatcher cria corrida
   └─> POST /api/v1/dispatcher/request/create
       Request: {
         user_id: "uuid",
         pick_lat, pick_lng, drop_lat, drop_lng,
         vehicle_type, payment_opt,
         book_for_other: 1,  // Se for para outra pessoa
         book_for_other_contact: "11888888888"
       }
   └─> Backend:
       - Cria Request com if_dispatch = 1
       - Inicia busca por motorista
       - Notifica usuário (ou contato alternativo)

4. Fluxo segue igual ao normal
```

---

## Considerações de Segurança

### 1. Autenticação
- OAuth2 via Laravel Passport
- Tokens expiram em 15 dias (configurável)
- Refresh tokens para renovação
- Revogação de tokens no logout

### 2. Autorização
- Middleware de roles em todas as rotas sensíveis
- Verificação de ownership (usuário só acessa seus dados)
- Scopes do Passport para permissões granulares

### 3. Multi-tenancy
- Isolamento completo de dados por tenant
- Não há cross-tenant data leakage
- Cada tenant tem suas próprias chaves de API

### 4. Pagamentos
- PCI-DSS compliance via gateways certificados
- Não armazena dados de cartão completos
- Usa tokens dos gateways
- Webhooks validados por assinaturas

### 5. Dados Sensíveis
- Senhas com bcrypt
- OTPs expiram em 10 minutos
- Logs não contêm dados sensíveis
- API keys em .env (nunca commitadas)

### 6. Rate Limiting
- Throttle middleware em rotas críticas
- Limites por IP e por usuário
- Proteção contra brute force

---

## Performance e Escalabilidade

### 1. Database
- Índices em colunas frequentemente consultadas
- Spatial indexes para queries geográficas
- Eager loading para evitar N+1 queries

### 2. Caching
- Redis para sessions e cache
- Cache de configurações
- Cache de tipos de veículo por zona

### 3. Queues
- Todos processos pesados em background
- Redis como queue driver
- Multiple workers para high throughput

### 4. CDN
- Assets estáticos servidos via CDN
- Imagens de perfil via S3 + CloudFront

### 5. Horizontal Scaling
- Stateless API permite múltiplas instâncias
- Load balancer distribui requisições
- Database replication (master-slave)

---

## Próximos Passos para Implementação

### 1. Setup Inicial
```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan passport:install
php artisan migrate
php artisan db:seed
```

### 2. Configurar Gateways
- Adicionar chaves no .env
- Testar webhooks
- Configurar modo sandbox/produção

### 3. Configurar Firebase
- Criar projeto no Firebase Console
- Baixar credenciais (JSON)
- Configurar FCM para push
- Setup Realtime Database

### 4. Configurar Maps
- Obter Google Maps API key
- Ativar APIs necessárias:
  - Maps JavaScript API
  - Directions API
  - Distance Matrix API
  - Places API
  - Geocoding API

### 5. Configurar Workers
```bash
php artisan queue:work --queue=high,default,low
php artisan horizon  # Se usar Horizon
```

### 6. Configurar Cron
```bash
* * * * * cd /path-to-your-project && php artisan schedule:run >> /dev/null 2>&1
```

---

## Conclusão

Esta documentação cobre os aspectos principais da API do sistema de ride-hailing. Para implementações específicas ou dúvidas, consulte o código-fonte nos controllers e models mencionados.

**Arquivos importantes para referência:**
- [routes/api/v1/](routes/api/v1/) - Todas as rotas
- [app/Http/Controllers/Api/V1/](app/Http/Controllers/Api/V1/) - Controllers
- [app/Models/](app/Models/) - Modelos de dados
- [app/Transformers/](app/Transformers/) - Transformers
- [app/Base/](app/Base/) - Serviços customizados
- [config/](config/) - Configurações

**Documentação adicional:**
- Laravel: https://laravel.com/docs/8.x
- Passport: https://laravel.com/docs/8.x/passport
- Fractal: https://fractal.thephpleague.com/

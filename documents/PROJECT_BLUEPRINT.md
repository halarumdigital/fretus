# Project Blueprint - Ride Hailing Application

> **IMPORTANTE:** Este arquivo contém TODAS as informações necessárias para recriar este projeto em qualquer tecnologia, sem precisar ler o código PHP original.

## 📋 Índice
1. [Visão Geral Executiva](#visão-geral-executiva)
2. [Entidades e Modelos de Dados](#entidades-e-modelos-de-dados)
3. [Endpoints da API Completos](#endpoints-da-api-completos)
4. [Lógica de Negócio Detalhada](#lógica-de-negócio-detalhada)
5. [Fluxos de Sistema](#fluxos-de-sistema)
6. [Integrações Externas](#integrações-externas)
7. [Stack Técnica Recomendada](#stack-técnica-recomendada)

---

## Visão Geral Executiva

### O Que É
Sistema completo de ride-hailing (estilo Uber/99) multi-tenant com:
- Múltiplos tipos de serviço (taxi, delivery, rental, outstation)
- Multi-tenancy (cada empresa tem dados isolados)
- 5 tipos de usuários (Super Admin, Admin, Dispatcher, Driver, User)
- 11 payment gateways integrados
- Geolocalização avançada com zonas e preços dinâmicos
- Real-time tracking
- Sistema completo de corridas (criar, aceitar, iniciar, finalizar)

### Casos de Uso Principais
1. **Usuário solicita corrida** → Sistema busca motorista → Corrida executada → Pagamento
2. **Dispatcher cria corrida para cliente** → Atribui motorista → Acompanha
3. **Motorista fica online** → Recebe solicitações → Aceita/Rejeita → Executa corridas
4. **Admin gerencia** → Zonas, preços, motoristas, relatórios

---

## Entidades e Modelos de Dados

### 1. User (Usuário/Passageiro)
```typescript
interface User {
  id: string;                    // UUID
  name: string;
  email: string;
  mobile: string;
  password: string;              // Hashed
  country_id: string;            // FK -> countries
  profile_picture?: string;      // URL
  active: boolean;
  email_confirmed: boolean;
  mobile_confirmed: boolean;

  // Push Notifications
  fcm_token?: string;            // Firebase Cloud Messaging
  apn_token?: string;            // Apple Push Notification
  login_by: 'android' | 'ios' | 'web';

  // Ratings
  rating: number;                // Average (0-5)
  rating_total: number;          // Sum of all ratings
  no_of_ratings: number;         // Count

  // Referral System
  refferal_code: string;         // Unique code
  referred_by?: string;          // User ID who referred

  // Social Login
  social_provider?: 'google' | 'facebook' | 'apple';
  social_id?: string;
  social_token?: string;

  // Multi-tenancy
  company_key: string;           // Tenant identifier

  // Preferences
  timezone: string;
  lang: string;                  // Language code
  gender?: 'male' | 'female' | 'other';

  // Soft Delete
  is_deleted_at?: Date;

  created_at: Date;
  updated_at: Date;
}

// Relationships
User hasOne Driver
User hasOne Admin
User hasOne Owner
User hasOne UserWallet
User hasOne DriverWallet
User hasMany Request
User hasMany FavouriteLocation
User hasOne UserBankInfo
User hasMany WalletWithdrawalRequest
User hasMany LinkedSocialAccount
User belongsToMany Role
```

### 2. Driver (Motorista)
```typescript
interface Driver {
  id: string;                    // UUID
  user_id: string;               // FK -> users
  service_location_id: string;   // FK -> service_locations (cidade)
  owner_id?: string;             // FK -> owners (se pertence a frota)
  fleet_id?: string;             // FK -> fleets

  // Personal Info
  name: string;
  mobile: string;
  email: string;
  profile_picture?: string;

  // Vehicle Info
  vehicle_type_id: string;       // FK -> zone_types (tipo de veículo)
  car_make: string;              // Marca
  car_model: string;             // Modelo
  car_number: string;            // Placa
  car_color: string;

  // Status
  active: boolean;               // Admin pode ativar/desativar
  approve: boolean;              // Admin aprovou documentos
  available: boolean;            // Online/Offline (driver controla)

  // Documents
  uploaded_documents: boolean;   // Enviou documentos

  // Type
  is_company_driver: boolean;    // Pertence a empresa/frota

  // Ratings
  rating: number;
  rating_total: number;
  no_of_ratings: number;

  // Location (MySQL Point ou lat/lng separados)
  latitude: number;
  longitude: number;
  // OU
  location: Point;               // PostGIS: POINT(lng lat)

  // Push Notifications
  fcm_token?: string;
  apn_token?: string;
  timezone: string;

  // Route-based Booking (motorista define rota preferencial)
  enable_my_route_booking: boolean;
  my_route_lat?: number;
  my_route_lng?: number;
  my_route_address?: string;

  created_at: Date;
  updated_at: Date;
}

// Relationships
Driver belongsTo User
Driver belongsTo ServiceLocation
Driver belongsTo Owner
Driver belongsTo Fleet
Driver hasOne DriverDetail
Driver hasMany DriverDocument
Driver hasOne DriverVehicleType
Driver hasMany Request
Driver hasOne DriverWallet
Driver hasMany DriverEnabledRoutes
```

### 3. Request (Corrida/Viagem)
```typescript
interface Request {
  id: string;                    // UUID
  request_number: string;        // Número único (ex: REQ-001234)

  // Participants
  user_id: string;               // FK -> users
  driver_id?: string;            // FK -> drivers (null até ser aceito)

  // Type
  zone_type_id: string;          // FK -> zone_types (tipo de veículo)
  service_location_id: string;   // FK -> service_locations
  owner_id?: string;             // FK -> owners
  fleet_id?: string;             // FK -> fleets

  // Timing
  is_later: boolean;             // false: agora, true: agendado
  trip_start_time?: Date;        // Quando a viagem deve começar
  accepted_at?: Date;            // Quando motorista aceitou
  arrived_at?: Date;             // Quando motorista chegou ao pickup
  trip_started_at?: Date;        // Quando viagem começou (usuário embarcou)
  completed_at?: Date;           // Quando viagem terminou
  cancelled_at?: Date;           // Quando foi cancelada

  // Status Flags
  is_driver_started: boolean;    // Driver aceitou
  is_driver_arrived: boolean;    // Driver chegou ao pickup
  is_trip_start: boolean;        // Viagem iniciou
  is_completed: boolean;         // Viagem completa
  is_cancelled: boolean;         // Cancelada

  // Cancellation
  reason?: string;               // FK -> cancellation_reasons
  cancel_method?: 'user' | 'driver' | 'admin' | 'auto';
  custom_reason?: string;        // Texto livre

  // Trip Details
  total_distance: number;        // Em km ou miles
  total_time: number;            // Em minutos

  // Payment
  payment_opt: 0 | 1 | 2;        // 0: cash, 1: card, 2: wallet
  is_paid: boolean;

  // Ratings
  user_rated: boolean;           // User avaliou?
  driver_rated: boolean;         // Driver avaliou?

  // Promo
  promo_id?: string;             // FK -> promos

  // Config
  timezone: string;
  unit: 'km' | 'miles';
  requested_currency_code: string;
  requested_currency_symbol: string;

  // Dispatcher
  if_dispatch: boolean;          // Criado por dispatcher?
  dispatcher_id?: string;        // FK -> users
  book_for_other: boolean;       // Corrida para outra pessoa?
  book_for_other_contact?: string;

  // Security
  ride_otp: string;              // OTP para início da viagem

  // Special Types
  is_rental: boolean;            // Aluguel por pacote
  rental_package_id?: string;    // FK -> package_types

  is_out_station: boolean;       // Viagem intermunicipal

  is_surge_applied: boolean;     // Surge pricing ativo
  request_eta_amount: number;    // Preço estimado

  // Delivery
  goods_type_id?: string;        // FK -> goods_types
  goods_type_quantity?: number;
  transport_type: 'taxi' | 'delivery';

  // Bid System
  is_bid_ride: boolean;          // Motoristas dão lances
  offerred_ride_fare?: number;   // Preço oferecido pelo user
  accepted_ride_fare?: number;   // Preço aceito

  // Instant Ride
  instant_ride: boolean;         // Criada pelo motorista

  // Round Trip
  is_round_trip: boolean;
  return_time?: Date;

  // Discounts
  discounted_total: number;

  // Source
  web_booking: boolean;
  on_search: boolean;

  // Route
  poly_line?: string;            // Encoded polyline (Google Maps)

  // Extras
  is_pet_available: boolean;
  is_luggage_available: boolean;

  // Additional Charges
  additional_charges_amount?: number;
  additional_charges_reason?: string;

  // Retry Counter
  attempt_for_schedule: number;  // Tentativas de atribuir driver

  created_at: Date;
  updated_at: Date;
}

// Relationships
Request belongsTo User (userDetail)
Request belongsTo Driver (driverDetail)
Request belongsTo Owner (ownerDetail)
Request belongsTo ZoneType
Request hasOne RequestPlace (pickup/drop locations)
Request hasOne RequestBill (cobrança detalhada)
Request hasMany RequestMeta (metadados)
Request hasMany RequestRating
Request hasOne AdHocUser (usuário ad-hoc)
Request belongsTo PackageType (rentalPackage)
Request hasMany RequestStop (paradas intermediárias)
Request hasOne RequestCancellationFee
Request hasMany RequestDeliveryProof
```

### 4. RequestPlace (Localização da Corrida)
```typescript
interface RequestPlace {
  id: string;
  request_id: string;            // FK -> requests

  // Pickup
  pick_lat: number;
  pick_lng: number;
  pick_address: string;

  // Drop
  drop_lat: number;
  drop_lng: number;
  drop_address: string;

  created_at: Date;
  updated_at: Date;
}
```

### 5. RequestBill (Cobrança da Corrida)
```typescript
interface RequestBill {
  id: string;
  request_id: string;            // FK -> requests

  // Base Pricing
  base_price: number;            // Tarifa base
  base_distance: number;         // Distância incluída na base

  // Distance Pricing
  price_per_distance: number;    // Preço por km/mile
  distance_price: number;        // Total cobrado por distância extra

  // Time Pricing
  price_per_time: number;        // Preço por minuto
  time_price: number;            // Total cobrado por tempo

  // Fees
  cancellation_fee: number;
  waiting_charge: number;

  // Taxes
  service_tax: number;
  service_tax_percentage: number;

  // Discounts
  promo_discount: number;

  // Commissions
  admin_commision: number;
  admin_commision_type: 'percentage' | 'fixed';
  driver_commision: number;
  driver_commision_type: 'percentage' | 'fixed';

  // Surge & Airport
  surge_price: number;
  airport_surge_fee: number;

  // Extras
  toll_charge: number;
  round_of: number;              // Arredondamento

  // Total
  total_amount: number;

  created_at: Date;
  updated_at: Date;
}
```

### 6. Zone (Zona Geográfica)
```typescript
interface Zone {
  id: string;
  service_location_id: string;   // FK -> service_locations (cidade)
  name: string;                  // Ex: "Centro", "Zona Sul"
  unit: 'km' | 'miles';

  // Geospatial (MySQL Spatial ou PostGIS)
  coordinates: Polygon;          // Polígono definindo a zona
  // OU para simplificar:
  // coordinates: string;        // GeoJSON string

  // Center point (para queries de proximidade)
  lat: number;
  lng: number;

  // Defaults
  default_vehicle_type: string;  // FK -> vehicle_types
  default_vehicle_type_for_delivery: string;

  active: boolean;
  company_key: string;           // Multi-tenancy

  created_at: Date;
  updated_at: Date;
}
```

### 7. ZoneType (Tipo de Veículo em uma Zona com Preços)
```typescript
interface ZoneType {
  id: string;
  zone_id: string;               // FK -> zones
  type_id: string;               // FK -> vehicle_types

  // Payment Methods
  payment_type: 'cash' | 'card' | 'wallet' | 'all';

  // Pricing
  base_price: number;
  price_per_distance: number;    // Por km/mile
  price_per_time: number;        // Por minuto
  base_distance: number;         // km/miles incluídos no base_price
  price_per_minute_drive: number;

  // Waiting Charges
  waiting_charge_per_minute: number;
  free_waiting_time_in_mins_before_trip: number;
  free_waiting_time_in_mins_after_trip: number;

  // Cancellation
  cancellation_fee: number;

  // Commissions
  admin_commision_type: 'percentage' | 'fixed';
  admin_commision: number;
  driver_commision_type: 'percentage' | 'fixed';
  driver_commision: number;

  // Service Tax
  service_tax: number;           // Percentage

  // Surge Pricing
  surge_pricing: boolean;        // Ativo?
  peak_hour_start?: string;      // HH:mm
  peak_hour_end?: string;        // HH:mm
  peak_hour_multiplier?: number; // Ex: 1.5 (50% a mais)

  active: boolean;

  created_at: Date;
  updated_at: Date;
}
```

### 8. UserWallet / DriverWallet
```typescript
interface UserWallet {
  id: string;
  user_id: string;               // FK -> users

  amount_balance: number;        // Saldo atual
  amount_added: number;          // Total adicionado historicamente
  amount_spent: number;          // Total gasto historicamente

  currency_code: string;

  created_at: Date;
  updated_at: Date;
}

interface DriverWallet {
  id: string;
  user_id: string;               // FK -> users (driver)

  amount_balance: number;
  amount_added: number;
  amount_spent: number;
  amount_for_trip: number;       // Total ganho com viagens
  total_commission: number;      // Total pago em comissão

  currency_code: string;

  created_at: Date;
  updated_at: Date;
}
```

### 9. WalletHistory
```typescript
interface UserWalletHistory {
  id: string;
  user_id: string;               // FK -> users
  card_id?: string;              // FK -> cards (se pagamento com cartão)

  amount: number;                // Positivo: crédito, Negativo: débito
  transaction_id: string;        // ID do gateway de pagamento
  transaction_desc: string;      // Descrição

  request_id?: string;           // FK -> requests (se for pagamento de corrida)

  merchant: string;              // 'stripe', 'razorpay', etc

  is_withdrawal: boolean;        // Se é saque

  created_at: Date;
  updated_at: Date;
}
```

### 10. Outras Entidades Importantes

```typescript
interface ServiceLocation {
  id: string;
  name: string;                  // Nome da cidade
  currency_code: string;
  currency_symbol: string;
  timezone: string;
  company_key: string;
  active: boolean;
}

interface VehicleType {
  id: string;
  name: string;                  // "Carro", "Moto", "Van"
  icon: string;                  // URL do ícone
  capacity: number;              // Número de passageiros
  active: boolean;
}

interface PromoCode {
  id: string;
  code: string;                  // "PROMO10"
  from: Date;
  to: Date;
  max_uses: number;
  uses: number;
  discount_type: 'percentage' | 'fixed';
  discount: number;
  min_trip_amount: number;
  max_discount_amount: number;
  active: boolean;
}

interface CancellationReason {
  id: string;
  reason: string;
  user_type: 'user' | 'driver';
  active: boolean;
}

interface FavouriteLocation {
  id: string;
  user_id: string;
  address: string;
  lat: number;
  lng: number;
  created_at: Date;
}

interface RequestRating {
  id: string;
  request_id: string;
  user_id: string;               // Quem avaliou (user ou driver)
  driver_id: string;             // Quem foi avaliado
  rating: number;                // 1-5
  comment: string;
  created_at: Date;
}
```

---

## Endpoints da API Completos

### Base URL: `/api/v1`

### 1. Authentication

```typescript
// Login
POST /user/login
Body: {
  mobile: string;      // ou email
  password: string;
  device_token: string;
  login_by: 'android' | 'ios' | 'web';
}
Response: {
  token_type: "Bearer";
  expires_in: number;
  access_token: string;
  refresh_token: string;
}

// Login Motorista
POST /driver/login
Body: {
  mobile: string;
  password: string;
  device_token: string;
  role: 'driver' | 'owner';
}

// OTP
POST /mobile-otp
Body: { mobile: string }

POST /validate-otp
Body: { mobile: string; otp: string }

// Registro
POST /user/register
Body: {
  name: string;
  mobile: string;
  email: string;
  password: string;
  country: string;
  device_token: string;
}

POST /driver/register
Body: {
  name: string;
  mobile: string;
  email: string;
  password: string;
  service_location_id: string;
  car_make: string;
  car_model: string;
  car_number: string;
  vehicle_type_id: string;
}

// Social Login
POST /social-auth/{provider}
Params: provider = 'google' | 'facebook' | 'apple'
Body: {
  access_token: string;
  device_token: string;
}

// Logout
POST /logout
Headers: Authorization: Bearer {token}
```

### 2. User/Passenger

```typescript
// Perfil
GET /user/
Headers: Authorization: Bearer {token}
Response: User completo + wallet + roles

POST /user/profile
Body: {
  name?: string;
  email?: string;
  profile_picture?: File;
}

POST /user/password
Body: {
  old_password: string;
  new_password: string;
}

// Locais Favoritos
GET /user/list-favourite-location

POST /user/add-favourite-location
Body: {
  address: string;
  latitude: number;
  longitude: number;
}

GET /user/delete-favourite-location/{id}

// Banco
POST /user/update-bank-info
Body: {
  account_holder_name: string;
  account_number: string;
  bank_code: string;
  bank_name: string;
}

GET /user/get-bank-info

// Delete Account
POST /user/delete-user-account
Body: { password: string }
```

### 3. Driver

```typescript
// Documentos
GET /driver/documents/needed
Response: Lista de documentos necessários

POST /driver/upload/documents
Body: FormData com arquivos

// Online/Offline
POST /driver/online-offline
Body: { availability: 0 | 1 }

// Ganhos
GET /driver/today-earnings
GET /driver/weekly-earnings
GET /driver/all-earnings
GET /driver/earnings-report/{from_date}/{to_date}

// Leaderboard
GET /driver/leader-board/trips
GET /driver/leader-board/earnings

// Rota Preferencial
POST /driver/add-my-route-address
Body: {
  latitude: number;
  longitude: number;
  address: string;
}

POST /driver/enable-my-route-booking
Body: { enabled: boolean }
```

### 4. Requests (Corridas) - CORE DO SISTEMA

```typescript
// ===== ETA e Preço =====
POST /request/eta
Body: {
  pick_lat: number;
  pick_lng: number;
  drop_lat: number;
  drop_lng: number;
  promo_code?: string;
}
Response: {
  distance: number;      // km
  time: number;          // minutos
  vehicle_types: [
    {
      id: string;
      name: string;
      icon: string;
      capacity: number;
      price: number;
      base_fare: number;
      distance_fare: number;
      time_fare: number;
      surge_multiplier?: number;
      eta: number;       // minutos até chegada do motorista
    }
  ]
}

// ===== Criar Corrida (USER) =====
POST /request/create
Headers: Authorization: Bearer {token}
Body: {
  pick_lat: number;
  pick_lng: number;
  drop_lat: number;
  drop_lng: number;
  pick_address: string;
  drop_address: string;
  vehicle_type: string;           // zone_type_id
  payment_opt: 0 | 1 | 2;         // 0: cash, 1: card, 2: wallet
  is_later: 0 | 1;                // 0: agora, 1: agendado
  trip_start_time?: string;       // ISO datetime (se agendado)
  promo_id?: string;
  stops?: [                       // Paradas intermediárias
    {
      latitude: number;
      longitude: number;
      address: string;
    }
  ];
}
Response: {
  request_id: string;
  request_number: string;
  status: 'pending' | 'accepted' | 'ongoing' | 'completed' | 'cancelled';
  message: 'Procurando motorista...';
}

// ===== Aceitar/Rejeitar (DRIVER) =====
POST /request/respond
Body: {
  request_id: string;
  status: 'accepted' | 'rejected';
}

// ===== Chegou ao Pickup (DRIVER) =====
POST /request/arrived
Body: {
  request_id: string;
  latitude: number;
  longitude: number;
}

// ===== Pronto para Embarque (DRIVER) =====
POST /request/ready-to-pickup
Body: {
  request_id: string;
}

// ===== Iniciar Viagem (DRIVER) =====
POST /request/started
Body: {
  request_id: string;
  ride_otp: string;              // OTP fornecido pelo usuário
}

// ===== Completar Parada (DRIVER) =====
POST /request/stop-complete
Body: {
  request_id: string;
  stop_id: string;
}

// ===== Finalizar Corrida (DRIVER) =====
POST /request/end
Body: {
  request_id: string;
  latitude: number;
  longitude: number;
}
Response: {
  request: Request completo;
  bill: RequestBill completo;
  payment_status: 'paid' | 'pending';
}

// ===== Cancelar (USER) =====
POST /request/cancel
Body: {
  request_id: string;
  reason: string;                // cancellation_reason_id
  custom_reason?: string;
}

// ===== Cancelar (DRIVER) =====
POST /request/cancel/by-driver
Body: {
  request_id: string;
  reason: string;
}

// ===== Avaliação =====
POST /request/rating
Body: {
  request_id: string;
  rating: number;                // 1-5
  comment?: string;
}

// ===== Histórico =====
GET /request/history
Query: ?page=1
Response: Paginado com lista de Request

GET /request/history/{id}
Response: Request completo + RequestPlace + RequestBill + ratings

// ===== Métodos de Pagamento (USER) =====
POST /request/user/payment-method
Body: {
  request_id: string;
  payment_opt: 0 | 1 | 2;
}

POST /request/user/payment-confirm
Body: {
  request_id: string;
  payment_method: string;
}

// ===== Gorjeta (USER) =====
POST /request/user/driver-tip
Body: {
  request_id: string;
  tip_amount: number;
}

// ===== Taxa Adicional (DRIVER) =====
POST /request/additional-charge
Body: {
  request_id: string;
  amount: number;
  reason: string;
}

// ===== Chat =====
GET /request/chat-history/{request_id}

POST /request/send
Body: {
  request_id: string;
  message: string;
}

POST /request/seen
Body: {
  request_id: string;
}

// ===== Corrida Instantânea (DRIVER cria) =====
POST /request/create-instant-ride
Body: {
  pick_lat: number;
  pick_lng: number;
  drop_lat: number;
  drop_lng: number;
  vehicle_type: string;
  offerred_ride_fare: number;
}

// ===== Delivery =====
POST /request/delivery/create
Body: {
  // Mesmos campos de create +
  goods_type_id: string;
  goods_type_quantity: number;
}

POST /request/upload-proof
Body: FormData com foto de entrega

// ===== Pacotes (Rental) =====
POST /request/list-packages
Body: {
  zone_id: string;
}
```

### 5. Payments

```typescript
// ===== Cartões =====
POST /payment/card/add
Body: {
  card_token: string;          // Token do gateway (Stripe, etc)
}

GET /payment/card/list

POST /payment/card/make/default
Body: { card_id: string }

DELETE /payment/card/delete/{card_id}

// ===== Wallet =====
POST /payment/wallet/add/money
Body: {
  amount: number;
  payment_method_id: string;   // Stripe payment method
}

GET /payment/wallet/history
Query: ?page=1

GET /payment/wallet/withdrawal-requests

POST /payment/wallet/request-for-withdrawal
Body: {
  amount: number;
}

// ===== Stripe =====
POST /payment/stripe/intent
Body: { amount: number }
Response: { client_secret: string }

POST /payment/stripe/add/money
Body: {
  amount: number;
  payment_intent_id: string;
}

POST /payment/stripe/make-payment-for-ride
Body: {
  request_id: string;
  payment_method_id: string;
}

// ===== Razorpay =====
POST /payment/razerpay/add-money
Body: {
  amount: number;
  payment_id: string;          // Razorpay payment ID
}

// ===== Braintree =====
GET /payment/braintree/client/token

POST /payment/braintree/add/money
Body: {
  amount: number;
  payment_method_nonce: string;
}

// ===== Paystack =====
POST /payment/paystack/initialize
Body: { amount: number }
Response: { authorization_url: string }

POST /payment/paystack/add-money
Body: {
  amount: number;
  reference: string;
}

// ===== Outros Gateways =====
// Cashfree, FlutterWave, PayMob, etc.
// Seguem padrão similar
```

### 6. Common

```typescript
// Tipos de Veículo
GET /types/{lat}/{lng}
Response: Vehicle types disponíveis na localização

GET /types/by-location/{lat}/{lng}
Response: Vehicle types com preços

// Marcas e Modelos
GET /common/car/makes

GET /common/car/models/{make_id}

// FAQ
GET /common/faq/list/{lat}/{lng}

// SOS
GET /common/sos/list/{lat}/{lng}

POST /common/sos/store
Body: {
  name: string;
  mobile: string;
}

POST /common/sos/delete/{sos_id}

// Reclamações
GET /common/complaint-titles

POST /common/make-complaint
Body: {
  complaint_title_id: string;
  description: string;
  request_id?: string;
}

// Cancelamento
GET /common/cancallation/reasons
Query: ?user_type=user|driver

// Goods Types (Delivery)
GET /common/goods-types
```

### 7. Notifications

```typescript
GET /notifications/get-notification

DELETE /notifications/delete-notification/{notification_id}
```

### 8. Dispatcher

```typescript
POST /dispatcher/request/find-user-data
Body: { mobile: string }

POST /dispatcher/request/create
Body: {
  user_id: string;
  pick_lat: number;
  pick_lng: number;
  drop_lat: number;
  drop_lng: number;
  vehicle_type: string;
  payment_opt: number;
  book_for_other?: boolean;
  book_for_other_contact?: string;
}

GET /dispatcher/request/request-detail/{request_id}

POST /dispatcher/request/cancel-ride
Body: { request_id: string }
```

---

## Lógica de Negócio Detalhada

### 1. Fluxo de Criação de Corrida

```typescript
async function createRide(data: CreateRideDTO) {
  // 1. VALIDAÇÕES
  validateCoordinates(data.pick_lat, data.pick_lng);
  validateCoordinates(data.drop_lat, data.drop_lng);

  // 2. IDENTIFICAR ZONA (Spatial Query)
  const pickupZone = await findZoneByPoint(data.pick_lat, data.pick_lng);
  if (!pickupZone) {
    throw new Error('Localização de embarque fora da área de serviço');
  }

  // 3. CALCULAR ETA E PREÇO
  const eta = await calculateETA({
    pickup: { lat: data.pick_lat, lng: data.pick_lng },
    drop: { lat: data.drop_lat, lng: data.drop_lng },
    zoneTypeId: data.vehicle_type,
    promoId: data.promo_id
  });

  // 4. VALIDAR SALDO (se payment_opt = wallet)
  if (data.payment_opt === 2) {
    const wallet = await getUserWallet(userId);
    if (wallet.amount_balance < eta.price) {
      throw new Error('Saldo insuficiente');
    }
  }

  // 5. APLICAR PROMO CODE
  let discountedTotal = eta.price;
  if (data.promo_id) {
    const promo = await getPromoCode(data.promo_id);
    discountedTotal = applyPromoCode(eta.price, promo);
  }

  // 6. CRIAR REQUEST
  const request = await db.insert(requests).values({
    id: generateUUID(),
    request_number: generateRequestNumber(),
    user_id: userId,
    zone_type_id: data.vehicle_type,
    is_later: data.is_later,
    trip_start_time: data.trip_start_time,
    payment_opt: data.payment_opt,
    promo_id: data.promo_id,
    request_eta_amount: eta.price,
    discounted_total: discountedTotal,
    ride_otp: generateOTP(4),
    company_key: currentTenant,
    // ... outros campos
  });

  // 7. CRIAR REQUEST PLACE
  await db.insert(requestPlaces).values({
    request_id: request.id,
    pick_lat: data.pick_lat,
    pick_lng: data.pick_lng,
    pick_address: data.pick_address,
    drop_lat: data.drop_lat,
    drop_lng: data.drop_lng,
    drop_address: data.drop_address,
  });

  // 8. CRIAR PARADAS (se houver)
  if (data.stops?.length) {
    await db.insert(requestStops).values(
      data.stops.map((stop, index) => ({
        request_id: request.id,
        order: index + 1,
        latitude: stop.latitude,
        longitude: stop.longitude,
        address: stop.address,
      }))
    );
  }

  // 9. DISPARAR JOB PARA BUSCAR MOTORISTAS
  if (!data.is_later) {
    // Corrida imediata
    await queue.add('assign-drivers', {
      requestId: request.id,
      attempt: 1
    });
  } else {
    // Agendar job para X minutos antes
    const scheduleTime = new Date(data.trip_start_time);
    scheduleTime.setMinutes(scheduleTime.getMinutes() - 15);

    await queue.add('assign-drivers', {
      requestId: request.id,
      attempt: 1
    }, {
      delay: scheduleTime.getTime() - Date.now()
    });
  }

  // 10. NOTIFICAR USUÁRIO
  await sendNotification(userId, {
    title: 'Corrida solicitada',
    body: 'Procurando motorista próximo...',
    data: { type: 'ride_created', request_id: request.id }
  });

  return request;
}
```

### 2. Algoritmo de Atribuição de Motorista

```typescript
async function assignDrivers(requestId: string, attempt: number) {
  const MAX_ATTEMPTS = 10;
  const TIMEOUT_SECONDS = 30;

  // 1. BUSCAR REQUEST
  const request = await db.query.requests.findFirst({
    where: eq(requests.id, requestId),
    with: { requestPlace: true, zoneType: true }
  });

  if (!request || request.driver_id) {
    return; // Já tem motorista ou foi cancelada
  }

  // 2. BUSCAR MOTORISTAS DISPONÍVEIS PRÓXIMOS
  // PostgreSQL + PostGIS
  const nearbyDrivers = await db.execute(sql`
    SELECT d.id, d.user_id,
           ST_Distance(
             d.location::geography,
             ST_MakePoint(${request.requestPlace.pick_lng}, ${request.requestPlace.pick_lat})::geography
           ) as distance
    FROM drivers d
    WHERE d.available = true
      AND d.active = true
      AND d.approve = true
      AND d.vehicle_type_id = ${request.zone_type_id}
      AND d.service_location_id = ${request.service_location_id}
      AND d.id NOT IN (
        -- Excluir motoristas que já rejeitaram
        SELECT driver_id FROM driver_rejected_requests
        WHERE request_id = ${requestId}
      )
      AND ST_DWithin(
        d.location::geography,
        ST_MakePoint(${request.requestPlace.pick_lng}, ${request.requestPlace.pick_lat})::geography,
        10000  -- 10km radius
      )
    ORDER BY distance ASC
    LIMIT 1
  `);

  if (nearbyDrivers.length === 0) {
    if (attempt >= MAX_ATTEMPTS) {
      // Não encontrou motorista após X tentativas
      await db.update(requests)
        .set({ is_cancelled: true, cancelled_at: new Date() })
        .where(eq(requests.id, requestId));

      await sendNotification(request.user_id, {
        title: 'Nenhum motorista disponível',
        body: 'Não conseguimos encontrar um motorista. Tente novamente.',
        data: { type: 'no_driver_found', request_id: requestId }
      });

      return;
    }

    // Tentar novamente em 10 segundos
    await queue.add('assign-drivers', {
      requestId,
      attempt: attempt + 1
    }, {
      delay: 10000
    });

    return;
  }

  const driver = nearbyDrivers[0];

  // 3. CALCULAR ETA DO MOTORISTA ATÉ PICKUP
  const driverEta = await calculateDriverETA(
    driver.location,
    { lat: request.requestPlace.pick_lat, lng: request.requestPlace.pick_lng }
  );

  // 4. ENVIAR NOTIFICAÇÃO PARA MOTORISTA
  await sendNotification(driver.user_id, {
    title: 'Nova corrida disponível',
    body: `${driverEta.time} min - R$ ${request.request_eta_amount}`,
    data: {
      type: 'ride_request',
      request_id: requestId,
      pickup_address: request.requestPlace.pick_address,
      drop_address: request.requestPlace.drop_address,
      distance: request.total_distance,
      price: request.request_eta_amount,
      eta: driverEta.time
    }
  });

  // 5. AGENDAR PRÓXIMA TENTATIVA (se não aceitar)
  await queue.add('check-driver-response', {
    requestId,
    driverId: driver.id,
    attempt: attempt + 1
  }, {
    delay: TIMEOUT_SECONDS * 1000
  });
}

async function checkDriverResponse(requestId: string, driverId: string, attempt: number) {
  const request = await db.query.requests.findFirst({
    where: eq(requests.id, requestId)
  });

  if (request.driver_id) {
    return; // Motorista aceitou
  }

  // Motorista não respondeu, marcar como rejeitado
  await db.insert(driverRejectedRequests).values({
    request_id: requestId,
    driver_id: driverId,
  });

  // Tentar próximo motorista
  await assignDrivers(requestId, attempt);
}
```

### 3. Cálculo de ETA e Preço

```typescript
async function calculateETA(params: ETAParams) {
  const { pickup, drop, zoneTypeId, promoId } = params;

  // 1. BUSCAR ZONE TYPE (preços)
  const zoneType = await db.query.zoneTypes.findFirst({
    where: eq(zoneTypes.id, zoneTypeId),
    with: { zone: true, vehicleType: true }
  });

  // 2. GOOGLE MAPS DISTANCE MATRIX
  const googleResponse = await fetch(
    `https://maps.googleapis.com/maps/api/distancematrix/json?` +
    `origins=${pickup.lat},${pickup.lng}&` +
    `destinations=${drop.lat},${drop.lng}&` +
    `key=${GOOGLE_MAPS_KEY}`
  );
  const data = await googleResponse.json();

  const distance = data.rows[0].elements[0].distance.value / 1000; // meters to km
  const duration = data.rows[0].elements[0].duration.value / 60;   // seconds to minutes

  // 3. CALCULAR PREÇO BASE
  let totalPrice = zoneType.base_price;

  // 4. ADICIONAR PREÇO POR DISTÂNCIA
  if (distance > zoneType.base_distance) {
    const extraDistance = distance - zoneType.base_distance;
    totalPrice += extraDistance * zoneType.price_per_distance;
  }

  // 5. ADICIONAR PREÇO POR TEMPO
  totalPrice += duration * zoneType.price_per_time;

  // 6. APLICAR SURGE PRICING (se ativo)
  if (zoneType.surge_pricing) {
    const currentHour = new Date().getHours();
    const peakStart = parseInt(zoneType.peak_hour_start.split(':')[0]);
    const peakEnd = parseInt(zoneType.peak_hour_end.split(':')[0]);

    if (currentHour >= peakStart && currentHour <= peakEnd) {
      totalPrice *= zoneType.peak_hour_multiplier;
    }
  }

  // 7. VERIFICAR AEROPORTO
  const isAirportPickup = await checkAirport(pickup.lat, pickup.lng);
  const isAirportDrop = await checkAirport(drop.lat, drop.lng);

  if (isAirportPickup || isAirportDrop) {
    const airport = isAirportPickup || isAirportDrop;
    totalPrice += airport.airport_surge_fee;
  }

  // 8. APLICAR SERVICE TAX
  const serviceTax = (totalPrice * zoneType.service_tax) / 100;
  totalPrice += serviceTax;

  // 9. APLICAR PROMO CODE
  let discount = 0;
  if (promoId) {
    const promo = await db.query.promos.findFirst({
      where: eq(promos.id, promoId)
    });

    if (promo && isPromoValid(promo) && totalPrice >= promo.min_trip_amount) {
      if (promo.discount_type === 'percentage') {
        discount = (totalPrice * promo.discount) / 100;
        if (promo.max_discount_amount) {
          discount = Math.min(discount, promo.max_discount_amount);
        }
      } else {
        discount = promo.discount;
      }
    }
  }

  const finalPrice = totalPrice - discount;

  // 10. CALCULAR ETA DO MOTORISTA MAIS PRÓXIMO
  const nearestDriver = await findNearestDriver(pickup, zoneTypeId);
  const driverEta = nearestDriver
    ? await calculateDriverETA(nearestDriver.location, pickup)
    : { time: 5, distance: 2 }; // Fallback

  return {
    distance,
    time: duration,
    base_fare: zoneType.base_price,
    distance_fare: (distance - zoneType.base_distance) * zoneType.price_per_distance,
    time_fare: duration * zoneType.price_per_time,
    service_tax: serviceTax,
    airport_fee: isAirportPickup || isAirportDrop ? airport.airport_surge_fee : 0,
    surge_multiplier: zoneType.surge_pricing ? zoneType.peak_hour_multiplier : 1,
    discount,
    price: totalPrice,
    final_price: finalPrice,
    driver_eta: driverEta.time,
    currency: zoneType.zone.service_location.currency_code
  };
}
```

### 4. Processamento de Pagamento

```typescript
async function processPayment(request: Request) {
  const bill = await createRequestBill(request);

  switch (request.payment_opt) {
    case 0: // CASH
      // Motorista recebe dinheiro
      // Registrar dívida do motorista com admin
      await db.update(driverWallets)
        .set({
          amount_balance: sql`amount_balance - ${bill.admin_commision}`
        })
        .where(eq(driverWallets.user_id, request.driver_id));

      await db.insert(driverWalletHistory).values({
        user_id: request.driver_id,
        amount: -bill.admin_commision,
        transaction_desc: `Comissão - Corrida ${request.request_number}`,
        request_id: request.id
      });
      break;

    case 1: // CARD
      // Cobrar no cartão
      const card = await getUserDefaultCard(request.user_id);

      try {
        const charge = await stripe.charges.create({
          amount: Math.round(bill.total_amount * 100), // em centavos
          currency: request.requested_currency_code.toLowerCase(),
          customer: card.stripe_customer_id,
          source: card.stripe_card_id,
          description: `Corrida ${request.request_number}`
        });

        // Creditar motorista (total - comissão)
        const driverAmount = bill.total_amount - bill.admin_commision;
        await creditDriverWallet(request.driver_id, driverAmount, request.id);

        // Registrar histórico do usuário
        await db.insert(userWalletHistory).values({
          user_id: request.user_id,
          amount: -bill.total_amount,
          transaction_id: charge.id,
          transaction_desc: `Pagamento - Corrida ${request.request_number}`,
          request_id: request.id,
          merchant: 'stripe'
        });

      } catch (error) {
        throw new Error('Falha ao processar pagamento no cartão');
      }
      break;

    case 2: // WALLET
      // Debitar carteira do usuário
      const userWallet = await db.query.userWallets.findFirst({
        where: eq(userWallets.user_id, request.user_id)
      });

      if (userWallet.amount_balance < bill.total_amount) {
        throw new Error('Saldo insuficiente');
      }

      await db.update(userWallets)
        .set({
          amount_balance: sql`amount_balance - ${bill.total_amount}`,
          amount_spent: sql`amount_spent + ${bill.total_amount}`
        })
        .where(eq(userWallets.user_id, request.user_id));

      // Creditar motorista
      const driverAmount = bill.total_amount - bill.admin_commision;
      await creditDriverWallet(request.driver_id, driverAmount, request.id);

      // Histórico usuário
      await db.insert(userWalletHistory).values({
        user_id: request.user_id,
        amount: -bill.total_amount,
        transaction_desc: `Pagamento - Corrida ${request.request_number}`,
        request_id: request.id,
        merchant: 'wallet'
      });
      break;
  }

  // Marcar como pago
  await db.update(requests)
    .set({ is_paid: true })
    .where(eq(requests.id, request.id));
}

async function creditDriverWallet(driverId: string, amount: number, requestId: string) {
  await db.update(driverWallets)
    .set({
      amount_balance: sql`amount_balance + ${amount}`,
      amount_added: sql`amount_added + ${amount}`,
      amount_for_trip: sql`amount_for_trip + ${amount}`
    })
    .where(eq(driverWallets.user_id, driverId));

  await db.insert(driverWalletHistory).values({
    user_id: driverId,
    amount: amount,
    transaction_desc: `Recebido - Corrida ${requestId}`,
    request_id: requestId,
    merchant: 'system'
  });
}
```

---

## Fluxos de Sistema

### Fluxo Completo de Corrida (Diagrama de Sequência)

```
User          API          Database      Queue        Driver       Firebase
  |            |               |            |            |             |
  |--create--->|               |            |            |             |
  |            |--insert------>|            |            |             |
  |            |<--request-----|            |            |             |
  |            |--queue job----|----------->|            |             |
  |<--pending--|               |            |            |             |
  |            |               |            |--find drivers            |
  |            |               |            |            |<--notify----|
  |            |               |            |            |             |
  |            |               |            |<--accept---|             |
  |            |<--update------<------------|            |             |
  |<--assigned-|               |            |            |             |
  |            |               |            |            |--update---->|
  |--track-----|---------------|------------|------------|------------>|
  |            |               |            |            |--arrived--->|
  |<--notify---|               |            |            |             |
  |            |               |            |            |--started--->|
  |            |<--update------|<-----------|            |             |
  |<--ongoing--|               |            |            |             |
  |            |               |            |            |--end------->|
  |            |--process----->|            |            |             |
  |            |  payment      |            |            |             |
  |            |<--bill--------|            |            |             |
  |<--complete-|               |            |            |             |
  |--rate----->|               |            |            |             |
```

---

## Integrações Externas

### 1. Google Maps API

```typescript
// Configuração
const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_KEY;

// Distance Matrix
async function getDistance(origin, destination) {
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?` +
    `origins=${origin.lat},${origin.lng}&` +
    `destinations=${destination.lat},${destination.lng}&` +
    `key=${GOOGLE_MAPS_KEY}`;

  const response = await fetch(url);
  return response.json();
}

// Geocoding
async function geocode(address: string) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?` +
    `address=${encodeURIComponent(address)}&` +
    `key=${GOOGLE_MAPS_KEY}`;

  const response = await fetch(url);
  return response.json();
}

// Reverse Geocoding
async function reverseGeocode(lat: number, lng: number) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?` +
    `latlng=${lat},${lng}&` +
    `key=${GOOGLE_MAPS_KEY}`;

  const response = await fetch(url);
  return response.json();
}

// Directions
async function getDirections(origin, destination) {
  const url = `https://maps.googleapis.com/maps/api/directions/json?` +
    `origin=${origin.lat},${origin.lng}&` +
    `destination=${destination.lat},${destination.lng}&` +
    `key=${GOOGLE_MAPS_KEY}`;

  const response = await fetch(url);
  return response.json();
}
```

### 2. Firebase Cloud Messaging

```typescript
import admin from 'firebase-admin';

// Inicialização
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

// Enviar notificação
async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data: any
) {
  const message = {
    token,
    notification: { title, body },
    data,
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        clickAction: 'FLUTTER_NOTIFICATION_CLICK'
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1
        }
      }
    }
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Notification sent:', response);
    return response;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}

// Firebase Realtime Database (Tracking)
const db = admin.database();

async function updateDriverLocation(driverId: string, location: { lat: number, lng: number }) {
  await db.ref(`drivers/${driverId}`).set({
    lat: location.lat,
    lng: location.lng,
    updated_at: Date.now()
  });
}

async function listenToDriverLocation(driverId: string, callback: Function) {
  const ref = db.ref(`drivers/${driverId}`);
  ref.on('value', (snapshot) => {
    callback(snapshot.val());
  });
}
```

### 3. Stripe

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Criar Payment Intent
async function createPaymentIntent(amount: number, currency: string) {
  return stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // em centavos
    currency: currency.toLowerCase(),
    automatic_payment_methods: { enabled: true }
  });
}

// Salvar cartão
async function saveCard(userId: string, paymentMethodId: string) {
  // Criar ou obter customer
  let customer = await getStripeCustomer(userId);

  if (!customer) {
    customer = await stripe.customers.create({
      metadata: { user_id: userId }
    });

    await db.update(users)
      .set({ stripe_customer_id: customer.id })
      .where(eq(users.id, userId));
  }

  // Anexar payment method
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customer.id
  });

  // Salvar no banco
  await db.insert(cards).values({
    user_id: userId,
    stripe_payment_method_id: paymentMethodId,
    stripe_customer_id: customer.id,
    is_default: true
  });
}

// Cobrar no cartão
async function chargeCard(userId: string, amount: number, currency: string) {
  const card = await getUserDefaultCard(userId);

  return stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: currency.toLowerCase(),
    customer: card.stripe_customer_id,
    payment_method: card.stripe_payment_method_id,
    confirm: true,
    off_session: true
  });
}

// Webhook
async function handleStripeWebhook(req: Request) {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(
    req.body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  );

  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      await handlePaymentSuccess(paymentIntent);
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      await handlePaymentFailed(failedPayment);
      break;
  }
}
```

---

## Stack Técnica Recomendada

### Backend (Node.js/TypeScript)

```json
{
  "dependencies": {
    // Core
    "express": "^4.18.2",
    "typescript": "^5.3.3",

    // Database
    "pg": "^8.11.3",
    "drizzle-orm": "^0.29.0",
    "@drizzle-team/postgres-js": "^2.0.0",

    // Authentication
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",

    // Validation
    "zod": "^3.22.4",
    "drizzle-zod": "^0.5.1",

    // Payments
    "stripe": "^14.10.0",

    // Real-time
    "socket.io": "^4.6.1",
    "ws": "^8.16.0",

    // Queue
    "bullmq": "^5.1.1",
    "ioredis": "^5.3.2",

    // Email
    "nodemailer": "^6.9.8",
    "@sendgrid/mail": "^8.1.0",

    // Firebase
    "firebase-admin": "^12.0.0",

    // Utils
    "date-fns": "^3.0.6",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.6",
    "drizzle-kit": "^0.20.9",
    "tsx": "^4.7.0"
  }
}
```

### Database Schema (Drizzle ORM)

```typescript
// db/schema.ts
import { pgTable, uuid, varchar, boolean, timestamp, numeric, point } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).unique(),
  mobile: varchar('mobile', { length: 20 }).unique().notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  countryId: uuid('country_id').references(() => countries.id),
  profilePicture: varchar('profile_picture', { length: 500 }),
  active: boolean('active').default(true),
  emailConfirmed: boolean('email_confirmed').default(false),
  mobileConfirmed: boolean('mobile_confirmed').default(false),
  fcmToken: varchar('fcm_token', { length: 500 }),
  apnToken: varchar('apn_token', { length: 500 }),
  loginBy: varchar('login_by', { length: 20 }),
  rating: numeric('rating', { precision: 2, scale: 1 }).default('0'),
  ratingTotal: numeric('rating_total').default('0'),
  noOfRatings: numeric('no_of_ratings').default('0'),
  refferalCode: varchar('refferal_code', { length: 50 }).unique(),
  referredBy: uuid('referred_by').references(() => users.id),
  companyKey: varchar('company_key', { length: 255 }).notNull(),
  timezone: varchar('timezone', { length: 100 }),
  lang: varchar('lang', { length: 10 }).default('en'),
  gender: varchar('gender', { length: 10 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const drivers = pgTable('drivers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  serviceLocationId: uuid('service_location_id').references(() => serviceLocations.id),
  ownerId: uuid('owner_id').references(() => owners.id),
  name: varchar('name', { length: 255 }).notNull(),
  mobile: varchar('mobile', { length: 20 }).notNull(),
  email: varchar('email', { length: 255 }),
  vehicleTypeId: uuid('vehicle_type_id').references(() => zoneTypes.id),
  carMake: varchar('car_make', { length: 100 }),
  carModel: varchar('car_model', { length: 100 }),
  carNumber: varchar('car_number', { length: 50 }),
  carColor: varchar('car_color', { length: 50 }),
  active: boolean('active').default(true),
  approve: boolean('approve').default(false),
  available: boolean('available').default(false),
  rating: numeric('rating', { precision: 2, scale: 1 }).default('0'),
  // PostGIS
  location: point('location', { mode: 'xy' }), // ou geometry(Point, 4326)
  fcmToken: varchar('fcm_token', { length: 500 }),
  timezone: varchar('timezone', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const requests = pgTable('requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestNumber: varchar('request_number', { length: 50 }).unique().notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  driverId: uuid('driver_id').references(() => drivers.id),
  zoneTypeId: uuid('zone_type_id').references(() => zoneTypes.id).notNull(),
  isLater: boolean('is_later').default(false),
  tripStartTime: timestamp('trip_start_time'),
  acceptedAt: timestamp('accepted_at'),
  arrivedAt: timestamp('arrived_at'),
  completedAt: timestamp('completed_at'),
  cancelledAt: timestamp('cancelled_at'),
  isDriverStarted: boolean('is_driver_started').default(false),
  isDriverArrived: boolean('is_driver_arrived').default(false),
  isTripStart: boolean('is_trip_start').default(false),
  isCompleted: boolean('is_completed').default(false),
  isCancelled: boolean('is_cancelled').default(false),
  totalDistance: numeric('total_distance'),
  totalTime: numeric('total_time'),
  paymentOpt: numeric('payment_opt'),
  isPaid: boolean('is_paid').default(false),
  userRated: boolean('user_rated').default(false),
  driverRated: boolean('driver_rated').default(false),
  requestEtaAmount: numeric('request_eta_amount'),
  discountedTotal: numeric('discounted_total'),
  rideOtp: varchar('ride_otp', { length: 10 }),
  companyKey: varchar('company_key', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ... outros schemas
```

### Frontend (React/Vite)

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",

    // Routing
    "wouter": "^3.0.0",

    // State Management
    "@tanstack/react-query": "^5.15.0",

    // UI
    "tailwindcss": "^3.4.0",
    "framer-motion": "^10.17.0",
    "lucide-react": "^0.303.0",
    "@radix-ui/react-*": "latest",

    // Forms
    "react-hook-form": "^7.49.2",
    "zod": "^3.22.4",
    "@hookform/resolvers": "^3.3.3",

    // Maps
    "@react-google-maps/api": "^2.19.2",

    // Payments
    "@stripe/stripe-js": "^2.4.0",
    "@stripe/react-stripe-js": "^2.4.0",

    // HTTP
    "axios": "^1.6.5",

    // WebSockets
    "socket.io-client": "^4.6.1",

    // Utils
    "date-fns": "^3.0.6"
  },
  "devDependencies": {
    "@types/react": "^18.2.48",
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.11"
  }
}
```

---

## Comandos de Desenvolvimento

### Setup Inicial
```bash
# Backend
npm install
npm run db:generate  # Gerar migrations
npm run db:push      # Aplicar migrations
npm run db:seed      # Seed database
npm run dev          # Iniciar servidor

# Frontend
npm install
npm run dev          # Iniciar Vite dev server
```

### Database
```bash
npm run db:studio    # Abrir Drizzle Studio
npm run db:migrate   # Rodar migrations
npm run db:drop      # Dropar database (CUIDADO!)
```

---

**Este blueprint contém TODAS as informações necessárias para recriar o sistema em qualquer stack. Use-o como referência completa!**

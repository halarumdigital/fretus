# Guia de Integração - API Ride-Hailing

## Índice
1. [Quick Start](#quick-start)
2. [Exemplos de Integração Mobile](#exemplos-de-integração-mobile)
3. [Exemplos de Integração Web](#exemplos-de-integração-web)
4. [Padrões e Convenções](#padrões-e-convenções)
5. [Tratamento de Erros](#tratamento-de-erros)
6. [Testing](#testing)
7. [Deploy e DevOps](#deploy-e-devops)

---

## Quick Start

### Configuração Básica

**1. Instalação:**
```bash
git clone <repository>
cd Admin-Panel-Oct-24
composer install
npm install
cp .env.example .env
```

**2. Configurar .env:**
```env
APP_NAME="My Taxi App"
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=taxi_app
DB_USERNAME=root
DB_PASSWORD=

# Multi-tenancy
TENANCY_KEY=your-secret-key

# Google Maps
GOOGLE_MAP_KEY=your-google-maps-api-key

# Firebase
FIREBASE_SERVER_KEY=your-firebase-server-key
FIREBASE_DATABASE_URL=https://your-app.firebaseio.com

# Stripe
STRIPE_KEY=pk_test_xxx
STRIPE_SECRET=sk_test_xxx

# Queue
QUEUE_CONNECTION=redis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
```

**3. Setup:**
```bash
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan passport:install
php artisan storage:link
```

**4. Executar:**
```bash
# Terminal 1: Servidor
php artisan serve

# Terminal 2: Queue Worker
php artisan queue:work

# Terminal 3: Assets (desenvolvimento)
npm run watch
```

---

## Exemplos de Integração Mobile

### React Native / Expo

#### 1. Setup HTTP Client

```javascript
// services/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://your-api.com/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Interceptor para adicionar token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        const response = await axios.post(`${API_BASE_URL}/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token } = response.data;
        await AsyncStorage.setItem('access_token', access_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Logout
        await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
        // Navegar para tela de login
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

#### 2. Authentication Service

```javascript
// services/auth.js
import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';

export const authService = {
  // Login
  async login(mobile, password) {
    try {
      // Obter FCM token
      const fcmToken = await messaging().getToken();

      const response = await api.post('/user/login', {
        mobile,
        password,
        device_token: fcmToken,
        login_by: Platform.OS === 'ios' ? 'ios' : 'android',
      });

      const { access_token, refresh_token } = response.data;

      // Salvar tokens
      await AsyncStorage.multiSet([
        ['access_token', access_token],
        ['refresh_token', refresh_token],
      ]);

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Login com OTP
  async sendOTP(mobile) {
    try {
      const response = await api.post('/mobile-otp', { mobile });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  async validateOTP(mobile, otp) {
    try {
      const fcmToken = await messaging().getToken();

      const response = await api.post('/validate-otp', {
        mobile,
        otp,
        device_token: fcmToken,
      });

      const { access_token, refresh_token } = response.data;

      await AsyncStorage.multiSet([
        ['access_token', access_token],
        ['refresh_token', refresh_token],
      ]);

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Registro
  async register(userData) {
    try {
      const fcmToken = await messaging().getToken();

      const response = await api.post('/user/register', {
        ...userData,
        device_token: fcmToken,
      });

      const { access_token, refresh_token } = response.data;

      await AsyncStorage.multiSet([
        ['access_token', access_token],
        ['refresh_token', refresh_token],
      ]);

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Logout
  async logout() {
    try {
      await api.post('/logout');
      await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    } catch (error) {
      // Mesmo com erro, limpar tokens locais
      await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
      throw this.handleError(error);
    }
  },

  // Helper para tratamento de erros
  handleError(error) {
    if (error.response) {
      return {
        message: error.response.data.message || 'Erro ao processar requisição',
        errors: error.response.data.errors || {},
      };
    } else if (error.request) {
      return { message: 'Erro de conexão. Verifique sua internet.' };
    } else {
      return { message: error.message };
    }
  },
};
```

#### 3. Request Service (Corridas)

```javascript
// services/request.js
import api from './api';

export const requestService = {
  // Calcular ETA e preço
  async calculateETA(pickupLat, pickupLng, dropLat, dropLng, promoCode = null) {
    try {
      const response = await api.post('/request/eta', {
        pick_lat: pickupLat,
        pick_lng: pickupLng,
        drop_lat: dropLat,
        drop_lng: dropLng,
        promo_code: promoCode,
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Criar corrida
  async createRide(rideData) {
    try {
      const response = await api.post('/request/create', {
        pick_lat: rideData.pickupLat,
        pick_lng: rideData.pickupLng,
        drop_lat: rideData.dropLat,
        drop_lng: rideData.dropLng,
        pick_address: rideData.pickupAddress,
        drop_address: rideData.dropAddress,
        vehicle_type: rideData.vehicleTypeId,
        payment_opt: rideData.paymentMethod, // 0: cash, 1: card, 2: wallet
        is_later: rideData.isScheduled ? 1 : 0,
        trip_start_time: rideData.scheduledTime || null,
        promo_id: rideData.promoId || null,
        stops: rideData.stops || [],
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Cancelar corrida
  async cancelRide(requestId, reason, customReason = null) {
    try {
      const response = await api.post('/request/cancel', {
        request_id: requestId,
        reason,
        custom_reason: customReason,
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Avaliar corrida
  async rateRide(requestId, rating, comment = '') {
    try {
      const response = await api.post('/request/rating', {
        request_id: requestId,
        rating,
        comment,
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Obter histórico
  async getHistory(page = 1) {
    try {
      const response = await api.get(`/request/history?page=${page}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Obter detalhes da corrida
  async getRideDetails(requestId) {
    try {
      const response = await api.get(`/request/history/${requestId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};
```

#### 4. Firebase Real-time Tracking

```javascript
// services/tracking.js
import database from '@react-native-firebase/database';

export const trackingService = {
  // User: Ouvir localização do motorista
  listenDriverLocation(driverId, callback) {
    const ref = database().ref(`drivers/${driverId}`);

    ref.on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) {
        callback({
          latitude: data.lat,
          longitude: data.lng,
          bearing: data.bearing,
          speed: data.speed,
          updatedAt: data.updated_at,
        });
      }
    });

    // Retorna função para parar de ouvir
    return () => ref.off('value');
  },

  // Driver: Atualizar localização
  async updateDriverLocation(driverId, location) {
    try {
      await database()
        .ref(`drivers/${driverId}`)
        .set({
          lat: location.latitude,
          lng: location.longitude,
          bearing: location.heading || 0,
          speed: location.speed || 0,
          updated_at: Date.now(),
        });
    } catch (error) {
      console.error('Erro ao atualizar localização:', error);
    }
  },

  // Ouvir status da corrida
  listenRequestStatus(requestId, callback) {
    const ref = database().ref(`requests/${requestId}`);

    ref.on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) {
        callback(data);
      }
    });

    return () => ref.off('value');
  },
};
```

#### 5. Componente de Mapa (React Native)

```jsx
// components/RideMap.js
import React, { useState, useEffect, useRef } from 'react';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { trackingService } from '../services/tracking';

const RideMap = ({ request, userLocation }) => {
  const [driverLocation, setDriverLocation] = useState(null);
  const [route, setRoute] = useState([]);
  const mapRef = useRef(null);

  useEffect(() => {
    if (request?.driver_id) {
      // Ouvir localização do motorista
      const unsubscribe = trackingService.listenDriverLocation(
        request.driver_id,
        (location) => {
          setDriverLocation(location);
        }
      );

      return unsubscribe;
    }
  }, [request?.driver_id]);

  useEffect(() => {
    // Buscar rota do Google Maps
    if (userLocation && driverLocation) {
      fetchRoute();
    }
  }, [userLocation, driverLocation]);

  const fetchRoute = async () => {
    try {
      const origin = `${driverLocation.latitude},${driverLocation.longitude}`;
      const destination = `${userLocation.latitude},${userLocation.longitude}`;
      const apiKey = 'YOUR_GOOGLE_MAPS_KEY';

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${apiKey}`
      );

      const data = await response.json();

      if (data.routes.length) {
        const points = decode(data.routes[0].overview_polyline.points);
        setRoute(points);
      }
    } catch (error) {
      console.error('Erro ao buscar rota:', error);
    }
  };

  // Decodificar polyline do Google
  const decode = (encoded) => {
    // Implementação do algoritmo de decodificação de polyline
    // ... (código de decodificação)
  };

  useEffect(() => {
    // Ajustar câmera para mostrar todos os marcadores
    if (mapRef.current && userLocation && driverLocation) {
      mapRef.current.fitToCoordinates(
        [userLocation, driverLocation],
        {
          edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
          animated: true,
        }
      );
    }
  }, [userLocation, driverLocation]);

  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_GOOGLE}
      style={{ flex: 1 }}
      initialRegion={{
        latitude: userLocation?.latitude || 0,
        longitude: userLocation?.longitude || 0,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
    >
      {userLocation && (
        <Marker
          coordinate={userLocation}
          title="Você"
          pinColor="blue"
        />
      )}

      {driverLocation && (
        <Marker
          coordinate={{
            latitude: driverLocation.latitude,
            longitude: driverLocation.longitude,
          }}
          title="Motorista"
          rotation={driverLocation.bearing}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          {/* Custom marker de carro */}
          <Image source={require('../assets/car.png')} style={{ width: 40, height: 40 }} />
        </Marker>
      )}

      {route.length > 0 && (
        <Polyline
          coordinates={route}
          strokeColor="#4285F4"
          strokeWidth={4}
        />
      )}
    </MapView>
  );
};

export default RideMap;
```

#### 6. Push Notifications

```javascript
// services/notifications.js
import messaging from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';

export const notificationService = {
  async initialize() {
    // Solicitar permissão
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Permissão de notificação concedida');
    }

    // Configurar notificações locais
    PushNotification.configure({
      onNotification: function (notification) {
        console.log('NOTIFICAÇÃO:', notification);

        // Processar notificação baseado no tipo
        if (notification.data?.type === 'ride_request') {
          // Navegar para tela de aceitar corrida
          // navigation.navigate('AcceptRide', { requestId: notification.data.request_id });
        } else if (notification.data?.type === 'driver_assigned') {
          // Navegar para tela de tracking
          // navigation.navigate('TrackRide', { requestId: notification.data.request_id });
        }
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: true,
    });

    // Ouvir notificações em foreground
    messaging().onMessage(async (remoteMessage) => {
      console.log('Notificação em foreground:', remoteMessage);

      // Mostrar notificação local
      PushNotification.localNotification({
        title: remoteMessage.notification?.title,
        message: remoteMessage.notification?.body || '',
        playSound: true,
        soundName: 'default',
        data: remoteMessage.data,
      });
    });

    // Notificação abriu o app (background)
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('App aberto por notificação:', remoteMessage);
      // Navegar para tela apropriada
    });

    // App foi aberto por notificação (killed state)
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('App aberto por notificação (killed):', remoteMessage);
          // Navegar para tela apropriada
        }
      });
  },

  // Obter FCM token
  async getToken() {
    try {
      const token = await messaging().getToken();
      return token;
    } catch (error) {
      console.error('Erro ao obter FCM token:', error);
      return null;
    }
  },
};
```

---

## Exemplos de Integração Web

### React + Axios

#### 1. Setup Axios

```javascript
// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL}/refresh`,
          { refresh_token: refreshToken }
        );

        const { access_token } = response.data;
        localStorage.setItem('access_token', access_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

#### 2. React Context para Autenticação

```javascript
// src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredData();
  }, []);

  async function loadStoredData() {
    const token = localStorage.getItem('access_token');

    if (token) {
      try {
        const response = await api.get('/user');
        setUser(response.data.data);
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    }

    setLoading(false);
  }

  async function login(email, password) {
    try {
      const response = await api.post('/user/login', {
        email,
        password,
      });

      const { access_token, refresh_token } = response.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);

      // Carregar dados do usuário
      const userResponse = await api.get('/user');
      setUser(userResponse.data.data);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao fazer login',
      };
    }
  }

  async function logout() {
    try {
      await api.post('/logout');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  return useContext(AuthContext);
}
```

#### 3. Google Maps Integration

```javascript
// src/components/MapPicker.js
import React, { useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const MapPicker = ({ onLocationSelect, initialLocation }) => {
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_KEY,
    libraries: ['places'],
  });

  const onMapClick = useCallback((e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    setSelectedLocation({ lat, lng });

    // Reverse geocoding para obter endereço
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results[0]) {
        onLocationSelect({
          lat,
          lng,
          address: results[0].formatted_address,
        });
      }
    });
  }, [onLocationSelect]);

  if (!isLoaded) return <div>Carregando mapa...</div>;

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '400px' }}
      center={selectedLocation || { lat: -23.5505, lng: -46.6333 }}
      zoom={15}
      onClick={onMapClick}
    >
      {selectedLocation && <Marker position={selectedLocation} />}
    </GoogleMap>
  );
};

export default MapPicker;
```

#### 4. Request Ride Component

```javascript
// src/components/RequestRide.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import MapPicker from './MapPicker';

const RequestRide = () => {
  const [step, setStep] = useState(1); // 1: pickup, 2: drop, 3: vehicle, 4: confirm
  const [pickup, setPickup] = useState(null);
  const [drop, setDrop] = useState(null);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [eta, setEta] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pickup && drop) {
      calculateETA();
    }
  }, [pickup, drop]);

  async function calculateETA() {
    setLoading(true);
    try {
      const response = await api.post('/request/eta', {
        pick_lat: pickup.lat,
        pick_lng: pickup.lng,
        drop_lat: drop.lat,
        drop_lng: drop.lng,
      });

      setEta(response.data.data);
      setVehicleTypes(response.data.data.vehicle_types || []);
    } catch (error) {
      console.error('Erro ao calcular ETA:', error);
    } finally {
      setLoading(false);
    }
  }

  async function confirmRide() {
    setLoading(true);
    try {
      const response = await api.post('/request/create', {
        pick_lat: pickup.lat,
        pick_lng: pickup.lng,
        drop_lat: drop.lat,
        drop_lng: drop.lng,
        pick_address: pickup.address,
        drop_address: drop.address,
        vehicle_type: selectedVehicle.id,
        payment_opt: 2, // Wallet
        is_later: 0,
      });

      // Navegar para tela de acompanhamento
      console.log('Corrida criada:', response.data);
    } catch (error) {
      console.error('Erro ao criar corrida:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="request-ride">
      {step === 1 && (
        <div>
          <h2>Selecione o local de embarque</h2>
          <MapPicker
            onLocationSelect={(location) => {
              setPickup(location);
              setStep(2);
            }}
          />
        </div>
      )}

      {step === 2 && (
        <div>
          <h2>Selecione o destino</h2>
          <MapPicker
            onLocationSelect={(location) => {
              setDrop(location);
              setStep(3);
            }}
          />
        </div>
      )}

      {step === 3 && (
        <div>
          <h2>Selecione o tipo de veículo</h2>
          {loading ? (
            <p>Calculando preço...</p>
          ) : (
            <div className="vehicle-types">
              {vehicleTypes.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className={`vehicle-card ${selectedVehicle?.id === vehicle.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedVehicle(vehicle);
                    setStep(4);
                  }}
                >
                  <img src={vehicle.icon} alt={vehicle.name} />
                  <h3>{vehicle.name}</h3>
                  <p>{vehicle.capacity} passageiros</p>
                  <p className="price">R$ {vehicle.price.toFixed(2)}</p>
                  <p className="time">{vehicle.eta} min</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div>
          <h2>Confirme sua corrida</h2>
          <div className="ride-summary">
            <p><strong>Embarque:</strong> {pickup.address}</p>
            <p><strong>Destino:</strong> {drop.address}</p>
            <p><strong>Veículo:</strong> {selectedVehicle.name}</p>
            <p><strong>Distância:</strong> {eta.distance} km</p>
            <p><strong>Tempo estimado:</strong> {eta.time} min</p>
            <p><strong>Preço:</strong> R$ {selectedVehicle.price.toFixed(2)}</p>
          </div>
          <button onClick={confirmRide} disabled={loading}>
            {loading ? 'Criando corrida...' : 'Confirmar e solicitar'}
          </button>
        </div>
      )}
    </div>
  );
};

export default RequestRide;
```

---

## Padrões e Convenções

### Nomenclatura de Endpoints

```
Recurso         Ação              Método    Endpoint
--------------- ----------------- --------- -------------------------
User            Listar            GET       /users
User            Obter específico  GET       /users/{id}
User            Criar             POST      /users
User            Atualizar         PUT/PATCH /users/{id}
User            Deletar           DELETE    /users/{id}

Request (Ride)  Criar             POST      /request/create
Request         Cancelar          POST      /request/cancel
Request         Aceitar           POST      /request/respond
Request         Iniciar           POST      /request/started
Request         Finalizar         POST      /request/end
```

### Códigos de Status HTTP

```
200 OK                  - Sucesso geral
201 Created             - Recurso criado com sucesso
204 No Content          - Sucesso sem conteúdo de retorno
400 Bad Request         - Dados inválidos
401 Unauthorized        - Não autenticado
403 Forbidden           - Sem permissão
404 Not Found           - Recurso não encontrado
422 Unprocessable       - Validação falhou
429 Too Many Requests   - Rate limit excedido
500 Internal Server Error - Erro no servidor
```

### Formato de Validação de Erros

```json
{
  "success": false,
  "message": "The given data was invalid.",
  "errors": {
    "mobile": [
      "The mobile field is required."
    ],
    "password": [
      "The password must be at least 6 characters."
    ]
  }
}
```

---

## Tratamento de Erros

### Backend (Controller)

```php
// app/Http/Controllers/Api/V1/BaseController.php
namespace App\Http\Controllers\Api\V1;

use Illuminate\Http\JsonResponse;

class BaseController extends Controller
{
    protected function successResponse($data, $message = 'Success', $code = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $code);
    }

    protected function errorResponse($message, $code = 400, $errors = []): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'errors' => $errors,
        ], $code);
    }
}

// Uso em controllers
class UserController extends BaseController
{
    public function updateProfile(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'email' => 'required|email',
            ]);

            if ($validator->fails()) {
                return $this->errorResponse(
                    'Validation failed',
                    422,
                    $validator->errors()
                );
            }

            $user = auth()->user();
            $user->update($request->only(['name', 'email']));

            return $this->successResponse($user, 'Profile updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse(
                'Failed to update profile: ' . $e->getMessage(),
                500
            );
        }
    }
}
```

### Frontend (React)

```javascript
// src/utils/errorHandler.js
export function handleApiError(error) {
  if (error.response) {
    // Servidor respondeu com erro
    const { status, data } = error.response;

    switch (status) {
      case 400:
        return data.message || 'Requisição inválida';
      case 401:
        return 'Sessão expirada. Faça login novamente.';
      case 403:
        return 'Você não tem permissão para esta ação';
      case 404:
        return 'Recurso não encontrado';
      case 422:
        // Erros de validação
        if (data.errors) {
          const errors = Object.values(data.errors).flat();
          return errors.join(', ');
        }
        return data.message;
      case 429:
        return 'Muitas requisições. Tente novamente mais tarde.';
      case 500:
        return 'Erro no servidor. Tente novamente.';
      default:
        return data.message || 'Erro desconhecido';
    }
  } else if (error.request) {
    // Requisição foi feita mas sem resposta
    return 'Erro de conexão. Verifique sua internet.';
  } else {
    // Erro ao configurar requisição
    return error.message || 'Erro inesperado';
  }
}

// Uso
import { handleApiError } from '../utils/errorHandler';

async function login(email, password) {
  try {
    const response = await api.post('/user/login', { email, password });
    return { success: true, data: response.data };
  } catch (error) {
    const message = handleApiError(error);
    return { success: false, message };
  }
}
```

---

## Testing

### Backend - Feature Tests

```php
// tests/Feature/RequestTest.php
namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Admin\Zone;
use App\Models\Admin\ZoneType;
use Laravel\Passport\Passport;
use Illuminate\Foundation\Testing\RefreshDatabase;

class RequestTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $driver;

    protected function setUp(): void
    {
        parent::setUp();

        // Criar usuário de teste
        $this->user = User::factory()->create();
        $this->user->roles()->attach(Role::where('slug', 'user')->first());

        // Criar motorista de teste
        $this->driver = Driver::factory()->create();
    }

    /** @test */
    public function user_can_calculate_eta()
    {
        Passport::actingAs($this->user);

        $response = $this->postJson('/api/v1/request/eta', [
            'pick_lat' => -23.5505,
            'pick_lng' => -46.6333,
            'drop_lat' => -23.5629,
            'drop_lng' => -46.6544,
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'distance',
                    'time',
                    'price',
                    'vehicle_types',
                ],
            ]);
    }

    /** @test */
    public function user_can_create_ride()
    {
        Passport::actingAs($this->user);

        $zoneType = ZoneType::factory()->create();

        $response = $this->postJson('/api/v1/request/create', [
            'pick_lat' => -23.5505,
            'pick_lng' => -46.6333,
            'drop_lat' => -23.5629,
            'drop_lng' => -46.6544,
            'pick_address' => 'Av. Paulista, 1000',
            'drop_address' => 'Rua Augusta, 500',
            'vehicle_type' => $zoneType->id,
            'payment_opt' => 2,
            'is_later' => 0,
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'id',
                    'request_number',
                    'status',
                ],
            ]);

        $this->assertDatabaseHas('requests', [
            'user_id' => $this->user->id,
            'zone_type_id' => $zoneType->id,
        ]);
    }

    /** @test */
    public function driver_can_accept_ride()
    {
        Passport::actingAs($this->driver->user);

        $request = Request::factory()->create([
            'user_id' => $this->user->id,
        ]);

        $response = $this->postJson('/api/v1/request/respond', [
            'request_id' => $request->id,
            'status' => 'accepted',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('requests', [
            'id' => $request->id,
            'driver_id' => $this->driver->id,
            'is_driver_started' => 1,
        ]);
    }
}
```

### Frontend - Jest Tests

```javascript
// src/services/__tests__/auth.test.js
import { authService } from '../auth';
import api from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../api');
jest.mock('@react-native-async-storage/async-storage');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should login successfully', async () => {
    const mockResponse = {
      data: {
        access_token: 'test_token',
        refresh_token: 'refresh_token',
      },
    };

    api.post.mockResolvedValue(mockResponse);

    const result = await authService.login('1234567890', 'password123');

    expect(api.post).toHaveBeenCalledWith('/user/login', expect.any(Object));
    expect(AsyncStorage.multiSet).toHaveBeenCalled();
    expect(result).toEqual(mockResponse.data);
  });

  it('should handle login error', async () => {
    const mockError = {
      response: {
        data: {
          message: 'Invalid credentials',
        },
      },
    };

    api.post.mockRejectedValue(mockError);

    await expect(authService.login('1234567890', 'wrong')).rejects.toEqual({
      message: 'Invalid credentials',
      errors: {},
    });
  });
});
```

---

## Deploy e DevOps

### Docker Setup

```dockerfile
# Dockerfile
FROM php:8.2-fpm

# Instalar dependências
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip

# Instalar extensões PHP
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd

# Instalar Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Diretório de trabalho
WORKDIR /var/www

# Copiar aplicação
COPY . /var/www

# Instalar dependências
RUN composer install --no-dev --optimize-autoloader

# Permissões
RUN chown -R www-data:www-data /var/www

EXPOSE 9000
CMD ["php-fpm"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    image: taxi-app
    container_name: taxi-app
    restart: unless-stopped
    working_dir: /var/www
    volumes:
      - ./:/var/www
    networks:
      - taxi-network

  nginx:
    image: nginx:alpine
    container_name: taxi-nginx
    restart: unless-stopped
    ports:
      - "8000:80"
    volumes:
      - ./:/var/www
      - ./docker/nginx:/etc/nginx/conf.d
    networks:
      - taxi-network

  db:
    image: mysql:8.0
    container_name: taxi-db
    restart: unless-stopped
    environment:
      MYSQL_DATABASE: ${DB_DATABASE}
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_PASSWORD: ${DB_PASSWORD}
      MYSQL_USER: ${DB_USERNAME}
    volumes:
      - dbdata:/var/lib/mysql
    networks:
      - taxi-network

  redis:
    image: redis:alpine
    container_name: taxi-redis
    restart: unless-stopped
    networks:
      - taxi-network

networks:
  taxi-network:
    driver: bridge

volumes:
  dbdata:
    driver: local
```

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2

    - name: Setup PHP
      uses: shivammathur/setup-php@v2
      with:
        php-version: '8.2'
        extensions: mbstring, dom, fileinfo, mysql

    - name: Install dependencies
      run: composer install --prefer-dist --no-progress --no-suggest

    - name: Run tests
      run: vendor/bin/phpunit

    - name: Deploy to server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /var/www/taxi-app
          git pull origin main
          composer install --no-dev --optimize-autoloader
          php artisan migrate --force
          php artisan config:cache
          php artisan route:cache
          php artisan view:cache
          sudo systemctl restart php8.2-fpm
```

---

## Conclusão

Este guia fornece exemplos práticos de integração com a API. Para casos de uso específicos ou dúvidas, consulte a [API_DOCUMENTATION.md](API_DOCUMENTATION.md) ou o código-fonte.

**Recursos adicionais:**
- [CLAUDE.md](CLAUDE.md) - Visão geral da arquitetura
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - Documentação completa da API
- Postman Collection - [Em desenvolvimento]
- Swagger/OpenAPI - Disponível via Scribe: `/docs`

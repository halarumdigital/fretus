# Referência Rápida - Configuração e Troubleshooting

## Sumário Executivo

Esta é uma aplicação de ride-hailing (tipo Uber) multi-tenant construída com Laravel 8. Suporta múltiplas empresas (tenants), múltiplos gateways de pagamento, geolocalização avançada, e comunicação em tempo real.

**Stack Principal:**
- Backend: Laravel 8 (PHP 7.3+/8.2+)
- Multi-tenancy: hyn/multi-tenant
- Database: MySQL 8 com extensões espaciais
- Autenticação: Laravel Passport (OAuth2)
- Real-time: Firebase Realtime Database
- Pagamentos: Stripe, Razorpay, Braintree, Paystack, etc.
- Queues: Redis + Laravel Horizon
- Maps: Google Maps API

---

## Instalação Rápida (5 minutos)

```bash
# 1. Clone e entre no diretório
git clone <repo-url>
cd Admin-Panel-Oct-24

# 2. Instale dependências
composer install
npm install

# 3. Configure ambiente
cp .env.example .env
# Edite .env com suas credenciais

# 4. Gere chave e setup
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan passport:install
php artisan storage:link

# 5. Compile assets
npm run dev

# 6. Inicie (3 terminais)
# Terminal 1: Servidor
php artisan serve

# Terminal 2: Queue Worker
php artisan queue:work

# Terminal 3: Scheduler (ou configure cron)
php artisan schedule:work
```

---

## Variáveis de Ambiente Essenciais

```env
# App
APP_NAME="My Taxi App"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com

# Database
DB_DATABASE=taxi_app
DB_USERNAME=root
DB_PASSWORD=your_password

# Multi-tenancy
TENANCY_KEY=your-secret-key-min-32-chars

# Google Maps (OBRIGATÓRIO)
GOOGLE_MAP_KEY=AIzaSy...

# Firebase (OBRIGATÓRIO para push)
FIREBASE_SERVER_KEY=AAAAxxx...
FIREBASE_DATABASE_URL=https://your-app.firebaseio.com

# Stripe
STRIPE_KEY=pk_live_xxx
STRIPE_SECRET=sk_live_xxx

# Queue
QUEUE_CONNECTION=redis

# Cache
CACHE_DRIVER=redis

# Session
SESSION_DRIVER=redis
```

---

## Checklist de Configuração

### ✅ Backend Setup

- [ ] `.env` configurado com todas as chaves
- [ ] `composer install` executado
- [ ] Migrations executadas: `php artisan migrate`
- [ ] Seeds executados: `php artisan db:seed`
- [ ] Passport instalado: `php artisan passport:install`
- [ ] Storage linkado: `php artisan storage:link`
- [ ] Redis funcionando
- [ ] Queue worker rodando
- [ ] Cron configurado

### ✅ Database

- [ ] MySQL 8+ instalado
- [ ] Extensões espaciais habilitadas
- [ ] Timezone configurado
- [ ] Collation: `utf8mb4_unicode_ci`
- [ ] Backup configurado

### ✅ External Services

- [ ] Google Maps API ativada com APIs necessárias:
  - Maps JavaScript API
  - Directions API
  - Distance Matrix API
  - Places API
  - Geocoding API
- [ ] Firebase projeto criado
- [ ] FCM configurado
- [ ] Realtime Database configurado
- [ ] Payment gateways configurados (pelo menos um)

### ✅ Server Requirements

- [ ] PHP 7.3+ ou 8.2+ com extensões:
  - BCMath
  - Ctype
  - JSON
  - Mbstring
  - OpenSSL
  - PDO
  - Tokenizer
  - XML
  - GD
  - MySQL PDO Driver
- [ ] Composer
- [ ] Node.js & NPM
- [ ] Redis Server
- [ ] Supervisor (para queues em produção)

---

## Comandos Úteis

### Desenvolvimento

```bash
# Servidor de desenvolvimento
php artisan serve --host=0.0.0.0 --port=8000

# Watch assets
npm run watch

# Queue worker (desenvolvimento)
php artisan queue:work --tries=3 --timeout=60

# Limpar caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Listar rotas
php artisan route:list

# Testar email
php artisan tinker
>>> Mail::raw('Test', function($m) { $m->to('test@test.com')->subject('Test'); });

# Gerar documentação da API
php artisan scribe:generate
```

### Produção

```bash
# Otimizar para produção
php artisan config:cache
php artisan route:cache
php artisan view:cache
composer install --optimize-autoloader --no-dev

# Rodar migrations com confirmação
php artisan migrate --force

# Restart queue workers
php artisan queue:restart

# Verificar status do Horizon
php artisan horizon:status
```

### Multi-tenancy

```bash
# Criar novo tenant
php artisan tenancy:install

# Listar tenants
php artisan tenancy:list

# Migrar tenant específico
php artisan tenancy:migrate --tenancy=tenant_database_name

# Seed tenant
php artisan tenancy:seed --tenancy=tenant_database_name
```

### Database

```bash
# Backup
mysqldump -u root -p taxi_app > backup.sql

# Restore
mysql -u root -p taxi_app < backup.sql

# Migrar + Seed fresh (CUIDADO: apaga tudo)
php artisan migrate:fresh --seed

# Status das migrations
php artisan migrate:status

# Rollback última migration
php artisan migrate:rollback

# Ver queries SQL (no tinker)
DB::enableQueryLog();
// ... executar código
DB::getQueryLog();
```

---

## Troubleshooting Comum

### Problema: "Class not found"

```bash
# Solução
composer dump-autoload
php artisan config:clear
php artisan cache:clear
```

### Problema: Erros de permissão

```bash
# Laravel precisa escrever em storage/ e bootstrap/cache/
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache

# Ou para desenvolvimento local
sudo chmod -R 777 storage bootstrap/cache
```

### Problema: OAuth "Client not found"

```bash
# Re-instalar Passport
php artisan passport:install --force

# Copiar client ID e secret para o .env
PASSPORT_CLIENT_ID=2
PASSPORT_CLIENT_SECRET=xxx
```

### Problema: Erros de CORS

**config/cors.php:**
```php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => ['*'], // Em produção, especifique domínios
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
```

### Problema: Queue não processa jobs

```bash
# Verificar se Redis está rodando
redis-cli ping
# Deve retornar: PONG

# Verificar jobs na fila
php artisan queue:work --once

# Ver failed jobs
php artisan queue:failed

# Retry failed job
php artisan queue:retry <job-id>

# Retry all failed jobs
php artisan queue:retry all
```

### Problema: Push notifications não funcionam

**Checklist:**
1. FCM Server Key correto no .env?
2. Device token sendo enviado no login?
3. Firebase Realtime Database rules configuradas?
4. Verificar logs: `tail -f storage/logs/laravel.log`

**Firebase Rules (Realtime Database):**
```json
{
  "rules": {
    "drivers": {
      "$driver_id": {
        ".read": true,
        ".write": true
      }
    },
    "requests": {
      "$request_id": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

### Problema: Spatial queries não funcionam

```sql
-- Verificar se MySQL tem suporte spatial
SHOW VARIABLES LIKE 'version';
-- Precisa ser MySQL 5.7+ ou 8+

-- Testar spatial
SELECT ST_GeomFromText('POINT(-23.5505 -46.6333)');
```

### Problema: Google Maps API errors

**Verificar:**
1. API Key correto no .env
2. APIs habilitadas no Google Cloud Console
3. Billing account ativa
4. Restrições de API Key (HTTP referrers, IPs)

**Testar API Key:**
```bash
curl "https://maps.googleapis.com/maps/api/geocode/json?address=1600+Amphitheatre+Parkway,+Mountain+View,+CA&key=YOUR_API_KEY"
```

### Problema: Payment gateway errors

**Stripe:**
```bash
# Testar webhook localmente
composer require stripe/stripe-cli --dev
stripe listen --forward-to localhost:8000/api/v1/payment/stripe/webhook
```

**Razorpay:**
```php
// Verificar credenciais
$api = new Api(env('RAZORPAY_KEY'), env('RAZORPAY_SECRET'));
$api->order->all();
```

---

## Configuração de Produção

### Supervisor para Queues

**/etc/supervisor/conf.d/taxi-worker.conf:**
```ini
[program:taxi-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/taxi-app/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=4
redirect_stderr=true
stdout_logfile=/var/www/taxi-app/storage/logs/worker.log
stopwaitsecs=3600
```

```bash
# Recarregar supervisor
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start taxi-worker:*

# Status
sudo supervisorctl status
```

### Nginx Configuration

**/etc/nginx/sites-available/taxi-app:**
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com;
    root /var/www/taxi-app/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_read_timeout 300;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }

    # Aumentar limites para uploads
    client_max_body_size 100M;
}
```

### Cron Configuration

```bash
# Editar crontab
crontab -e

# Adicionar linha
* * * * * cd /var/www/taxi-app && php artisan schedule:run >> /dev/null 2>&1
```

### SSL/HTTPS com Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Monitoramento e Logs

### Visualizar Logs em Tempo Real

```bash
# Laravel logs
tail -f storage/logs/laravel.log

# Nginx access
tail -f /var/log/nginx/access.log

# Nginx errors
tail -f /var/log/nginx/error.log

# PHP-FPM errors
tail -f /var/log/php8.2-fpm.log

# Queue worker logs (supervisor)
tail -f storage/logs/worker.log
```

### Laravel Telescope (Dev)

```bash
composer require laravel/telescope --dev
php artisan telescope:install
php artisan migrate

# Acesse /telescope
```

### Horizon Dashboard

```bash
# Já vem instalado
# Acesse /horizon

# Se não funcionar
php artisan horizon:install
php artisan migrate
```

### Métricas Importantes

**Database Performance:**
```sql
-- Queries lentas
SHOW PROCESSLIST;

-- Tabelas maiores
SELECT
  table_name AS 'Table',
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.TABLES
WHERE table_schema = 'taxi_app'
ORDER BY (data_length + index_length) DESC;

-- Índices não utilizados
SELECT * FROM sys.schema_unused_indexes;
```

**Redis:**
```bash
redis-cli info memory
redis-cli info stats
redis-cli slowlog get 10
```

---

## Performance Optimization

### Database Indexing

```sql
-- Índices importantes para performance

-- Users
CREATE INDEX idx_users_mobile ON users(mobile);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(active);

-- Drivers
CREATE INDEX idx_drivers_available ON drivers(available);
CREATE INDEX idx_drivers_service_location ON drivers(service_location_id);
CREATE SPATIAL INDEX idx_drivers_location ON drivers(latitude, longitude);

-- Requests
CREATE INDEX idx_requests_status ON requests(is_completed, is_cancelled);
CREATE INDEX idx_requests_created ON requests(created_at);
CREATE INDEX idx_requests_driver ON requests(driver_id);
CREATE INDEX idx_requests_user ON requests(user_id);

-- Wallet History
CREATE INDEX idx_wallet_history_user ON user_wallet_history(user_id);
CREATE INDEX idx_wallet_history_created ON user_wallet_history(created_at);
```

### Laravel Optimizations

**.env:**
```env
# Produção
APP_DEBUG=false
APP_ENV=production

# Session
SESSION_DRIVER=redis

# Cache
CACHE_DRIVER=redis

# Queue
QUEUE_CONNECTION=redis

# Logging
LOG_CHANNEL=daily
LOG_LEVEL=error
```

**config/database.php:**
```php
'options' => [
    PDO::ATTR_PERSISTENT => true,  // Conexões persistentes
    PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true,
],
```

### Eager Loading (Evitar N+1)

```php
// ❌ Ruim - N+1 queries
$requests = Request::all();
foreach ($requests as $request) {
    echo $request->user->name;
    echo $request->driver->name;
}

// ✅ Bom - Eager loading
$requests = Request::with(['user', 'driver', 'requestBill'])->get();
foreach ($requests as $request) {
    echo $request->user->name;
    echo $request->driver->name;
}
```

### Caching Strategies

```php
// Cache configurações
$settings = Cache::remember('app_settings', 3600, function () {
    return Setting::all();
});

// Cache tipos de veículo por zona
$vehicleTypes = Cache::remember("zone_{$zoneId}_types", 1800, function () use ($zoneId) {
    return ZoneType::where('zone_id', $zoneId)->get();
});

// Limpar cache específico
Cache::forget('app_settings');

// Limpar tudo
Cache::flush();
```

---

## Segurança - Checklist

### Produção

- [ ] `APP_DEBUG=false`
- [ ] `APP_ENV=production`
- [ ] Chaves de API em variáveis de ambiente
- [ ] HTTPS configurado
- [ ] CORS configurado corretamente
- [ ] Rate limiting habilitado
- [ ] `.env` não versionado
- [ ] Logs protegidos
- [ ] Backups automáticos
- [ ] Monitoring configurado
- [ ] Firewall configurado
- [ ] SSH com chave, não senha
- [ ] Fail2ban instalado

### Application Security

```php
// Sempre validar inputs
$validator = Validator::make($request->all(), [
    'mobile' => 'required|regex:/^[0-9]{10,15}$/',
    'email' => 'required|email',
    'amount' => 'required|numeric|min:0',
]);

// Usar query builder ou Eloquent (proteção contra SQL injection)
// ❌ Nunca fazer isso
DB::select("SELECT * FROM users WHERE id = " . $request->id);

// ✅ Fazer isso
User::find($request->id);
DB::table('users')->where('id', $request->id)->first();

// Verificar ownership
if ($request->user_id !== auth()->id()) {
    return response()->json(['error' => 'Unauthorized'], 403);
}

// Sanitizar outputs (XSS)
{{ $variable }}  // Blade automaticamente escapa
{!! $variable !!}  // Não escapa - use com cuidado

// CSRF protection (já vem habilitado)
@csrf
```

---

## Backup e Restore

### Backup Script

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
APP_DIR="/var/www/taxi-app"

# Database backup
mysqldump -u root -p'password' taxi_app > $BACKUP_DIR/db_$DATE.sql

# Files backup
tar -czf $BACKUP_DIR/files_$DATE.tar.gz $APP_DIR/storage/app/public

# Cleanup old backups (manter últimos 7 dias)
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# Tornar executável
chmod +x backup.sh

# Adicionar ao cron (diariamente às 2am)
0 2 * * * /path/to/backup.sh >> /var/log/backup.log 2>&1
```

### Restore

```bash
# Database
mysql -u root -p taxi_app < backup.sql

# Files
tar -xzf files_backup.tar.gz -C /var/www/taxi-app/storage/app/public
```

---

## Escalabilidade

### Horizontal Scaling

**Load Balancer (Nginx):**
```nginx
upstream taxi_app {
    least_conn;  # Algoritmo de balanceamento
    server 10.0.1.10:80 weight=3;
    server 10.0.1.11:80 weight=2;
    server 10.0.1.12:80 weight=1;
}

server {
    listen 80;
    server_name taxi-app.com;

    location / {
        proxy_pass http://taxi_app;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $http_host;
    }
}
```

### Database Replication

**Master-Slave Configuration:**
```php
// config/database.php
'mysql' => [
    'read' => [
        'host' => [
            '192.168.1.2',  // Slave 1
            '192.168.1.3',  // Slave 2
        ],
    ],
    'write' => [
        'host' => [
            '192.168.1.1',  // Master
        ],
    ],
    'driver' => 'mysql',
    'database' => 'taxi_app',
    // ...
],
```

### CDN para Assets

**AWS CloudFront + S3:**
```env
FILESYSTEM_DRIVER=s3
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=taxi-app-assets
AWS_URL=https://cdn.taxi-app.com
```

---

## Contatos e Suporte

**Documentação:**
- [CLAUDE.md](CLAUDE.md) - Visão geral da arquitetura
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - Documentação completa da API
- [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) - Guia de integração com exemplos

**Recursos Externos:**
- Laravel Docs: https://laravel.com/docs/8.x
- Laravel Passport: https://laravel.com/docs/8.x/passport
- Google Maps API: https://developers.google.com/maps
- Firebase: https://firebase.google.com/docs

**Troubleshooting:**
- Laravel Log Viewer: `/log-viewer` (se instalado)
- Horizon Dashboard: `/horizon`
- Telescope: `/telescope` (dev only)

---

## Changelog e Versões

Para manter rastreabilidade das mudanças:

```bash
# Criar tag de versão
git tag -a v1.0.0 -m "Versão 1.0.0 - Release inicial"
git push origin v1.0.0

# Ver versões
git tag -l

# Ver mudanças entre versões
git log v1.0.0..v1.1.0 --oneline
```

**Versionamento Semântico:**
- MAJOR: Mudanças incompatíveis na API
- MINOR: Novas funcionalidades compatíveis
- PATCH: Bug fixes compatíveis

Exemplo: v1.2.3
- 1 = Major version
- 2 = Minor version
- 3 = Patch version

---

## Quick Commands Cheatsheet

```bash
# Setup
composer install && npm install
php artisan migrate && php artisan db:seed
php artisan passport:install
php artisan storage:link

# Development
php artisan serve
php artisan queue:work
npm run watch

# Production Optimization
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Clear Everything
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
composer dump-autoload

# Queue Management
php artisan queue:work --tries=3
php artisan queue:failed
php artisan queue:retry all
php artisan queue:restart

# Database
php artisan migrate --force
php artisan db:seed --force
php artisan migrate:fresh --seed (DANGER!)

# Logs
tail -f storage/logs/laravel.log

# Testing
php artisan test
vendor/bin/phpunit --filter TestName
```

---

**Última atualização:** 2024
**Versão do documento:** 1.0

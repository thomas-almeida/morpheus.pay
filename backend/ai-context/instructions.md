# 🔧 Backend — Documentação de Arquitetura e Idealização

> **Stack:** Node.js + Express + MongoDB (Mongoose)  
> **Padrão:** MVC simples (Model → Controller → Route)  
> **Propósito:** MVP de um SaaS B2C onde creators de conteúdo adulto criam checkouts personalizados com múltiplos domínios e templates, integração PIX e gestão financeira centralizada.

---

## 📁 Estrutura de Pastas

```
backend/
├── src/
│   ├── config/
│   │   ├── db.js                  # Conexão com MongoDB via Mongoose
│   │   └── env.js                 # Centraliza e valida variáveis de ambiente
│   │
│   ├── models/
│   │   ├── User.js                # Usuário (dono do painel / creator)
│   │   ├── Model.js               # Persona/modelo vinculada ao usuário
│   │   └── Transaction.js         # Histórico de transações dos checkouts
│   │
│   ├── controllers/
│   │   ├── authController.js      # Login/Signup via email (Google OAuth delegado ao Next.js)
│   │   ├── userController.js      # CRUD de dados do usuário
│   │   ├── modelController.js     # CRUD de modelos/personas
│   │   └── kpiController.js       # KPIs, saldo, histórico, cliques
│   │
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── model.routes.js
│   │   └── kpi.routes.js
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.js     # Valida JWT em rotas protegidas
│   │   └── plan.middleware.js     # Valida limites do plano (freemium vs PRO)
│   │
│   ├── services/
│   │   ├── payment.service.js     # Abstração do AbacatePay (geração de QR PIX, validação de webhook)
│   │   └── token.service.js       # Geração e validação de JWT
│   │
│   └── app.js                     # Setup do Express, middlewares globais e rotas
│
├── .env.example
├── package.json
└── server.js                      # Entry point — inicia servidor e conecta DB
```

---

## 🗄️ Models (Mongoose Schemas)

### `User.js` — Dono do painel

```js
{
  email: String,           // único, vem do Google via NextAuth
  name: String,
  lastName: String,
  whatsapp: String,        // número para suporte
  pixKey: String,          // chave PIX para recebimento dos repasses
  plan: {
    type: String,
    enum: ['freemium', 'pro'],
    default: 'freemium'
  },
  balance: {
    available: Number,     // saldo disponível para saque (em centavos)
    pending: Number        // aguardando liquidação
  },
  models: [{ type: ObjectId, ref: 'Model' }],  // personas criadas
  createdAt: Date,
  updatedAt: Date
}
```

**Regra de negócio do plano:**
- `freemium` → máximo de **2 modelos/checkouts**
- `pro` → **ilimitado**

Essa validação é feita no `plan.middleware.js` antes de qualquer criação de modelo.

---

### `Model.js` — Persona / Checkout

```js
{
  owner: { type: ObjectId, ref: 'User' },  // usuário dono dessa persona

  // Identidade visual
  username: String,         // slug único da página: dominio.com/username
  displayName: String,      // nome de exibição na página de checkout
  description: String,      // bio/descrição
  profilePhoto: String,     // URL (ex: Cloudinary ou S3)
  coverPhoto: String,       // URL

  // Configuração do checkout
  domain: {
    type: String,
    enum: ['hotlink.fans', 'vaultpass.io', 'exclusivepass.me']
    // expansível: adicionar domínios sem quebrar schema
  },
  template: {
    type: String,
    enum: ['dark', 'clean', 'bold'],
    default: 'clean'
  },

  // Planos de assinatura disponíveis nesse checkout
  pricing: {
    weekly:  { price: Number, enabled: Boolean },   // 1 semana
    monthly: { price: Number, enabled: Boolean },   // mensal
    annual:  { price: Number, enabled: Boolean }    // anual
  },

  // KPIs desse checkout específico
  stats: {
    clicks: { type: Number, default: 0 },
    sales:  { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 }      // em centavos
  },

  isActive: { type: Boolean, default: true },
  createdAt: Date,
  updatedAt: Date
}
```

> `username` deve ser único dentro do mesmo domínio. A combinação `(domain + username)` forma a URL pública do checkout.

---

### `Transaction.js` — Histórico de transações

```js
{
  model: { type: ObjectId, ref: 'Model' },     // qual checkout gerou a venda
  owner: { type: ObjectId, ref: 'User' },      // usuário que receberá

  // Dados do comprador (mínimo para rastreio)
  buyer: {
    name: String,
    email: String
  },

  plan: {
    type: String,
    enum: ['weekly', 'monthly', 'annual']
  },
  amount: Number,              // valor em centavos
  platformFee: Number,         // taxa do SaaS retida (em centavos)
  netAmount: Number,           // valor líquido para o creator

  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },

  // Dados do gateway PIX
  gateway: {
    provider: String,          // 'abacatepay'
    paymentId: String,         // ID externo para reconciliação
    qrCode: String,            // string do PIX copia-e-cola
    qrCodeImage: String,       // URL da imagem do QR Code
    expiresAt: Date
  },

  paidAt: Date,
  createdAt: Date
}
```

---

## 🔌 Endpoints da API

Base URL: `/api/v1`

---

### Auth — `/api/v1/auth`

#### `POST /auth/session`
**Único endpoint de autenticação.** Recebe o email vindo do Google via NextAuth, verifica se o usuário já existe e faz login ou cria conta nova automaticamente.

```
Body:   { email, name, lastName }
Return: { token: JWT, user: { id, email, name, plan } }
```

**Lógica:**
1. Busca `User` pelo `email`
2. Se não existe → cria com plano `freemium` → retorna JWT
3. Se existe → retorna JWT
4. JWT gerado com `userId` no payload, expira em 7 dias

---

### User — `/api/v1/user` *(protegido por JWT)*

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/user/me` | Retorna dados completos do usuário autenticado |
| `PUT` | `/user/me` | Atualiza nome, sobrenome, whatsapp, chave PIX |
| `GET` | `/user/me/balance` | Retorna saldo disponível e pendente |

---

### Model — `/api/v1/models` *(protegido por JWT + plan middleware)*

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/models` | Lista todas as modelos do usuário autenticado |
| `POST` | `/models` | Cria nova modelo/persona |
| `GET` | `/models/:id` | Retorna dados de uma modelo específica |
| `PUT` | `/models/:id` | Atualiza dados da modelo (foto, preços, template, etc.) |
| `DELETE` | `/models/:id` | Desativa/remove modelo |
| `POST` | `/models/:id/click` | Registra clique no checkout (chamado pelo frontend público) |

**Middleware de plano em `POST /models`:**
```
freemium → conta os models do usuário → se >= 2, retorna 403 com mensagem de upgrade
pro      → sem limite
```

---

### KPIs — `/api/v1/kpi` *(protegido por JWT)*

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/kpi/overview` | KPIs consolidados: total de cliques, vendas, faturamento, saldo |
| `GET` | `/kpi/model/:id` | KPIs de uma modelo específica |
| `GET` | `/kpi/transactions` | Histórico de transações com filtros (`?status=paid&modelId=xxx&from=&to=`) |

**Resposta do `GET /kpi/overview`:**
```json
{
  "totalClicks": 1240,
  "totalSales": 87,
  "totalRevenue": 620000,
  "balance": {
    "available": 182000,
    "pending": 54000
  },
  "topModel": {
    "id": "...",
    "displayName": "Luna Dark",
    "sales": 42
  }
}
```

---

### Pagamento (AbacatePay + Webhook) — `/api/v1/payment`

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/payment/generate` | Gera QR Code PIX para o lead no checkout |
| `POST` | `/payment/webhook` | Recebe confirmação do gateway e atualiza Transaction + stats da modelo |

**Fluxo `POST /payment/generate`:**
```
Body: { modelId, plan: 'monthly', buyer: { name, email } }

1. Busca Model e calcula amount via pricing[plan]
2. Cria Transaction com status 'pending'
3. Chama payment.service.js → AbacatePay gera cobrança PIX
4. Salva retorno do AbacatePay na Transaction (paymentId, qrCode, qrCodeImage, expiresAt)
5. Retorna { qrCode, qrCodeImage, expiresAt, transactionId }
```

**Fluxo `POST /payment/webhook`:**
```
1. Valida assinatura HMAC do AbacatePay no header da requisição
2. Busca Transaction pelo gateway.paymentId
3. Atualiza status → 'paid', paidAt
4. Incrementa model.stats (sales, totalRevenue)
5. Atualiza user.balance.pending += netAmount
6. Retorna 200 OK para o AbacatePay
```

> ⚠️ Este endpoint é público (chamado pelo AbacatePay), mas deve validar a assinatura HMAC enviada no header do webhook para evitar fraudes. Consulte a documentação em https://abacatepay.com/docs para o campo exato do header de assinatura.

---

## 🔑 Middleware de Autenticação

`auth.middleware.js` — aplicado em todas as rotas exceto `/auth/session`, o registro de clique público e o webhook de pagamento.

```js
// Verifica Bearer token no header Authorization
// Decodifica JWT → injeta req.userId
// Se inválido ou expirado → 401 Unauthorized
```

---

## 🌐 Endpoint Público — Checkout

`GET /api/v1/public/checkout/:domain/:username`

Chamado pelo frontend de cada domínio para renderizar o checkout.

```
Return: {
  displayName, description, profilePhoto, coverPhoto,
  template, pricing, stats: { clicks }
}
```

Não retorna dados sensíveis (PIX do owner, email, etc). Apenas o necessário para o template renderizar a página.

---

## ⚙️ Variáveis de Ambiente (`.env.example`)

```env
# Servidor
PORT=3001
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/saas-checkout

# JWT
JWT_SECRET=sua_chave_secreta_aqui
JWT_EXPIRES_IN=7d

# Gateway de Pagamento
PAYMENT_PROVIDER=abacatepay
ABACATEPAY_API_KEY=your_abacatepay_api_key
ABACATEPAY_WEBHOOK_SECRET=your_abacatepay_webhook_secret

# Domínios permitidos para checkout (validação no Model schema)
ALLOWED_DOMAINS=hotlink.fans,vaultpass.io,exclusivepass.me

# Taxa da plataforma (percentual sobre transações)
PLATFORM_FEE_PERCENT=10
```

---

## 🚀 Setup e Execução

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev       # usa nodemon

# Rodar em produção
npm start
```

**Dependências principais:**
```json
{
  "express": "^4.18.x",
  "mongoose": "^8.x",
  "jsonwebtoken": "^9.x",
  "dotenv": "^16.x",
  "cors": "^2.x",
  "helmet": "^7.x",
  "express-rate-limit": "^7.x",
  "abacatepay-node-sdk": "latest"
}
```

---

## 📐 Regras de Negócio Centrais

| Regra | Detalhe |
|-------|---------|
| Auth por email | Um único endpoint recebe o email do Google, não existe senha. JWT é o mecanismo de sessão. |
| Limite de modelos | `freemium` → 2 checkouts. `pro` → ilimitado. Validado via middleware antes de criar. |
| Username único por domínio | A combinação `domain + username` deve ser única no banco. Índice composto no Model. |
| Taxa da plataforma | Calculada no momento da transação e armazenada em `platformFee`. Nunca recalculada retroativamente. |
| Saldo | Incrementado como `pending` no webhook. Lógica de liquidação (mover para `available`) pode ser via cron job diário ou manual via admin. |
| Cliques | Registrados sem autenticação. Rate limiting por IP para evitar inflate artificial. |

---

## 🔄 Fluxo Completo — Visão Geral

```
[Google OAuth no Next.js]
        ↓
POST /auth/session  →  JWT retornado
        ↓
Usuário preenche perfil → PUT /user/me
        ↓
Cria modelo → POST /models  (middleware verifica plano)
        ↓
Lead acessa dominio.com/username
        ↓
GET /public/checkout/:domain/:username  → template renderiza
        ↓
Lead clica em "Assinar"
        ↓
POST /payment/generate  →  AbacatePay gera cobrança PIX + QR Code
        ↓
Lead paga via PIX
        ↓
AbacatePay dispara webhook → POST /payment/webhook
        ↓
Transaction atualizada → stats da modelo incrementados → saldo do creator atualizado
        ↓
Creator vê no painel: GET /kpi/overview + GET /kpi/transactions
```

---

## 📌 Próximos Passos pós-MVP

- [ ] Endpoint de saque (`POST /user/me/withdraw`) com integração PIX out via AbacatePay
- [ ] Renovação automática de assinaturas (cron + lógica de recorrência)
- [ ] Upload de imagens (integração Cloudinary ou AWS S3)
- [ ] Painel admin interno para gestão de usuários e saques
- [ ] Plano PRO — integração com gateway de pagamento para cobrança da mensalidade do SaaS
- [ ] Notificações WhatsApp via Twilio ou Z-API (nova venda, saque processado)

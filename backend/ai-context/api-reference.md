# API Reference — Backend MVP

Base URL: `http://localhost:3001/api/v1`

---

## Auth

### `POST /auth/session`
Cria ou autentica usuário via email (Google OAuth delegate).

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|--------------|-----------|
| email | string | ✅ | Email do usuário |
| name | string | ❌ | Nome de exibição |
| lastName | string | ❌ | Sobrenome |

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John",
    "plan": "freemium"
  }
}
```

---

## User (Protegido)

### `GET /user/me`
Retorna dados completos do usuário autenticado.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "name": "John",
  "lastName": "Doe",
  "whatsapp": "+5511999999999",
  "pixKey": "cpf:12345678900",
  "plan": "freemium",
  "balance": {
    "available": 50000,
    "pending": 10000
  },
  "models": ["..."],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### `PUT /user/me`
Atualiza dados do usuário.

**Headers:** `Authorization: Bearer <token>`

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|--------------|-----------|
| name | string | ❌ | Nome de exibição |
| lastName | string | ❌ | Sobrenome |
| whatsapp | string | ❌ | Número para suporte |
| pixKey | string | ❌ | Chave PIX para recebimento |

**Body:**
```json
{
  "name": "John",
  "lastName": "Doe",
  "whatsapp": "+5511999999999",
  "pixKey": "cpf:12345678900"
}
```

**Response (200):** Retorna usuário atualizado.

---

### `GET /user/me/balance`
Retorna saldo disponível e pendente.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "available": 50000,
  "pending": 10000
}
```

---

### `POST /user/upgrade`
Contrata o plano PRO (R$ 47,90/mês).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "subscriptionId": "507f1f77bcf86cd799439012",
  "qrCode": "00020126580014br.gov.bcb.pix0136...",
  "qrCodeImageBase64": "data:image/png;base64,...",
  "expiresAt": "2025-04-24T21:50:20.772Z",
  "amount": 4790,
  "plan": "pro"
}
```

**Response (400) — Já é PRO:**
```json
{
  "error": "PRO plan already active",
  "planExpiration": "2025-04-24T21:50:20.772Z"
}
```

---

## Models (Protegido + Plan Middleware)

### `GET /models`
Lista todas as modelos do usuário autenticado.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "owner": "...",
    "username": "lunadark",
    "displayName": "Luna Dark",
    "description": "Conteúdo exclusivo",
    "profilePhoto": "https://...",
    "coverPhoto": "https://...",
    "domains": ["hotlink.fans", "vaultpass.io"],
    "template": "dark",
    "pricing": {
      "weekly": { "price": 1500, "enabled": true },
      "monthly": { "price": 5000, "enabled": true },
      "annual": { "price": 45000, "enabled": false }
    },
    "stats": {
      "clicks": 150,
      "sales": 12,
      "totalRevenue": 60000
    },
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### `POST /models`
Cria nova modelo/persona.

**Headers:** `Authorization: Bearer <token>`

**Restrição:** Usuários `freemium` limitado a 2 modelos.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|--------------|-----------|
| username | string | ✅ | Slug único (lowercase) |
| displayName | string | ✅ | Nome de exibição |
| description | string | ❌ | Bio/descrição |
| profilePhoto | string | ❌ | URL da foto |
| coverPhoto | string | ❌ | URL da capa |
| domains | array | ✅ | Lista de domínios (mínimo 1) |
| template | string | ❌ | dark, clean, bold |
| pricing | object | ❌ | Planos e preços |

**Body:**
```json
{
  "username": "lunadark",
  "displayName": "Luna Dark",
  "description": "Conteúdo exclusivo",
  "profilePhoto": "https://cdn.example.com/photo.jpg",
  "coverPhoto": "https://cdn.example.com/cover.jpg",
  "domains": ["hotlink.fans", "vaultpass.io"],
  "template": "dark",
  "pricing": {
    "weekly": { "price": 1500, "enabled": true },
    "monthly": { "price": 5000, "enabled": true },
    "annual": { "price": 45000, "enabled": false }
  }
}
```

**Response (201):** Retorna modelo criada.

**Response (403) — Limite freemium:**
```json
{
  "error": "Freemium limit reached",
  "message": "Upgrade to PRO to create unlimited models",
  "limit": 2,
  "current": 2
}
```

---

### `GET /models/:id`
Retorna dados de uma modelo específica.

**Headers:** `Authorization: Bearer <token>`

**Response (200):** Retorna modelo específica.

---

### `PUT /models/:id`
Atualiza dados da modelo.

**Headers:** `Authorization: Bearer <token>`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| displayName | string | Nome de exibição |
| description | string | Bio |
| profilePhoto | string | URL |
| coverPhoto | string | URL |
| domains | array | Lista de domínios (substitui os anteriores) |
| template | string | dark, clean, bold |
| pricing | object | Planos e preços |
| isActive | boolean | Ativar/desativar |

**Body:**
```json
{
  "displayName": "Luna Dark Updated",
  "domains": ["hotlink.fans", "vaultpass.io", "exclusivepass.me"],
  "pricing": {
    "weekly": { "price": 2000, "enabled": true },
    "monthly": { "price": 6000, "enabled": true }
  }
}
```

**Response (200):** Retorna modelo atualizada.

---

### `DELETE /models/:id`
Desativa/remove modelo (soft delete).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "Model deleted successfully"
}
```

---

### `POST /models/:id/click`
Registra clique no checkout (público, sem auth).

**Response (200):**
```json
{
  "success": true,
  "clicks": 151
}
```

---

## KPIs (Protegido)

### `GET /kpi/overview`
KPIs consolidados do usuário.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
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
    "id": "507f1f77bcf86cd799439011",
    "displayName": "Luna Dark",
    "sales": 42
  }
}
```

---

### `GET /kpi/model/:id`
KPIs de uma modelo específica.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "displayName": "Luna Dark",
  "stats": {
    "clicks": 150,
    "sales": 12,
    "totalRevenue": 60000
  }
}
```

---

### `GET /kpi/transactions`
Histórico de transações com filtros.

**Headers:** `Authorization: Bearer <token>`

**Query Params:**
| Param | Tipo | Descrição |
|-------|------|-----------|
| status | string | pending, paid, failed, refunded |
| modelId | string | Filtrar por modelo |
| from | date | Data inicial (YYYY-MM-DD) |
| to | date | Data final (YYYY-MM-DD) |

**Exemplo:** `GET /kpi/transactions?status=paid&modelId=507f1f77bcf86cd799439011`

**Response (200):**
```json
[
  {
    "_id": "...",
    "model": {
      "_id": "507f1f77bcf86cd799439011",
      "displayName": "Luna Dark"
    },
    "buyer": {
      "name": "John Buyer",
      "email": "buyer@example.com"
    },
    "plan": "monthly",
    "amount": 5000,
    "platformFee": 500,
    "netAmount": 4500,
    "status": "paid",
    "paidAt": "2024-01-15T10:00:00.000Z",
    "createdAt": "2024-01-15T09:55:00.000Z"
  }
]
```

---

## Payment

### `POST /payment/generate`
Gera QR Code PIX para o lead no checkout (checkout transparente).

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|--------------|-----------|
| modelId | string | ✅ | ID da modelo |
| plan | string | ✅ | weekly, monthly, annual |
| buyer | object | ✅ | Dados do comprador |
| buyer.name | string | ✅ | Nome |
| buyer.email | string | ✅ | Email |
| buyer.cellphone | string | ❌ | Celular |
| buyer.taxId | string | ❌ | CPF/CNPJ |

**Body:**
```json
{
  "modelId": "507f1f77bcf86cd799439011",
  "plan": "monthly",
  "buyer": {
    "name": "John Buyer",
    "email": "buyer@example.com",
    "cellphone": "+5511999999999",
    "taxId": "12345678901"
  }
}
```

**Response (200):**
```json
{
  "transactionId": "507f1f77bcf86cd799439012",
  "qrCode": "00020126580014br.gov.bcb.pix0136...",
  "qrCodeImageBase64": "data:image/png;base64,iVBORw0KGgo...",
  "expiresAt": "2025-03-25T21:50:20.772Z",
  "amount": 5000,
  "platformFee": 500,
  "plan": "monthly"
}
```

---

### `GET /payment/status/:transactionId`
Verifica status do pagamento (usado no botão "Já paguei" do frontend).

**Response (200) — Pendente:**
```json
{
  "transactionId": "507f1f77bcf86cd799439012",
  "status": "PENDING",
  "expiresAt": "2025-03-25T21:50:20.772Z"
}
```

**Response (200) — Pago:**
```json
{
  "transactionId": "507f1f77bcf86cd799439012",
  "status": "paid",
  "paidAt": "2025-03-24T22:00:00.000Z"
}
```

---

### `POST /payment/webhook`
Recebe confirmação do gateway (público, valida via query string).

**URL:** `POST /api/v1/payment/webhook?webhookSecret=<secret>`

**Query Params:**
| Param | Descrição |
|-------|-----------|
| webhookSecret | Secret configurado nas variáveis de ambiente |

**Body (recebido do gateway):**
```json
{
  "id": "log_12345abcdef",
  "data": {
    "payment": {
      "amount": 1000,
      "fee": 80,
      "method": "PIX"
    },
    "pixQrCode": {
      "amount": 1000,
      "id": "pix_char_mXTWdj6sABWnc4uL2Rh1r6tb",
      "kind": "PIX",
      "status": "PAID"
    }
  },
  "devMode": false,
  "event": "billing.paid"
}
```

**Response (200):**
```json
{
  "received": true
}
```

---

## Público

### `GET /public/checkout/:domain/:username`
Retorna dados públicos do checkout para renderização.

**Response (200):**
```json
{
  "displayName": "Luna Dark",
  "description": "Conteúdo exclusivo",
  "profilePhoto": "https://...",
  "coverPhoto": "https://...",
  "template": "dark",
  "pricing": {
    "weekly": { "price": 1500, "enabled": true },
    "monthly": { "price": 5000, "enabled": true },
    "annual": { "price": 45000, "enabled": false }
  },
  "stats": {
    "clicks": 150
  }
}
```

---

## Health Check

### `GET /health`
Verifica se o servidor está online.

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

---

## Códigos de Erro

| Código | Descrição |
|--------|-----------|
| 400 | Bad Request — dados inválidos |
| 401 | Unauthorized — token inválido/expirado |
| 403 | Forbidden — limite atingido ou acesso negado |
| 404 | Not Found — recurso não encontrado |
| 500 | Internal Server Error |

---

## Observações

- Todos os valores monetários em **centavos** (R$ 50,00 = 5000)
- Token JWT expira em 7 dias
- Webhook valida secret via query string (`?webhookSecret=xxx`)
- Cliques têm rate limiting por IP
- Checkout transparente: QR Code gerado localmente, sem redirecionamento
- Status do pagamento pode ser verificado via endpoint ou webhook

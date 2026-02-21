## criar QR Code PIX:
### paylaod:

curl --request POST \
  --url https://api.abacatepay.com/v1/pixQrCode/create \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '
{
  "amount": 123,
  "expiresIn": 123,
  "description": "<string>",
  "customer": {
    "name": "Daniel Lima",
    "cellphone": "(11) 4002-8922",
    "email": "daniel_lima@abacatepay.com",
    "taxId": "123.456.789-01"
  },
  "metadata": {
    "externalId": "123"
  }
}
'

### saida (200)
{
  "data": {
    "id": "pix_char_123456",
    "amount": 100,
    "status": "PENDING",
    "devMode": true,
    "brCode": "00020101021226950014br.gov.bcb.pix",
    "brCodeBase64": "data:image/png;base64,iVBORw0KGgoAAA",
    "platformFee": 80,
    "createdAt": "2025-03-24T21:50:20.772Z",
    "updatedAt": "2025-03-24T21:50:20.772Z",
    "expiresAt": "2025-03-25T21:50:20.772Z"
  },
  "error": null
}


## Checar Status

### GET
curl --request GET \
  --url https://api.abacatepay.com/v1/pixQrCode/check \
  --header 'Authorization: Bearer <token>'

### Saida EXEMPLO
{
  "data": {
    "status": "PENDING",
    "expiresAt": "2025-03-25T21:50:20.772Z"
  },
  "error": null
}


## Webhook

- 1) Secret na URL (autenticação simples)
Cada chamada de webhook inclui o secret configurado como parâmetro de query string.
### URL base do seu webhook:
> https://meusite.com/webhook/abacatepay
### URL com secret (como será chamado):
> https://meusite.com/webhook/abacatepay?webhookSecret=seu_secret_aqui
### Exemplo de validação (Express):
app.post('/webhook/abacatepay', (req, res) => {
  const webhookSecret = req.query.webhookSecret;
  if (webhookSecret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid webhook secret' });
  }

  const event = req.body;
  console.log('Received webhook:', event);
  res.status(200).json({ received: true });
});

### Eventos Suportados
Atualmente, suportamos os seguintes eventos:
​
> billing.paid

Este evento é disparado quando um pagamento é confirmado. O payload varia dependendo da origem do pagamento:
#### PIX QR Code
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
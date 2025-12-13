import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, Typography, MenuItem, TextField, Button, Stack, CardMedia } from '@mui/material';

const api = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`${api}/api/products/${id}`).then((res) => res.json()).then(setProduct);
  }, [id]);

  const requestOtp = async () => {
    await fetch(`${api}/api/auth/customer/request-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target: email }) });
    setMessage('Código enviado al correo');
  };

  const reserve = async (otpCode) => {
    const customerRes = await fetch(`${api}/api/auth/customer/verify-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target: email, code: otpCode }) });
    const customer = await customerRes.json();
    const res = await fetch(`${api}/api/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: customer.customer.id, items: [{ variantId, quantity }] }),
    });
    const data = await res.json();
    setMessage(`Reserva creada: ${data.code}`);
  };

  if (!product) return <p>Cargando...</p>;

  return (
    <Card>
      {product.imageUrl && <CardMedia component="img" height="260" image={product.imageUrl} alt={product.name} />}
      <CardContent>
        <Typography variant="h5">{product.name}</Typography>
        <Typography sx={{ mb: 2 }}>{product.description}</Typography>
        <Stack spacing={2}>
          <TextField select label="Variante" value={variantId} onChange={(e) => setVariantId(e.target.value)}>
            {product.variants.map((v) => (
              <MenuItem key={v.id} value={v.id}>{`${v.size} / ${v.color} - ₡${v.price}`}</MenuItem>
            ))}
          </TextField>
          <TextField type="number" label="Cantidad" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          <TextField label="Correo" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Stack direction="row" spacing={2}>
            <Button variant="outlined" onClick={requestOtp}>Enviar OTP</Button>
            <Button variant="contained" onClick={() => reserve(prompt('Ingresa el OTP recibido'))}>Reservar</Button>
          </Stack>
          {message && <Typography color="primary">{message}</Typography>}
        </Stack>
      </CardContent>
    </Card>
  );
}

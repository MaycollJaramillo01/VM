import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Card,
  CardContent,
  Typography,
  MenuItem,
  TextField,
  Button,
  Stack,
  Chip,
  Divider,
  Alert,
  CardMedia,
  Grid,
  Box,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SparklesIcon from '@mui/icons-material/AutoAwesome';

const api = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [loadingReservation, setLoadingReservation] = useState(false);

  useEffect(() => {
    fetch(`${api}/api/products/${id}`).then((res) => res.json()).then(setProduct);
  }, [id]);

  const requestOtp = async () => {
    setLoadingOtp(true);
    await fetch(`${api}/api/auth/customer/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: email }),
    });
    setMessageType('info');
    setMessage('Código enviado al correo. Revísalo e ingrésalo para confirmar la reserva.');
    setLoadingOtp(false);
  };

  const reserve = async (otpCode) => {
    try {
      setLoadingReservation(true);
      const customerRes = await fetch(`${api}/api/auth/customer/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: email, code: otpCode }),
      });
      if (!customerRes.ok) {
        throw new Error('OTP inválido. Intenta nuevamente.');
      }

      const customer = await customerRes.json();
      const res = await fetch(`${api}/api/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: customer.customer.id, items: [{ variantId, quantity }] }),
      });

      if (!res.ok) {
        throw new Error('No se pudo crear la reserva.');
      }

      const data = await res.json();
      setMessageType('success');
      setMessage(`Reserva creada: ${data.code}`);
      setOtpCode('');
    } catch (error) {
      setMessageType('error');
      setMessage(error.message);
    } finally {
      setLoadingReservation(false);
    }
  };

  if (!product) return <p>Cargando...</p>;

  const selectedVariant = useMemo(
    () => product?.variants.find((v) => v.id === variantId),
    [product, variantId]
  );

  const cover =
    product.image ||
    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80&sat=-15&blend-mode=overlay';

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <CardMedia
          component="img"
          image={cover}
          alt={product.name}
          sx={{ borderRadius: 3, height: { xs: 260, md: 360 }, objectFit: 'cover' }}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <Card sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Button startIcon={<ArrowBackIcon />} component={RouterLink} to="/" color="inherit">
                Volver al catálogo
              </Button>
              <Chip label={product.category} color="primary" variant="outlined" />
            </Stack>

            <Box>
              <Typography variant="h5">{product.name}</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                {product.description}
              </Typography>
            </Box>

            <Divider />

            <TextField
              select
              label="Variante"
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
              helperText={selectedVariant ? `Precio: ₡${selectedVariant.price}` : 'Elige talla/color'}
            >
              {product.variants.map((v) => (
                <MenuItem key={v.id} value={v.id}>{`${v.size} / ${v.color} - ₡${v.price}`}</MenuItem>
              ))}
            </TextField>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                type="number"
                label="Cantidad"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                inputProps={{ min: 1 }}
              />
              <TextField label="Correo para la reserva" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Código OTP"
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
              />
              <Button variant="outlined" onClick={requestOtp} disabled={!email || loadingOtp}>
                {loadingOtp ? 'Enviando…' : 'Enviar OTP'}
              </Button>
              <Button
                variant="contained"
                startIcon={<SparklesIcon />}
                onClick={() => reserve(otpCode)}
                disabled={!variantId || !otpCode || loadingReservation}
              >
                {loadingReservation ? 'Creando reserva…' : 'Reservar' }
              </Button>
            </Stack>

            {message && <Alert severity={messageType}>{message}</Alert>}
          </Stack>
        </Card>
      </Grid>
    </Grid>
  );
}

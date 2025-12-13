import React, { useState } from 'react';
import {
  TextField,
  Button,
  Typography,
  Stack,
  Card,
  CardContent,
  Divider,
  Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

const api = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function ReservationPage() {
  const [code, setCode] = useState('');
  const [reservation, setReservation] = useState(null);

  const search = async () => {
    const res = await fetch(`${api}/api/reservations/${code}`);
    if (res.ok) setReservation(await res.json());
  };

  return (
    <Stack spacing={3}>
      <Card sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h5">Rastrea tu reserva</Typography>
          <Typography color="text.secondary">
            Ingresa el código que te enviamos por correo. Te mostraremos el estado y la fecha de expiración.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label="Código"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ej: RSV-12345"
            />
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={search}
              disabled={!code}
              sx={{ minWidth: 160 }}
            >
              Buscar
            </Button>
          </Stack>
        </Stack>
      </Card>

      {reservation && (
        <Card sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">{reservation.code}</Typography>
              <Chip
                label={reservation.status}
                color={reservation.status === 'active' ? 'success' : 'default'}
                variant="outlined"
              />
            </Stack>
            <Divider />
            <Typography color="text.secondary">
              Expira: {new Date(reservation.expiresAt).toLocaleString()}
            </Typography>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}

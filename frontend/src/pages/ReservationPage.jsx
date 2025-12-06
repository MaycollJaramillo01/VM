import React, { useState } from 'react';
import { TextField, Button, Typography, Stack, Card, CardContent } from '@mui/material';

const api = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function ReservationPage() {
  const [code, setCode] = useState('');
  const [reservation, setReservation] = useState(null);

  const search = async () => {
    const res = await fetch(`${api}/api/reservations/${code}`);
    if (res.ok) setReservation(await res.json());
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Buscar reserva</Typography>
      <Stack direction="row" spacing={2}>
        <TextField label="Código" value={code} onChange={(e) => setCode(e.target.value)} />
        <Button variant="contained" onClick={search}>Buscar</Button>
      </Stack>
      {reservation && (
        <Card>
          <CardContent>
            <Typography variant="h6">{reservation.code}</Typography>
            <Typography>Estado: {reservation.status}</Typography>
            <Typography>Expira: {new Date(reservation.expiresAt).toLocaleString()}</Typography>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}

import React, { useEffect, useState } from 'react';
import { Typography, TextField, Button, Stack, Card, CardContent, Grid } from '@mui/material';

const api = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function AdminDashboard() {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('admin@angelshop.cr');
  const [password, setPassword] = useState('changeme');
  const [overview, setOverview] = useState(null);

  const login = async () => {
    const res = await fetch(`${api}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setToken(data.token);
  };

  useEffect(() => {
    if (!token) return;
    fetch(`${api}/api/reports/overview`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then(setOverview);
  }, [token]);

  return (
    <Stack spacing={3}>
      <Typography variant="h5">Panel admin</Typography>
      {!token && (
        <Stack direction="row" spacing={2}>
          <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button variant="contained" onClick={login}>Ingresar</Button>
        </Stack>
      )}
      {overview && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Card><CardContent><Typography>Productos: {overview.productCount}</Typography></CardContent></Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card><CardContent><Typography>Reservas: {overview.reservationCount}</Typography></CardContent></Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card><CardContent><Typography>Activas: {overview.activeReservations}</Typography></CardContent></Card>
          </Grid>
        </Grid>
      )}
    </Stack>
  );
}

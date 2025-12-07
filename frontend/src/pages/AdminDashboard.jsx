import React, { useEffect, useState } from 'react';
import { Typography, TextField, Button, Stack, Card, CardContent, Grid, Divider } from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';

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
      <Card sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <InsightsIcon color="primary" />
          <div>
            <Typography variant="h5">Panel admin</Typography>
            <Typography color="text.secondary">Estadísticas rápidas para monitorear la tienda.</Typography>
          </div>
        </Stack>
        {!token && (
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 2 }}>
            <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
            <TextField
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
            />
            <Button variant="contained" onClick={login} sx={{ minWidth: 160 }}>
              Ingresar
            </Button>
          </Stack>
        )}
      </Card>

      {overview && (
        <Card sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle1">Resumen en vivo</Typography>
            <Divider />
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography color="text.secondary">Productos</Typography>
                    <Typography variant="h5">{overview.productCount}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography color="text.secondary">Reservas</Typography>
                    <Typography variant="h5">{overview.reservationCount}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography color="text.secondary">Activas</Typography>
                    <Typography variant="h5">{overview.activeReservations}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}

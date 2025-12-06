import React from 'react';
import { AppBar, Toolbar, Typography, Container, Button, Stack } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export default function Layout({ children }) {
  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Ángel Shop
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button color="inherit" component={RouterLink} to="/">Catálogo</Button>
            <Button color="inherit" component={RouterLink} to="/reservations">Reservas</Button>
            <Button color="inherit" component={RouterLink} to="/admin">Admin</Button>
          </Stack>
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 3 }}>{children}</Container>
    </>
  );
}

import React from 'react';
import { AppBar, Toolbar, Typography, Container, Button, Stack, Box, Chip } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { Link as RouterLink } from 'react-router-dom';

export default function Layout({ children }) {
  return (
    <>
      <AppBar position="sticky" color="default">
        <Toolbar sx={{ py: 1, gap: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ flexGrow: 1 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: 'white',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <StorefrontIcon />
            </Box>
            <Box>
              <Typography variant="h6">Ángel Shop</Typography>
              <Typography variant="caption" color="text.secondary">
                Experiencia boutique inspirada en Shopify
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label="Nuevo" color="primary" variant="outlined" size="small" />
            <Button color="inherit" component={RouterLink} to="/">Catálogo</Button>
            <Button color="inherit" component={RouterLink} to="/reservations">Reservas</Button>
            <Button variant="contained" component={RouterLink} to="/admin">Admin</Button>
          </Stack>
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 4, mb: 5 }}>{children}</Container>
    </>
  );
}

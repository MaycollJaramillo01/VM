import React, { useEffect, useState } from 'react';
import { Grid, Card, CardContent, Typography, CardActions, Button, Chip } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { io } from 'socket.io-client';

const api = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const socket = io(api);

export default function CatalogPage() {
  const [products, setProducts] = useState([]);

  const load = async () => {
    const res = await fetch(`${api}/api/products`);
    const data = await res.json();
    setProducts(data);
  };

  useEffect(() => {
    load();
    socket.on('stock:update', load);
    return () => socket.off('stock:update', load);
  }, []);

  return (
    <Grid container spacing={2}>
      {products.map((product) => (
        <Grid item xs={12} md={4} key={product.id}>
          <Card>
            <CardContent>
              <Typography variant="h6">{product.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {product.description}
              </Typography>
              <Typography variant="caption">{product.category}</Typography>
              <div style={{ marginTop: 8 }}>
                {product.variants.map((v) => (
                  <Chip key={v.id} label={`${v.size}/${v.color} ₡${v.price}`} sx={{ mr: 0.5, mb: 0.5 }} />
                ))}
              </div>
            </CardContent>
            <CardActions>
              <Button component={RouterLink} to={`/products/${product.id}`}>Ver</Button>
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

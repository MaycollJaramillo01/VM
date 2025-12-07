import React, { useEffect, useMemo, useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  CardActions,
  Button,
  Chip,
  Stack,
  Box,
  TextField,
  InputAdornment,
  MenuItem,
  Slider,
  CardMedia,
  Divider,
  Skeleton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SparklesIcon from '@mui/icons-material/AutoAwesome';
import { Link as RouterLink } from 'react-router-dom';
import { io } from 'socket.io-client';

const api = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const socket = io(api);

export default function CatalogPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  const [priceRange, setPriceRange] = useState([0, 0]);

  const minPrice = useMemo(() => {
    if (!products.length) return 0;
    return Math.min(...products.flatMap((p) => p.variants.map((v) => v.price)));
  }, [products]);

  const maxPrice = useMemo(() => {
    if (!products.length) return 0;
    return Math.max(...products.flatMap((p) => p.variants.map((v) => v.price)));
  }, [products]);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`${api}/api/products`);
    const data = await res.json();
    setProducts(data);
    if (data.length) {
      const prices = data.flatMap((p) => p.variants.map((v) => v.price));
      setPriceRange([Math.min(...prices), Math.max(...prices)]);
    } else {
      setPriceRange([0, 0]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    socket.on('stock:update', load);
    return () => socket.off('stock:update', load);
  }, []);

  const categories = useMemo(() => ['all', ...new Set(products.map((p) => p.category))], [products]);

  const filteredProducts = useMemo(() => {
    return products
      .filter((product) =>
        `${product.name} ${product.description}`.toLowerCase().includes(search.toLowerCase())
      )
      .filter((product) => (category === 'all' ? true : product.category === category))
      .filter((product) => {
        const productPrices = product.variants.map((v) => v.price);
        return Math.min(...productPrices) <= priceRange[1] && Math.max(...productPrices) >= priceRange[0];
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') {
          return Math.min(...a.variants.map((v) => v.price)) - Math.min(...b.variants.map((v) => v.price));
        }
        if (sortBy === 'price-desc') {
          return Math.min(...b.variants.map((v) => v.price)) - Math.min(...a.variants.map((v) => v.price));
        }
        return a.name.localeCompare(b.name);
      });
  }, [category, priceRange, products, search, sortBy]);

  const heroCard = (
    <Card
      sx={{
        p: 4,
        background:
          'linear-gradient(135deg, rgba(0,128,96,0.08) 0%, rgba(17,18,19,0.08) 100%)',
        border: '1px solid #e6e6e6',
      }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center">
        <Box sx={{ flex: 1 }}>
          <Typography variant="overline" color="primary.main">Nueva colección</Typography>
          <Typography variant="h4" sx={{ mt: 1, mb: 1 }}>
            Descubre productos curados con una experiencia Shopify
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Filtra por categoría, rango de precios y encuentra variantes en segundos. Las
            tarjetas muestran combinaciones populares para reservar sin fricción.
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button variant="contained" startIcon={<SparklesIcon />} component={RouterLink} to="/reservations">
              Ver mis reservas
            </Button>
            <Button variant="outlined" component={RouterLink} to="/admin">Ir al panel admin</Button>
          </Stack>
        </Box>
        <Box
          sx={{
            p: 3,
            borderRadius: 3,
            bgcolor: 'white',
            border: '1px solid #e6e6e6',
            minWidth: { md: 320 },
          }}
        >
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Curamos cada detalle</Typography>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip color="primary" label="UX" size="small" />
              <Typography variant="body2">Micro-interacciones suaves y CTA claros.</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip color="success" label="Live" size="small" />
              <Typography variant="body2">Actualización en vivo con Socket.IO.</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip color="secondary" label="Shopify vibe" size="small" />
              <Typography variant="body2">Tarjetas minimalistas, fondos suaves y chips.</Typography>
            </Stack>
          </Stack>
        </Box>
      </Stack>
    </Card>
  );

  return (
    <Stack spacing={3}>
      {heroCard}

      <Card sx={{ p: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              placeholder="Buscar por nombre o descripción"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={2.5}>
            <TextField select fullWidth label="Categoría" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat === 'all' ? 'Todas' : cat}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={2.5}>
            <TextField select fullWidth label="Ordenar" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <MenuItem value="relevance">Relevancia</MenuItem>
              <MenuItem value="price-asc">Precio: menor a mayor</MenuItem>
              <MenuItem value="price-desc">Precio: mayor a menor</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary">Rango de precio (₡)</Typography>
              <Slider
                value={priceRange}
                min={minPrice}
                max={maxPrice || 1000}
                onChange={(_, value) => setPriceRange(value)}
                valueLabelDisplay="auto"
              />
            </Stack>
          </Grid>
        </Grid>
      </Card>

      <Divider />

      <Grid container spacing={3}>
        {loading
          ? Array.from({ length: 6 }).map((_, idx) => (
              <Grid item xs={12} md={4} key={idx}>
                <Card>
                  <Skeleton variant="rectangular" height={180} sx={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }} />
                  <CardContent>
                    <Skeleton width="60%" />
                    <Skeleton width="80%" />
                    <Skeleton width="40%" />
                  </CardContent>
                </Card>
              </Grid>
            ))
          : filteredProducts.map((product) => {
              const basePrice = Math.min(...product.variants.map((v) => v.price));
              const cover =
                product.image ||
                `https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80&sat=-15&blend-mode=overlay`;

              return (
                <Grid item xs={12} md={4} key={product.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardMedia component="img" height="180" image={cover} alt={product.name} />
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Stack spacing={1.5}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Chip label={product.category} color="primary" variant="outlined" size="small" />
                          <Typography variant="body2" color="text.secondary">
                            Desde <strong>₡{basePrice}</strong>
                          </Typography>
                        </Stack>

                        <Box>
                          <Typography variant="h6">{product.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {product.description}
                          </Typography>
                        </Box>

                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {product.variants.slice(0, 3).map((v) => (
                            <Chip key={v.id} label={`${v.size} • ${v.color}`} size="small" />
                          ))}
                          {product.variants.length > 3 && (
                            <Chip label={`+${product.variants.length - 3} variantes`} size="small" />
                          )}
                        </Stack>
                      </Stack>
                    </CardContent>
                    <CardActions sx={{ p: 2, pt: 0 }}>
                      <Button variant="contained" fullWidth component={RouterLink} to={`/products/${product.id}`}>
                        Ver detalles
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
      </Grid>
    </Stack>
  );
}
